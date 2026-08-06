# BillAxe Bot Infrastructure

Autonomous AI employee ecosystem running 19 specialized bots + manager orchestration.

## Architecture

- **19 Specialized Bots** — Each handles one job: monitoring, analysis, enforcement
- **Manager Bot** — Synthesizes all reports into ONE daily email
- **Self-Healing** — Uses Anthropic API to diagnose and suggest fixes
- **Railway Deployment** — 24/7 uptime, automatic scaling

## Bots

1. **Bill Retry Supervisor** — Triggers missed Bland.ai calls (Daily 8 AM)
2. **Call Quality Inspector** — Flags dropped/failed calls (Daily 10 AM)
3. **Negotiation Success Tracker** — Counts completions, calculates savings (Daily 12 PM)
4. **Onboarding Checker** — Simulates full signup flow (Daily 6 AM)
5. **Bill Upload Monitor** — Verifies upload pipeline (Every 2 hours)
6. **Webhook Health Checker** — Tests Bland webhook delivery (Daily 3 PM)
7. **Daily Revenue Report** — Total bills negotiated + savings (Daily 11 PM)
8. **User Engagement Tracker** — Active users, new signups (Daily 11:30 PM)
9. **Error Log Analyzer** — Reads logs, uses Claude for diagnosis (Every 4 hours)
10. **Database Health Monitor** — Connection, performance, growth (Daily 1 AM)
11. **API Response Time Monitor** — Tests core endpoints (Every 6 hours)
12. **Manager Bot** — Synthesizes all 11 reports (Daily 6 AM)
13. **Competitor Monitor** — Tracks market positioning (Weekly)
14. **Customer Success Bot** — Emails users on success (Daily 7 PM)
15. **Bland Balance Monitor** — CRITICAL: Alerts if credits run out (Daily 7 AM)
16. **Failed Auth Detector** — Flags login issues (Daily 9 AM)
17. **Stale Bill Cleaner** — Finds neglected bills (Weekly)
18. **CFO Bot** — Financial analysis via Plaid (Weekly)
19. **Cost Optimization Analyst** — Identifies waste (Weekly)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env`:
```bash
cp .env.example .env
# Fill in your keys
```

3. Run locally:
```bash
npm start
```

## Deployment on Railway

1. Connect GitHub repo
2. Set environment variables in Railway dashboard
3. Deploy — bots start running on schedule immediately

## Logs

All bot executions logged to `logs/` directory as JSON.

Each log entry includes: timestamp, bot name, level, message, and relevant data.

## Customization

Add new bots by:
1. Create `src/bots/bot-XX-name.js`
2. Export `async function run()`
3. Register in `src/manager.js` with schedule

## License

MIT
