// Formal Client Quotation PDF Generator using html2pdf.js
// Designed for a simple, minimalist, high-contrast, and deeply useful single-page A4 document
import { OMNI_LOGO_BASE64, OMNI_QR_BASE64 } from './pdfAssets';
import { ProfileFolder, FolderProduct } from '@/types/profileFolder';

export interface QuotationData {
  productTitle: string;
  rmbPrice: string;
  rmbRate: string;
  quantity: number;
  weightVal: string;
  weightUnit: string;
  totalWeightKg: number;
  freightRate: string;
  freightUnit: string;
  domesticShipping: string;
  agentFeePct: string;
  dutyPct: string;
  otherCosts: string;
  itemPriceBdt: number;
  domesticShippingBdt: number;
  agentFeeBdt: number;
  freightBdt: number;
  dutyVatBdt: number;
  otherCostsBdt: number;
  totalLandedCost: number;
  perUnitLandedCost: number;
  targetPrice: number;
  netProfit: number;
  batchTotalProfit: number;
  grossMargin: number;
  roi: number;
  breakEvenUnits: number;
  imageUrl?: string;
  shippingMethod?: 'air' | 'sea';
  platform?: string;
  sellerRating?: number | string;
  moq?: number | string;
}

/**
 * Attempts to convert an external image URL to base64 so html2canvas renders it without CORS restrictions.
 */
async function toSafeDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

/**
 * Generates and triggers download of a clean, minimalist, high-utility single-page A4 PDF quotation.
 */
export async function exportQuotationPdf(data: QuotationData, formatMoney: (n: number) => string) {
  // Dynamically import html2pdf to prevent SSR window issues
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const quoteNumber = `OMNI-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const validUntilStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Pre-process product image to avoid CORS failure in html2canvas
  const safeImageUrl = await toSafeDataUrl(data.imageUrl);

  const element = document.createElement('div');
  element.style.padding = '20px 24px';
  element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  element.style.color = '#0f172a';
  element.style.background = '#ffffff';
  element.style.width = '740px';
  element.style.boxSizing = 'border-box';
  element.style.lineHeight = '1.4';

  const hasTarget = data.targetPrice > 0;
  const qty = data.quantity > 0 ? data.quantity : 1;
  const unitItemPrice = Math.round(data.itemPriceBdt / qty);
  const unitAgentFee = Math.round(data.agentFeeBdt / qty);
  const unitFreight = Math.round(data.freightBdt / qty);
  const unitDuty = Math.round(data.dutyVatBdt / qty);
  const unitOther = Math.round(data.otherCostsBdt / qty);

  // Suggested selling prices for Bangladesh market if user has no target set
  const wholesalePrice = Math.round(data.perUnitLandedCost * 1.25);
  const retailPrice = Math.round(data.perUnitLandedCost * 1.45);
  const premiumRetailPrice = Math.round(data.perUnitLandedCost * 1.70);
  const retailProfitBatch = Math.round((retailPrice - data.perUnitLandedCost) * qty);

  element.innerHTML = `
    <!-- MINIMALIST HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px;">
      <!-- Left: Quotation Reference & Dates -->
      <div style="width: 175px; font-size: 9.5px; color: #475569; line-height: 1.45;">
        <div><strong style="color: #0f172a;">Ref No:</strong> <span style="font-family: monospace; font-weight: 700; color: #dc2626;">${quoteNumber}</span></div>
        <div><strong>Date:</strong> ${dateStr}</div>
        <div><strong>Valid Until:</strong> ${validUntilStr}</div>
        <div style="color: #0284c7; font-weight: 600; font-size: 8.5px; margin-top: 2px;">China → Bangladesh DDP</div>
      </div>

      <!-- Center: Official Logo & Minimalist Title -->
      <div style="flex: 1; text-align: center; padding: 0 10px;">
        <img src="${OMNI_LOGO_BASE64}" alt="OMNI" style="height: 48px; width: auto; max-width: 210px; object-fit: contain; margin: 0 auto 4px auto; display: block; image-rendering: -webkit-optimize-contrast;" />
        <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; letter-spacing: 1.5px; text-transform: uppercase;">
          COMMERCIAL SOURCING QUOTATION
        </div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
          Direct Factory Sourcing · Customs Clearance · Doorstep Delivery
        </div>
      </div>

      <!-- Right: Facebook Page QR Code -->
      <div style="width: 175px; display: flex; flex-direction: column; align-items: flex-end; text-align: center;">
        <div style="padding: 2px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px;">
          <img src="${OMNI_QR_BASE64}" alt="Facebook Page QR" style="width: 44px; height: 44px; display: block; object-fit: contain;" />
        </div>
        <span style="font-size: 8px; font-weight: 800; color: #1877f2; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.5px;">
          Facebook Page
        </span>
      </div>
    </div>

    <!-- SOURCING & ORDER SPECIFICATIONS -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
        <span style="font-size: 9.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
          📦 Product & Order Specifications
        </span>
        <span style="font-size: 9px; color: #475569;">
          Exchange Rate: <strong style="color: #0f172a;">1 RMB = ৳${data.rmbRate} BDT</strong>
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        ${safeImageUrl ? `
          <div style="width: 68px; height: 68px; min-width: 68px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; background: #ffffff; display: flex; align-items: center; justify-content: center;">
            <img src="${safeImageUrl}" alt="Product" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.parentElement.style.display='none';" />
          </div>
        ` : ''}

        <table style="flex: 1; font-size: 9.5px; border-collapse: collapse; line-height: 1.45;">
          <tr>
            <td style="color: #64748b; width: 18%;">Product Item:</td>
            <td style="font-weight: 700; color: #0f172a; width: 34%; padding-right: 6px;">${data.productTitle}</td>
            <td style="color: #64748b; width: 22%;">Order Quantity:</td>
            <td style="font-weight: 700; color: #0f172a; width: 26%;">${data.quantity.toLocaleString()} Pcs</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Supplier Price:</td>
            <td style="font-weight: 700; color: #0f172a;">¥${data.rmbPrice} RMB</td>
            <td style="color: #64748b;">Unit Weight:</td>
            <td style="font-weight: 700; color: #0f172a;">${data.weightVal} ${data.weightUnit}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Cargo Freight Rate:</td>
            <td style="font-weight: 700; color: #0f172a;">
              ৳${data.freightRate} ${data.freightUnit === 'per_gm' ? '/ gm' : '/ kg'}
              <span style="font-size: 8.5px; color: #64748b; font-weight: normal;">(${data.freightUnit === 'per_gm' ? '≈ ৳' + ((Number(data.freightRate)||0)*1000).toLocaleString() + '/kg' : ''})</span>
            </td>
            <td style="color: #64748b;">Total Batch Weight:</td>
            <td style="font-weight: 700; color: #0f172a;">${data.totalWeightKg.toFixed(2)} kg</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Shipping Channel:</td>
            <td style="font-weight: 700; color: #dc2626;">${(data.shippingMethod || 'air').toUpperCase()} CARGO (Doorstep Delivery)</td>
            <td style="color: #64748b;">Source Platform:</td>
            <td style="font-weight: 700; color: #0f172a;">${data.platform || '1688 / Taobao Factory Direct'}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ITEMIZED LANDED COST BREAKDOWN TABLE -->
    <div style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-size: 9.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
          💰 Itemized Landed Cost Statement (BDT ৳)
        </span>
        <span style="font-size: 8.5px; color: #64748b;">
          Includes international freight, customs tariff & Dhaka handling
        </span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden;">
        <thead>
          <tr style="background: #f1f5f9; color: #0f172a; font-weight: 700; border-bottom: 1.5px solid #cbd5e1;">
            <th style="padding: 6px 9px; text-align: left; width: 44%;">Cost Element</th>
            <th style="padding: 6px 9px; text-align: center; width: 24%;">Calculation Basis</th>
            <th style="padding: 6px 9px; text-align: right; width: 16%;">Unit Cost (৳)</th>
            <th style="padding: 6px 9px; text-align: right; width: 16%;">Batch Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          <!-- 1. Factory Cost -->
          <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
            <td style="padding: 5px 9px; font-weight: 600; color: #1e293b;">1. Factory Product Cost</td>
            <td style="padding: 5px 9px; text-align: center; color: #64748b;">¥${data.rmbPrice} × ৳${data.rmbRate}</td>
            <td style="padding: 5px 9px; text-align: right; color: #334155;">৳${formatMoney(unitItemPrice)}</td>
            <td style="padding: 5px 9px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.itemPriceBdt)}</td>
          </tr>

          <!-- 2. Domestic China Freight -->
          <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
            <td style="padding: 5px 9px; font-weight: 600; color: #1e293b;">2. China Domestic Logistics</td>
            <td style="padding: 5px 9px; text-align: center; color: #64748b;">Factory to Guangzhou/Yiwu Warehouse</td>
            <td style="padding: 5px 9px; text-align: right; color: #334155;">৳${data.domesticShipping}</td>
            <td style="padding: 5px 9px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.domesticShippingBdt)}</td>
          </tr>

          <!-- 3. Sourcing & Inspection Fee -->
          <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
            <td style="padding: 5px 9px; font-weight: 600; color: #1e293b;">3. Sourcing Agent Fee & Inspection</td>
            <td style="padding: 5px 9px; text-align: center; color: #64748b;">${data.agentFeePct}% of Factory Value</td>
            <td style="padding: 5px 9px; text-align: right; color: #334155;">৳${formatMoney(unitAgentFee)}</td>
            <td style="padding: 5px 9px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.agentFeeBdt)}</td>
          </tr>

          <!-- 4. International Freight -->
          <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
            <td style="padding: 5px 9px; font-weight: 600; color: #1e293b;">4. International Cargo Freight (China → BD)</td>
            <td style="padding: 5px 9px; text-align: center; color: #64748b;">${data.totalWeightKg.toFixed(2)} kg @ ৳${data.freightRate}/${data.freightUnit === 'per_gm' ? 'gm' : 'kg'}</td>
            <td style="padding: 5px 9px; text-align: right; color: #334155;">৳${formatMoney(unitFreight)}</td>
            <td style="padding: 5px 9px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.freightBdt)}</td>
          </tr>

          <!-- 5. Customs Duty & Clearance -->
          <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
            <td style="padding: 5px 9px; font-weight: 600; color: #1e293b;">5. Customs Duty, Clearance & Taxes</td>
            <td style="padding: 5px 9px; text-align: center; color: #64748b;">${data.dutyPct}% Applied Tariff & Formalities</td>
            <td style="padding: 5px 9px; text-align: right; color: #334155;">৳${formatMoney(unitDuty)}</td>
            <td style="padding: 5px 9px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.dutyVatBdt)}</td>
          </tr>

          <!-- 6. Local Handling -->
          <tr style="border-bottom: 1px solid #cbd5e1; background: #f8fafc;">
            <td style="padding: 5px 9px; font-weight: 600; color: #1e293b;">6. Dhaka Inbound & Sorting</td>
            <td style="padding: 5px 9px; text-align: center; color: #64748b;">Warehouse Handling & Quality Check</td>
            <td style="padding: 5px 9px; text-align: right; color: #334155;">৳${formatMoney(unitOther)}</td>
            <td style="padding: 5px 9px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.otherCostsBdt)}</td>
          </tr>

          <!-- TOTAL LANDED COST ROW -->
          <tr style="background: #0f172a; color: #ffffff; font-weight: 700;">
            <td style="padding: 8px 9px; font-size: 10.5px; letter-spacing: 0.5px; text-transform: uppercase;">
              TOTAL LANDED COST (BDT)
            </td>
            <td style="padding: 8px 9px; text-align: center; color: #94a3b8; font-size: 9px;">
              ${data.quantity.toLocaleString()} Pcs Total Batch
            </td>
            <td style="padding: 8px 9px; text-align: right; font-size: 11px; color: #38bdf8;">
              ৳${formatMoney(data.perUnitLandedCost)}
            </td>
            <td style="padding: 8px 9px; text-align: right; font-size: 11.5px; font-weight: 900; color: #ffffff;">
              ৳${formatMoney(data.totalLandedCost)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- COMMERCIAL MARGIN & PROFITABILITY (DEEPLY USEFUL) -->
    ${hasTarget ? `
      <div style="background: #f0fdf4; border: 1.5px solid #22c55e; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 9.5px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">
            📈 Commercial Margin & Profit Projection
          </span>
          <span style="font-size: 8.5px; color: #166534;">
            Break-even: <strong>${data.breakEvenUnits} units</strong> | Expected ROI: <strong>${data.roi}%</strong>
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">
          <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px;">
            <div style="font-size: 8px; color: #166534; font-weight: 600; text-transform: uppercase;">Target Selling Price</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 1px;">৳${formatMoney(data.targetPrice)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px;">
            <div style="font-size: 8px; color: #166534; font-weight: 600; text-transform: uppercase;">Net Profit / Unit</div>
            <div style="font-size: 12px; font-weight: 800; color: #15803d; margin-top: 1px;">+৳${formatMoney(data.netProfit)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px;">
            <div style="font-size: 8px; color: #166534; font-weight: 600; text-transform: uppercase;">Gross Profit Margin</div>
            <div style="font-size: 12px; font-weight: 800; color: #0284c7; margin-top: 1px;">${data.grossMargin}%</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px;">
            <div style="font-size: 8px; color: #166534; font-weight: 600; text-transform: uppercase;">Total Batch Net Profit</div>
            <div style="font-size: 12px; font-weight: 800; color: #16a34a; margin-top: 1px;">+৳${formatMoney(data.batchTotalProfit)}</div>
          </div>
        </div>
      </div>
    ` : `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 9px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            🎯 Recommended Selling Price & Margin Guide (Bangladesh)
          </span>
          <span style="font-size: 8px; color: #64748b;">
            Est. Batch Net Profit at Standard Retail: <strong style="color: #16a34a;">+৳${formatMoney(retailProfitBatch)} BDT</strong>
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px;">
            <div style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">Wholesale Distribution (20% Net)</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-top: 1px;">৳${formatMoney(wholesalePrice)} BDT</div>
          </div>
          <div style="background: #ffffff; border: 1.5px solid #22c55e; border-radius: 4px; padding: 4px;">
            <div style="font-size: 8px; color: #166534; font-weight: 700; text-transform: uppercase;">Standard Retail (31% Net · 45% Markup)</div>
            <div style="font-size: 11.5px; font-weight: 900; color: #15803d; margin-top: 1px;">৳${formatMoney(retailPrice)} BDT</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px;">
            <div style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">Premium Retail / E-com (41% Net)</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0284c7; margin-top: 1px;">৳${formatMoney(premiumRetailPrice)} BDT</div>
          </div>
        </div>
      </div>
    `}

    <!-- MINIMALIST FOOTER & SIGN-OFF -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px; color: #64748b; line-height: 1.4;">
      <div style="max-width: 490px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">Terms & Conditions:</div>
        <div>• Quotation valid for 7 calendar days from issuance. Subject to freight tariff adjustments.</div>
        <div>• Chargeable weight is calculated on actual gross weight or volumetric weight, whichever is higher.</div>
        <div>• 100% customs clearance handled. Doorstep delivery across all 64 districts in Bangladesh.</div>
      </div>

      <div style="text-align: right; width: 170px;">
        <div style="border-bottom: 1px solid #94a3b8; height: 24px; margin-bottom: 3px;"></div>
        <div style="font-weight: 700; color: #0f172a; font-size: 9px;">Authorized Signature</div>
        <div style="font-size: 8px; color: #64748b;">OMNI Sourcing & Logistics Ltd.</div>
      </div>
    </div>
  `;

  const opt = {
    margin: [6, 6, 6, 6] as [number, number, number, number],
    filename: `OMNI-Quotation-${quoteNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 1.0 },
    html2canvas: { scale: 2.5, useCORS: true, allowTaint: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    enableLinks: true,
  };

  const worker = html2pdf().set(opt).from(element);
  const pdf: any = await (worker as any).toPdf().get('pdf');

  // Enforce strict single page by removing any spilled-over page
  const totalPages = pdf.internal.getNumberOfPages();
  for (let p = totalPages; p > 1; p--) {
    pdf.deletePage(p);
  }

  pdf.save(opt.filename);
}

export interface FolderPdfExportOptions {
  folder: {
    orderNumber: string;
    name: string;
    date: string;
    exchangeRate: number;
    paidAmountTk?: number;
    isDelivered?: boolean;
    note?: string;
    products: FolderProduct[];
  };
  customer?: {
    name: string;
    phone?: string | null;
    address?: string | null;
    group?: string | null;
  };
  freightRate?: number;
  freightUnit?: 'per_gm' | 'per_kg';
  customFilename?: string;
}

/**
 * Generates and triggers download of a comprehensive, branded PDF manifest / quotation for a folder or collection of products.
 */
export async function exportFolderToPdf(options: FolderPdfExportOptions): Promise<void> {
  const { folder, customer, customFilename } = options;
  const freightRate = options.freightRate ?? 1.2;
  const freightUnit = options.freightUnit ?? 'per_gm';
  const exchangeRate = folder.exchangeRate > 0 ? folder.exchangeRate : 20.0;
  const products = folder.products || [];

  // Dynamically import html2pdf to prevent SSR window issues
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  // Pre-load all product images to base64 to avoid CORS restrictions in html2canvas
  const safeImages = await Promise.all(
    products.map(async (p) => {
      const url = p.imageUrl || (p.images && p.images.length > 0 ? p.images[0] : undefined);
      return toSafeDataUrl(url);
    })
  );

  let sumQty = 0;
  let sumTotalRmb = 0;
  let sumProductBdt = 0;
  let sumWeightKg = 0;
  let sumFreightBdt = 0;
  let sumLandedBdt = 0;

  const rowsHtml = products.map((prod, idx) => {
    const qty = Number(prod.quantity || 1);
    const unitPriceRmb = Number(prod.priceRmb || 0);
    const totalRmb = Number(prod.totalRmb || unitPriceRmb * qty);
    const productBdt = Number(prod.equivalentTk || Math.round(totalRmb * exchangeRate));
    const unitWeight = Number(prod.weightKg || 0);
    const totalWeight = unitWeight * qty;

    let lineFreight = 0;
    if (prod.weightPriceTk !== undefined && prod.weightPriceTk > 0) {
      lineFreight = Number(prod.weightPriceTk);
    } else if (unitWeight > 0) {
      lineFreight = freightUnit === 'per_gm'
        ? Math.round(totalWeight * 1000 * freightRate)
        : Math.round(totalWeight * freightRate);
    }

    const landedTotal = productBdt + lineFreight;
    const isCancelled = prod.status === 'cancelled';
    const isReturned = prod.status === 'returned';

    if (!isCancelled) {
      sumQty += qty;
      sumTotalRmb += totalRmb;
      sumProductBdt += productBdt;
      sumWeightKg += totalWeight;
      sumFreightBdt += lineFreight;
      sumLandedBdt += landedTotal;
    }

    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const safeImg = safeImages[idx];
    const imageTag = safeImg
      ? `<img src="${safeImg}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; display: block;" />`
      : `<div style="width: 40px; height: 40px; border-radius: 4px; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">ITEM</div>`;

    const statusBadge = isCancelled
      ? `<span style="font-size: 8px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: #fee2e2; color: #dc2626;">CANCELLED</span>`
      : isReturned
      ? `<span style="font-size: 8px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: #fef3c7; color: #b45309;">RETURNED</span>`
      : `<span style="font-size: 8px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: #dcfce7; color: #15803d;">ACTIVE</span>`;

    return `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; ${isCancelled ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
        <td style="padding: 6px 4px; text-align: center; font-size: 9px; color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 6px 4px; text-align: center;">${imageTag}</td>
        <td style="padding: 6px 6px; font-size: 9px; font-family: monospace; font-weight: 800; color: #dc2626; white-space: nowrap;">
          ${prod.assignedNumber || `${folder.orderNumber}-${prod.sequenceNumber || idx + 1}`}
        </td>
        <td style="padding: 6px 8px; font-size: 9.5px; color: #0f172a; line-height: 1.35;">
          <div style="font-weight: 700; color: #0f172a;">${prod.name || 'Untitled Product'}</div>
          ${prod.note ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Note: ${prod.note}</div>` : ''}
          <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">
            <span style="font-size: 7.5px; font-weight: 700; padding: 1px 4px; border-radius: 3px; background: #e0f2fe; color: #0284c7;">
              ${prod.platform || '1688 / Pinduoduo'}
            </span>
            ${statusBadge}
          </div>
        </td>
        <td style="padding: 6px 6px; text-align: right; font-size: 9px; color: #475569; font-weight: 600; white-space: nowrap;">
          ¥${unitPriceRmb.toFixed(2)}
        </td>
        <td style="padding: 6px 6px; text-align: center; font-size: 9.5px; font-weight: 800; color: #0f172a;">
          ${qty}
        </td>
        <td style="padding: 6px 6px; text-align: right; font-size: 9px; font-weight: 700; color: #0f172a; white-space: nowrap;">
          ¥${totalRmb.toFixed(2)}
        </td>
        <td style="padding: 6px 6px; text-align: right; font-size: 9.5px; font-weight: 800; color: #dc2626; white-space: nowrap;">
          ৳${productBdt.toLocaleString()}
        </td>
        <td style="padding: 6px 6px; text-align: right; font-size: 8.5px; color: #475569; line-height: 1.3; white-space: nowrap;">
          <div>${unitWeight > 0 ? `${Math.round(unitWeight * 1000)}g` : '-'}</div>
          <div style="color: #0284c7; font-weight: 700;">৳${lineFreight.toLocaleString()}</div>
        </td>
        <td style="padding: 6px 6px; text-align: right; font-size: 10px; font-weight: 900; color: #0f172a; white-space: nowrap;">
          ৳${landedTotal.toLocaleString()}
        </td>
      </tr>
    `;
  }).join('');

  const paidAmount = Number(folder.paidAmountTk || 0);
  const dueAmount = Math.max(0, sumLandedBdt - paidAmount);
  const isPaid = paidAmount >= sumLandedBdt && sumLandedBdt > 0;
  const isPartial = paidAmount > 0 && !isPaid;

  const element = document.createElement('div');
  element.style.padding = '20px 24px';
  element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  element.style.color = '#0f172a';
  element.style.background = '#ffffff';
  element.style.width = '750px';
  element.style.boxSizing = 'border-box';
  element.style.lineHeight = '1.4';

  const orderDateStr = folder.date || new Date().toISOString().slice(0, 10);

  element.innerHTML = `
    <style>
      @media print {
        tr { page-break-inside: avoid !important; break-inside: avoid !important; }
        .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      }
    </style>

    <!-- OFFICIAL HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px;">
      <!-- Left: Folder & Customer Reference -->
      <div style="width: 200px; font-size: 9px; color: #475569; line-height: 1.45;">
        <div><strong style="color: #0f172a;">Folder Order Ref:</strong> <span style="font-family: monospace; font-weight: 800; color: #dc2626; font-size: 12px;">${folder.orderNumber}</span></div>
        <div><strong style="color: #0f172a;">Folder Name:</strong> <span style="font-weight: 700;">${folder.name}</span></div>
        <div><strong>Order Date:</strong> ${orderDateStr}</div>
        <div><strong>Status:</strong> ${folder.isDelivered ? '<span style="color:#15803d; font-weight:700;">DELIVERED</span>' : '<span style="color:#0284c7; font-weight:700;">ACTIVE / PROCESSING</span>'}</div>
      </div>

      <!-- Center: Official Logo & Title -->
      <div style="flex: 1; text-align: center; padding: 0 10px;">
        <img src="${OMNI_LOGO_BASE64}" alt="OMNI" style="height: 44px; width: auto; max-width: 200px; object-fit: contain; margin: 0 auto 3px auto; display: block;" />
        <div style="font-size: 11px; font-weight: 900; color: #0f172a; letter-spacing: 1.5px; text-transform: uppercase;">
          CLIENT SOURCING ORDER MANIFEST
        </div>
        <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
          Direct Factory Sourcing · Customs Clearance · Doorstep Delivery across Bangladesh
        </div>
      </div>

      <!-- Right: Facebook Page QR & Customer Quick Info -->
      <div style="width: 200px; display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="text-align: right; font-size: 8.5px; color: #475569; line-height: 1.4;">
            <div><strong style="color: #0f172a; font-size: 10px;">${customer?.name || 'Customer'}</strong></div>
            <div>${customer?.phone || 'No phone'}</div>
            <div style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${customer?.address || 'Bangladesh'}</div>
          </div>
          <div style="padding: 2px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px;">
            <img src="${OMNI_QR_BASE64}" alt="Facebook Page QR" style="width: 40px; height: 40px; display: block; object-fit: contain;" />
          </div>
        </div>
      </div>
    </div>

    <!-- RATE & ORDER SPECIFICATIONS BAR -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div style="font-size: 9px; color: #475569;">
        Exchange Rate Applied: <strong style="color: #0f172a; font-size: 10px;">1 RMB = ৳${exchangeRate.toFixed(2)} BDT</strong>
      </div>
      <div style="font-size: 9px; color: #475569;">
        Air/Sea Freight Rate: <strong style="color: #0284c7; font-size: 10px;">৳${freightRate}/${freightUnit === 'per_gm' ? 'gm' : 'kg'}</strong>
      </div>
      <div style="font-size: 9px; color: #475569;">
        Total Line Items: <strong style="color: #0f172a; font-size: 10px;">${products.length} Products (${sumQty} pcs)</strong>
      </div>
      <div style="font-size: 9px; color: #475569;">
        Total Weight: <strong style="color: #0f172a; font-size: 10px;">${sumWeightKg.toFixed(3)} kg</strong>
      </div>
    </div>

    <!-- PRODUCTS TABLE -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
      <thead>
        <tr style="background: #0f172a; color: #ffffff; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px;">
          <th style="padding: 6px 4px; text-align: center; width: 22px;">#</th>
          <th style="padding: 6px 4px; text-align: center; width: 44px;">Photo</th>
          <th style="padding: 6px 6px; text-align: left; width: 68px;">Code</th>
          <th style="padding: 6px 8px; text-align: left;">Product Details & Specifications</th>
          <th style="padding: 6px 6px; text-align: right; width: 55px;">Unit (¥)</th>
          <th style="padding: 6px 6px; text-align: center; width: 32px;">Qty</th>
          <th style="padding: 6px 6px; text-align: right; width: 58px;">Total (¥)</th>
          <th style="padding: 6px 6px; text-align: right; width: 68px;">Product (৳)</th>
          <th style="padding: 6px 6px; text-align: right; width: 58px;">Freight (৳)</th>
          <th style="padding: 6px 6px; text-align: right; width: 72px;">Landed (৳)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- FINANCIAL SUMMARY CARDS -->
    <div class="avoid-break" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        📊 Financial Summary & Payment Reconciliation
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Product Sourcing Subtotal</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">৳${sumProductBdt.toLocaleString()}</div>
          <div style="font-size: 8px; color: #64748b; margin-top: 1px;">¥${sumTotalRmb.toFixed(2)} RMB</div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Intl Freight Charges</div>
          <div style="font-size: 13px; font-weight: 800; color: #0284c7; margin-top: 2px;">৳${sumFreightBdt.toLocaleString()}</div>
          <div style="font-size: 8px; color: #64748b; margin-top: 1px;">Gross: ${sumWeightKg.toFixed(3)} kg</div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #dc2626; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 8px; color: #dc2626; font-weight: 800; text-transform: uppercase;">Grand Landed Total</div>
          <div style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 2px;">৳${sumLandedBdt.toLocaleString()}</div>
          <div style="font-size: 8px; color: #475569; margin-top: 1px;">All-Inclusive DDP</div>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Outstanding Due</div>
          <div style="font-size: 15px; font-weight: 900; color: ${dueAmount > 0 ? '#dc2626' : '#15803d'}; margin-top: 2px;">
            ৳${dueAmount.toLocaleString()}
          </div>
          <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
            Paid: ৳${paidAmount.toLocaleString()} (${isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'})
          </div>
        </div>
      </div>
    </div>

    <!-- MINIMALIST FOOTER & SIGN-OFF -->
    <div class="avoid-break" style="border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px; color: #64748b; line-height: 1.4; page-break-inside: avoid; break-inside: avoid;">
      <div style="max-width: 490px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">Order Verification Terms:</div>
        <div>• Sourced directly from verified factory suppliers. Complete physical inspection before departure from China hub.</div>
        <div>• Chargeable weight reflects verified gross air/sea freight scales. 100% customs clearance handled.</div>
        <div>• Doorstep courier dispatch to ${customer?.address || 'all 64 districts in Bangladesh'}.</div>
      </div>

      <div style="text-align: right; width: 170px;">
        <div style="border-bottom: 1px solid #94a3b8; height: 20px; margin-bottom: 3px;"></div>
        <div style="font-weight: 700; color: #0f172a; font-size: 9px;">Authorized Inspection & Signature</div>
        <div style="font-size: 8px; color: #64748b;">OMNI Sourcing & Logistics Ltd.</div>
      </div>
    </div>
  `;

  const cleanOrderNum = (folder.orderNumber || 'ORD').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanCustName = (customer?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  const filename = customFilename || `OMNI_${cleanCustName}_${cleanOrderNum}_${orderDateStr}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  await html2pdf().set(opt).from(element).save();
}

