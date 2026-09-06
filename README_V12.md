# V12 CURRENT-COMPLETE
Bundled and verified complete through 2026-09-06.
KR-767 (Sep-5) and SM-71 (Sep-6) full 4th-9th result blocks are included in static DB.
Sync validator now compares actual block counts against each page's own declared 'Last four digits to be drawn N times' value.
HTTP 429 retries use backoff; incomplete/mismatched draws stop safely and never advance COMPLETE date.
Startup skips web sync when database is already current.
Use /selftest and /status for live verification.
