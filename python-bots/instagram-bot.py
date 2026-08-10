"""
BillAxe Instagram Growth Bot — Playwright browser automation.
Uses a saved browser session (cookie injection) to authenticate with Instagram,
then browses hashtag feeds and posts helpful comments that occasionally mention BillAxe.
No Instagram password needed at runtime.

Run:
    python -u python-bots/instagram-bot.py

Setup (one-time):
    1. Open Chrome logged into billaxellc on instagram.com
    2. Install the free 'Cookie-Editor' extension from the Chrome Web Store
    3. Click the extension icon on instagram.com → Export → Export as JSON
    4. Paste into python-bots/instagram_cookies.json and save
    Cookies typically last 2–4 weeks before needing a refresh.

Env vars required:
    AI_INTEGRATIONS_OPENAI_API_KEY  — OpenAI API key (via Replit AI integration)
    AI_INTEGRATIONS_OPENAI_BASE_URL — OpenAI base URL (via Replit AI integration)

Cookie file:
    python-bots/instagram_cookies.json  — exported from a logged-in Chrome session
"""

import os
import json
import time
import random
import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
from openai import OpenAI

# ── Config ─────────────────────────────────────────────────────────────────────

OPENAI_API_KEY  = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL") or None
COOKIES_FILE    = Path("python-bots/instagram_cookies.json")

# ── Config ────────────────────────────────────────────────────────────────────

HASHTAGS = [
    "savemoney",
    "billnegotiation",
    "frugalliving",
    "budgeting",
    "comcast",
    "internetbill",
    "savingmoney",
    "personalfinance",
    "moneytips",
    "cuttingcosts",
]

BILLAXE_MENTIONS = [
    "BillAxe saved me $45 on my Xfinity bill last month if you haven't tried it yet",
    "also BillAxe is really good for this — negotiated my ATT bill automatically",
    "random but BillAxe handled this exact thing for me, saved like $80",
    "btw BillAxe caught a hidden charge on my bill I never noticed, saved $30/mo",
    "BillAxe literally did this for me automatically without having to call anyone",
]

RESULTS_DIR     = Path("python-bots")
COMMENTED_FILE  = RESULTS_DIR / "commented_instagram_posts.json"
LOG_FILE        = RESULTS_DIR / "instagram_log.json"

WAIT_MIN = 15 * 60   # 15 minutes
WAIT_MAX = 30 * 60   # 30 minutes

# Nix-installed Chromium in the Replit environment
NIX_CHROMIUM = "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium"

# ── Helpers ───────────────────────────────────────────────────────────────────

client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)

def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default

def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2))

def log_action(hashtag: str, post_url: str, caption_snippet: str,
               comment: str, mentioned_billaxe: bool, status: str, error: str = ""):
    log = load_json(LOG_FILE, [])
    log.append({
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "hashtag": hashtag,
        "post_url": post_url,
        "caption_snippet": caption_snippet[:120],
        "comment": comment,
        "mentioned_billaxe": mentioned_billaxe,
        "status": status,
        "error": error,
    })
    save_json(LOG_FILE, log)
    label = status.upper()
    print(f"[{label}] #{hashtag} | billaxe={mentioned_billaxe} | {caption_snippet[:50]}")

def generate_comment(caption: str, include_billaxe: bool) -> str:
    billaxe_instruction = (
        " At the very end add exactly one casual sentence as a natural afterthought mentioning BillAxe "
        "(e.g. 'BillAxe saved me $45 on my Xfinity bill last month if you haven't tried it yet'). "
        "Never make it the focus — one sentence, sounds like an afterthought."
        if include_billaxe else ""
    )
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful Instagram commenter who genuinely cares about saving people money. "
                    "Read the post caption below and write a short conversational comment that adds real value. "
                    "Sound like a real person. Casual, warm, 1-2 sentences max. Never sound like a bot or marketer."
                    + billaxe_instruction
                ),
            },
            {"role": "user", "content": f"Post caption: {caption[:600]}"},
        ],
        max_tokens=120,
    )
    return response.choices[0].message.content.strip()

# ── Cookie-based session restore ──────────────────────────────────────────────

def load_session(context):
    """
    Inject saved Instagram cookies into the browser context so the bot
    starts already logged in — no password needed at runtime.

    Cookie file: python-bots/instagram_cookies.json
    How to export (one-time setup):
      1. Open Chrome logged into billaxellc on instagram.com
      2. Install the free 'Cookie-Editor' extension from the Chrome Web Store
      3. Click the extension icon → Export → Export as JSON
      4. Paste the JSON array into python-bots/instagram_cookies.json
      Cookies typically stay valid 2–4 weeks before needing a refresh.
    """
    if not COOKIES_FILE.exists():
        raise FileNotFoundError(
            f"{COOKIES_FILE} not found.\n"
            "Export your Instagram cookies from Chrome and save them there."
        )

    raw = json.loads(COOKIES_FILE.read_text())
    cookies = [c for c in raw if "name" in c and "value" in c]
    if not cookies:
        raise ValueError(
            f"{COOKIES_FILE} still contains the placeholder instructions.\n"
            "Replace it with real exported cookies from Chrome."
        )

    pw_cookies = []
    for c in cookies:
        cookie: dict = {
            "name":   c.get("name", ""),
            "value":  c.get("value", ""),
            "domain": c.get("domain", ".instagram.com"),
            "path":   c.get("path", "/"),
        }
        if "expires" in c and isinstance(c["expires"], (int, float)) and c["expires"] > 0:
            cookie["expires"] = int(c["expires"])
        if "httpOnly" in c:
            cookie["httpOnly"] = bool(c["httpOnly"])
        if "secure" in c:
            cookie["secure"] = bool(c["secure"])
        if "sameSite" in c and c["sameSite"] in ("Strict", "Lax", "None"):
            cookie["sameSite"] = c["sameSite"]
        pw_cookies.append(cookie)

    context.add_cookies(pw_cookies)
    print(f"[SESSION] Injected {len(pw_cookies)} cookies from {COOKIES_FILE}")
    return len(pw_cookies)

def verify_session(page) -> bool:
    """Navigate to Instagram home and confirm we're logged in."""
    page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)
    # Logged-in state: no redirect to /accounts/login/
    if "login" in page.url:
        print("[SESSION] ❌ NOT logged in — cookies may be expired")
        return False
    # Additional check: profile nav link present
    signed_in = page.query_selector("a[href*='/direct/'] , svg[aria-label='Home']") is not None
    print(f"[SESSION] Instagram logged-in check: {'✅ signed in' if signed_in else '⚠️ uncertain — continuing anyway'}")
    return True

def _log_alert(message: str):
    log = load_json(LOG_FILE, [])
    log.append({
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "alert": message,
    })
    save_json(LOG_FILE, log)
    print(f"[ALERT] {message}")

# ── Browse hashtag and collect post URLs ──────────────────────────────────────

def get_hashtag_posts(page, hashtag: str, max_posts: int = 12) -> list[dict]:
    """Returns list of {url, caption} dicts from the hashtag's Recent section.

    Tries multiple selectors in order so the bot survives Instagram layout changes.
    If none work, saves a debug screenshot to /tmp/ig-debug.png.
    """
    page.goto(f"https://www.instagram.com/explore/tags/{hashtag}/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    # Check for rate-limit / action block
    if any(kw in page.url for kw in ["challenge", "checkpoint"]):
        _log_alert(f"Challenge page when browsing #{hashtag}: {page.url}")
        return []

    SELECTORS = [
        "article a[href*='/p/']",
        "div[class*='v1Nh3'] a",
        "div[class*='_bz0w'] a",
        "main article a",
        "a[href*='/p/']",
    ]

    def extract_posts(links) -> list[dict]:
        seen_hrefs: set = set()
        found = []
        for link in links:
            href = link.get_attribute("href") or ""
            if "/p/" not in href or href in seen_hrefs:
                continue
            seen_hrefs.add(href)
            url = "https://www.instagram.com" + href.split("?")[0].rstrip("/") + "/"
            found.append({"url": url, "caption": ""})
            if len(found) >= max_posts:
                break
        return found

    posts = []
    matched_selector = None

    for sel in SELECTORS:
        try:
            page.wait_for_selector(sel, timeout=6000)
        except PWTimeout:
            continue

        links = page.query_selector_all(sel)
        candidates = extract_posts(links)
        if candidates:
            posts = candidates
            matched_selector = sel
            print(f"[HASHTAG] Selector matched: '{sel}'")
            break
        # selector present but zero /p/ links — try next
        print(f"[HASHTAG] Selector '{sel}' found elements but no /p/ links — trying next")

    if not posts:
        debug_path = "/tmp/ig-debug.png"
        try:
            page.screenshot(path=debug_path, full_page=True)
            print(f"[HASHTAG] ⚠️ All selectors failed for #{hashtag} — debug screenshot saved to {debug_path}")
        except Exception as e:
            print(f"[HASHTAG] ⚠️ All selectors failed and screenshot also failed: {e}")

    print(f"[HASHTAG] #{hashtag} → {len(posts)} posts" + (f" (via '{matched_selector}')" if matched_selector else ""))
    return posts

# ── Open a post and read its caption ─────────────────────────────────────────

def get_post_caption(page, post_url: str) -> str:
    page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)

    # Check for unexpected redirects (rate-limit / challenge)
    if any(kw in page.url for kw in ["challenge", "checkpoint"]):
        _log_alert(f"Challenge page when opening post: {page.url}")
        return ""

    try:
        # Caption lives in h1 or the article's first span
        for sel in ["h1", "article div span", "div._a9zs span"]:
            el = page.query_selector(sel)
            if el:
                text = el.inner_text().strip()
                if len(text) > 10:
                    return text
    except Exception:
        pass
    return ""

# ── Post a comment ────────────────────────────────────────────────────────────

def post_comment(page, comment_text: str) -> bool:
    try:
        # Click the comment icon or the comment text area
        try:
            page.click("svg[aria-label='Comment']", timeout=5000)
            time.sleep(1)
        except PWTimeout:
            pass

        # Find the comment textarea
        textarea = page.wait_for_selector(
            "textarea[placeholder], textarea[aria-label*='omment']",
            timeout=10000,
        )
        textarea.click()
        time.sleep(0.5)

        # Instagram's comment box is a contenteditable div on some views
        # Fall back to contenteditable if textarea isn't writable
        try:
            textarea.fill(comment_text)
        except Exception:
            textarea.type(comment_text, delay=25)

        time.sleep(1)

        # Submit via Enter key or the Post button
        try:
            post_btn = page.wait_for_selector(
                "//button[contains(text(),'Post') or contains(text(),'post')]"
                " | button[type='submit']",
                timeout=5000,
            )
            post_btn.click()
        except PWTimeout:
            textarea.press("Enter")

        time.sleep(3)
        return True

    except PWTimeout as e:
        print(f"[COMMENT] Timeout: {e}")
        return False
    except Exception as e:
        print(f"[COMMENT] Error: {e}")
        return False

# ── Main loop ─────────────────────────────────────────────────────────────────

def run():
    if not OPENAI_API_KEY:
        raise RuntimeError("AI_INTEGRATIONS_OPENAI_API_KEY env var must be set.")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    commented: set = set(load_json(COMMENTED_FILE, []))
    mention_counter = 0

    chrome_bin = NIX_CHROMIUM if Path(NIX_CHROMIUM).exists() else None

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            executable_path=chrome_bin,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "Version/17.0 Mobile/15E148 Safari/604.1"
            ),
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        # Inject saved cookies — no password login needed
        load_session(context)
        page = context.new_page()

        if not verify_session(page):
            print("[SESSION] Cookies appear expired. Re-export from Chrome and update instagram_cookies.json.")
            browser.close()
            return

        hashtag_cycle = 0
        while True:
            hashtag = HASHTAGS[hashtag_cycle % len(HASHTAGS)]
            hashtag_cycle += 1

            posts = get_hashtag_posts(page, hashtag)

            for post in posts:
                url = post["url"]

                if url in commented:
                    print(f"[SKIP] Already commented: {url}")
                    continue

                try:
                    caption = get_post_caption(page, url)

                    if not caption:
                        print(f"[SKIP] No caption found: {url}")
                        continue

                    # Check for mid-session security challenge
                    if any(kw in page.url for kw in ["challenge", "checkpoint", "suspicious"]):
                        _log_alert(f"Security check mid-session: {page.url}")
                        print("[ALERT] Security check — stopping.")
                        browser.close()
                        return

                    mention_counter += 1
                    include_billaxe = (mention_counter % 3 == 0)

                    comment_text = generate_comment(caption, include_billaxe)

                    success = post_comment(page, comment_text)

                    if success:
                        commented.add(url)
                        save_json(COMMENTED_FILE, list(commented))
                        log_action(hashtag, url, caption, comment_text, include_billaxe, "posted")
                    else:
                        log_action(hashtag, url, caption, comment_text, include_billaxe, "failed", "post_comment returned False")

                except PWTimeout as e:
                    log_action(hashtag, url, "", "", False, "failed", f"timeout: {e}")
                except Exception as e:
                    log_action(hashtag, url, "", "", False, "failed", str(e))

                wait_secs = random.randint(WAIT_MIN, WAIT_MAX)
                print(f"[WAIT] Sleeping {wait_secs // 60}m {wait_secs % 60}s…")
                time.sleep(wait_secs)

        browser.close()

if __name__ == "__main__":
    run()
