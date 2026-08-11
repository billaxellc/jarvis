"""
BillAxe Instagram Growth Bot — Playwright browser automation.
Railway-ready: cookies from INSTAGRAM_COOKIES_JSON env var, comments via Gemini.
"""

import os
import json
import time
import random
import datetime
from pathlib import Path

import google.generativeai as genai
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

# ── Config ─────────────────────────────────────────────────────────────────────

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

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

RESULTS_DIR    = Path("/tmp/billaxe-instagram")
COMMENTED_FILE = RESULTS_DIR / "commented_instagram_posts.json"
LOG_FILE       = RESULTS_DIR / "instagram_log.json"

WAIT_MIN = 15 * 60
WAIT_MAX = 30 * 60

# ── Gemini setup ──────────────────────────────────────────────────────────────

def get_gemini_model():
    genai.configure(api_key=GOOGLE_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default

def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2))

def log_action(hashtag, post_url, caption_snippet, comment, mentioned_billaxe, status, error=""):
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
    print(f"[{status.upper()}] #{hashtag} | billaxe={mentioned_billaxe} | {caption_snippet[:50]}")

def generate_comment(model, caption: str, include_billaxe: bool) -> str:
    billaxe_instruction = (
        " At the very end add exactly one casual sentence as a natural afterthought mentioning BillAxe "
        "(e.g. 'BillAxe saved me $45 on my Xfinity bill last month if you haven't tried it yet'). "
        "Never make it the focus — one sentence, sounds like an afterthought."
        if include_billaxe else ""
    )
    prompt = (
        "You are a helpful Instagram commenter who genuinely cares about saving people money. "
        "Read the post caption below and write a short conversational comment that adds real value. "
        "Sound like a real person. Casual, warm, 1-2 sentences max. Never sound like a bot or marketer."
        + billaxe_instruction
        + f"\n\nPost caption: {caption[:600]}"
    )
    response = model.generate_content(prompt)
    return response.text.strip()

# ── Cookie-based session restore ──────────────────────────────────────────────

def load_session(context):
    cookies_json = os.environ.get("INSTAGRAM_COOKIES_JSON", "")
    if not cookies_json:
        raise RuntimeError("INSTAGRAM_COOKIES_JSON environment variable not set.")

    try:
        raw = json.loads(cookies_json)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"INSTAGRAM_COOKIES_JSON is not valid JSON: {e}")

    cookies = [c for c in raw if "name" in c and "value" in c]
    if not cookies:
        raise ValueError("INSTAGRAM_COOKIES_JSON contains no valid cookies.")

    pw_cookies = []
    for c in cookies:
        cookie = {
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
    print(f"[SESSION] Injected {len(pw_cookies)} cookies from INSTAGRAM_COOKIES_JSON")
    return len(pw_cookies)

def verify_session(page) -> bool:
    page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)
    if "login" in page.url:
        print("[SESSION] ❌ NOT logged in — cookies may be expired")
        return False
    signed_in = page.query_selector("a[href*='/direct/'] , svg[aria-label='Home']") is not None
    print(f"[SESSION] Instagram logged-in check: {'✅ signed in' if signed_in else '⚠️ uncertain — continuing anyway'}")
    return True

def _log_alert(message: str):
    log = load_json(LOG_FILE, [])
    log.append({"timestamp": datetime.datetime.utcnow().isoformat() + "Z", "alert": message})
    save_json(LOG_FILE, log)
    print(f"[ALERT] {message}")

# ── Browse hashtag ────────────────────────────────────────────────────────────

def get_hashtag_posts(page, hashtag: str, max_posts: int = 12) -> list:
    page.goto(f"https://www.instagram.com/explore/tags/{hashtag}/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

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

    def extract_posts(links):
        seen = set()
        found = []
        for link in links:
            href = link.get_attribute("href") or ""
            if "/p/" not in href or href in seen:
                continue
            seen.add(href)
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

    print(f"[HASHTAG] #{hashtag} → {len(posts)} posts" + (f" (via '{matched_selector}')" if matched_selector else ""))
    return posts

# ── Get post caption ──────────────────────────────────────────────────────────

def get_post_caption(page, post_url: str) -> str:
    page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)

    if any(kw in page.url for kw in ["challenge", "checkpoint"]):
        _log_alert(f"Challenge page when opening post: {page.url}")
        return ""

    try:
        for sel in ["h1", "article div span", "div._a9zs span"]:
            el = page.query_selector(sel)
            if el:
                text = el.inner_text().strip()
                if len(text) > 10:
                    return text
    except Exception:
        pass
    return ""

# ── Post comment ──────────────────────────────────────────────────────────────

def post_comment(page, comment_text: str) -> bool:
    try:
        try:
            page.click("svg[aria-label='Comment']", timeout=5000)
            time.sleep(1)
        except PWTimeout:
            pass

        textarea = page.wait_for_selector(
            "textarea[placeholder], textarea[aria-label*='omment']",
            timeout=10000,
        )
        textarea.click()
        time.sleep(0.5)

        try:
            textarea.fill(comment_text)
        except Exception:
            textarea.type(comment_text, delay=25)

        time.sleep(1)

        try:
            post_btn = page.wait_for_selector(
                "//button[contains(text(),'Post') or contains(text(),'post')] | button[type='submit']",
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
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY env var must be set.")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    commented = set(load_json(COMMENTED_FILE, []))
    mention_counter = 0
    model = get_gemini_model()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
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

        load_session(context)
        page = context.new_page()

        if not verify_session(page):
            print("[SESSION] Cookies expired. Update INSTAGRAM_COOKIES_JSON and redeploy.")
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

                    if any(kw in page.url for kw in ["challenge", "checkpoint", "suspicious"]):
                        _log_alert(f"Security check mid-session: {page.url}")
                        print("[ALERT] Security check — stopping.")
                        browser.close()
                        return

                    mention_counter += 1
                    include_billaxe = (mention_counter % 3 == 0)
                    comment_text = generate_comment(model, caption, include_billaxe)

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
