import * as XLSX from 'xlsx';
import { ProductItem, SavedProductList } from '@/components/ProductListBuilder';
import { Customer, CustomerOrder } from '@/types/customer';

/**
 * Calculates optimal column widths based on maximum string lengths in the rows.
 */
function calculateColumnWidths(rows: (string | number | undefined | null)[][]): { wch: number }[] {
  const colWidths: number[] = [];
  rows.forEach((row) => {
    row.forEach((val, colIdx) => {
      const str = val !== null && val !== undefined ? String(val) : '';
      const len = Math.max(str.length, 8);
      colWidths[colIdx] = Math.max(colWidths[colIdx] || 10, Math.min(len + 3, 60));
    });
  });
  return colWidths.map((w) => ({ wch: w }));
}

/**
 * Export a single order / list to a professionally formatted Excel (.xlsx) workbook.
 */
export function exportSingleOrderToExcel(
  order: {
    name: string;
    brand_name?: string;
    date: string;
    items: ProductItem[];
    freight_rate?: number;
    freight_unit?: string;
    total_price_bdt?: number;
    total_weight_kg?: number;
    total_quantity?: number;
    total_weight_price_bdt?: number;
    grand_total_bdt?: number;
    total_paid_bdt?: number;
    total_due_bdt?: number;
    payment_status?: string;
    notes?: string;
  },
  customFilename?: string
): void {
  const wb = XLSX.utils.book_new();

  const freightRate = order.freight_rate ?? 1.2;
  const freightUnit = order.freight_unit ?? 'per_gm';

  // 1. Title & Meta block
  const sheetData: (string | number)[][] = [
    ['OMNI SOURCING PRO - ORDER & SOURCING RECORD'],
    ['Order Name / Client:', order.name || 'Untitled Order'],
    ['Brand / Company:', order.brand_name || 'OMNI SOURCING'],
    ['Order Date:', order.date || new Date().toISOString().slice(0, 10)],
    ['Freight Rate Applied:', `৳${freightRate}/${freightUnit === 'per_gm' ? 'gm' : 'kg'}`],
    ['Notes:', order.notes || 'None'],
    [], // empty row separator
    // 2. Table Headers
    [
      'SL #',
      'Product Title',
      'Platform',
      'Unit Price (BDT ৳)',
      'Quantity (pcs)',
      'Product Total (BDT ৳)',
      'Unit Weight (kg)',
      'Line Weight (kg)',
      'Unit Freight (BDT ৳)',
      'Line Freight (BDT ৳)',
      'Combined Landed Total (BDT ৳)',
      'Advance Paid (BDT ৳)',
      'Balance Due (BDT ৳)',
      'Payment Status',
      'Direct Product Link',
      'Specifications / Details'
    ]
  ];

  let sumProductTotal = 0;
  let sumWeightKg = 0;
  let sumFreightTotal = 0;
  let sumCombinedTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumQty = 0;

  // 3. Item Rows
  order.items.forEach((it, idx) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.price_bdt || 0);
    const lineProduct = unitPrice * qty;

    const unitWeight = Number(it.weight_kg || 0);
    const lineWeight = unitWeight * qty;

    let unitFreight = it.weight_price_bdt !== undefined && it.weight_price_bdt !== null ? Number(it.weight_price_bdt) : undefined;
    if (unitFreight === undefined || unitFreight <= 0) {
      unitFreight = freightUnit === 'per_gm' ? unitWeight * 1000 * freightRate : unitWeight * freightRate;
    }
    const lineFreight = unitFreight * qty;
    const combinedLine = lineProduct + lineFreight;

    const paid = Number(it.paid_amount || 0);
    const due = Math.max(0, combinedLine - paid);
    const status = it.payment_status || (due === 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid');

    sumProductTotal += lineProduct;
    sumWeightKg += lineWeight;
    sumFreightTotal += lineFreight;
    sumCombinedTotal += combinedLine;
    sumPaid += paid;
    sumDue += due;
    sumQty += qty;

    sheetData.push([
      idx + 1,
      it.title || 'Untitled',
      it.platform || '1688',
      Math.round(unitPrice * 100) / 100,
      qty,
      Math.round(lineProduct * 100) / 100,
      Math.round(unitWeight * 1000) / 1000,
      Math.round(lineWeight * 1000) / 1000,
      Math.round(unitFreight * 100) / 100,
      Math.round(lineFreight * 100) / 100,
      Math.round(combinedLine * 100) / 100,
      Math.round(paid * 100) / 100,
      Math.round(due * 100) / 100,
      status.toUpperCase(),
      it.product_url || '',
      it.details || ''
    ]);
  });

  // 4. Totals Row
  sheetData.push([]);
  sheetData.push([
    'TOTALS',
    `Total Items: ${order.items.length}`,
    '',
    '',
    sumQty,
    Math.round(sumProductTotal * 100) / 100,
    '',
    Math.round(sumWeightKg * 1000) / 1000,
    '',
    Math.round(sumFreightTotal * 100) / 100,
    Math.round(sumCombinedTotal * 100) / 100,
    Math.round(sumPaid * 100) / 100,
    Math.round(sumDue * 100) / 100,
    sumDue === 0 && sumPaid > 0 ? 'FULLY PAID' : sumPaid > 0 ? 'PARTIAL' : 'UNPAID',
    '',
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = calculateColumnWidths(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Order Record');

  const sanitizeName = (order.name || 'order').toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const filename = customFilename || `order_${sanitizeName}_${order.date || 'record'}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Export ALL recorded orders and their complete line items into a Master Excel (.xlsx) Workbook.
 */
export function exportAllOrdersToExcel(
  orders: SavedProductList[],
  customFilename?: string
): void {
  if (!orders || orders.length === 0) {
    throw new Error('No orders available to export.');
  }

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: MASTER ORDERS SUMMARY
  // ==========================================
  const summaryData: (string | number)[][] = [
    ['OMNI SOURCING PRO - MASTER ORDERS RECORD & SUMMARY'],
    ['Generated On:', new Date().toLocaleString()],
    ['Total Recorded Orders:', orders.length],
    [],
    [
      'Order #',
      'Order / Client Name',
      'Brand / Tag',
      'Order Date',
      'Unique Items',
      'Total Quantity (pcs)',
      'Total Weight (kg)',
      'Product Subtotal (BDT ৳)',
      'Freight Cost (BDT ৳)',
      'Grand Total Landed (BDT ৳)',
      'Advance Paid (BDT ৳)',
      'Balance Due (BDT ৳)',
      'Payment Status',
      'Freight Rate Applied',
      'Notes'
    ]
  ];

  let grandProductTotal = 0;
  let grandFreightTotal = 0;
  let grandLandedTotal = 0;
  let grandPaidTotal = 0;
  let grandDueTotal = 0;
  let grandWeightKg = 0;
  let grandPcs = 0;

  orders.forEach((ord, idx) => {
    const productTotal = Number(ord.total_price_bdt || 0);
    const freightTotal = Number(ord.total_weight_price_bdt || 0);
    const landedTotal = Number(ord.grand_total_bdt || (productTotal + freightTotal));
    const paid = Number(ord.total_paid_bdt || 0);
    const due = ord.total_due_bdt !== undefined ? Number(ord.total_due_bdt) : Math.max(0, landedTotal - paid);
    const weight = Number(ord.total_weight_kg || 0);
    const pcs = Number(ord.total_quantity || 0);
    const status = (ord.payment_status || (due === 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid')).toUpperCase();

    grandProductTotal += isNaN(productTotal) ? 0 : productTotal;
    grandFreightTotal += isNaN(freightTotal) ? 0 : freightTotal;
    grandLandedTotal += isNaN(landedTotal) ? 0 : landedTotal;
    grandPaidTotal += isNaN(paid) ? 0 : paid;
    grandDueTotal += isNaN(due) ? 0 : due;
    grandWeightKg += isNaN(weight) ? 0 : weight;
    grandPcs += isNaN(pcs) ? 0 : pcs;

    summaryData.push([
      idx + 1,
      ord.name || 'Untitled Order',
      ord.brand_name || 'OMNI SOURCING',
      ord.date || '',
      ord.items?.length || ord.total_items_count || 0,
      pcs,
      Math.round(weight * 1000) / 1000,
      Math.round(productTotal * 100) / 100,
      Math.round(freightTotal * 100) / 100,
      Math.round(landedTotal * 100) / 100,
      Math.round(paid * 100) / 100,
      Math.round(due * 100) / 100,
      status,
      ord.freight_rate ? `৳${ord.freight_rate}/${ord.freight_unit || 'per_gm'}` : 'Default',
      ord.notes || ''
    ]);
  });

  // Summary Totals
  summaryData.push([]);
  summaryData.push([
    'MASTER TOTALS',
    `Total Orders: ${orders.length}`,
    '',
    '',
    '',
    grandPcs,
    Math.round(grandWeightKg * 1000) / 1000,
    Math.round(grandProductTotal * 100) / 100,
    Math.round(grandFreightTotal * 100) / 100,
    Math.round(grandLandedTotal * 100) / 100,
    Math.round(grandPaidTotal * 100) / 100,
    Math.round(grandDueTotal * 100) / 100,
    grandDueTotal === 0 && grandPaidTotal > 0 ? 'ALL PAID' : grandDueTotal > 0 ? 'OUTSTANDING DUE' : 'UNPAID',
    '',
    ''
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = calculateColumnWidths(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Orders Summary');

  // ==========================================
  // SHEET 2: ALL ORDER LINE ITEMS
  // ==========================================
  const itemsData: (string | number)[][] = [
    ['OMNI SOURCING PRO - ALL ORDER LINE ITEMS DETAILED RECORD'],
    ['All items across every recorded order'],
    [],
    [
      'Order Ref',
      'Order Date',
      'Item #',
      'Product Title',
      'Platform',
      'Unit Price (BDT ৳)',
      'Quantity (pcs)',
      'Line Product Total (BDT ৳)',
      'Unit Weight (kg)',
      'Line Weight (kg)',
      'Unit Freight (BDT ৳)',
      'Line Freight (BDT ৳)',
      'Combined Landed Total (BDT ৳)',
      'Advance Paid (BDT ৳)',
      'Balance Due (BDT ৳)',
      'Payment Status',
      'Direct Product Link',
      'Item Notes / Specs'
    ]
  ];

  orders.forEach((ord) => {
    const rate = ord.freight_rate ?? 1.2;
    const unit = ord.freight_unit ?? 'per_gm';

    (ord.items || []).forEach((it, itIdx) => {
      const qty = Number(it.quantity || 1);
      const unitPrice = Number(it.price_bdt || 0);
      const lineProduct = unitPrice * qty;

      const unitWeight = Number(it.weight_kg || 0);
      const lineWeight = unitWeight * qty;

      let unitFreight = it.weight_price_bdt !== undefined && it.weight_price_bdt !== null ? Number(it.weight_price_bdt) : undefined;
      if (unitFreight === undefined || unitFreight <= 0) {
        unitFreight = unit === 'per_gm' ? unitWeight * 1000 * rate : unitWeight * rate;
      }
      const lineFreight = unitFreight * qty;
      const combinedLine = lineProduct + lineFreight;

      const paid = Number(it.paid_amount || 0);
      const due = Math.max(0, combinedLine - paid);
      const status = (it.payment_status || (due === 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid')).toUpperCase();

      itemsData.push([
        ord.name || 'Untitled Order',
        ord.date || '',
        itIdx + 1,
        it.title || 'Untitled Product',
        it.platform || '1688',
        Math.round(unitPrice * 100) / 100,
        qty,
        Math.round(lineProduct * 100) / 100,
        Math.round(unitWeight * 1000) / 1000,
        Math.round(lineWeight * 1000) / 1000,
        Math.round(unitFreight * 100) / 100,
        Math.round(lineFreight * 100) / 100,
        Math.round(combinedLine * 100) / 100,
        Math.round(paid * 100) / 100,
        Math.round(due * 100) / 100,
        status,
        it.product_url || '',
        it.details || ''
      ]);
    });
  });

  const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
  wsItems['!cols'] = calculateColumnWidths(itemsData);
  XLSX.utils.book_append_sheet(wb, wsItems, 'All Line Items');

  // ==========================================
  // SHEET 3: DUE & OUTSTANDING BALANCES
  // ==========================================
  const dueOrders = orders.filter((o) => {
    const due = o.total_due_bdt !== undefined ? o.total_due_bdt : Math.max(0, (o.grand_total_bdt || o.total_price_bdt) - (o.total_paid_bdt || 0));
    return due > 0;
  });

  if (dueOrders.length > 0) {
    const dueData: (string | number)[][] = [
      ['OMNI SOURCING PRO - PENDING DUES & COLLECTION RECORD'],
      ['Orders with outstanding customer balance'],
      [],
      [
        'Order / Client Name',
        'Brand / Tag',
        'Order Date',
        'Total Items',
        'Total Qty',
        'Grand Landed Total (BDT ৳)',
        'Advance Collected (BDT ৳)',
        'OUTSTANDING DUE (BDT ৳)',
        'Payment Status',
        'Contact / Notes'
      ]
    ];

    let sumDueOnly = 0;
    dueOrders.forEach((ord) => {
      const landed = Number(ord.grand_total_bdt || ord.total_price_bdt || 0);
      const paid = Number(ord.total_paid_bdt || 0);
      const due = ord.total_due_bdt !== undefined ? Number(ord.total_due_bdt) : Math.max(0, landed - paid);
      sumDueOnly += isNaN(due) ? 0 : due;

      dueData.push([
        ord.name,
        ord.brand_name || '',
        ord.date,
        ord.total_items_count || ord.items?.length || 0,
        ord.total_quantity || 0,
        Math.round(landed * 100) / 100,
        Math.round(paid * 100) / 100,
        Math.round(due * 100) / 100,
        (ord.payment_status || 'PARTIAL').toUpperCase(),
        ord.notes || ''
      ]);
    });

    dueData.push([]);
    dueData.push([
      'TOTAL PENDING DUE',
      '',
      '',
      '',
      '',
      '',
      '',
      Math.round(sumDueOnly * 100) / 100,
      'COLLECTION REQUIRED',
      ''
    ]);

    const wsDue = XLSX.utils.aoa_to_sheet(dueData);
    wsDue['!cols'] = calculateColumnWidths(dueData);
    XLSX.utils.book_append_sheet(wb, wsDue, 'Outstanding Dues');
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `omni_all_orders_master_record_${todayStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// ============================================================================
// TEMPLATE-ACCURATE MONTHLY & CUSTOMER EXCEL GENERATION
// Strictly matches the OMNI shipment sheet layout provided by the user:
// Header: Month : <Month> | OMNI | Shipment NO : <No>
// 21 Exact Columns with live Excel formulas for BDT, W BDT, Total, due, and SUMs
// ============================================================================

export interface MonthlyExportOptions {
  selectedMonth: string; // e.g. "2026-10" or "all"
  monthLabel?: string; // e.g. "October" or "October 2026"
  shipmentNo?: string; // default "03"
  rmbRate?: number; // default 20.0
  weightRate?: number; // default 1.2 BDT/gm
  packgCharge?: number; // default 3.0
  localDelivery?: number; // default 0.0
  includeBlankRows?: boolean; // default true
  blankRowsCount?: number; // default 15
  generateCustomerSheets?: boolean; // default true (creates a separate tab for each customer)
  customFilename?: string;
}

export const OMNI_TEMPLATE_HEADERS = [
  'SL',
  'Customer name',
  'Product Photo',
  'Name & Details',
  'product link',
  'Quantity',
  'RMB',
  'RMB rate',
  'BDT',
  'Weight (g)',
  'weight rat',
  'W BDT',
  'L delivery',
  'Packg C',
  'Total',
  'A pay',
  'due',
  'Address',
  'Delivery Status',
  'Orderd on',
  'DD'
];

export const OMNI_TEMPLATE_COL_WIDTHS = [
  { wch: 6 },  // SL
  { wch: 22 }, // Customer name
  { wch: 16 }, // Product Photo
  { wch: 32 }, // Name & Details
  { wch: 26 }, // product link
  { wch: 9 },  // Quantity
  { wch: 9 },  // RMB
  { wch: 10 }, // RMB rate
  { wch: 10 }, // BDT
  { wch: 12 }, // Weight (g)
  { wch: 11 }, // weight rat
  { wch: 10 }, // W BDT
  { wch: 11 }, // L delivery
  { wch: 9 },  // Packg C
  { wch: 11 }, // Total
  { wch: 9 },  // A pay
  { wch: 9 },  // due
  { wch: 34 }, // Address
  { wch: 16 }, // Delivery Status
  { wch: 13 }, // Orderd on
  { wch: 13 }  // DD
];

interface OrderWithCustomer {
  order: CustomerOrder;
  customer: Customer;
}

function sanitizeSheetName(name: string, existingNames: Set<string>): string {
  let clean = name.replace(/[\\/?*:[\]]/g, '').trim().slice(0, 28) || 'Customer';
  let finalName = clean;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${clean.slice(0, 24)} (${counter})`;
    counter++;
  }
  existingNames.add(finalName.toLowerCase());
  return finalName;
}

function resolveMonthLabel(selectedMonth: string, explicitLabel?: string): string {
  if (explicitLabel) return explicitLabel;
  if (!selectedMonth || selectedMonth === 'all') return 'October';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (selectedMonth.includes('-')) {
    const parts = selectedMonth.split('-');
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      return monthNames[m - 1];
    }
  }
  return selectedMonth;
}

/**
 * Builds a single worksheet strictly matching the user's template.
 */
function buildTemplateWorksheet(
  ordersWithCustomer: OrderWithCustomer[],
  options: MonthlyExportOptions,
  customerHeaderInfo?: { name: string; phone: string; address?: string | null }
): XLSX.WorkSheet {
  const monthLabel = resolveMonthLabel(options.selectedMonth, options.monthLabel);
  const shipmentNo = options.shipmentNo || '03';
  const rmbRate = options.rmbRate ?? 20.0;
  const weightRate = options.weightRate ?? 1.2;
  const packgCharge = options.packgCharge ?? 3.0;
  const localDelivery = options.localDelivery ?? 0.0;

  // Row 1 (index 0): Header Banner
  const row1 = new Array(21).fill('');
  row1[0] = `Month : ${monthLabel}`;
  row1[8] = 'OMNI'; // Col I (Center)
  row1[18] = `Shipment NO : ${shipmentNo}`; // Col S (Right)

  // Row 2 (index 1): 21 Column Headers
  const row2 = [...OMNI_TEMPLATE_HEADERS];

  const sheetRows: (string | number)[][] = [row1, row2];

  // Populate actual data rows starting at Row 3
  ordersWithCustomer.forEach((item, idx) => {
    const { order, customer } = item;
    const sl = idx + 1;
    const custName = customer.name || '';
    const photo = order.product_image || '';
    const details = order.notes ? `${order.product_name} (${order.notes})` : order.product_name;
    const link = order.product_link || '';
    const qty = order.quantity && order.quantity > 0 ? order.quantity : 1;

    // Price / RMB: if unit price is BDT, convert to RMB at rmbRate
    const unitPriceBDT = Number(order.price || 0);
    const unitRMB = unitPriceBDT > 0 ? Math.round((unitPriceBDT / rmbRate) * 10) / 10 : 0;
    const lineBDT = Math.round(unitRMB * rmbRate * qty);

    // Weight in grams:
    const rawWeight = Number(order.weight || 0);
    const weightGrams = order.weight_unit === 'kg'
      ? Math.round(rawWeight * 1000)
      : Math.round(rawWeight);
    const lineWeightGrams = weightGrams;
    const lineWBdt = Math.round(lineWeightGrams * weightRate);

    const lineTotal = lineBDT + lineWBdt + localDelivery + packgCharge;
    const aPay = Number(order.advance_payment || 0);
    const due = Math.max(0, lineTotal - aPay);

    const address = customer.address || '';
    const status = order.is_delivered
      ? 'Delivered'
      : order.is_cancelled
      ? 'Cancelled'
      : 'Pending';
    const orderedOn = order.date_time ? order.date_time.slice(0, 10) : '';
    const dd = order.is_delivered && order.updated_at ? order.updated_at.slice(0, 10) : '';

    sheetRows.push([
      sl,
      custName,
      photo ? '#UNKNOWN!' : '',
      details,
      link,
      qty,
      unitRMB,
      rmbRate,
      lineBDT,
      lineWeightGrams,
      weightRate,
      lineWBdt,
      localDelivery,
      packgCharge,
      lineTotal,
      aPay,
      due,
      address,
      status,
      orderedOn,
      dd
    ]);
  });

  const ordersCount = ordersWithCustomer.length;
  const includeBlank = options.includeBlankRows !== false;
  // Pad blank template rows up to row 35 or (ordersCount + blankRowsCount)
  const targetTotalRows = includeBlank
    ? Math.max(35, ordersCount + (options.blankRowsCount ?? 15))
    : ordersCount;

  for (let r = ordersCount + 1; r <= targetTotalRows; r++) {
    sheetRows.push([
      r,
      '',
      '',
      '',
      '',
      1,           // Quantity
      0,           // RMB
      rmbRate,     // RMB rate
      0,           // BDT
      0,           // Weight (g)
      weightRate,  // weight rat
      0,           // W BDT
      localDelivery,
      packgCharge,
      packgCharge, // Total = 0 + 0 + 0 + 3 = 3
      0,           // A pay
      packgCharge, // due = 3 - 0 = 3
      '',
      '',
      '',
      ''
    ]);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  // Set formulas and formats on rows (row 3 to end)
  const totalRowsCount = sheetRows.length;
  for (let r = 3; r <= totalRowsCount; r++) {
    const isBlankRow = r > ordersCount + 2;
    const rowIdx = r;
    // Col I: BDT = Quantity * RMB * RMB rate
    ws[`I${rowIdx}`] = {
      t: 'n',
      v: isBlankRow ? 0 : Number(ws[`I${rowIdx}`]?.v ?? 0),
      f: `F${rowIdx}*G${rowIdx}*H${rowIdx}`
    };
    // Col L: W BDT = Weight (g) * weight rat
    ws[`L${rowIdx}`] = {
      t: 'n',
      v: isBlankRow ? 0 : Number(ws[`L${rowIdx}`]?.v ?? 0),
      f: `J${rowIdx}*K${rowIdx}`
    };
    // Col O: Total = BDT + W BDT + L delivery + Packg C
    ws[`O${rowIdx}`] = {
      t: 'n',
      v: isBlankRow ? packgCharge : Number(ws[`O${rowIdx}`]?.v ?? packgCharge),
      f: `I${rowIdx}+L${rowIdx}+M${rowIdx}+N${rowIdx}`
    };
    // Col Q: due = Total - A pay
    ws[`Q${rowIdx}`] = {
      t: 'n',
      v: isBlankRow ? packgCharge : Number(ws[`Q${rowIdx}`]?.v ?? packgCharge),
      f: `O${rowIdx}-P${rowIdx}`
    };

    // Hyperlink in Col E if valid URL
    const linkVal = ws[`E${rowIdx}`]?.v;
    if (linkVal && typeof linkVal === 'string' && (linkVal.startsWith('http://') || linkVal.startsWith('https://'))) {
      ws[`E${rowIdx}`].l = { Target: linkVal };
    }
  }

  // Add Summary Totals Row
  const totalsRowIdx = totalRowsCount + 1;
  const startRow = 3;
  const endRow = ordersCount > 0 ? ordersCount + 2 : startRow;

  const totalsRow = new Array(21).fill('');
  totalsRow[0] = 'TOTALS';
  totalsRow[1] = customerHeaderInfo
    ? `Customer: ${customerHeaderInfo.name} (${ordersCount} Orders)`
    : `Total Month Orders: ${ordersCount}`;

  XLSX.utils.sheet_add_aoa(ws, [totalsRow], { origin: `A${totalsRowIdx}` });

  // Live Excel SUM formulas for totals
  ws[`F${totalsRowIdx}`] = { t: 'n', f: `SUM(F${startRow}:F${endRow})` };
  ws[`I${totalsRowIdx}`] = { t: 'n', f: `SUM(I${startRow}:I${endRow})` };
  ws[`J${totalsRowIdx}`] = { t: 'n', f: `SUM(J${startRow}:J${endRow})` };
  ws[`L${totalsRowIdx}`] = { t: 'n', f: `SUM(L${startRow}:L${endRow})` };
  ws[`O${totalsRowIdx}`] = { t: 'n', f: `SUM(O${startRow}:O${endRow})` };
  ws[`P${totalsRowIdx}`] = { t: 'n', f: `SUM(P${startRow}:P${endRow})` };
  ws[`Q${totalsRowIdx}`] = { t: 'n', f: `SUM(Q${startRow}:Q${endRow})` };

  // Set column widths
  ws['!cols'] = [...OMNI_TEMPLATE_COL_WIDTHS];

  // Set merges for Row 1 Banner
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },   // A1:D1 -> "Month : October"
    { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } },   // H1:J1 -> "OMNI"
    { s: { r: 0, c: 18 }, e: { r: 0, c: 20 } }, // S1:U1 -> "Shipment NO : 03"
    { s: { r: totalsRowIdx - 1, c: 1 }, e: { r: totalsRowIdx - 1, c: 4 } }
  ];

  return ws;
}

/**
 * Export Monthly Excel Workbook:
 * 1. Sheet 1: Master Monthly Sheet containing all orders for that month across all customers.
 * 2. Sheet 2..N: Individual separate sheets for each customer with their orders.
 */
export function exportMonthlyOrdersToExcel(
  customers: Customer[],
  options: MonthlyExportOptions
): void {
  if (!customers || customers.length === 0) {
    throw new Error('No customer profiles available to export.');
  }

  const selectedMonth = options.selectedMonth || 'all';
  const monthLabel = resolveMonthLabel(selectedMonth, options.monthLabel);
  const shipmentNo = options.shipmentNo || '03';

  // 1. Gather all orders matching month across all customers
  const allOrdersWithCustomer: OrderWithCustomer[] = [];

  customers.forEach((customer) => {
    (customer.orders || []).forEach((order) => {
      let matches = false;
      if (selectedMonth === 'all') {
        matches = true;
      } else {
        const dt = order.date_time || order.created_at || '';
        matches = dt.startsWith(selectedMonth) || dt.includes(selectedMonth);
      }
      if (matches) {
        allOrdersWithCustomer.push({ order, customer });
      }
    });
  });

  const wb = XLSX.utils.book_new();
  const existingSheetNames = new Set<string>();

  // SHEET 1: Master Monthly Sheet
  const masterSheetName = sanitizeSheetName(`Month - ${monthLabel}`, existingSheetNames);
  const wsMaster = buildTemplateWorksheet(allOrdersWithCustomer, options);
  XLSX.utils.book_append_sheet(wb, wsMaster, masterSheetName);

  // INDIVIDUAL CUSTOMER SHEETS (Tabs)
  if (options.generateCustomerSheets !== false) {
    const customerMap = new Map<string, { customer: Customer; orders: CustomerOrder[] }>();

    customers.forEach((c) => {
      customerMap.set(c.id, { customer: c, orders: [] });
    });

    allOrdersWithCustomer.forEach(({ order, customer }) => {
      const entry = customerMap.get(customer.id);
      if (entry) {
        entry.orders.push(order);
      }
    });

    // Create a tab for each customer who has orders in this month
    customerMap.forEach(({ customer, orders }) => {
      if (orders.length > 0) {
        const custItems: OrderWithCustomer[] = orders.map((o) => ({ order: o, customer }));
        const custSheetName = sanitizeSheetName(customer.name, existingSheetNames);
        const wsCust = buildTemplateWorksheet(custItems, options, {
          name: customer.name,
          phone: customer.phone,
          address: customer.address
        });
        XLSX.utils.book_append_sheet(wb, wsCust, custSheetName);
      }
    });
  }

  const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = options.customFilename || `OMNI_Monthly_Orders_${cleanMonth}_Shipment_${shipmentNo}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export a single customer's orders into a standalone Excel workbook
 * formatted strictly in the user's template layout.
 */
export function exportSingleCustomerOrdersToExcel(
  customer: Customer,
  options?: Partial<MonthlyExportOptions>
): void {
  const selectedMonth = options?.selectedMonth || 'all';
  const monthLabel = resolveMonthLabel(selectedMonth, options?.monthLabel);
  const shipmentNo = options?.shipmentNo || '03';

  const fullOptions: MonthlyExportOptions = {
    selectedMonth,
    monthLabel,
    shipmentNo,
    rmbRate: options?.rmbRate ?? 20.0,
    weightRate: options?.weightRate ?? 1.2,
    packgCharge: options?.packgCharge ?? 3.0,
    localDelivery: options?.localDelivery ?? 0.0,
    includeBlankRows: options?.includeBlankRows ?? true,
    blankRowsCount: options?.blankRowsCount ?? 15,
    generateCustomerSheets: false
  };

  const matchingOrders = (customer.orders || []).filter((order) => {
    if (selectedMonth === 'all') return true;
    const dt = order.date_time || order.created_at || '';
    return dt.startsWith(selectedMonth) || dt.includes(selectedMonth);
  });

  const custItems: OrderWithCustomer[] = (matchingOrders.length > 0 ? matchingOrders : customer.orders || []).map((o) => ({
    order: o,
    customer
  }));

  const wb = XLSX.utils.book_new();
  const existingSheetNames = new Set<string>();

  const sheetName = sanitizeSheetName(customer.name, existingSheetNames);
  const ws = buildTemplateWorksheet(custItems, fullOptions, {
    name: customer.name,
    phone: customer.phone,
    address: customer.address
  });

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanCustName = customer.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = options?.customFilename || `OMNI_Customer_${cleanCustName}_${cleanMonth}.xlsx`;

  XLSX.writeFile(wb, filename);
}
