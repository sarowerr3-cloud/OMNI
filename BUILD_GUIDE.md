# SourceIQ: Build Guide for Google Antigravity (Research & Comparison Only)

A sourcing and costing system: text and image search across AliExpress, 1688 and Pinduoduo; automatic landed-cost breakdown using **your** RMB→BDT rate and **your** per-kg weight rates; suggested retail and wholesale prices; and a PDF quote slip. **It does not place orders.** You open the product link and buy manually. It works on **web and mobile** from one codebase (a responsive, installable web app / PWA).

**How to use this guide:** do one phase at a time. Finish its "Check" before moving on.

---

## Part A: Before you write any code

### A1. API access to apply for

| Platform | What to apply for | Fallback |
| --- | --- | --- |
| AliExpress | AliExpress Open Platform developer account (product search, image search) | Third-party data provider |
| 1688 | 1688 Open Platform, or a provider such as TMAPI / Onebound (text + image search) | Provider only |
| Pinduoduo | Third-party data provider | Leave out in v1 |
| Gemini API | Google Gemini API key (`google-genai` SDK for translation, vision, matching, weight estimate) | none |
| Currency (optional) | Any live FX API for auto mode | Manual rate only |

No order APIs, payment accounts, or buying-agent connection are needed. Build with **mock data** while approvals are pending.

### A2. Install and set up Antigravity

1. Install Google Antigravity and sign in.
2. Open an empty folder named `sourceiq`.
3. Policies: **Terminal execution = Auto**, **Review policy = Agent decides**, **JavaScript execution = Request review**. Switch to **Request Review** for Phases 2, 4 and 11.
4. Use **Planning mode**, and read each plan before approving.
5. Add a terminal deny list: `rm -rf`, `git push --force`, `DROP DATABASE`, `curl | sh`.

### A3. Project rules (paste into `.agents/rules/` first)

```
PROJECT: SourceIQ, product sourcing, price comparison and costing tool
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
- Use official APIs or licensed data providers only. Do NOT bypass
  logins, CAPTCHAs or anti-bot protection.
- Every quote stores the exchange rate and shipping rates used.
- Work in small steps. After each step, run tests and summarize.
- Never delete or rewrite files outside the current task.
```

Add `.gitignore` (with `.env`), run `git init`, and commit after every phase.

### A4. Workflows to save (type `/` to run)

`/test` (run all tests, fix only what broke), `/security-scan` (pip-audit, npm audit, secrets check, RBAC check), `/commit`, `/phase-check` (compare work to the phase's "Check").

---

## Part B: Build phases

### Phase 1: Scaffold

```
Create the monorepo: /backend (FastAPI), /frontend (Next.js + TypeScript),
docker-compose.yml (postgres, redis, backend, frontend), .env.example,
Alembic setup, pytest config, GET /health. Add JWT authentication with
roles (admin, user), argon2 password hashing, and a login endpoint.
Add Gemini API integration service skeleton (using google-genai SDK).
```

**Check:** `docker compose up` works, `/health` is OK, login returns a token, tests pass.

### Phase 2: Settings (your rates)

```
Create a Settings module:
- rate_rmb_bdt and rate_usd_bdt, mode (manual/auto), rate_history table.
- Per-request rate override.
- ShippingRate table, user-editable: method (air/sea), rate_per_kg,
  currency, minimum_charge, rounding_step, volumetric_divisor, category (optional).
- Admin-only CRUD endpoints with validation (rates > 0).
- Every quote stores the rate snapshot used.
Add tests.
```

**Check:** change the rate, and an old saved quote does **not** change.

### Phase 3: Connectors with mock mode

```
Define abstract ProductConnector: search(query), search_by_image(image_url),
get_details(id). Product model: platform, title_original, title_en, price,
currency, moq, images, url, seller_rating, weight_kg (nullable),
dimensions, raw_id. Implement AliExpressConnector (official API),
Connector1688 and ConnectorPDD (via configurable provider base URL + key).
Each has a MOCK mode with realistic sample data. Add Redis caching (short
TTL), retries with backoff, timeouts, and per-platform rate limiting.
```

**Check:** in mock mode, one search returns results from all three platforms.

### Phase 4: Cost engine

```
Build CostEngine (Decimal only). Inputs: product, quantity, user weight
(optional), shipping method, rate snapshot. Weight priority: user input >
listing weight > Gemini estimate (flag "estimated"). Formula:
chargeable_kg = max(actual, LxWxH/divisor), rounded by rounding_step;
freight = max(chargeable_kg * rate_per_kg, minimum_charge).
Output a line-by-line BDT breakdown: item price, domestic China shipping,
agent/service fee %, freight, duty/VAT (config table by category/HS code),
payment fee, total landed cost, per-unit cost.
Write unit tests with at least 5 hand-calculated examples.
```

**Check:** compare 3 results with a real past shipment of yours and adjust the config tables until they match.

### Phase 5: Pricing engine

```
Build PricingEngine: target margin % per category, rounding rule (e.g.
nearest ৳10), suggested retail and wholesale price, profit per unit,
margin %, break-even quantity, manual override. Add tests.
```

### Phase 6: Text search API

```
POST /search {query, quantity, shipping_method, rate_override?}
Run all connectors in parallel, skip failed platforms with a warning,
rank by landed cost per unit, return product links + full breakdown +
a "lowest price" highlight.
```

**Check:** results are sorted lowest first, and one failing platform does not break the search.

### Phase 7: Image search

```
Add POST /search/image (multipart). Validate type (jpg/png/webp/heic; convert HEIC to JPEG on the server),
max 5MB after the client has resized large phone photos to about 1600px,
verify real MIME type, strip EXIF, store privately with a random name and
a signed URL expiring in 1 hour, auto-delete after 3 days.
Run platform search_by_image in parallel, plus a Gemini vision step that
describes the product in English and Chinese and generates keywords for a
text-search fallback. Merge results.
```

**Check:** a renamed `.exe` is rejected, an iPhone HEIC photo works, and an uploaded photo returns merged results.

### Phase 8: AI matching and translation

```
Use the Gemini API (`google-genai` SDK) to translate Chinese titles, normalize specs, extract
weight/dimensions from descriptions, and group listings that are the same
product. Return a confidence score (0-100) and flag low confidence for
manual review. Cache AI results. Never send secrets to the AI.
```

### Phase 9: Dashboard (web + mobile, one codebase)

```
Build the Next.js dashboard as a mobile-first responsive PWA:
- Login; search screen with text box, quantity, shipping toggle (air/sea),
  rate field pre-filled from Settings.
- Image search: a button that opens the phone camera or gallery
  (<input type="file" accept="image/*" capture>), drag-and-drop on desktop.
  Resize and compress the photo in the browser before upload.
- Results: a table on desktop, a card list on mobile (platform, price,
  product link, confidence badge, landed cost per unit).
- Cost breakdown: side drawer on desktop, bottom sheet on mobile, with
  editable weight and live recalculation.
- "Save to shortlist", Settings page, loading skeletons, clear error states.
- PWA: manifest, icons, service worker, "Add to home screen" support,
  offline view of the shortlist and saved quotes.
- Touch targets 44px+, numeric keyboards for rate/weight fields,
  safe-area padding, light and dark mode.
```

**Check:** at 360px, 768px and desktop widths nothing scrolls sideways, you can take a photo and search with it on a real phone, and the app installs to the home screen.

### Phase 10: Shortlist and quote slip

```
Add a shortlist: save selected products with their quote snapshot (rates,
weights, breakdown, selling price) and a note. Generate a PDF quote slip
(date, search term, products with links, quantity, rate snapshot, full cost
breakdown, total landed cost, suggested retail/wholesale price) and a CSV
export. Add a price re-check button that refreshes a saved product's price.
```

**Check:** the PDF matches the screen to the taka, and re-checking a price creates a new snapshot without changing the old one.

### Phase 11: Security hardening

```
Review the whole repo: secrets handling, input validation, rate limiting,
RBAC on every endpoint, SQL injection, file upload safety, CORS, security
headers, dependency audit (pip-audit, npm audit), 2FA for admin, backups.
Fix every finding and add tests.
```

**Check:** no endpoint works without login, and a normal user cannot reach admin settings.

### Phase 12: Tests, CI and deployment

```
Add integration tests for the full flow (search -> cost -> shortlist ->
slip). Add GitHub Actions CI (lint, type check, tests, audit). Create a
production Docker setup with HTTPS, environment-based config, logging,
error monitoring, and daily database backups.
```

---

## Part C: Security checklist

- [ ] No secrets in the repo; keys in env or a secrets manager
- [ ] HTTPS, JWT expiry, 2FA for admin
- [ ] Role-based access on every endpoint
- [ ] Audit log for settings and rate changes
- [ ] Upload validation, private storage, auto-delete
- [ ] Rate limiting and input validation
- [ ] Dependency scans in CI
- [ ] Database backups tested by restoring one
- [ ] Tested on a real Android phone, a real iPhone, and a desktop browser

## Part D: Common risks

- **Prices can change before you buy.** Re-check the price on the platform page just before purchasing.
- **Duty rates change.** Keep them in editable tables and confirm with your customs agent or clearing house.
- **Weight estimates can be wrong.** Always enter your own weight when you know it.
- **Image search finds similar, not identical items.** Check the confidence badge and the product page.
- **1688 and Pinduoduo access is limited.** Use official or licensed providers only.
- **PWA limits on iPhone.** Home-screen install works, but push notifications and background features are more limited than on Android. This app doesn't need them.
- **Phone photos are large and may be HEIC.** Compress on the device and convert on the server.

## Timeline

| Week | Phases |
| --- | --- |
| 1 | A, 1, 2, 3 |
| 2 | 4, 5, 6, 7 |
| 3 | 8, 9, 10 |
| 4 | 11, 12 |
