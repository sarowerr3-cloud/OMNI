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
  Info,
  MessageSquare,
  Wallet,
  CreditCard,
  CheckCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle
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
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'paid' | 'partial' | 'unpaid';
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
  total_paid_bdt?: number;
  total_due_bdt?: number;
  payment_status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductListBuilderProps {
  items: ProductItem[];
  onUpdateItems: (items: ProductItem[]) => void;
  apiUrl: string;
  showToast: (msg: string) => void;
  defaultRmbRate?: string;
  defaultUsdRate?: string;
  onPitchToCustomers?: (item: ProductItem) => void;
}

export default function ProductListBuilder({
  items,
  onUpdateItems,
  apiUrl,
  showToast,
  defaultRmbRate,
  defaultUsdRate,
  onPitchToCustomers
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
  const [rmbRate, setRmbRate] = useState<string>(defaultRmbRate || '20.00');
  const [usdRate, setUsdRate] = useState<string>(defaultUsdRate || '120.00');

  // Keep rmbRate and usdRate in sync if defaults change
  useEffect(() => {
    if (defaultRmbRate && Number(defaultRmbRate) > 0) {
      setRmbRate(defaultRmbRate);
    }
  }, [defaultRmbRate]);

  useEffect(() => {
    if (defaultUsdRate && Number(defaultUsdRate) > 0) {
      setUsdRate(defaultUsdRate);
    }
  }, [defaultUsdRate]);
  
  const [newWeightVal, setNewWeightVal] = useState<string>('0.35');
  const [newWeightUnit, setNewWeightUnit] = useState<'kg' | 'gm'>('kg');
  
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newPlatform, setNewPlatform] = useState<string>('1688');
  const [newPaidAmount, setNewPaidAmount] = useState<string>('0');

  // Customer Deposit / Advance Modal State
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [depositStrategy, setDepositStrategy] = useState<'sequential' | 'proportional'>('sequential');

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
    const lineTotalBdt = priceBdt * qty;
    const paidNum = Math.max(0, Number(newPaidAmount) || 0);
    const dueNum = Math.max(0, lineTotalBdt - paidNum);
    const itemStatus: 'paid' | 'partial' | 'unpaid' =
      dueNum === 0 && paidNum > 0 ? 'paid' : (paidNum > 0 ? 'partial' : 'unpaid');

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
      platform: newPlatform,
      paid_amount: paidNum,
      due_amount: dueNum,
      payment_status: itemStatus
    };

    onUpdateItems([...items, newItem]);
    showToast(`✅ Added "${newItem.title}" to product list!`);

    // Reset form
    setNewTitle('');
    setNewDetails('');
    setNewPrice('500');
    setNewPaidAmount('0');
    setNewProductUrl('');
    setNewImageUrl('');
    setNewQuantity(1);
  };

  // Helper calculations for items
  const getItemLineTotal = (item: ProductItem): number => {
    return (item.price_bdt || 0) * (item.quantity || 1);
  };

  const getItemPaid = (item: ProductItem): number => {
    return Math.max(0, Number(item.paid_amount) || 0);
  };

  const getItemDue = (item: ProductItem): number => {
    const lineTotal = getItemLineTotal(item);
    const paid = getItemPaid(item);
    return Math.max(0, lineTotal - paid);
  };

  const getItemStatus = (item: ProductItem): 'paid' | 'partial' | 'unpaid' => {
    const lineTotal = getItemLineTotal(item);
    const paid = getItemPaid(item);
    if (paid >= lineTotal && lineTotal > 0) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
  };

  // Payment update handlers
  const handleItemPaidChange = (id: string, newPaid: number) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const lineTotal = getItemLineTotal(item);
        const validPaid = Math.max(0, Math.min(lineTotal, newPaid));
        const due = Math.max(0, lineTotal - validPaid);
        const status: 'paid' | 'partial' | 'unpaid' =
          due === 0 && validPaid > 0 ? 'paid' : (validPaid > 0 ? 'partial' : 'unpaid');
        return {
          ...item,
          paid_amount: validPaid,
          due_amount: due,
          payment_status: status
        };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleMarkItemPaid = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const lineTotal = getItemLineTotal(item);
        return {
          ...item,
          paid_amount: lineTotal,
          due_amount: 0,
          payment_status: 'paid' as const
        };
      }
      return item;
    });
    onUpdateItems(updated);
    showToast('✅ Marked item as fully paid!');
  };

  const handleResetItemPayment = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const lineTotal = getItemLineTotal(item);
        return {
          ...item,
          paid_amount: 0,
          due_amount: lineTotal,
          payment_status: 'unpaid' as const
        };
      }
      return item;
    });
    onUpdateItems(updated);
    showToast('🔄 Item payment reset to unpaid');
  };

  const handleMarkAllPaid = () => {
    if (items.length === 0) return;
    const updated = items.map((item) => {
      const lineTotal = getItemLineTotal(item);
      return {
        ...item,
        paid_amount: lineTotal,
        due_amount: 0,
        payment_status: 'paid' as const
      };
    });
    onUpdateItems(updated);
    showToast('✅ All items marked as 100% paid!');
  };

  const handleResetAllPayments = () => {
    if (items.length === 0) return;
    if (!confirm('Reset all customer payments to ৳0?')) return;
    const updated = items.map((item) => {
      const lineTotal = getItemLineTotal(item);
      return {
        ...item,
        paid_amount: 0,
        due_amount: lineTotal,
        payment_status: 'unpaid' as const
      };
    });
    onUpdateItems(updated);
    showToast('🔄 All payments reset to unpaid');
  };

  // Customer Deposit / Advance Allocator
  const handleApplyDeposit = () => {
    const deposit = Math.max(0, Number(depositAmountInput) || 0);
    if (deposit <= 0) {
      showToast('⚠️ Please enter a valid deposit amount greater than 0');
      return;
    }
    if (items.length === 0) {
      showToast('⚠️ No items in list to apply deposit to');
      return;
    }

    let remainingDeposit = deposit;
    let updated: ProductItem[] = [];

    if (depositStrategy === 'sequential') {
      // Pay off line 1, then line 2, etc.
      updated = items.map((item) => {
        const lineTotal = getItemLineTotal(item);
        const currentPaid = getItemPaid(item);
        const remainingItemDue = Math.max(0, lineTotal - currentPaid);

        if (remainingDeposit <= 0) {
          return item;
        }

        const allocation = Math.min(remainingItemDue, remainingDeposit);
        const newPaid = currentPaid + allocation;
        const newDue = Math.max(0, lineTotal - newPaid);
        remainingDeposit -= allocation;
        const status: 'paid' | 'partial' | 'unpaid' = newDue === 0 && newPaid > 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

        return {
          ...item,
          paid_amount: newPaid,
          due_amount: newDue,
          payment_status: status
        };
      });
    } else {
      // Proportional allocation based on remaining due
      const currentRemainingTotalDue = items.reduce((sum, it) => sum + getItemDue(it), 0);
      if (currentRemainingTotalDue <= 0) {
        showToast('ℹ️ All items are already fully paid!');
        setShowDepositModal(false);
        return;
      }

      const ratio = Math.min(1, deposit / currentRemainingTotalDue);
      updated = items.map((item) => {
        const lineTotal = getItemLineTotal(item);
        const currentPaid = getItemPaid(item);
        const currentItemDue = Math.max(0, lineTotal - currentPaid);
        const addedPaid = Math.round(currentItemDue * ratio);
        const newPaid = Math.min(lineTotal, currentPaid + addedPaid);
        const newDue = Math.max(0, lineTotal - newPaid);
        const status: 'paid' | 'partial' | 'unpaid' = newDue === 0 && newPaid > 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');
        return {
          ...item,
          paid_amount: newPaid,
          due_amount: newDue,
          payment_status: status
        };
      });
    }

    onUpdateItems(updated);
    const newTotalPaid = updated.reduce((sum, it) => sum + getItemPaid(it), 0);
    const newTotalDue = Math.max(0, totalPriceBdt - newTotalPaid);
    setShowDepositModal(false);
    showToast(`💰 Applied ৳${deposit.toLocaleString()} deposit! Remaining balance: ৳${newTotalDue.toLocaleString()}`);
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
    const updated = items.map((item) => {
      if (item.id === id) {
        const lineTotal = item.price_bdt * qty;
        const paid = Math.min(lineTotal, getItemPaid(item));
        const due = Math.max(0, lineTotal - paid);
        const status: 'paid' | 'partial' | 'unpaid' = due === 0 && paid > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
        return {
          ...item,
          quantity: qty,
          paid_amount: paid,
          due_amount: due,
          payment_status: status
        };
      }
      return item;
    });
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
        const editedQty = Math.max(1, editItemState.quantity ?? item.quantity);
        const lineTotal = editedPriceBdt * editedQty;
        const paid = Math.min(lineTotal, editItemState.paid_amount ?? getItemPaid(item));
        const due = Math.max(0, lineTotal - paid);
        const status: 'paid' | 'partial' | 'unpaid' = due === 0 && paid > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
        return {
          ...item,
          ...editItemState,
          price: editedPrice,
          currency: editedCurr,
          price_bdt: editedPriceBdt,
          weight_kg: Math.max(0, editItemState.weight_kg ?? item.weight_kg),
          quantity: editedQty,
          paid_amount: paid,
          due_amount: due,
          payment_status: status
        } as ProductItem;
      }
      return item;
    });
    onUpdateItems(updated);
    setEditingId(null);
    showToast('✏️ Product details updated!');
  };

  // Total Calculations
  const totalPriceBdt = items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
  const totalPaidBdt = items.reduce((sum, item) => sum + getItemPaid(item), 0);
  const totalDueBdt = Math.max(0, totalPriceBdt - totalPaidBdt);
  const totalWeightKg = items.reduce((sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 1), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
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
        items: items.map(it => ({
          ...it,
          paid_amount: getItemPaid(it),
          paid_amount_bdt: getItemPaid(it),
          due_amount: getItemDue(it),
          due_amount_bdt: getItemDue(it),
          payment_status: getItemStatus(it)
        })),
        total_price_bdt: totalPriceBdt,
        total_paid_bdt: totalPaidBdt,
        total_due_bdt: totalDueBdt,
        payment_status: totalDueBdt === 0 && totalPriceBdt > 0 ? 'paid' : (totalPaidBdt > 0 ? 'partial' : 'unpaid')
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

    const loadedItems: ProductItem[] = (saved.items || []).map((it) => {
      const paid = Number(it.paid_amount ?? (it as any).paid_amount_bdt) || 0;
      const lineTotal = (it.price_bdt || 0) * (it.quantity || 1);
      const due = typeof it.due_amount === 'number' 
        ? it.due_amount 
        : (typeof (it as any).due_amount_bdt === 'number' 
            ? (it as any).due_amount_bdt 
            : Math.max(0, lineTotal - paid));
      const status = (it.payment_status as any) || (due === 0 && paid > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));
      return {
        ...it,
        paid_amount: paid,
        due_amount: due,
        payment_status: status
      };
    });

    onUpdateItems(loadedItems);
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

  // Share Summary Text with Paid & Due tracking
  const handleShareSummary = () => {
    if (items.length === 0) {
      showToast('⚠️ Add items to list before sharing!');
      return;
    }

    const lines = [
      `📋 PRODUCT SOURCING & CUSTOMER PAYMENT SUMMARY: ${listName}`,
      `📅 Date: ${listDate}`,
      `----------------------------------------`,
      ...items.map((it, i) => {
        const lineTotal = getItemLineTotal(it);
        const paid = getItemPaid(it);
        const due = getItemDue(it);
        const status = getItemStatus(it).toUpperCase();
        return `${i + 1}. ${it.title} (${it.quantity} pcs)\n   Line Total: ৳${lineTotal.toLocaleString()} | Paid: ৳${paid.toLocaleString()} | Due: ৳${due.toLocaleString()} [${status}]\n   Link: ${it.product_url || 'N/A'}`;
      }),
      `----------------------------------------`,
      `📦 Total Items: ${totalItemsCount} (${totalQuantity} pcs)`,
      `⚖️ TOTAL WEIGHT: ${totalWeightKg.toFixed(3)} kg`,
      `💰 TOTAL ORDER: ৳${totalPriceBdt.toLocaleString()} BDT`,
      `✅ TOTAL CUSTOMER PAID: ৳${totalPaidBdt.toLocaleString()} BDT`,
      `⚠️ OUTSTANDING CUSTOMER DUE: ৳${totalDueBdt.toLocaleString()} BDT`,
      listNotes ? `📝 Notes: ${listNotes}` : ''
    ];

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    showToast('📋 Sourcing & payment summary copied to clipboard!');
  };

  // Export CSV with Paid & Due tracking
  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast('⚠️ No items to export!');
      return;
    }
    const headers = [
      '#', 
      'Product Title', 
      'Platform', 
      'Unit Price (BDT)', 
      'Quantity', 
      'Line Total (BDT)', 
      'Paid Amount (BDT)', 
      'Due Amount (BDT)', 
      'Payment Status', 
      'Unit Weight (kg)', 
      'Line Weight (kg)', 
      'Product Link', 
      'Details'
    ];
    const rows = items.map((it, idx) => {
      const lineTotal = getItemLineTotal(it);
      const paid = getItemPaid(it);
      const due = getItemDue(it);
      const status = getItemStatus(it);
      return [
        idx + 1,
        `"${it.title.replace(/"/g, '""')}"`,
        `"${it.platform || 'N/A'}"`,
        it.price_bdt,
        it.quantity,
        lineTotal,
        paid,
        due,
        `"${status.toUpperCase()}"`,
        it.weight_kg,
        (it.weight_kg * it.quantity).toFixed(3),
        `"${it.product_url || ''}"`,
        `"${(it.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${listName.toLowerCase().replace(/\s+/g, '_')}_${listDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 CSV file downloaded with Paid & Due tracking!');
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
          background: 'rgba(24, 24, 27, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.45)'
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          
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
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Total Order Value</div>
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

          {/* Card 5: Total Customer Paid */}
          <div style={{ backgroundColor: '#09090b', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399' }}>
              <Wallet style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Total Customer Paid</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
                ৳{totalPaidBdt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#a1a1aa' }}>BDT</span>
              </div>
            </div>
          </div>

          {/* Card 6: Outstanding Customer Due */}
          <div style={{ backgroundColor: '#09090b', border: `1px solid ${totalDueBdt > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`, borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: totalDueBdt > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: `1px solid ${totalDueBdt > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, color: totalDueBdt > 0 ? '#f87171' : '#34d399' }}>
              {totalDueBdt > 0 ? <AlertCircle style={{ width: '24px', height: '24px' }} /> : <CheckCircle2 style={{ width: '24px', height: '24px' }} />}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: totalDueBdt > 0 ? '#f87171' : '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding Due</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: totalDueBdt > 0 ? '#f87171' : '#34d399' }}>
                ৳{totalDueBdt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#a1a1aa' }}>BDT</span>
              </div>
            </div>
          </div>

        </div>

        {/* Payment Quick Actions Bar */}
        {items.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              padding: '10px 14px',
              backgroundColor: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Wallet style={{ width: '18px', height: '18px', color: '#10b981' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Customer Payment Status:</span>
              <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ৳{totalPaidBdt.toLocaleString()} Paid ({totalPriceBdt > 0 ? Math.round((totalPaidBdt / totalPriceBdt) * 100) : 0}%)
              </span>
              <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: totalDueBdt > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: totalDueBdt > 0 ? '#f87171' : '#34d399', fontWeight: 800, border: totalDueBdt > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)' }}>
                {totalDueBdt > 0 ? `৳${totalDueBdt.toLocaleString()} Due` : 'All Paid ✓'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setDepositAmountInput(String(totalDueBdt > 0 ? totalDueBdt : ''));
                  setShowDepositModal(true);
                }}
                title="Record customer advance payment and distribute across items"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CreditCard style={{ width: '14px', height: '14px' }} />
                <span>Record Customer Deposit</span>
              </button>

              <button
                type="button"
                onClick={handleMarkAllPaid}
                title="Mark 100% of all items as paid"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCheck style={{ width: '14px', height: '14px' }} />
                <span>Mark All Paid</span>
              </button>

              <button
                type="button"
                onClick={handleResetAllPayments}
                title="Reset all payments to 0 (all due)"
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw style={{ width: '13px', height: '13px' }} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Unit Price & Currency <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {newCurrency === 'RMB' && Number(newPrice) > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8' }}>
                    ≈ ৳{((Number(newPrice) || 0) * (Number(rmbRate) || 20.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                  </span>
                )}
                {newCurrency === 'USD' && Number(newPrice) > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399' }}>
                    ≈ ৳{((Number(newPrice) || 0) * (Number(usdRate) || 120.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Price"
                    style={{ ...inputStyle, paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8', pointerEvents: 'none', fontWeight: 700 }}>
                    {newCurrency === 'RMB' ? '¥' : newCurrency === 'USD' ? '$' : '৳'}
                  </span>
                </div>
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as any)}
                  style={{ ...inputStyle, width: '95px', backgroundColor: '#18181b', fontWeight: 700 }}
                >
                  <option value="BDT">BDT (৳)</option>
                  <option value="RMB">RMB (¥)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              {/* Dynamic Live Currency Conversion Box */}
              {newCurrency === 'RMB' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#22d3ee', fontWeight: 800 }}>
                        🇨🇳 ¥{Number(newPrice) || 0} RMB
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>➔</span>
                      <span style={{ fontSize: '0.88rem', color: '#38bdf8', fontWeight: 900 }}>
                        ৳{((Number(newPrice) || 0) * (Number(rmbRate) || 20.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Rate: ৳{rmbRate}/RMB
                    </span>
                  </div>

                  {newQuantity > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#67e8f9', borderTop: '1px dashed rgba(6, 182, 212, 0.25)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Batch Total ({newQuantity} units):</span>
                      <span style={{ fontWeight: 800 }}>
                        ¥{((Number(newPrice) || 0) * newQuantity).toFixed(2)} ≈ ৳{((Number(newPrice) || 0) * (Number(rmbRate) || 20.0) * newQuantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                  )}
                </div>
              )}

              {newCurrency === 'USD' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 800 }}>
                        🇺🇸 ${Number(newPrice) || 0} USD
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>➔</span>
                      <span style={{ fontSize: '0.88rem', color: '#4ade80', fontWeight: 900 }}>
                        ৳{((Number(newPrice) || 0) * (Number(usdRate) || 120.0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Rate: ৳{usdRate}/USD
                    </span>
                  </div>

                  {newQuantity > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#86efac', borderTop: '1px dashed rgba(16, 185, 129, 0.25)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Batch Total ({newQuantity} units):</span>
                      <span style={{ fontWeight: 800 }}>
                        ${((Number(newPrice) || 0) * newQuantity).toFixed(2)} ≈ ৳{((Number(newPrice) || 0) * (Number(usdRate) || 120.0) * newQuantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                  )}
                </div>
              )}

              {newCurrency === 'BDT' && newQuantity > 1 && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    color: '#a1a1aa',
                    fontWeight: 500
                  }}
                >
                  Batch Total ({newQuantity} units): <strong style={{ color: '#f8fafc' }}>৳{((Number(newPrice) || 0) * newQuantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT</strong>
                </div>
              )}
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

            {/* Initial Customer Paid Amount */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <Wallet style={{ width: '14px', height: '14px', color: '#34d399' }} />
                  Customer Paid (BDT)
                </label>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                  Due: <strong style={{ color: Number(newPaidAmount) >= (calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (newQuantity || 1)) ? '#34d399' : '#f87171' }}>
                    ৳{Math.max(0, (calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (newQuantity || 1)) - (Number(newPaidAmount) || 0)).toLocaleString()}
                  </strong>
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newPaidAmount}
                  onChange={(e) => setNewPaidAmount(e.target.value)}
                  placeholder="0"
                  style={{ ...inputStyle, paddingRight: '60px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const lineTotal = calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (newQuantity || 1);
                    setNewPaidAmount(String(lineTotal));
                  }}
                  title="Set 100% paid"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: '#27272a',
                    color: '#34d399',
                    border: '1px solid #3f3f46',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Full
                </button>
              </div>
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
                const itemPaid = getItemPaid(item);
                const itemDue = getItemDue(item);
                const itemStatus = getItemStatus(item);

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
                        <div style={{ fontSize: '0.65rem', color: '#71717a' }}>
                          {item.currency !== 'BDT' ? (
                            <span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{item.currency === 'RMB' ? '¥' : '$'}{item.price}</span>
                              {' '}➔ ৳{item.price_bdt.toLocaleString()} / unit
                            </span>
                          ) : (
                            `৳${item.price_bdt.toLocaleString()} / unit`
                          )}
                        </div>
                      </div>

                      {/* Customer Payment & Due Box */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          backgroundColor: '#18181b',
                          border: `1px solid ${itemStatus === 'paid' ? 'rgba(16, 185, 129, 0.4)' : itemStatus === 'partial' ? 'rgba(245, 158, 11, 0.4)' : '#27272a'}`,
                          borderRadius: '10px',
                          padding: '6px 10px'
                        }}
                      >
                        {/* Status Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              textAlign: 'center',
                              backgroundColor:
                                itemStatus === 'paid'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : itemStatus === 'partial'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(239, 68, 68, 0.12)',
                              color:
                                itemStatus === 'paid'
                                  ? '#34d399'
                                  : itemStatus === 'partial'
                                  ? '#fbbf24'
                                  : '#f87171',
                              border:
                                itemStatus === 'paid'
                                  ? '1px solid rgba(16, 185, 129, 0.3)'
                                  : itemStatus === 'partial'
                                  ? '1px solid rgba(245, 158, 11, 0.3)'
                                  : '1px solid rgba(239, 68, 68, 0.25)'
                            }}
                          >
                            {itemStatus === 'paid' ? 'PAID ✓' : itemStatus === 'partial' ? 'PARTIAL' : 'UNPAID'}
                          </span>
                        </div>

                        {/* Paid Input */}
                        <div>
                          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: '#a1a1aa' }}>
                            Customer Paid
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max={lineTotalBdt}
                                step="1"
                                value={itemPaid}
                                onChange={(e) => handleItemPaidChange(item.id, Number(e.target.value) || 0)}
                                style={{
                                  width: '90px',
                                  backgroundColor: '#09090b',
                                  border: '1px solid #3f3f46',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: '#34d399',
                                  outline: 'none'
                                }}
                              />
                              <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#71717a', pointerEvents: 'none' }}>
                                ৳
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMarkItemPaid(item.id)}
                              title="Mark this item fully paid"
                              style={{
                                padding: '4px 6px',
                                borderRadius: '5px',
                                backgroundColor: '#27272a',
                                color: '#34d399',
                                border: '1px solid #3f3f46',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Full
                            </button>
                            {itemPaid > 0 && (
                              <button
                                type="button"
                                onClick={() => handleResetItemPayment(item.id)}
                                title="Reset payment"
                                style={{
                                  padding: '4px',
                                  borderRadius: '5px',
                                  backgroundColor: 'transparent',
                                  color: '#f87171',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <X style={{ width: '12px', height: '12px' }} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Due Display */}
                        <div style={{ textAlign: 'right', minWidth: '75px' }}>
                          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: '#a1a1aa' }}>
                            Customer Due
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: itemDue > 0 ? '#f87171' : '#34d399', marginTop: '2px' }}>
                            ৳{itemDue.toLocaleString()}
                          </div>
                        </div>
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
                        {onPitchToCustomers && (
                          <button
                            onClick={() => onPitchToCustomers(item)}
                            title="Message customers about this product"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#34d399',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginLeft: '4px'
                            }}
                          >
                            <MessageSquare style={{ width: '12px', height: '12px' }} />
                            <span>Pitch</span>
                          </button>
                        )}
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
                        {typeof list.total_paid_bdt === 'number' && (
                          <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                            Paid: ৳{list.total_paid_bdt.toLocaleString()}
                          </div>
                        )}
                        {typeof list.total_due_bdt === 'number' && list.total_due_bdt > 0 && (
                          <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>
                            Due: ৳{list.total_due_bdt.toLocaleString()}
                          </div>
                        )}
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
      {/* 💳 RECORD CUSTOMER DEPOSIT / ADVANCE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showDepositModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <CreditCard style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Record Customer Advance / Deposit
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '2px 0 0 0' }}>
                    Allocate advance payment across product line items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: '#09090b', padding: '8px 10px', borderRadius: '8px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '0.65rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700 }}>Total Order</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>৳{totalPriceBdt.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: '#09090b', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.65rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Current Paid</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>৳{totalPaidBdt.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: '#09090b', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ fontSize: '0.65rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>Current Due</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>৳{totalDueBdt.toLocaleString()}</div>
              </div>
            </div>

            {/* Deposit Input */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                <Wallet style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
                Customer Deposit Amount (BDT) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  placeholder="e.g. 5000"
                  style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 800, paddingLeft: '28px', color: '#38bdf8', border: '1px solid #38bdf8' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#38bdf8', pointerEvents: 'none', fontWeight: 800 }}>
                  ৳
                </span>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setDepositAmountInput(String(totalDueBdt))}
                  style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Pay Full Balance (৳{totalDueBdt.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmountInput(String(Math.round(totalPriceBdt * 0.5)))}
                  style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  50% Advance (৳{Math.round(totalPriceBdt * 0.5).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmountInput(String(Math.round(totalPriceBdt * 0.3)))}
                  style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  30% Advance (৳{Math.round(totalPriceBdt * 0.3).toLocaleString()})
                </button>
              </div>
            </div>

            {/* Allocation Strategy */}
            <div style={{ marginBottom: '1.25rem', backgroundColor: '#09090b', padding: '10px 12px', borderRadius: '8px', border: '1px solid #27272a' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                Allocation Mode:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#f8fafc' }}>
                  <input
                    type="radio"
                    name="allocation_strategy"
                    checked={depositStrategy === 'sequential'}
                    onChange={() => setDepositStrategy('sequential')}
                  />
                  <span><strong>Sequential:</strong> Clear items top-to-bottom in order</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#f8fafc' }}>
                  <input
                    type="radio"
                    name="allocation_strategy"
                    checked={depositStrategy === 'proportional'}
                    onChange={() => setDepositStrategy('proportional')}
                  />
                  <span><strong>Proportional:</strong> Distribute evenly based on item price</span>
                </label>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                style={{ ...buttonActionStyle, backgroundColor: 'transparent' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDeposit}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                }}
              >
                <CheckCheck style={{ width: '16px', height: '16px' }} />
                <span>Apply Customer Deposit</span>
              </button>
            </div>

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
                  Product Sourcing, Weight & Payment Statement
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

          {/* Summary Box Header (5 boxes including Paid & Due) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#1e40af', textTransform: 'uppercase', fontWeight: 'bold' }}>Products</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1d4ed8', marginTop: '2px' }}>
                {totalItemsCount} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>({totalQuantity} pcs)</span>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#92400e', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Weight</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#b45309', marginTop: '2px' }}>
                {totalWeightKg.toFixed(3)} kg
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#334155', textTransform: 'uppercase', fontWeight: 'bold' }}>Order Value</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                ৳{totalPriceBdt.toLocaleString()}
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#065f46', textTransform: 'uppercase', fontWeight: 'bold' }}>Customer Paid</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#047857', marginTop: '2px' }}>
                ৳{totalPaidBdt.toLocaleString()}
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: totalDueBdt > 0 ? '#fef2f2' : '#ecfdf5', border: `1px solid ${totalDueBdt > 0 ? '#fecaca' : '#a7f3d0'}`, borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: totalDueBdt > 0 ? '#991b1b' : '#065f46', textTransform: 'uppercase', fontWeight: 'bold' }}>Customer Due</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: totalDueBdt > 0 ? '#b91c1c' : '#047857', marginTop: '2px' }}>
                ৳{totalDueBdt.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Products Table with Paid & Due */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1f2937', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '6px', width: '20px' }}>#</th>
                <th style={{ padding: '6px', width: '38px' }}>Image</th>
                <th style={{ padding: '6px' }}>Product Details</th>
                <th style={{ padding: '6px', width: '60px' }}>Source Link</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '50px' }}>Unit Price</th>
                <th style={{ padding: '6px', textAlign: 'center', width: '25px' }}>Qty</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '55px' }}>Line Total</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '50px' }}>Paid (BDT)</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '50px' }}>Due (BDT)</th>
                <th style={{ padding: '6px', textAlign: 'center', width: '45px' }}>Status</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '45px' }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = getItemLineTotal(item);
                const paid = getItemPaid(item);
                const due = getItemDue(item);
                const status = getItemStatus(item);

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '6px', fontWeight: 'bold', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '6px' }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" style={{ width: '34px', height: '34px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '34px', height: '34px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
                      )}
                    </td>
                    <td style={{ padding: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '10px' }}>{item.title}</div>
                      {item.details && <div style={{ color: '#4b5563', fontSize: '8px', marginTop: '1px' }}>{item.details}</div>}
                      {item.platform && <div style={{ color: '#dc2626', fontSize: '7.5px', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '1px' }}>Platform: {item.platform}</div>}
                    </td>
                    <td style={{ padding: '6px', wordBreak: 'break-all' }}>
                      {item.product_url ? (
                        <a href={item.product_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                          View Link
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: '500' }}>
                      {item.currency !== 'BDT' ? `${item.currency === 'RMB' ? '¥' : '$'}${item.price} (৳${item.price_bdt.toLocaleString()})` : `৳${item.price_bdt.toLocaleString()}`}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>
                      ৳{lineTotal.toLocaleString()}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>
                      ৳{paid.toLocaleString()}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', color: due > 0 ? '#b91c1c' : '#047857' }}>
                      ৳{due.toLocaleString()}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '7.5px',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          backgroundColor: status === 'paid' ? '#dcfce7' : status === 'partial' ? '#fef3c7' : '#fee2e2',
                          color: status === 'paid' ? '#166534' : status === 'partial' ? '#92400e' : '#991b1b'
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#b45309' }}>
                      {(item.weight_kg * item.quantity).toFixed(3)} kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Grand Totals Footer with Paid & Due */}
          <div style={{ backgroundColor: '#111827', color: '#ffffff', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>GRAND TOTAL STATEMENT</div>
              <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>Formatted for A4 Standard Paper</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 'bold' }}>TOTAL WEIGHT</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24' }}>{totalWeightKg.toFixed(3)} kg</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>TOTAL ORDER</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>৳{totalPriceBdt.toLocaleString()} BDT</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#34d399', textTransform: 'uppercase', fontWeight: 'bold' }}>TOTAL PAID</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#34d399' }}>৳{totalPaidBdt.toLocaleString()} BDT</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: totalDueBdt > 0 ? '#f87171' : '#34d399', textTransform: 'uppercase', fontWeight: 'bold' }}>OUTSTANDING DUE</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: totalDueBdt > 0 ? '#f87171' : '#34d399' }}>৳{totalDueBdt.toLocaleString()} BDT</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '9px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
            Generated by OMNI Sourcing & Costing Engine • Customer Payment & Balance Statement
          </div>
        </div>
      </div>

    </div>
  );
}
