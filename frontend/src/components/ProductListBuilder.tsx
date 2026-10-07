'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  FolderOpen, 
  ExternalLink, 
  Edit3, 
  MoveUp, 
  MoveDown, 
  Check, 
  X, 
  Scale, 
  Coins, 
  Package, 
  Calendar, 
  Tag, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Share2,
  Printer,
  Sparkles,
  Layers,
  Info
} from 'lucide-react';

export interface ProductItem {
  id: string;
  title: string;
  details?: string;
  price: number;
  currency: string;
  price_bdt: number;
  weight_kg: number;
  quantity: number;
  image_url?: string;
  product_url?: string;
  platform?: string;
  notes?: string;
}

export interface SavedProductList {
  id: string;
  name: string;
  date: string;
  items: ProductItem[];
  total_price_bdt: number;
  total_weight_kg: number;
  total_items_count: number;
  total_quantity: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductListBuilderProps {
  items: ProductItem[];
  onUpdateItems: (items: ProductItem[]) => void;
  apiUrl: string;
  showToast: (msg: string) => void;
}

export default function ProductListBuilder({
  items,
  onUpdateItems,
  apiUrl,
  showToast
}: ProductListBuilderProps) {
  // Top Header Metadata
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  const [listName, setListName] = useState<string>('My Sourcing Product List');
  const [listDate, setListDate] = useState<string>(getTodayDate());
  const [listNotes, setListNotes] = useState<string>('');
  const [currentListId, setCurrentListId] = useState<string | null>(null);

  // New Item Form State (Sequential Adding)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDetails, setNewDetails] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('500');
  const [newCurrency, setNewCurrency] = useState<'BDT' | 'RMB' | 'USD'>('BDT');
  const [rmbRate, setRmbRate] = useState<string>('20.00');
  const [usdRate, setUsdRate] = useState<string>('120.00');
  
  const [newWeightVal, setNewWeightVal] = useState<string>('0.35');
  const [newWeightUnit, setNewWeightUnit] = useState<'kg' | 'gm'>('kg');
  
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newPlatform, setNewPlatform] = useState<string>('1688');

  // Image Upload File Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItemState, setEditItemState] = useState<Partial<ProductItem>>({});

  // Saved Lists Modal State
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [savedLists, setSavedLists] = useState<SavedProductList[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [savingToServer, setSavingToServer] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Auto-save & restore from localStorage
  useEffect(() => {
    const cachedData = localStorage.getItem('omni_active_product_list');
    if (cachedData && items.length === 0) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          onUpdateItems(parsed.items);
          if (parsed.name) setListName(parsed.name);
          if (parsed.date) setListDate(parsed.date);
          if (parsed.notes) setListNotes(parsed.notes);
          if (parsed.id) setCurrentListId(parsed.id);
        }
      } catch (e) {
        console.error('Failed to load local cached product list:', e);
      }
    }
  }, []);

  useEffect(() => {
    const listPayload = {
      id: currentListId,
      name: listName,
      date: listDate,
      notes: listNotes,
      items
    };
    localStorage.setItem('omni_active_product_list', JSON.stringify(listPayload));
  }, [listName, listDate, listNotes, items, currentListId]);

  // Calculate Price in BDT
  const calculatePriceBdt = (priceVal: number, curr: string): number => {
    if (curr === 'RMB') {
      return priceVal * (Number(rmbRate) || 20.00);
    } else if (curr === 'USD') {
      return priceVal * (Number(usdRate) || 120.00);
    }
    return priceVal;
  };

  // Convert weight to KG
  const calculateWeightKg = (val: number, unit: 'kg' | 'gm'): number => {
    return unit === 'gm' ? val / 1000.0 : val;
  };

  // Sequential Product Add Handler
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('⚠️ Please enter a product title!');
      return;
    }

    const priceNum = Math.max(0, Number(newPrice) || 0);
    const priceBdt = calculatePriceBdt(priceNum, newCurrency);
    const weightNum = Math.max(0, Number(newWeightVal) || 0);
    const weightKg = calculateWeightKg(weightNum, newWeightUnit);
    const qty = Math.max(1, newQuantity || 1);

    const newItem: ProductItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTitle.trim(),
      details: newDetails.trim(),
      price: priceNum,
      currency: newCurrency,
      price_bdt: priceBdt,
      weight_kg: Number(weightKg.toFixed(3)),
      quantity: qty,
      product_url: newProductUrl.trim() || undefined,
      image_url: newImageUrl.trim() || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80',
      platform: newPlatform
    };

    onUpdateItems([...items, newItem]);
    showToast(`✅ Added "${newItem.title}" to product list!`);

    // Reset form
    setNewTitle('');
    setNewDetails('');
    setNewPrice('500');
    setNewProductUrl('');
    setNewImageUrl('');
    setNewQuantity(1);
  };

  // Image Upload File Reader
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setNewImageUrl(reader.result as string);
          showToast('📸 Product image uploaded!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    onUpdateItems(filtered);
    showToast('🗑️ Item removed from list');
  };

  // Reorder Items
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === items.length - 1)) {
      return;
    }
    const updated = [...items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onUpdateItems(updated);
  };

  // Quantity Change
  const handleQuantityChange = (id: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = items.map((item) => (item.id === id ? { ...item, quantity: qty } : item));
    onUpdateItems(updated);
  };

  // Inline Edit Item
  const startEdit = (item: ProductItem) => {
    setEditingId(item.id);
    setEditItemState({ ...item });
  };

  const saveEdit = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const editedPrice = Math.max(0, editItemState.price ?? item.price);
        const editedCurr = editItemState.currency ?? item.currency;
        const editedPriceBdt = calculatePriceBdt(editedPrice, editedCurr);
        return {
          ...item,
          ...editItemState,
          price: editedPrice,
          currency: editedCurr,
          price_bdt: editedPriceBdt,
          weight_kg: Math.max(0, editItemState.weight_kg ?? item.weight_kg),
          quantity: Math.max(1, editItemState.quantity ?? item.quantity)
        } as ProductItem;
      }
      return item;
    });
    onUpdateItems(updated);
    setEditingId(null);
    showToast('✏️ Product details updated!');
  };

  // Total Calculations
  const totalPriceBdt = items.reduce((sum, item) => sum + item.price_bdt * item.quantity, 0);
  const totalWeightKg = items.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalItemsCount = items.length;

  // Estimated Landed Cost (Total Product Price + Air Freight @ 1200 Tk/kg + 20% Duty/Fees)
  const totalFreightBdt = totalWeightKg * 1200;
  const estimatedLandedTotalBdt = totalPriceBdt + totalFreightBdt + totalPriceBdt * 0.20;

  // Clear List
  const handleClearList = () => {
    if (items.length === 0) return;
    if (confirm('Are you sure you want to clear all products from this list?')) {
      onUpdateItems([]);
      setCurrentListId(null);
      showToast('🧹 Product list cleared');
    }
  };

  // Save to Backend API
  const handleSaveToServer = async () => {
    if (items.length === 0) {
      showToast('⚠️ Cannot save an empty list! Add some products first.');
      return;
    }

    setSavingToServer(true);
    try {
      const payload = {
        name: listName,
        date: listDate,
        notes: listNotes,
        items
      };

      let res;
      if (currentListId) {
        res = await fetch(`${apiUrl}/product-lists/${currentListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${apiUrl}/product-lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setCurrentListId(data.id);
        showToast('💾 List saved successfully to database!');
      } else {
        showToast('💾 Saved list locally to browser storage!');
      }
    } catch (err) {
      console.error('Server save error:', err);
      showToast('💾 Saved list locally to browser storage!');
    } finally {
      setSavingToServer(false);
    }
  };

  // Fetch Saved Lists from Server
  const handleOpenSavedModal = async () => {
    setShowSavedModal(true);
    setLoadingSaved(true);
    try {
      const res = await fetch(`${apiUrl}/product-lists`);
      if (res.ok) {
        const data = await res.json();
        setSavedLists(data);
      }
    } catch (err) {
      console.error('Fetch saved lists failed:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Load Saved List
  const handleLoadList = (saved: SavedProductList) => {
    setCurrentListId(saved.id);
    setListName(saved.name);
    setListDate(saved.date);
    setListNotes(saved.notes || '');
    onUpdateItems(saved.items || []);
    setShowSavedModal(false);
    showToast(`📂 Loaded list: "${saved.name}"`);
  };

  // Delete Saved List
  const handleDeleteSavedList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved list?')) return;
    try {
      await fetch(`${apiUrl}/product-lists/${id}`, { method: 'DELETE' });
      setSavedLists(savedLists.filter((l) => l.id !== id));
      showToast('🗑️ Saved list deleted');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Share Summary Text
  const handleShareSummary = () => {
    if (items.length === 0) {
      showToast('⚠️ Add items to list before sharing!');
      return;
    }

    const lines = [
      `📋 PRODUCT SOURCING LIST: ${listName}`,
      `📅 Date: ${listDate}`,
      `----------------------------------------`,
      ...items.map((it, i) => 
        `${i + 1}. ${it.title} (${it.quantity} pcs)\n   Price: ৳${it.price_bdt.toLocaleString()} | Weight: ${it.weight_kg} kg\n   Link: ${it.product_url || 'N/A'}`
      ),
      `----------------------------------------`,
      `📦 Total Items: ${totalItemsCount} (${totalQuantity} pcs)`,
      `⚖️ TOTAL WEIGHT: ${totalWeightKg.toFixed(3)} kg`,
      `💰 TOTAL PRICE: ৳${totalPriceBdt.toLocaleString()} BDT`,
      listNotes ? `📝 Notes: ${listNotes}` : ''
    ];

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    showToast('📋 Sourcing summary copied to clipboard!');
  };

  // Export CSV
  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast('⚠️ No items to export!');
      return;
    }
    const headers = ['#', 'Product Title', 'Platform', 'Unit Price (BDT)', 'Quantity', 'Line Total (BDT)', 'Unit Weight (kg)', 'Line Weight (kg)', 'Product Link', 'Details'];
    const rows = items.map((it, idx) => [
      idx + 1,
      `"${it.title.replace(/"/g, '""')}"`,
      `"${it.platform || 'N/A'}"`,
      it.price_bdt,
      it.quantity,
      it.price_bdt * it.quantity,
      it.weight_kg,
      (it.weight_kg * it.quantity).toFixed(3),
      `"${it.product_url || ''}"`,
      `"${(it.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${listName.toLowerCase().replace(/\s+/g, '_')}_${listDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 CSV file downloaded!');
  };

  // Export A4 PDF Download
  const handleDownloadA4Pdf = async () => {
    if (items.length === 0) {
      showToast('⚠️ Please add at least one product before exporting to PDF!');
      return;
    }

    setDownloadingPdf(true);
    showToast('⏳ Preparing high-resolution A4 PDF document...');

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.getElementById('a4-pdf-content');
      if (!element) {
        showToast('❌ PDF export element not found');
        return;
      }

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: `${listName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${listDate}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
      showToast('📄 A4 PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('🖨️ Opening browser A4 print PDF renderer...');
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  // Common Input Base Style Object
  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#09090b',
    border: '1px solid #3f3f46',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '0.9rem',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px'
  };

  const buttonActionStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: '10px',
    backgroundColor: '#18181b',
    color: '#f8fafc',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1px solid #3f3f46',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTAINER CARD FOR PRODUCT LIST BUILDER */}
      {/* ------------------------------------------------------------- */}
      <div 
        className="no-print"
        style={{
          backgroundColor: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 25px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* TOP BAR: Title & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid #27272a' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              <Sparkles style={{ width: '16px', height: '16px' }} />
              <span>Sourcing List Creator & Cost Engine</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package style={{ width: '28px', height: '28px', color: '#dc2626' }} />
              Product List Builder
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
              Add products sequentially, calculate live total weight & price, and export as an A4 formatted PDF.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenSavedModal}
              style={buttonActionStyle}
            >
              <FolderOpen style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
              <span>Saved Lists</span>
            </button>

            <button
              onClick={handleSaveToServer}
              disabled={savingToServer}
              style={buttonActionStyle}
            >
              <Save style={{ width: '16px', height: '16px', color: '#34d399' }} />
              <span>{savingToServer ? 'Saving...' : 'Save List'}</span>
            </button>

            <button
              onClick={handleShareSummary}
              style={buttonActionStyle}
            >
              <Share2 style={{ width: '16px', height: '16px', color: '#c084fc' }} />
              <span>Copy Text</span>
            </button>

            <button
              onClick={handleExportCsv}
              style={buttonActionStyle}
            >
              <Download style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
              <span>CSV</span>
            </button>

            <button
              onClick={handleDownloadA4Pdf}
              disabled={downloadingPdf}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)'
              }}
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              <span>{downloadingPdf ? 'Exporting PDF...' : 'Download A4 PDF'}</span>
            </button>

            <button
              onClick={handleNativePrint}
              title="Print to PDF via Browser"
              style={{ ...buttonActionStyle, padding: '9px' }}
            >
              <Printer style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LIST SPECIFICATION FORM AT THE VERY TOP */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: '1.25rem', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* List Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>
                <Tag style={{ width: '14px', height: '14px', color: '#f87171' }} />
                Product List Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g. Smart Watch & Accessories Sourcing List Q4"
                style={{ ...inputStyle, border: '1px solid #dc2626', fontWeight: 600 }}
              />
            </div>

            {/* List Date */}
            <div>
              <label style={labelStyle}>
                <Calendar style={{ width: '14px', height: '14px', color: '#f87171' }} />
                List Date <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                value={listDate}
                onChange={(e) => setListDate(e.target.value)}
                style={{ ...inputStyle, fontWeight: 600 }}
              />
            </div>

            {/* Currency Exchange Rate */}
            <div>
              <label style={labelStyle}>
                <Coins style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                RMB / BDT Rate (৳)
              </label>
              <input
                type="number"
                step="0.1"
                value={rmbRate}
                onChange={(e) => setRmbRate(e.target.value)}
                style={{ ...inputStyle, fontWeight: 700 }}
              />
            </div>

            {/* List Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ ...labelStyle, color: '#a1a1aa' }}>
                <Info style={{ width: '14px', height: '14px', color: '#a1a1aa' }} />
                List Notes / Sourcing Context (Optional)
              </label>
              <input
                type="text"
                value={listNotes}
                onChange={(e) => setListNotes(e.target.value)}
                placeholder="e.g. Urgent sourcing order for Dhaka warehouse distribution. Air freight method required."
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LIVE TOTAL STATS DASHBOARD SUMMARY BAR */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          
          {/* Card 1: Total Items */}
          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
              <Package style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Items</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                {totalItemsCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#a1a1aa' }}>({totalQuantity} pcs)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Weight */}
          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}>
              <Scale style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Weight (kg)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>
                {totalWeightKg.toFixed(3)} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#a1a1aa' }}>kg</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Price */}
          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              <Coins style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Product Price</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
                ৳{totalPriceBdt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#a1a1aa' }}>BDT</span>
              </div>
            </div>
          </div>

          {/* Card 4: Est Landed Total */}
          <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#f87171' }}>
              <Sparkles style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Est. Landed Total</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>
                ৳{Math.round(estimatedLandedTotalBdt).toLocaleString()}
              </div>
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* ADD PRODUCT FORM (SEQUENTIAL ENTRY) */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: '1.5rem', backgroundColor: '#09090b', border: '1px solid rgba(220, 38, 38, 0.4)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #27272a' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus style={{ width: '20px', height: '20px', color: '#dc2626' }} />
              Add Product Sequentially
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Products are added step-by-step to the list below</span>
          </div>

          <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Title */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>
                Product Title / Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Smart Watch Ultra 8 Series"
                style={inputStyle}
              />
            </div>

            {/* Platform */}
            <div>
              <label style={labelStyle}>Platform / Source</label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                style={inputStyle}
              >
                <option value="1688">1688 China</option>
                <option value="AliExpress">AliExpress</option>
                <option value="Pinduoduo">Pinduoduo</option>
                <option value="Taobao">Taobao</option>
                <option value="Daraz BD">Daraz BD</option>
                <option value="Manual">Manual Supplier</option>
              </select>
            </div>

            {/* Price & Currency */}
            <div>
              <label style={labelStyle}>
                Unit Price & Currency <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Price"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as any)}
                  style={{ ...inputStyle, width: '90px', backgroundColor: '#18181b', fontWeight: 700 }}
                >
                  <option value="BDT">BDT (৳)</option>
                  <option value="RMB">RMB (¥)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Weight */}
            <div>
              <label style={labelStyle}>
                Unit Weight <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={newWeightVal}
                  onChange={(e) => setNewWeightVal(e.target.value)}
                  placeholder="Weight"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={newWeightUnit}
                  onChange={(e) => setNewWeightUnit(e.target.value as any)}
                  style={{ ...inputStyle, width: '70px', backgroundColor: '#18181b', fontWeight: 700 }}
                >
                  <option value="kg">kg</option>
                  <option value="gm">gm</option>
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label style={labelStyle}>Quantity (Units)</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Direct Link URL */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>
                <LinkIcon style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                Direct Product Link (URL)
              </label>
              <input
                type="url"
                value={newProductUrl}
                onChange={(e) => setNewProductUrl(e.target.value)}
                placeholder="https://detail.1688.com/offer/..."
                style={inputStyle}
              />
            </div>

            {/* Image URL & File Upload */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>
                <ImageIcon style={{ width: '14px', height: '14px', color: '#34d399' }} />
                Product Image (URL or Upload)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... image URL"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ ...buttonActionStyle, padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Upload File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Details & Specs */}
            <div>
              <label style={labelStyle}>Details / Specs</label>
              <input
                type="text"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="e.g. OLED screen, Titanium Casing, Black"
                style={inputStyle}
              />
            </div>

            {/* Submit Button */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)'
                }}
              >
                <Plus style={{ width: '18px', height: '18px' }} />
                Add Product to List
              </button>
            </div>
          </form>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CURRENT PRODUCT LIST ITEMS TABLE / CARDS VIEW */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ width: '20px', height: '20px', color: '#f87171' }} />
              Products in List ({items.length})
            </h3>

            {items.length > 0 && (
              <button
                onClick={handleClearList}
                style={{ backgroundColor: 'transparent', color: '#f87171', border: 'none', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Trash2 style={{ width: '14px', height: '14px' }} />
                Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ backgroundColor: '#09090b', border: '1px dashed #27272a', borderRadius: '12px', padding: '3rem 1rem', textAlign: 'center' }}>
              <Package style={{ width: '48px', height: '48px', color: '#3f3f46', margin: '0 auto 12px auto' }} />
              <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Your product list is currently empty</p>
              <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '6px', margin: 0 }}>
                Use the sequential product form above or click "+ Add to Product List" on any search result card!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item, index) => {
                const lineTotalBdt = item.price_bdt * item.quantity;
                const lineTotalWeightKg = item.weight_kg * item.quantity;

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#09090b',
                      border: '1px solid #27272a',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    {/* Item Serial, Image & Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', flex: 1 }}>
                      <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#f8fafc', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {index + 1}
                      </span>

                      <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#18181b', border: '1px solid #27272a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package style={{ width: '24px', height: '24px', color: '#71717a' }} />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                            {item.title}
                          </h4>
                          {item.platform && (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, backgroundColor: 'rgba(220, 38, 38, 0.2)', color: '#f87171', border: '1px solid rgba(220, 38, 38, 0.3)', textTransform: 'uppercase' }}>
                              {item.platform}
                            </span>
                          )}
                        </div>

                        {item.details && (
                          <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: 0 }}>{item.details}</p>
                        )}

                        {item.product_url ? (
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#60a5fa', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                          >
                            <ExternalLink style={{ width: '12px', height: '12px' }} />
                            <span>Direct Product Link</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#52525b' }}>No URL link</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper & Calculation Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                      {/* Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '4px' }}>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#27272a', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ width: '32px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#27272a', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Weight Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#a1a1aa' }}>Weight</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24' }}>
                          {lineTotalWeightKg.toFixed(3)} kg
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#71717a' }}>{item.weight_kg} kg / unit</div>
                      </div>

                      {/* Price Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#a1a1aa' }}>Line Total</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>
                          ৳{lineTotalBdt.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#71717a' }}>৳{item.price_bdt.toLocaleString()} / unit</div>
                      </div>

                      {/* Reorder & Remove Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleMoveItem(index, 'up')}
                          disabled={index === 0}
                          style={{ padding: '4px', backgroundColor: 'transparent', color: index === 0 ? '#3f3f46' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
                        >
                          <MoveUp style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button
                          onClick={() => handleMoveItem(index, 'down')}
                          disabled={index === items.length - 1}
                          style={{ padding: '4px', backgroundColor: 'transparent', color: index === items.length - 1 ? '#3f3f46' : '#a1a1aa', border: 'none', cursor: 'pointer' }}
                        >
                          <MoveDown style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ padding: '4px', backgroundColor: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', marginLeft: '4px' }}
                        >
                          <Trash2 style={{ width: '18px', height: '18px' }} />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* SAVED LISTS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSavedModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '600px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen style={{ width: '20px', height: '20px', color: '#60a5fa' }} />
                Saved Product Lists
              </h3>
              <button
                onClick={() => setShowSavedModal(false)}
                style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {loadingSaved ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa', fontSize: '0.9rem' }}>Loading saved product lists...</div>
            ) : savedLists.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa', fontSize: '0.9rem' }}>
                No saved product lists found on the server. Save your current list to see it here!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {savedLists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => handleLoadList(list)}
                    style={{ padding: '12px 16px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{list.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '4px 0 0 0' }}>
                        Date: {list.date} | Items: {list.total_items_count} ({list.total_quantity} pcs)
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>৳{list.total_price_bdt.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{list.total_weight_kg} kg</div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSavedList(list.id, e)}
                        style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 📄 A4 FORMATTED PRINT & PDF DOCUMENT TEMPLATE */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'none' }}>
        <div
          id="a4-pdf-content"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm',
            backgroundColor: '#ffffff',
            color: '#111827',
            fontFamily: 'Helvetica, Arial, sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '2px solid #dc2626', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
                  OMNI SOURCING PRODUCT LIST
                </h1>
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '4px 0 0 0' }}>
                  Product Sourcing, Weight & Landed Cost Statement
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  {listName}
                </h2>
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0 0 0' }}>
                  Date: <strong>{listDate}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {listNotes && (
            <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 12px', marginBottom: '16px', fontSize: '11px', color: '#374151' }}>
              <strong>Notes:</strong> {listNotes}
            </div>
          )}

          {/* Summary Box Header */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#1e40af', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Products</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1d4ed8', marginTop: '2px' }}>
                {totalItemsCount} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>({totalQuantity} units)</span>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#92400e', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Weight (kg)</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#b45309', marginTop: '2px' }}>
                {totalWeightKg.toFixed(3)} kg
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#065f46', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Price (BDT)</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#047857', marginTop: '2px' }}>
                ৳{totalPriceBdt.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1f2937', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '8px', width: '25px' }}>#</th>
                <th style={{ padding: '8px', width: '50px' }}>Image</th>
                <th style={{ padding: '8px' }}>Product Details</th>
                <th style={{ padding: '8px', width: '70px' }}>Source Link</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '60px' }}>Unit Price</th>
                <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>Qty</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '65px' }}>Line Total</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '60px' }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '8px' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '11px' }}>{item.title}</div>
                    {item.details && <div style={{ color: '#4b5563', fontSize: '9px', marginTop: '2px' }}>{item.details}</div>}
                    {item.platform && <div style={{ color: '#dc2626', fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '2px' }}>Platform: {item.platform}</div>}
                  </td>
                  <td style={{ padding: '8px', wordBreak: 'break-all' }}>
                    {item.product_url ? (
                      <a href={item.product_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        View Link
                      </a>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: '500' }}>৳{item.price_bdt.toLocaleString()}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>
                    ৳{(item.price_bdt * item.quantity).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#b45309' }}>
                    {(item.weight_kg * item.quantity).toFixed(3)} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Grand Totals Footer */}
          <div style={{ backgroundColor: '#111827', color: '#ffffff', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>GRAND TOTAL SUMMARY</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Formatted for A4 Standard Paper</div>
            </div>
            <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 'bold' }}>TOTAL WEIGHT</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>{totalWeightKg.toFixed(3)} kg</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#10b981', textTransform: 'uppercase', fontWeight: 'bold' }}>TOTAL PRICE</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#34d399' }}>৳{totalPriceBdt.toLocaleString()} BDT</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '9px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
            Generated by OMNI Sourcing & Costing Engine • Page 1 of 1
          </div>
        </div>
      </div>

    </div>
  );
}
