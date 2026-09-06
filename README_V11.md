# Kerala Lottery V11 AUTO-CATCHUP

What changed:
- On every Render startup/deploy, bot automatically runs catch-up sync.
- Catch-up starts after last COMPLETE draw, not partial validation rows.
- Missing result pages are processed sequentially, max 30 per run.
- Full-number source: keralalotteries.net archive/result pages.
- LOTIS public listing is draw/date authority when match is available.
- Fallback chart is used only as verification, never as full-number source.
- Bumper recent-2 refresh remains enabled.
- /selftest checks 3542, 0817, 1107, B3068 and future-date protection.
- /status shows Latest COMPLETE separately.
- Text-only; no OCR.

Two-step live check:
1. Deploy this ZIP.
2. Send /selftest and /status. Auto-catchup already runs on startup.

Render:
Build: npm install
Start: node --max-old-space-size=256 src/index.js
Health: /health
