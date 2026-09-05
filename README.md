# Kerala Lottery FINAL V7

This is the integrated version requested.

Bundled historical data:
- Cleaned 4-digit all-prize rows (2021-2026 available collected pages): 73,676
- First-prize 6-digit rows: 1,203

Main behavior
1. Enter 4 digits, e.g. 0856
   - Shows last seen date and prize amount if available
   - Shows whether it appeared within previous 6 days
   - Any number seen in previous 6 days is HARD EXCLUDED from robot suggestions
   - 30/90/180/365-day and all-history counts
   - Nearby/family robot suggestions

2. Enter 6 digits
   - Same last-4 analysis and robot suggestions
   - Adds first-prize structural analysis
   - doubles/triples, near-serial pairs, repeated digits, family density, historical structural similarity
   - date/numerology similarity
   - RED ALERT only when multiple model signals are strong and last-4 cooldown is clear

3. Full daily sync
   - Telegram button: Sync Today
   - /sync
   - /syncurl <result-page-url> fallback
   - Parses first-prize 6-digit + lower 4-digit prize numbers
   - /status shows row counts/latest date

Render
- Build Command: npm install
- Start Command: node src/index.js
- Health Check: /health

Environment
- TELEGRAM_BOT_TOKEN = BotFather token
- WEBHOOK_SECRET = any private secret
- MAX_TICKETS_PER_PHOTO = 10
- ADMIN_CHAT_ID = optional; if set, only this Telegram chat ID can use sync

Important persistence note
- Synced results are saved to data/synced_results.json in the running instance.
- Render free instances can lose local changes on restart/redeploy. For permanent production sync history, connect a persistent DB or GitHub/Supabase storage later.
- The bundled historical CSVs remain part of the repository and are not lost.

Model disclaimer
- Historical strength, structural similarity and numerology are descriptive/model scores, not scientifically established future lottery probabilities.
