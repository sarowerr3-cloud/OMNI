'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Image Upload File
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

  // Landed Cost Summary Option Toggle
  const [includeLandedCostEstimate, setIncludeLandedCostEstimate] = useState<boolean>(false);
  const [freightRatePerKg, setFreightRatePerKg] = useState<string>('1200'); // BDT 1200 / kg air freight

  // Auto-save to localStorage
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

  // Image Upload file reader
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

  // Estimated Landed Cost
  const totalFreightBdt = totalWeightKg * (Number(freightRatePerKg) || 1200);
  const estimatedLandedTotalBdt = totalPriceBdt + totalFreightBdt + totalPriceBdt * 0.20; // 20% duty + agent fee

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
        // Fallback to local storage notice
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

  // Delete Saved List from server
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
      // Dynamically import html2pdf.js on client side
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

  return (
    <div className="w-full space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* SCREEN UI CONTROLS & HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="no-print bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl">
        
        {/* TOP BAR: Title & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-red-500 font-semibold text-sm uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Sourcing List Creator & Smart Cost Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Package className="w-8 h-8 text-red-500" />
              Product List Builder
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Add products sequentially, calculate live total weight & price, and export as an A4 formatted PDF.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenSavedModal}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>Saved Lists</span>
            </button>

            <button
              onClick={handleSaveToServer}
              disabled={savingToServer}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{savingToServer ? 'Saving...' : 'Save List'}</span>
            </button>

            <button
              onClick={handleShareSummary}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Copy Text</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleDownloadA4Pdf}
              disabled={downloadingPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-sm shadow-lg shadow-red-900/30 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>{downloadingPdf ? 'Exporting PDF...' : 'Download A4 PDF'}</span>
            </button>

            <button
              onClick={handleNativePrint}
              title="Print to PDF via Browser"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LIST SPECIFICATION FORM AT THE VERY TOP */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-6 bg-slate-950/60 p-4 md:p-5 rounded-xl border border-slate-800/80">
          {/* List Name */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-red-400" />
              Product List Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Smart Watch & Accessories Sourcing List Q4"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* List Date */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-400" />
              List Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={listDate}
              onChange={(e) => setListDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Currency Exchange Rates */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              RMB / BDT Rate (৳)
            </label>
            <input
              type="number"
              step="0.1"
              value={rmbRate}
              onChange={(e) => setRmbRate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition"
            />
          </div>

          {/* List Notes */}
          <div className="md:col-span-12 space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              List Notes / Sourcing Context (Optional)
            </label>
            <input
              type="text"
              value={listNotes}
              onChange={(e) => setListNotes(e.target.value)}
              placeholder="e.g. Sourcing order for Chittagong distribution branch. Air freight method required."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-700 transition"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LIVE TOTAL STATS DASHBOARD SUMMARY BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Total Items</div>
              <div className="text-xl md:text-2xl font-bold text-white">
                {totalItemsCount} <span className="text-xs font-normal text-slate-400">({totalQuantity} pcs)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Total Weight (kg)</div>
              <div className="text-xl md:text-2xl font-bold text-amber-400">
                {totalWeightKg.toFixed(3)} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Total Product Price</div>
              <div className="text-xl md:text-2xl font-bold text-emerald-400">
                ৳{totalPriceBdt.toLocaleString()} <span className="text-xs font-normal text-slate-400">BDT</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Est. Landed Total</div>
              <div className="text-xl md:text-2xl font-bold text-red-400">
                ৳{Math.round(estimatedLandedTotalBdt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ADD PRODUCT FORM (SEQUENTIAL ENTRY) */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-8 bg-slate-950/90 border border-red-900/30 rounded-xl p-5 md:p-6 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-500" />
              Add Product Sequentially
            </h2>
            <span className="text-xs text-slate-400">Products are added step-by-step to the list below</span>
          </div>

          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Title */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Product Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Smart Watch Ultra 8 Series"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Platform */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-medium text-slate-300">Platform / Source</label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
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
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Unit Price & Currency <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Price"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none"
                >
                  <option value="BDT">BDT (৳)</option>
                  <option value="RMB">RMB (¥)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Weight */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Unit Weight <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={newWeightVal}
                  onChange={(e) => setNewWeightVal(e.target.value)}
                  placeholder="Weight"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <select
                  value={newWeightUnit}
                  onChange={(e) => setNewWeightUnit(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="gm">gm</option>
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-300">Quantity</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Direct Link URL */}
            <div className="md:col-span-6 space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                Direct Product Link (URL)
              </label>
              <input
                type="url"
                value={newProductUrl}
                onChange={(e) => setNewProductUrl(e.target.value)}
                placeholder="https://detail.1688.com/offer/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Image URL & File Upload */}
            <div className="md:col-span-8 space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                Product Image (URL or Upload)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... image URL"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  Upload File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Details & Specs */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-medium text-slate-300">Details / Specs</label>
              <input
                type="text"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="e.g. OLED screen, Titanium Casing, Black"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Add Button */}
            <div className="md:col-span-12 flex justify-end mt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product to List
              </button>
            </div>
          </form>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CURRENT PRODUCT LIST TABLE / CARDS VIEW */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-400" />
              Products in List ({items.length})
            </h3>

            {items.length > 0 && (
              <button
                onClick={handleClearList}
                className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-12 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-base">Your product list is currently empty</p>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Use the sequential product form above or click "+ Add to Product List" on any search result card to add products here!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const lineTotalBdt = item.price_bdt * item.quantity;
                const lineTotalWeightKg = item.weight_kg * item.quantity;
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Item Serial & Image */}
                    <div className="flex items-center gap-3.5 w-full md:w-auto">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-600" />
                        )}
                      </div>

                      {/* Info / Title / Link */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-base truncate max-w-xs md:max-w-md">
                            {item.title}
                          </h4>
                          {item.platform && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/60 text-red-400 border border-red-900/50 uppercase">
                              {item.platform}
                            </span>
                          )}
                        </div>

                        {item.details && (
                          <p className="text-xs text-slate-400 line-clamp-1">{item.details}</p>
                        )}

                        {item.product_url ? (
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline hover:text-blue-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Direct Product Link</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">No URL link provided</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity & Calculations */}
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-800/60">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      {/* Weight Breakdown */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Weight</div>
                        <div className="text-sm font-bold text-amber-400">
                          {lineTotalWeightKg.toFixed(3)} kg
                        </div>
                        <div className="text-[10px] text-slate-500">{item.weight_kg} kg / unit</div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Line Total</div>
                        <div className="text-sm font-bold text-emerald-400">
                          ৳{lineTotalBdt.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">৳{item.price_bdt.toLocaleString()} / unit</div>
                      </div>

                      {/* Reorder & Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveItem(index, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-400 hover:text-red-300 ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                Saved Product Lists
              </h3>
              <button
                onClick={() => setShowSavedModal(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSaved ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading saved product lists...</div>
            ) : savedLists.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No saved product lists found on the server. Save your current list to see it here!
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {savedLists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => handleLoadList(list)}
                    className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{list.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Date: {list.date} | Items: {list.total_items_count} ({list.total_quantity} pcs)
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">৳{list.total_price_bdt.toLocaleString()}</div>
                        <div className="text-[10px] text-amber-400">{list.total_weight_kg} kg</div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSavedList(list.id, e)}
                        className="p-1.5 rounded bg-slate-900 hover:bg-red-950 text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
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
      <div className="hidden print:block">
        <style type="text/css" media="print">{`
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          #a4-pdf-content {
            display: block !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
        `}</style>
      </div>

      {/* Rendered Container for html2pdf.js & A4 Printing */}
      <div className="hidden print:block">
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
