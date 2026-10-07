# SourceIQ: User Operational Guide & Sourcing Instructions

Welcome to **SourceIQ** — your automated product sourcing, price comparison, Bangladesh local market benchmarking, and landed-cost calculation system powered by the **Google Gemini API**.

---

## 🚀 Quick Access Links

| Interface | URL | Purpose |
| --- | --- | --- |
| **Web Dashboard** | [http://localhost:3000](http://localhost:3000) | Mobile-first Web & PWA Dashboard for product research |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI for running API queries |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | System status & Gemini API connection monitor |

---

## ⚙️ Step 1: Environment & API Configuration

To enable live Google Gemini AI features (Chinese title translation, product vision analysis, and automatic BD market extraction):

1. Open the [.env](file:///f:/OMNI/.env.example) file in the root folder.
2. Paste your Google Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
> [!NOTE]
> If `GEMINI_API_KEY` is not set, SourceIQ automatically operates in **Mock Mode**, providing realistic sample data so you can test all features without API costs.

---

## 🔍 Step 2: Sourcing a Product & BD Market Benchmark

### Method A: Using the Interactive API (Swagger UI)

1. Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.
2. Click on `POST /search` under **Sourcing & Market Benchmark**, then click **Try it out**.
3. Enter your product search parameters in JSON:
   ```json
   {
     "query": "Smart Watch Ultra",
     "quantity": 10,
     "shipping_method": "air",
     "user_weight_kg": 0.35
   }
   ```
4. Click **Execute**.

---

## 📊 Step 3: Understanding the Results & Profit Breakdown

The search result delivers three critical insights:

### 1. Sourcing Options (AliExpress, 1688, Pinduoduo)
- Original price in RMB (¥) or USD ($).
- Minimum Order Quantity (MOQ).
- Product link to buy manually.

### 2. Full Landed Cost Breakdown in BDT (৳)
The cost engine computes the total landed cost per unit in Bangladesh taka:
$$\text{Total Landed Cost} = \text{Item Price (BDT)} + \text{Domestic China Shipping} + \text{Agent Fee (5\%)} + \text{Freight (Air/Sea)} + \text{Customs Duty (15\%)} + \text{Payment Fee}$$

### 3. Bangladesh Local Market Benchmark & Profit Analysis
SourceIQ benchmarks the product against selling prices on:
- **Daraz BD** (Verified Mall & top sellers)
- **Facebook Pages / Shops**
- **Instagram Shops**
- **TikTok Seller Posts**
- **Offline Retail Stores** (Multiplan / Bashundhara retail counters)

#### Calculated Profit Metrics:
- **Estimated Net Profit per Unit**: $\text{Local BD Retail Price} - \text{Landed Cost}$
- **Gross Margin %**: $\frac{\text{Net Profit}}{\text{Local BD Retail Price}} \times 100$
- **ROI %**: $\frac{\text{Net Profit}}{\text{Landed Cost}} \times 100$
- **Break-even Sales Quantity**

---

## 📋 Step 5: Creating Product Lists & Exporting A4 PDF

SourceIQ includes a smart, interactive **Product List Builder** designed for importers and sourcing agents:

### Features:
1. **List Metadata**: Specify **List Name** (e.g. *Electronics Sourcing List Q4*) and **List Date** at the very top.
2. **Sequential Product Addition**:
   - Add items sequentially via the form (Title, Details, Price in BDT/RMB/USD, Weight in kg/gm, Direct Link, Image, Quantity).
   - Or click **`➕ Add to Product List`** directly on any search card or calculator result for instant 1-click addition.
3. **Live Totals Calculation**:
   - Real-time calculation of **Total Price (BDT)** and **Total Weight (in kg)** across all items.
4. **Saving & PDF Export**:
   - **Save List**: Persists product lists to the backend API & browser storage.
   - **Download A4 PDF**: Generates a clean, professionally formatted A4 paper PDF with product thumbnails, direct clickable product links, weight (kg), price breakdown, and summary totals.
   - **Export CSV & Text Summary**: Quickly export list to CSV for Excel or copy text for WhatsApp/email.

---

## 🛠️ Step 6: System Architecture & Build Guide

For complete technical documentation, database schemas, and phase progression, refer to:
- 📖 [BUILD_GUIDE.md](file:///f:/OMNI/BUILD_GUIDE.md) — Technical specification & architecture rules
- 📜 [.agents/rules/project_rules.md](file:///f:/OMNI/.agents/rules/project_rules.md) — Importer business logic constraints

