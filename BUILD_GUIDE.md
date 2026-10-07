# SourceIQ: Build Guide for Google Antigravity (Research & Comparison Only)

A sourcing, price comparison, local market benchmarking and costing system: text and image search across AliExpress, 1688 and Pinduoduo; local Bangladesh market price discovery (Daraz, Facebook Pages/Shops, Instagram, TikTok, local e-commerce & offline retail); automatic landed-cost breakdown using **your** RMB→BDT rate and **your** per-kg weight rates; suggested retail/wholesale prices and actual local market profit/gross margin calculations; and a PDF quote slip. **It does not place orders.** You open the product link and buy manually. It works on **web and mobile** from one codebase (a responsive, installable web app / PWA).

**How to use this guide:** do one phase at a time. Finish its "Check" before moving on.

---

## Part A: Before you write any code

### A1. API access to apply for

| Platform | What to apply for | Fallback |
| --- | --- | --- |
| AliExpress | AliExpress Open Platform developer account (product search, image search) | Third-party data provider |
| 1688 | 1688 Open Platform, or a provider such as TMAPI / Onebound (text + image search) | Provider only |
| Pinduoduo | Third-party data provider | Leave out in v1 |
| Gemini API | Google Gemini API key (`google-genai` SDK for translation, vision, matching, weight estimate, local BD market search/extraction) | none |
| BD Market Data | Web search / SerpAPI / Custom web scraper for local BD sites & social media (Daraz, FB, IG, TikTok) | Gemini Grounded Search + Mock Data |
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

### Phase 3: Connectors (China & BD Market) with mock mode

```
Define abstract ProductConnector: search(query), search_by_image(image_url),
get_details(id). Product model: platform, title_original, title_en, price,
currency, moq, images, url, seller_rating, weight_kg (nullable),
dimensions, raw_id.
Implement Sourcing Connectors: AliExpressConnector, Connector1688, ConnectorPDD.
Implement BDMarketConnector: search local BD market value across Daraz BD,
Facebook Pages/Shops, Instagram, TikTok seller posts, and offline retail benchmarks.
Each has a MOCK mode with realistic sample data. Add Redis caching (short
TTL), retries with backoff, timeouts, and per-platform rate limiting.
```

**Check:** search query returns sourcing listings (AliExpress/1688/PDD) AND local BD market prices (Daraz, FB, IG, TikTok, local store benchmark).

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

### Phase 5: Pricing & Market Margin Engine

```
Build PricingEngine:
- Inputs: Landed Cost per unit (from CostEngine), local BD market price benchmarks
  (Daraz, FB Pages, IG, TikTok, local offline retail).
- Calculates:
  1. Average & Range of Local BD Market Retail Price (৳).
  2. Potential Net Profit per unit (Local BD Market Price - Landed Cost).
  3. Potential Gross Margin % ((Local BD Market Price - Landed Cost) / Local BD Market Price * 100).
  4. ROI % ((Profit / Landed Cost) * 100).
  5. Suggested Retail & Wholesale Price based on target margin % with rounding rules.
  6. Break-even quantity.
Add unit tests with mock local market data.
```

**Check:** local BD market price ৳1,500 vs Landed Cost ৳600 accurately computes Profit = ৳900, Gross Margin = 60%, ROI = 150%.

### Phase 6: Text search API with BD Market Comparison

```
POST /search {query, quantity, shipping_method, rate_override?}
Run all sourcing connectors AND local BD market connectors in parallel,
skip failed platforms with a warning, rank by landed cost per unit,
match with local BD market benchmark prices, return product links + full cost breakdown +
local BD market prices (Daraz, FB, IG, TikTok) + profit & gross margin analysis.
```

**Check:** results display sourcing prices alongside local BD selling prices and calculated margins.

### Phase 7: Image search & Vision Matching

```
Add POST /search/image (multipart). Validate type (jpg/png/webp/heic; convert HEIC to JPEG on the server),
max 5MB after the client has resized large phone photos to about 1600px,
verify real MIME type, strip EXIF, store privately with a random name and
a signed URL expiring in 1 hour, auto-delete after 3 days.
Run platform search_by_image in parallel, plus a Gemini vision step that
describes the product in English, Chinese, and Bengali keywords for text-search fallback across
China suppliers AND local BD market stores. Merge results.
```

**Check:** uploaded photo returns sourcing options and matching local BD market listings.

### Phase 8: AI matching, translation & local market price extraction

```
Use the Gemini API (`google-genai` SDK) to translate Chinese titles, normalize specs,
extract weight/dimensions from descriptions, group listings of the same product,
and extract price points from local BD social media (FB/IG/TikTok post captions) & e-commerce descriptions.
Return a confidence score (0-100) and flag low confidence for manual review.
Cache AI results. Never send secrets to the AI.
```

### Phase 9: Dashboard (web + mobile, one codebase)

```
Build the Next.js dashboard as a mobile-first responsive PWA:
- Login; search screen with text box, quantity, shipping toggle (air/sea),
  rate field pre-filled from Settings.
- Image search: camera/gallery button, drag-and-drop on desktop.
- Results: sourcing cards (AliExpress, 1688, PDD) side-by-side with
  Local BD Market Value Card (Daraz, FB, IG, TikTok, local retail).
- Landed Cost & Profit Drawer: live edit weight, view Landed Cost vs Local Market Price,
  estimated profit per unit, gross margin %, ROI %.
- "Save to shortlist", Settings page, loading skeletons, clear error states.
- PWA: manifest, icons, service worker, "Add to home screen" support.
```

**Check:** at 360px and desktop widths, landed cost vs local BD market price and profit margin are clearly visible on card details.

### Phase 10: Shortlist and quote slip with Market Profit Summary

```
Add a shortlist: save selected products with their quote snapshot (rates,
weights, landed breakdown, local BD market prices, selling price, profit margin) and notes.
Generate a PDF quote slip (date, search term, products with links, quantity, rate snapshot,
full cost breakdown, local BD market benchmark, total landed cost, gross margin %, profit per unit)
and CSV export. Add price re-check button.
```

**Check:** the PDF displays total landed cost, local BD market price, gross margin %, and net profit per unit.

### Phase 11: Security hardening

```
Review the whole repo: secrets handling, input validation, rate limiting,
RBAC on every endpoint, SQL injection, file upload safety, CORS, security
headers, dependency audit (pip-audit, npm audit), 2FA for admin, backups.
Fix every finding and add tests.
```

### Phase 12: Tests, CI and deployment

```
Add integration tests for the full flow (search -> cost -> BD market match -> margin -> shortlist -> slip).
Add GitHub Actions CI (lint, type check, tests, audit). Create production Docker setup.
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
- **Local BD social media prices fluctuate.** Social media sellers (FB/IG/TikTok) often quote prices in captions or inbox; Gemini extraction helps parse published post prices.
- **Duty rates change.** Keep them in editable tables and confirm with your customs agent.
- **Weight estimates can be wrong.** Always enter your own weight when known.
- **Phone photos are large and may be HEIC.** Compress on the device and convert on the server.

## Timeline

| Week | Phases |
| --- | --- |
| 1 | A, 1, 2, 3 |
| 2 | 4, 5, 6, 7 |
| 3 | 8, 9, 10 |
| 4 | 11, 12 |
