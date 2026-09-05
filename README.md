Kerala Lottery Frequency V5

Core change:
- Main model is frequency-based: 365/180/90/30 days + all-history consistency.
- Very recent hits only mildly reduce score; short-gap repeat rate is NOT treated as the main probability.
- 4-digit and 6-digit inputs supported.
- For 6-digit input, exact 6D and last-4 are analyzed.
- Nearby historical candidates are searched around the last-4 using numeric +/-100 and up to 2 digit-position changes.
- Only candidates with historical support are suggested.
- If none qualify: NO STRONG HISTORICAL CANDIDATE.

Render:
Build Command: npm install
Start Command: node src/index.js
Health: /health

Env:
TELEGRAM_BOT_TOKEN
WEBHOOK_SECRET
MAX_TICKETS_PER_PHOTO=10
