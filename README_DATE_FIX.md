# V7 SYNC DATE FIX
- Strict DD/MM/YYYY and DD-MM-YYYY parsing only.
- Future dates are rejected.
- Existing future-dated synced rows are cleaned at startup and from the bundled JSON.
- Sync fails safely on incomplete parsing.
- Sync reply shows draw date, parsed 4D count, and database latest date.
- Photo/OCR remains removed.

Render:
Build: npm install
Start: node --max-old-space-size=256 src/index.js
Health: /health
