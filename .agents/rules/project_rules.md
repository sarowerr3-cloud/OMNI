PROJECT: SourceIQ, product sourcing, price comparison, local BD market benchmarking and costing tool
for a Bangladesh-based importer. RESEARCH ONLY.

STACK: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 + Alembic,
PostgreSQL, Redis + Celery, pytest, google-genai. Frontend: Next.js + TypeScript.
Docker Compose for local run.

RULES:
- The system NEVER places orders, makes payments, or stores purchase
  account credentials. Product links open the platform for manual buying.
- Mobile-first responsive UI: everything must work on a 360px-wide phone
  and on desktop. Touch targets at least 44px. No hover-only features.
- Build the frontend as an installable PWA (manifest, service worker).
- Type hints everywhere. Every module has tests.
- All money uses Decimal, never float. Store original currency + BDT.
- No secrets in code. Read from environment variables only (e.g. GEMINI_API_KEY).
- Every platform sits behind a common ProductConnector interface.
- Local BD Market discovery (Daraz, FB Shops, IG, TikTok, local retail)
  must be benchmarked to calculate local retail market value, gross margin %,
  and net profit per unit against total landed cost.
- Use official APIs or licensed data providers only. Do NOT bypass
  logins, CAPTCHAs or anti-bot protection.
- Every quote stores the exchange rate and shipping rates used.
- Work in small steps. After each step, run tests and summarize.
- Never delete or rewrite files outside the current task.
