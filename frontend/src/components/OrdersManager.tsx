'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Package, 
  Scale, 
  Coins, 
  Wallet, 
  FolderOpen,
  ArrowUpDown,
  Building,
  Calendar,
  Layers,
  Edit3
} from 'lucide-react';
import { SavedProductList, ProductItem } from '@/components/ProductListBuilder';
import { exportAllOrdersToExcel, exportSingleOrderToExcel } from '@/lib/excelExport';
import { customerApi, getAuthHeaders } from '@/services/customerApi';
import { Customer } from '@/types/customer';
import MonthlyExcelModal from '@/components/customers/MonthlyExcelModal';
import ViewModeToggle, { ViewMode } from '@/components/shared/ViewModeToggle';

interface OrdersManagerProps {
  apiUrl: string;
  showToast: (msg: string) => void;
  onOpenOrderInBuilder: (order: SavedProductList) => void;
  onCreateNewOrder: () => void;
}

export default function OrdersManager({
  apiUrl,
  showToast,
  onOpenOrderInBuilder,
  onCreateNewOrder
}: OrdersManagerProps) {
  const [orders, setOrders] = useState<SavedProductList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'due_desc'>('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showMonthlyExcelModal, setShowMonthlyExcelModal] = useState<boolean>(false);

  // Fetch all saved orders/lists from backend API & localStorage fallback
  const fetchOrders = async () => {
    setLoading(true);
    try {
      let serverLists: SavedProductList[] = [];
      try {
        const res = await fetch(`${apiUrl}/product-lists`, {
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          serverLists = await res.json();
        }
      } catch (err) {
        console.warn('API fetch failed, falling back to local storage:', err);
      }

      // Check localStorage for offline/client lists
      let localLists: SavedProductList[] = [];
      try {
        const stored = localStorage.getItem('omni_saved_product_lists');
        if (stored) {
          localLists = JSON.parse(stored);
        }
      } catch {}

      // Merge unique by ID
      const map = new Map<string, SavedProductList>();
      [...serverLists, ...localLists].forEach((item) => {
        if (item.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      });

      const merged = Array.from(map.values());
      setOrders(merged);

      // Also load customer profiles for template-accurate monthly export
      try {
        const custs = await customerApi.getCustomers(apiUrl);
        setCustomers(custs);
      } catch {}
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast('⚠️ Could not load order records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [apiUrl]);

  // Delete an order record
  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this order record?')) return;

    try {
      await fetch(`${apiUrl}/product-lists/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      }).catch(() => {});
      const updated = orders.filter((o) => o.id !== id);
      setOrders(updated);
      try {
        localStorage.setItem('omni_saved_product_lists', JSON.stringify(updated));
      } catch {}
      showToast('🗑️ Order record deleted successfully');
    } catch {
      showToast('❌ Failed to delete order');
    }
  };

  // Filter & Sort
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = 
          !query ||
          o.name?.toLowerCase().includes(query) ||
          o.brand_name?.toLowerCase().includes(query) ||
          o.date?.toLowerCase().includes(query) ||
          o.notes?.toLowerCase().includes(query) ||
          o.items?.some((it) => it.title?.toLowerCase().includes(query));

        if (!matchesQuery) return false;

        const paid = o.total_paid_bdt || 0;
        const grand = o.grand_total_bdt || o.total_price_bdt || 0;
        const due = o.total_due_bdt !== undefined ? o.total_due_bdt : Math.max(0, grand - paid);
        const status = o.payment_status || (due === 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid');

        if (statusFilter === 'all') return true;
        if (statusFilter === 'paid') return status === 'paid';
        if (statusFilter === 'partial') return status === 'partial';
        if (statusFilter === 'unpaid') return status === 'unpaid';
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return (b.date || '').localeCompare(a.date || '');
        }
        if (sortBy === 'date_asc') {
          return (a.date || '').localeCompare(b.date || '');
        }
        if (sortBy === 'total_desc') {
          const totalA = a.grand_total_bdt || a.total_price_bdt || 0;
          const totalB = b.grand_total_bdt || b.total_price_bdt || 0;
          return totalB - totalA;
        }
        if (sortBy === 'due_desc') {
          const dueA = a.total_due_bdt || 0;
          const dueB = b.total_due_bdt || 0;
          return dueB - dueA;
        }
        return 0;
      });
  }, [orders, searchQuery, statusFilter, sortBy]);

  // Overall Ledger Statistics
  const stats = useMemo(() => {
    let totalGrand = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalWeight = 0;
    let totalPcs = 0;
    let totalItems = 0;

    orders.forEach((o) => {
      const grand = Number(o.grand_total_bdt || o.total_price_bdt || 0);
      const paid = Number(o.total_paid_bdt || 0);
      const due = o.total_due_bdt !== undefined ? Number(o.total_due_bdt) : Math.max(0, grand - paid);
      const weightVal = Number(o.total_weight_kg || 0);
      const pcsVal = Number(o.total_quantity || 0);
      const itemsCountVal = Number(o.items?.length || o.total_items_count || 0);

      totalGrand += isNaN(grand) ? 0 : grand;
      totalPaid += isNaN(paid) ? 0 : paid;
      totalDue += isNaN(due) ? 0 : due;
      totalWeight += isNaN(weightVal) ? 0 : weightVal;
      totalPcs += isNaN(pcsVal) ? 0 : pcsVal;
      totalItems += isNaN(itemsCountVal) ? 0 : itemsCountVal;
    });

    return {
      orderCount: orders.length,
      totalGrand,
      totalPaid,
      totalDue,
      totalWeight: Number(totalWeight) || 0,
      totalPcs,
      totalItems
    };
  }, [orders]);

  // 1-Click Master Excel Export
  const handleExportAllToExcel = () => {
    if (orders.length === 0) {
      showToast('⚠️ No order records available to export. Create or save an order first!');
      return;
    }
    try {
      exportAllOrdersToExcel(orders);
      showToast(`📗 Master Excel Sheet downloaded! (${orders.length} orders included across 3 sheets)`);
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Excel export failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Export Single Order to Excel
  const handleExportSingleExcel = (order: SavedProductList, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      exportSingleOrderToExcel(order);
      showToast(`📗 Excel sheet for "${order.name}" downloaded successfully!`);
    } catch (err: any) {
      console.error(err);
      showToast('❌ Export failed');
    }
  };

  return (
    <div className="content-container">
      {/* ------------------------------------------------------------- */}
      {/* HEADER BANNER */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 124, 65, 0.15) 0%, rgba(24, 24, 27, 0.95) 100%)',
        border: '1px solid rgba(16, 124, 65, 0.4)',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              background: '#107c41',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 124, 65, 0.4)'
            }}>
              <FileSpreadsheet size={24} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0, letterSpacing: '-0.02em' }}>
              Orders Record
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #a1a1aa)', margin: 0, maxWidth: '650px' }}>
            Complete record and ledger of all your sourcing orders, client shipments, advance deposits, and outstanding balances with 1-click formatted Excel (.xlsx) export.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowMonthlyExcelModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #107c41, #0b5e30)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 124, 65, 0.4)',
              transition: 'all 0.2s ease'
            }}
            title="Generate monthly orders Excel sheet matching template and separate customer sheets"
          >
            <FileSpreadsheet size={18} />
            <span>Monthly Template Sheet (.xlsx)</span>
          </button>

          <button
            onClick={handleExportAllToExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'var(--bg-surface, #27272a)',
              color: 'var(--text-primary, #ffffff)',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: '1px solid var(--border-color, #3f3f46)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.2s ease'
            }}
            title="Download complete Master Excel Workbook containing all orders and line items"
          >
            <FileSpreadsheet size={18} />
            <span>Master All Orders (.xlsx)</span>
          </button>

          <button
            onClick={fetchOrders}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--bg-surface, #27272a)',
              color: 'var(--text-secondary, #e2e8f0)',
              border: '1px solid var(--border-color, #3f3f46)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Refresh order records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            onClick={onCreateNewOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--omni-red, #dc2626)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Create New Order</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* KPI METRICS OVERVIEW CARDS */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '1.5rem'
      }}>
        {/* Total Orders Card */}
        <div style={{
          background: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recorded Orders
            </span>
            <FolderOpen size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
            {stats.orderCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)', marginTop: '2px' }}>
            {stats.totalPcs} total pcs ({stats.totalItems} unique products)
          </div>
        </div>

        {/* Grand Total Value */}
        <div style={{
          background: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Order Value
            </span>
            <Coins size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
            ৳{Math.round(stats.totalGrand).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)', marginTop: '2px' }}>
            Landed cost + cargo freight
          </div>
        </div>

        {/* Advance Paid */}
        <div style={{
          background: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Advance Collected
            </span>
            <Wallet size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
            ৳{Math.round(stats.totalPaid).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)', marginTop: '2px' }}>
            {stats.totalGrand > 0 ? `${Math.round((stats.totalPaid / stats.totalGrand) * 100)}% collected` : '0%'}
          </div>
        </div>

        {/* Outstanding Due */}
        <div style={{
          background: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Outstanding Due
            </span>
            <AlertCircle size={16} style={{ color: '#f87171' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.totalDue > 0 ? '#f87171' : '#10b981' }}>
            ৳{Math.round(stats.totalDue).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)', marginTop: '2px' }}>
            {stats.totalDue > 0 ? 'Pending collection from buyers' : 'All accounts settled'}
          </div>
        </div>

        {/* Total Cargo Weight */}
        <div style={{
          background: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Weight
            </span>
            <Scale size={16} style={{ color: '#fbbf24' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
            {(Number(stats.totalWeight) || 0).toFixed(2)} kg
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #a1a1aa)', marginTop: '2px' }}>
            Air / Sea logistics volume
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEARCH, FILTER & CONTROLS TOOLBAR */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-card, #18181b)',
        border: '1px solid var(--border-color, #27272a)',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #71717a)' }} />
          <input
            type="text"
            placeholder="Search by order name, client, date, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              background: 'var(--bg-surface, #09090b)',
              border: '1px solid var(--border-color, #27272a)',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #71717a)', marginRight: '4px' }}>Status:</span>
          {(['all', 'paid', 'partial', 'unpaid'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: statusFilter === st ? '#107c41' : 'var(--bg-surface, #27272a)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-secondary, #a1a1aa)',
                transition: 'all 0.15s ease'
              }}
            >
              {st === 'all' ? 'All Orders' : st === 'paid' ? 'Fully Paid' : st === 'partial' ? 'Partial Due' : 'Unpaid'}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} style={{ color: 'var(--text-muted, #71717a)' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'var(--bg-surface, #09090b)',
              border: '1px solid var(--border-color, #27272a)',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="total_desc">Highest Amount</option>
            <option value="due_desc">Highest Due</option>
          </select>

          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ORDERS LIST LEDGER */}
      {/* ------------------------------------------------------------- */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted, #a1a1aa)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Loading your order records...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          background: 'var(--bg-card, #18181b)',
          border: '1px dashed var(--border-color, #3f3f46)',
          borderRadius: '16px',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          color: 'var(--text-secondary, #a1a1aa)'
        }}>
          <FileSpreadsheet size={48} style={{ margin: '0 auto 1rem', color: '#107c41', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', marginBottom: '6px' }}>
            {orders.length === 0 ? 'No Orders Recorded Yet' : 'No Orders Match Your Filters'}
          </h3>
          <p style={{ fontSize: '0.85rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
            {orders.length === 0 
              ? 'Build a sourcing list with items, freight rates, and customer advance in the Product List Builder, then save it to maintain your master order ledger.'
              : 'Try clearing your search query or changing your status filter.'}
          </p>
          {orders.length === 0 ? (
            <button
              onClick={onCreateNewOrder}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#107c41',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Open Product List Builder
            </button>
          ) : (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--bg-surface, #27272a)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.82rem',
                border: '1px solid var(--border-color, #3f3f46)',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredOrders.map((order, orderIdx) => {
            const grandTotal = Number(order.grand_total_bdt || order.total_price_bdt || 0);
            const paid = Number(order.total_paid_bdt || 0);
            const due = order.total_due_bdt !== undefined ? Number(order.total_due_bdt) : Math.max(0, grandTotal - paid);
            const isFullyPaid = due === 0 && paid > 0;
            const isPartial = paid > 0 && due > 0;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                style={{
                  background: 'var(--bg-card, #18181b)',
                  border: isExpanded ? '1px solid #107c41' : '1px solid var(--border-color, #27272a)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {/* Order Row Summary */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(16, 124, 65, 0.05)' : 'transparent'
                  }}
                >
                  {/* Left: Order Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 280px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(16, 124, 65, 0.15)',
                      border: '1px solid rgba(16, 124, 65, 0.3)',
                      color: '#107c41',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>
                      #{orderIdx + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                          {order.name || 'Untitled Order'}
                        </h3>
                        {order.brand_name && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface, #27272a)', color: 'var(--text-muted, #a1a1aa)', fontWeight: 600 }}>
                            {order.brand_name}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: isFullyPaid ? 'rgba(16, 185, 129, 0.15)' : isPartial ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isFullyPaid ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444'
                        }}>
                          {isFullyPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'DUE'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary, #a1a1aa)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} />
                          {order.date || 'No Date'}
                        </span>
                        <span>•</span>
                        <span>{order.total_items_count || order.items?.length || 0} items ({order.total_quantity || 0} pcs)</span>
                        <span>•</span>
                        <span>{Number(order.total_weight_kg || 0).toFixed(2)} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Financials & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                        ৳{Math.round(grandTotal).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Paid: ৳{Math.round(paid).toLocaleString()}</span>
                        {due > 0 && (
                          <span style={{ color: '#f87171', fontWeight: 700 }}>Due: ৳{Math.round(due).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                      {/* Download Excel Sheet for this Order */}
                      <button
                        onClick={(e) => handleExportSingleExcel(order, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          background: '#107c41',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(16, 124, 65, 0.3)'
                        }}
                        title="Download this order as an Excel file (.xlsx)"
                      >
                        <FileSpreadsheet size={15} />
                        <span>Excel</span>
                      </button>

                      {/* Open in Builder */}
                      <button
                        onClick={() => onOpenOrderInBuilder(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          background: 'var(--bg-surface, #27272a)',
                          color: 'var(--text-secondary, #e2e8f0)',
                          border: '1px solid var(--border-color, #3f3f46)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Open and edit in Product List Builder"
                      >
                        <Edit3 size={14} />
                        <span>Edit</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteOrder(order.id, e)}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                        title="Delete order record"
                      >
                        <Trash2 size={15} />
                      </button>

                      {/* Expand / Collapse toggle */}
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        style={{
                          padding: '4px',
                          color: 'var(--text-muted, #71717a)',
                          cursor: 'pointer'
                        }}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Line Items Detail Drawer */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--border-color, #27272a)',
                    background: 'var(--bg-surface, #09090b)',
                    padding: '16px 20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary, #e2e8f0)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Line Items in this Order ({order.items?.length || 0})
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #a1a1aa)' }}>
                        Freight Rate: ৳{order.freight_rate || 1.2}/{order.freight_unit === 'per_gm' ? 'gm' : 'kg'}
                      </div>
                    </div>

                    {(!order.items || order.items.length === 0) ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #71717a)', padding: '10px 0' }}>
                        No individual line items stored in this order header.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color, #27272a)', color: 'var(--text-muted, #71717a)' }}>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>#</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Product Title</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Platform</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Unit Price (৳)</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Weight (kg)</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Freight (৳)</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total (৳)</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((it, idx) => {
                              const qty = it.quantity || 1;
                              const lineProd = (it.price_bdt || 0) * qty;
                              const rate = order.freight_rate ?? 1.2;
                              const unitFreight = it.weight_price_bdt ?? (order.freight_unit === 'per_gm' ? (it.weight_kg || 0) * 1000 * rate : (it.weight_kg || 0) * rate);
                              const lineFreight = unitFreight * qty;
                              const combined = lineProd + lineFreight;

                              return (
                                <tr key={it.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary, #ffffff)' }}>
                                  <td style={{ padding: '8px 10px', color: 'var(--text-muted, #71717a)' }}>{idx + 1}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 600, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {it.title}
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-card, #18181b)' }}>
                                      {it.platform || '1688'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>৳{(it.price_bdt || 0).toLocaleString()}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{qty}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fbbf24' }}>
                                    {(Number(it.weight_kg || 0) * Number(qty || 1)).toFixed(3)}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>৳{Math.round(lineFreight).toLocaleString()}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                                    ৳{Math.round(combined).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    {it.product_url ? (
                                      <a
                                        href={it.product_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center' }}
                                        title="Open product url"
                                      >
                                        <ExternalLink size={14} />
                                      </a>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted, #71717a)' }}>-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {order.notes && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--bg-card, #18181b)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>Order Notes: </span>
                        {order.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '14px',
        }}>
          {filteredOrders.map((order) => {
            const grandTotal = Number(order.grand_total_bdt || order.total_price_bdt || 0);
            const paid = Number(order.total_paid_bdt || 0);
            const due = order.total_due_bdt !== undefined ? Number(order.total_due_bdt) : Math.max(0, grandTotal - paid);
            const isFullyPaid = due === 0 && paid > 0;
            const isPartial = paid > 0 && due > 0;
            const totalKg = order.items.reduce((acc, it) => acc + (it.weight_kg || 0) * (it.quantity || 1), 0);

            return (
              <div
                key={order.id}
                style={{
                  background: 'var(--bg-card, #18181b)',
                  border: '1px solid var(--border-color, #27272a)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Card Top: Order Name, Date & Payment Pill */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #71717a)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <Calendar size={12} />
                        <span>{order.date}</span>
                        {order.brand_name && <span>• {order.brand_name}</span>}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: isFullyPaid
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isPartial
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        color: isFullyPaid ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444',
                        border: `1px solid ${isFullyPaid ? 'rgba(16, 185, 129, 0.3)' : isPartial ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        flexShrink: 0,
                      }}
                    >
                      {isFullyPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                    </span>
                  </div>
                </div>

                {/* Financial Overview Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'var(--bg-surface, #09090b)',
                    border: '1px solid var(--border-color, #27272a)',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #71717a)' }}>Grand Total</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                      ৳{grandTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#10b981' }}>Paid</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                      ৳{paid.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: due > 0 ? '#ef4444' : '#10b981' }}>Due</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: due > 0 ? '#ef4444' : '#10b981' }}>
                      ৳{due.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Footer: Items + Weight + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color, #27272a)', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #71717a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Package size={12} />
                      {order.items.length} items
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#fbbf24' }}>
                      <Scale size={12} />
                      {totalKg.toFixed(2)} kg
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => onOpenOrderInBuilder(order)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'var(--omni-red, #dc2626)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Open in Product List Builder"
                    >
                      <FolderOpen size={13} />
                      <span>Open</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleExportSingleExcel(order, e)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: '#107c41',
                        color: '#fff',
                        border: 'none',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      title="Export single Excel sheet"
                    >
                      <FileSpreadsheet size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteOrder(order.id, e)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface, #09090b)',
                        border: '1px solid var(--border-color, #27272a)',
                        color: '#ef4444',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      title="Delete order"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly Excel Sheet & Customer Ledgers Modal */}
      <MonthlyExcelModal
        isOpen={showMonthlyExcelModal}
        onClose={() => setShowMonthlyExcelModal(false)}
        customers={customers}
        showToast={showToast}
      />
    </div>
  );
}
