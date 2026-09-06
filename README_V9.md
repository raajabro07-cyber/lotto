# Kerala Lottery V9 FINAL

Primary sync:
1. keralalotteries.net old-result archive
2. keralalotteries.net home/latest links

Fallback verification:
- keralalottery.com.co weekly chart (date/first-prize verification only)

Safety:
- Asia/Kolkata date
- future dates rejected
- full weekly result requires first prize + 4th-9th blocks + >=300 4D records
- incomplete parse never writes to DB
- if today's page is not published, latest available result is clearly labelled
- duplicate writes blocked by engine

Modes:
4567 = normal 4D
345678 = normal 6D + first-prize model
B4567 = bumper mode + normal cross-check
B345678 = bumper 6D + bumper RED ALERT model + normal cross-check

Render:
Build: npm install
Start: node --max-old-space-size=256 src/index.js
Health: /health
