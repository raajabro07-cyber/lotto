# Kerala Lottery V10 VERIFIED
Key repairs:
- Rebuilt historical 4D dates from result-page URLs (fixes DD/MM swap corruption).
- 3542 and 0817 correctly resolve to SK-68 on 2026-09-04.
- B3068 resolves to BR-110 on 2026-07-18.
- Last-two bumper metadata: BR-109 2026-05-23, BR-110 2026-07-18.
- Catch-up sync: missing result pages after last COMPLETE date, max 30 per run.
- LOTIS public result listing validates draw-code/date when available.
- keralalotteries.net is the full-number source.
- keralalottery.com.co used only as fallback first-prize cross-check.
- Recent two bumper pages are refreshed during sync and stored in bumper_recent.json.
- Partial validation rows do not advance last COMPLETE date.
- Future dates rejected; Asia/Kolkata date used.
- Text-only, no OCR.

Render:
Build: npm install
Start: node --max-old-space-size=256 src/index.js
Health: /health
