# Kerala Lottery One-Week Test V4

READY FOR GITHUB -> RENDER.

Render manual settings:
Build Command: npm install
Start Command: node src/index.js
Health Check: /health

Environment:
TELEGRAM_BOT_TOKEN = BotFather token
WEBHOOK_SECRET = any private string
MAX_TICKETS_PER_PHOTO = 10

Features:
- 4-digit direct analysis
- 6-digit analysis + last-4
- Historical appearance count/frequency
- Historical 1-6 day recurrence rate
- Exact recurrence gaps: 1d,2d,3d,4-6d,7-15d,16-30d,30+d
- Recent 1-6 day suppression based on that suffix's own historical recurrence behavior
- Median/min/max recurrence gap
- Historical-model repeat score %
- 10,000 possible last-4 candidate scan
- Top 5 bot candidate suggestions
- Photo OCR for multiple tickets
- Telegram webhook / Render health endpoint

IMPORTANT: This bundle uses the currently available 961-record baseline dataset (2024-01-01 through 2026-09-04). Clean 2021-2026 data should later replace/extend it for a stronger model.
