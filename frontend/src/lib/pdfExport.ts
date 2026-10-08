// Formal Client Quotation PDF Generator using html2pdf.js

interface QuotationData {
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
}

/**
 * Generates and triggers download of a formal, high-res branded PDF quotation.
 */
export async function exportQuotationPdf(data: QuotationData, formatMoney: (n: number) => string) {
  // Dynamically import html2pdf to prevent SSR window issues
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const quoteNumber = `OMNI-Q-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const element = document.createElement('div');
  element.style.padding = '32px';
  element.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  element.style.color = '#1e293b';
  element.style.background = '#ffffff';
  element.style.width = '750px';

  element.innerHTML = `
    <div style="border-bottom: 3px solid #dc2626; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
          OMNI <span style="color: #dc2626;">SOURCING</span>
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: 500;">
          Cross-Border Sourcing & Bangladesh Market Intelligence
        </p>
      </div>
      <div style="text-align: right;">
        <span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
          FORMAL QUOTATION
        </span>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #475569;"><strong>Ref:</strong> ${quoteNumber}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;"><strong>Date:</strong> ${dateStr}</p>
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
        📦 Sourced Product & Order Parameters
      </h3>
      <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 35%;">Product Item:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${data.productTitle}</td>
          <td style="padding: 4px 0; color: #64748b; width: 25%;">Order Quantity:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${data.quantity.toLocaleString()} pcs</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Supplier Price (RMB):</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">¥${data.rmbPrice} (Rate: ৳${data.rmbRate}/RMB)</td>
          <td style="padding: 4px 0; color: #64748b;">Total Batch Weight:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${data.totalWeightKg} kg (${data.weightVal} ${data.weightUnit}/unit)</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Freight Rate:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">৳${data.freightRate} ${data.freightUnit === 'per_gm' ? '/ gram' : '/ kg'}</td>
          <td style="padding: 4px 0; color: #64748b;">Customs Duty & Tax:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${data.dutyPct}% Applied</td>
        </tr>
      </table>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
        💰 Itemized Landed Cost Breakdown (BDT ৳)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 8px 10px; text-align: left; border-radius: 4px 0 0 0;">Cost Element</th>
            <th style="padding: 8px 10px; text-align: right;">Unit Cost (৳)</th>
            <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">Batch Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; color: #334155;">Total Factory Product Cost (¥${data.rmbPrice} × ৳${data.rmbRate})</td>
            <td style="padding: 8px 10px; text-align: right; color: #334155;">৳${formatMoney(Math.round(data.itemPriceBdt / data.quantity))}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.itemPriceBdt)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
            <td style="padding: 8px 10px; color: #334155;">Domestic China Freight & Warehouse Inbound</td>
            <td style="padding: 8px 10px; text-align: right; color: #334155;">৳${data.domesticShipping}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.domesticShippingBdt)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; color: #334155;">Agent Sourcing & Inspection Fee (${data.agentFeePct}%)</td>
            <td style="padding: 8px 10px; text-align: right; color: #334155;">৳${formatMoney(Math.round(data.agentFeeBdt / data.quantity))}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(Math.round(data.agentFeeBdt))}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
            <td style="padding: 8px 10px; color: #334155;">International Freight (${data.totalWeightKg} kg)</td>
            <td style="padding: 8px 10px; text-align: right; color: #334155;">৳${formatMoney(Math.round(data.freightBdt / data.quantity))}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.freightBdt)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; color: #334155;">Customs Duty & Clearance Tax (${data.dutyPct}%)</td>
            <td style="padding: 8px 10px; text-align: right; color: #334155;">৳${formatMoney(Math.round(data.dutyVatBdt / data.quantity))}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(Math.round(data.dutyVatBdt))}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
            <td style="padding: 8px 10px; color: #334155;">Local Overhead / Handling Fees</td>
            <td style="padding: 8px 10px; text-align: right; color: #334155;">৳${formatMoney(Math.round(data.otherCostsBdt / data.quantity))}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">৳${formatMoney(data.otherCostsBdt)}</td>
          </tr>
          <tr style="background: #eff6ff; font-weight: 700; border-top: 2px solid #3b82f6;">
            <td style="padding: 10px; color: #1e3a8a; font-size: 12px;">TOTAL LANDED COST (BDT)</td>
            <td style="padding: 10px; text-align: right; color: #1e3a8a; font-size: 12px;">৳${formatMoney(data.perUnitLandedCost)}</td>
            <td style="padding: 10px; text-align: right; color: #1e3a8a; font-size: 13px;">৳${formatMoney(data.totalLandedCost)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
        📈 Commercial Margin & Profit Projection
      </h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <div style="font-size: 10px; color: #64748b;">Target Selling Price</div>
          <div style="font-size: 14px; font-weight: 800; color: #166534; margin-top: 2px;">৳${formatMoney(data.targetPrice)}</div>
        </div>
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <div style="font-size: 10px; color: #64748b;">Net Profit / Unit</div>
          <div style="font-size: 14px; font-weight: 800; color: #166534; margin-top: 2px;">৳${formatMoney(data.netProfit)}</div>
        </div>
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <div style="font-size: 10px; color: #64748b;">Gross Margin</div>
          <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-top: 2px;">${data.grossMargin}%</div>
        </div>
        <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dcfce7;">
          <div style="font-size: 10px; color: #64748b;">Total Net Profit</div>
          <div style="font-size: 14px; font-weight: 800; color: #16a34a; margin-top: 2px;">৳${formatMoney(data.batchTotalProfit)}</div>
        </div>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 10px; color: #4b5563; text-align: right;">
        *Break-even sales required: <strong>${data.breakEvenUnits} units</strong> | Expected ROI: <strong>${data.roi}%</strong>
      </p>
    </div>

    <div style="border-top: 1px solid #cbd5e1; padding-top: 14px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span>Quotation valid for 7 business days from date of issue.</span><br/>
        <span>Subject to international freight and RMB exchange rate fluctuations.</span>
      </div>
      <div style="text-align: right; border-top: 1px solid #94a3b8; width: 140px; padding-top: 4px;">
        <span>Authorized Signature</span>
      </div>
    </div>
  `;

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `OMNI-Quotation-${quoteNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  };

  await html2pdf().set(opt).from(element).save();
}
