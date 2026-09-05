# Kerala Lottery Analyzer V2 — Render Ready

## IMPORTANT FIX
Do NOT use `yarn startnpm start`.

Manual Render settings:
- Runtime: Node
- Build Command: `npm install`
- Start Command: `node src/index.js`
- Health Check Path: `/health`
- Plan: Free

Environment:
- TELEGRAM_BOT_TOKEN = BotFather token
- WEBHOOK_SECRET = any private string, e.g. lotto-secure-2026
- MAX_TICKETS_PER_PHOTO = 10

The bundle already includes 961 baseline first-prize history rows covering 2024-01-01 through 2026-09-04.
Later, the clean 2021-2026 dataset can replace/extend this data file.

Features:
- Telegram webhook
- Render wake via Telegram webhook request
- Manual number analysis
- 1-10 tickets from one photo
- Local OCR, no paid AI
- Current-date scoring
- exact repeat suppression
- 2/3/4-digit recurrence gaps
- 30/90/365-day rolling frequency
- day-of-week recurrence
- previous-draw transition heuristic
- ranking
- /status

Pattern Score is descriptive historical analysis, not actual winning probability.
