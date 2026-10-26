'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Users,
  Coins,
  Scale,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Sliders,
  FolderDown,
  UserCheck
} from 'lucide-react';
import { Customer } from '@/types/customer';
import {
  exportMonthlyOrdersToExcel,
  exportSingleCustomerOrdersToExcel,
  MonthlyExportOptions
} from '@/lib/excelExport';
import { inputStyle, buttonActionStyle } from './customerStyles';

interface MonthlyExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  showToast: (msg: string) => void;
  defaultMonth?: string;
  defaultCustomerId?: string | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyExcelModal({
  isOpen,
  onClose,
  customers,
  showToast,
  defaultMonth,
  defaultCustomerId
}: MonthlyExcelModalProps) {
  // Extract all distinct months found across all customers' orders
  const availableMonths = useMemo(() => {
    const monthCounts = new Map<string, number>();

    customers.forEach((c) => {
      (c.orders || []).forEach((o) => {
        const dt = o.date_time || o.created_at;
        if (dt && dt.length >= 7) {
          const ym = dt.slice(0, 7); // e.g. "2026-10"
          monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
        }
      });
    });

    const list = Array.from(monthCounts.entries())
      .map(([ym, count]) => {
        const [year, mStr] = ym.split('-');
        const mIdx = parseInt(mStr, 10) - 1;
        const label = mIdx >= 0 && mIdx < 12 ? `${MONTH_NAMES[mIdx]} ${year}` : ym;
        return { ym, label, count };
      })
      .sort((a, b) => b.ym.localeCompare(a.ym));

    return list;
  }, [customers]);

  // Default to first detected month or 2026-10 or current YYYY-MM
  const initialMonth = useMemo(() => {
    if (defaultMonth) return defaultMonth;
    if (availableMonths.length > 0) return availableMonths[0].ym;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [defaultMonth, availableMonths]);

  // Form Configurations
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [shipmentNo, setShipmentNo] = useState<string>('03');
  const [rmbRate, setRmbRate] = useState<string>('20.0');
  const [weightRate, setWeightRate] = useState<string>('1.2');
  const [packgCharge, setPackgCharge] = useState<string>('3.0');
  const [localDelivery, setLocalDelivery] = useState<string>('0.0');
  const [includeBlankRows, setIncludeBlankRows] = useState<boolean>(true);
  const [generateCustomerSheets, setGenerateCustomerSheets] = useState<boolean>(true);
  const [selectedSingleCustomerId, setSelectedSingleCustomerId] = useState<string>(
    defaultCustomerId || (customers[0]?.id || '')
  );
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Month human label
  const monthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Months';
    const found = availableMonths.find((m) => m.ym === selectedMonth);
    if (found) return found.label;
    if (selectedMonth.includes('-')) {
      const [year, mStr] = selectedMonth.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      return mIdx >= 0 && mIdx < 12 ? `${MONTH_NAMES[mIdx]} ${year}` : selectedMonth;
    }
    return selectedMonth;
  }, [selectedMonth, availableMonths]);

  // Compute live metrics for the selected month
  const monthlyStats = useMemo(() => {
    let orderCount = 0;
    let totalBDT = 0;
    let totalAdvance = 0;
    let totalDue = 0;
    let totalWeightGrams = 0;
    const customersWithOrders = new Set<string>();
    const customerList: Customer[] = [];

    const numRmbRate = parseFloat(rmbRate) || 20.0;
    const numWeightRate = parseFloat(weightRate) || 1.2;
    const numPackg = parseFloat(packgCharge) || 3.0;
    const numLDel = parseFloat(localDelivery) || 0.0;

    customers.forEach((c) => {
      let customerHasOrder = false;
      (c.orders || []).forEach((o) => {
        let matches = false;
        if (selectedMonth === 'all') {
          matches = true;
        } else {
          const dt = o.date_time || o.created_at || '';
          matches = dt.startsWith(selectedMonth) || dt.includes(selectedMonth);
        }

        if (matches) {
          orderCount++;
          customerHasOrder = true;
          customersWithOrders.add(c.id);

          const unitBDT = Number(o.price || 0);
          const qty = o.quantity && o.quantity > 0 ? o.quantity : 1;
          const itemBDT = unitBDT * qty;

          const wGrams = o.weight_unit === 'kg' ? Number(o.weight || 0) * 1000 : Number(o.weight || 0);
          const wBDT = Math.round(wGrams * numWeightRate);

          const lineTotal = itemBDT + wBDT + numLDel + numPackg;
          const aPay = Number(o.advance_payment || 0);
          const due = Math.max(0, lineTotal - aPay);

          totalBDT += lineTotal;
          totalAdvance += aPay;
          totalDue += due;
          totalWeightGrams += wGrams;
        }
      });

      if (customerHasOrder) {
        customerList.push(c);
      }
    });

    return {
      orderCount,
      customerCount: customersWithOrders.size,
      customersWithOrders: customerList,
      totalBDT,
      totalAdvance,
      totalDue,
      totalWeightKg: totalWeightGrams / 1000
    };
  }, [customers, selectedMonth, rmbRate, weightRate, packgCharge, localDelivery]);

  if (!isOpen) return null;

  // Options payload for export
  const exportOptions: MonthlyExportOptions = {
    selectedMonth,
    monthLabel: monthLabel.split(' ')[0], // e.g. "October"
    shipmentNo: shipmentNo.trim() || '03',
    rmbRate: parseFloat(rmbRate) || 20.0,
    weightRate: parseFloat(weightRate) || 1.2,
    packgCharge: parseFloat(packgCharge) || 3.0,
    localDelivery: parseFloat(localDelivery) || 0.0,
    includeBlankRows,
    blankRowsCount: 15,
    generateCustomerSheets
  };

  // Handler: Export Full Monthly Workbook (Master Sheet + Individual Customer Tabs)
  const handleExportMonthlyWorkbook = () => {
    setExporting(true);
    try {
      exportMonthlyOrdersToExcel(customers, exportOptions);
      showToast(
        `📗 Monthly Excel Workbook for ${monthLabel} downloaded! (Includes Master Sheet + ${monthlyStats.customerCount} Customer Tabs)`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Excel export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  // Handler: Export Single Customer Sheet
  const handleExportSingleCustomer = (targetCustomerId?: string) => {
    const custId = targetCustomerId || selectedSingleCustomerId;
    const target = customers.find((c) => c.id === custId);
    if (!target) {
      showToast('⚠️ Please select a customer to export.');
      return;
    }

    try {
      exportSingleCustomerOrdersToExcel(target, exportOptions);
      showToast(`📗 Excel Sheet for "${target.name}" downloaded successfully!`);
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Export failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Handler: Export All Customers as Separate Files
  const handleExportAllCustomersSeparately = async () => {
    if (monthlyStats.customersWithOrders.length === 0) {
      showToast('⚠️ No customers with orders in this month to export.');
      return;
    }

    setExporting(true);
    let count = 0;
    try {
      for (const cust of monthlyStats.customersWithOrders) {
        exportSingleCustomerOrdersToExcel(cust, exportOptions);
        count++;
        // Small delay so browser handles downloads gracefully
        await new Promise((res) => setTimeout(res, 250));
      }
      showToast(`📗 Downloaded ${count} individual customer Excel sheets!`);
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Batch export error: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '20px',
          boxShadow: 'var(--neu-flat)',
          border: '1px solid var(--neu-rim)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--neu-rim)',
            background: 'linear-gradient(135deg, rgba(16, 124, 65, 0.12) 0%, var(--bg-card) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #107c41, #0b5e30)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(16, 124, 65, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Monthly Excel Sheet & Customer Ledgers
                </h2>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: 'rgba(16, 124, 65, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 124, 65, 0.3)',
                  }}
                >
                  OMNI Template
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Generates a master monthly sheet with all 21 columns plus separate sheets for each individual customer.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* STEP 1: SELECT MONTH & SHIPMENT NUMBER */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Month Selection */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                <Calendar size={14} style={{ color: '#107c41' }} />
                <span>Select Month to Export</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {availableMonths.map((m) => (
                  <option key={m.ym} value={m.ym}>
                    {m.label} ({m.count} order{m.count !== 1 ? 's' : ''})
                  </option>
                ))}
                <option value="all">All Months Combined ({customers.reduce((acc, c) => acc + (c.orders?.length || 0), 0)} total orders)</option>
              </select>
            </div>

            {/* Shipment Number Input */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                <Layers size={14} style={{ color: '#107c41' }} />
                <span>Shipment Number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 03 or BD-AIR-08"
                value={shipmentNo}
                onChange={(e) => setShipmentNo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* LIVE DATA OVERVIEW CARD */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--neu-rim)',
              padding: '16px 18px',
              boxShadow: 'var(--neu-flat-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Summary for {monthLabel}
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Shipment NO: <strong style={{ color: '#ef4444' }}>{shipmentNo}</strong>
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--neu-rim)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ORDERS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{monthlyStats.orderCount}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>in this month</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--neu-rim)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMERS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6' }}>{monthlyStats.customerCount}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>separate tabs</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--neu-rim)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL VALUE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>৳{Math.round(monthlyStats.totalBDT).toLocaleString()}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>landed + freight</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--neu-rim)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ADVANCE (A PAY)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>৳{Math.round(monthlyStats.totalAdvance).toLocaleString()}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>collected</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--neu-rim)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>REMAINING DUE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: monthlyStats.totalDue > 0 ? '#ef4444' : '#10b981' }}>
                  ৳{Math.round(monthlyStats.totalDue).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>receivable</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--neu-rim)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CARGO WEIGHT</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                  {monthlyStats.totalWeightKg.toFixed(2)} kg
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>air cargo</div>
              </div>
            </div>

            {/* List of customer tabs that will be generated */}
            {monthlyStats.customersWithOrders.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Customer sheets (tabs) to be created in the workbook:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {monthlyStats.customersWithOrders.map((cust) => (
                    <span
                      key={cust.id}
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {cust.name} ({cust.orders.length} order{cust.orders.length !== 1 ? 's' : ''})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CHECKBOXES & TOGGLES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={generateCustomerSheets}
                onChange={(e) => setGenerateCustomerSheets(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#107c41', cursor: 'pointer' }}
              />
              <span><strong>Generate separate Excel sheet (tab) for each customer</strong> in the monthly workbook</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={includeBlankRows}
                onChange={(e) => setIncludeBlankRows(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#107c41', cursor: 'pointer' }}
              />
              <span>Include empty template rows (like rows 9–35 in original sheet) with live formulas</span>
            </label>
          </div>

          {/* ADVANCED PARAMETERS TOGGLE */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedParams(!showAdvancedParams)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#34d399',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0',
              }}
            >
              <Sliders size={14} />
              <span>{showAdvancedParams ? 'Hide Pricing & Freight Defaults' : 'Customize Exchange & Freight Rates (Optional)'}</span>
            </button>

            {showAdvancedParams && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--neu-rim)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    RMB Rate (Exchange)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={rmbRate}
                    onChange={(e) => setRmbRate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Weight Rate (BDT/gm)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={weightRate}
                    onChange={(e) => setWeightRate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Packaging Charge (Packg C)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={packgCharge}
                    onChange={(e) => setPackgCharge(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Local Delivery (L delivery)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={localDelivery}
                    onChange={(e) => setLocalDelivery(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>

          {/* DUAL EXPORT SECTION: FULL WORKBOOK VS INDIVIDUAL CUSTOMER SHEET */}
          <div
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: '#60a5fa' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Export Standalone Single Customer Sheet (.xlsx)
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Need an individual Excel file for just one customer instead of the full monthly workbook? Choose below:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedSingleCustomerId}
                onChange={(e) => setSelectedSingleCustomerId(e.target.value)}
                style={{
                  ...inputStyle,
                  flex: '1 1 240px',
                  cursor: 'pointer',
                }}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.orders?.length || 0} orders)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleExportSingleCustomer()}
                style={{
                  ...buttonActionStyle,
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  padding: '9px 16px',
                }}
              >
                <Download size={15} />
                <span>Download Customer File</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllCustomersSeparately}
                disabled={exporting}
                style={{
                  ...buttonActionStyle,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.82rem',
                  padding: '9px 14px',
                }}
                title="Exports each customer with orders in this month as their own separate .xlsx file"
              >
                <FolderDown size={15} />
                <span>Download All as Separate Files</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--neu-rim)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Exact 21 columns • Live formulas • OMNI red header banner
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...buttonActionStyle,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExportMonthlyWorkbook}
              disabled={exporting}
              style={{
                ...buttonActionStyle,
                background: '#107c41',
                color: '#ffffff',
                fontWeight: 800,
                padding: '10px 22px',
                boxShadow: '0 4px 14px rgba(16, 124, 65, 0.4)',
              }}
            >
              <FileSpreadsheet size={18} />
              <span>
                {exporting ? 'Generating Excel...' : `Download Monthly Workbook (${monthLabel})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
