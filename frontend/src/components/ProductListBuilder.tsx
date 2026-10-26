'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OMNI_LOGO_BASE64, OMNI_QR_BASE64 } from '@/lib/pdfAssets';
import { WHATSAPP_GROUP_URL, openWhatsAppGroup } from '@/config/whatsapp';
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
  AlertCircle,
  Send,
  Copy,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  FileSpreadsheet,
  CheckSquare,
  ListChecks
} from 'lucide-react';
import { exportSingleOrderToExcel, exportAllOrdersToExcel } from '@/lib/excelExport';
import { getAuthHeaders } from '@/services/customerApi';
import SmartScreenshotExtractor from '@/components/SmartScreenshotExtractor';
import { ExtractedProductData } from '@/types/screenshotExtractor';



export interface ChecklistTask {
  id: string;
  text: string;
  completed: boolean;
  category?: 'sourcing' | 'payment' | 'shipping' | 'delivery' | 'custom';
}

export const DEFAULT_SOURCING_CHECKLIST: ChecklistTask[] = [
  { id: 'task-1', text: 'Supplier / Factory stock confirmed (1688 / Taobao / Factory Direct)', completed: false, category: 'sourcing' },
  { id: 'task-2', text: 'Sample photos & product specifications verified with supplier', completed: false, category: 'sourcing' },
  { id: 'task-3', text: 'Customer advance deposit received & receipt issued', completed: false, category: 'payment' },
  { id: 'task-4', text: 'Cargo freight rate & logistics route confirmed with agent', completed: false, category: 'shipping' },
  { id: 'task-5', text: 'Goods arrived at China warehouse & inspected for damages', completed: false, category: 'shipping' },
  { id: 'task-6', text: 'Package weighed, boxed & gross weight verified', completed: false, category: 'shipping' },
  { id: 'task-7', text: 'Air / Sea Cargo booked & transit tracking generated', completed: false, category: 'delivery' },
  { id: 'task-8', text: 'Customs clearance completed in Bangladesh warehouse', completed: false, category: 'delivery' },
  { id: 'task-9', text: 'Final customer payment collected & parcel dispatched', completed: false, category: 'payment' },
];

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
  images?: string[];
  product_url?: string;
  platform?: string;
  notes?: string;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: 'paid' | 'partial' | 'unpaid';
  // Weight Price / Freight fields
  weight_price_bdt?: number;
  line_weight_price_bdt?: number;
  combined_unit_price_bdt?: number;
  combined_line_total_bdt?: number;
  // Sourcing checklist check state
  is_checked?: boolean;
}

export interface SavedProductList {
  id: string;
  name: string;
  brand_name?: string;
  date: string;
  items: ProductItem[];
  total_price_bdt: number;
  total_weight_kg: number;
  total_items_count: number;
  total_quantity: number;
  total_paid_bdt?: number;
  total_due_bdt?: number;
  total_weight_price_bdt?: number;
  grand_total_bdt?: number;
  freight_rate?: number;
  freight_unit?: string;
  payment_status?: string;
  notes?: string;
  checklist?: ChecklistTask[];
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
  defaultFreightRate?: string;
  defaultFreightUnit?: 'per_gm' | 'per_kg';
  onPitchToCustomers?: (item: ProductItem) => void;
}

export const formatExternalUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

/**
 * Compresses an uploaded image File using an HTML5 Canvas to keep local storage small
 * and prevent QuotaExceededError while retaining high quality for PDF generation.
 */
export const compressImageFile = (file: File, maxDimension = 900, quality = 0.82): Promise<string> => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve((e.target?.result as string) || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export default function ProductListBuilder({
  items,
  onUpdateItems,
  apiUrl,
  showToast,
  defaultRmbRate,
  defaultUsdRate,
  defaultFreightRate,
  defaultFreightUnit,
  onPitchToCustomers
}: ProductListBuilderProps) {
  // Top Header Metadata (empty list name by default)
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  const [listName, setListName] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('OMNI SOURCING');
  const [listDate, setListDate] = useState<string>(getTodayDate());
  const [listNotes, setListNotes] = useState<string>('');
  const [currentListId, setCurrentListId] = useState<string | null>(null);

  // New Item Form State (Sequential Adding - All boxes empty by default)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDetails, setNewDetails] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCurrency, setNewCurrency] = useState<'BDT' | 'RMB' | 'USD'>('RMB');
  const [rmbRate, setRmbRate] = useState<string>(defaultRmbRate || '20.00');
  const [usdRate, setUsdRate] = useState<string>(defaultUsdRate || '120.00');

  // Freight Rate & Weight Price Configuration (Default: 1.2 Tk/gm = 1,200 Tk/kg)
  const [freightRate, setFreightRate] = useState<string>(defaultFreightRate || '1.2');
  const [freightUnit, setFreightUnit] = useState<'per_gm' | 'per_kg'>(defaultFreightUnit || 'per_gm');
  const [includeWeightInTotal, setIncludeWeightInTotal] = useState<boolean>(true);

  // Keep rates in sync if defaults change
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

  useEffect(() => {
    if (defaultFreightRate && Number(defaultFreightRate) > 0) {
      setFreightRate(defaultFreightRate);
    }
  }, [defaultFreightRate]);

  useEffect(() => {
    if (defaultFreightUnit) {
      setFreightUnit(defaultFreightUnit);
    }
  }, [defaultFreightUnit]);
  
  const [newWeightVal, setNewWeightVal] = useState<string>('');
  const [newWeightUnit, setNewWeightUnit] = useState<'kg' | 'gm'>('gm');
  
  const [newQuantity, setNewQuantity] = useState<number | string>('');
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newPlatform, setNewPlatform] = useState<string>('Pinduoduo');
  const [newPaidAmount, setNewPaidAmount] = useState<string>('');

  // Customer Deposit / Advance Modal State
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [depositStrategy, setDepositStrategy] = useState<'sequential' | 'proportional'>('sequential');

  // PDF Export Mode: 'single_page' (strict 1-page A4) vs 'multi_page' (natural multi-page flow)
  const [pdfExportMode, setPdfExportMode] = useState<'single_page' | 'multi_page'>('single_page');

  // WhatsApp Quotation Sharing Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('');
  const [waIncludeLinks, setWaIncludeLinks] = useState<boolean>(true);
  const [waIncludeFreight, setWaIncludeFreight] = useState<boolean>(true);
  const [waIncludeFacebook, setWaIncludeFacebook] = useState<boolean>(true);
  const [waIncludeGroup, setWaIncludeGroup] = useState<boolean>(true);

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

  // Save Sourcing List Modal State
  const [showSaveListModal, setShowSaveListModal] = useState<boolean>(false);
  const [saveListNameInput, setSaveListNameInput] = useState<string>('');
  const [saveBrandNameInput, setSaveBrandNameInput] = useState<string>('');
  const [saveDateInput, setSaveDateInput] = useState<string>(getTodayDate());
  const [saveNotesInput, setSaveNotesInput] = useState<string>('');

  // Sourcing & Order To-Do Checklist State
  const [checklist, setChecklist] = useState<ChecklistTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('omni_builder_checklist');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_SOURCING_CHECKLIST;
  });
  const [newChecklistText, setNewChecklistText] = useState<string>('');
  const [showChecklistSection, setShowChecklistSection] = useState<boolean>(true);

  // Lightbox Photo Viewer State
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    images: string[];
    currentIndex: number;
    productUrl?: string;
  } | null>(null);

  // Keyboard navigation for Lightbox Photo Viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewModal) return;
      if (e.key === 'Escape') {
        setPreviewModal(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewModal((prev) => {
          if (!prev || prev.images.length <= 1) return prev;
          const nextIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1;
          return { ...prev, currentIndex: nextIdx };
        });
      } else if (e.key === 'ArrowRight') {
        setPreviewModal((prev) => {
          if (!prev || prev.images.length <= 1) return prev;
          const nextIdx = prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0;
          return { ...prev, currentIndex: nextIdx };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModal]);

  // Auto-save & restore from localStorage
  useEffect(() => {
    const cachedData = localStorage.getItem('omni_active_product_list');
    if (cachedData && items.length === 0) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          onUpdateItems(parsed.items);
          if (parsed.name) setListName(parsed.name);
          if (parsed.brandName) setBrandName(parsed.brandName);
          if (parsed.date) setListDate(parsed.date);
          if (parsed.notes) setListNotes(parsed.notes);
          if (parsed.id) setCurrentListId(parsed.id);
          if (parsed.freightRate) setFreightRate(parsed.freightRate);
          if (parsed.freightUnit) setFreightUnit(parsed.freightUnit);
          if (typeof parsed.includeWeightInTotal === 'boolean') setIncludeWeightInTotal(parsed.includeWeightInTotal);
          if (parsed.checklist && Array.isArray(parsed.checklist) && parsed.checklist.length > 0) {
            setChecklist(parsed.checklist);
          }
        }
      } catch (e) {
        console.error('Failed to load local cached product list:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (items.length > 0 || listName.trim()) {
      const listPayload = {
        id: currentListId,
        name: listName,
        brandName,
        date: listDate,
        notes: listNotes,
        freightRate,
        freightUnit,
        includeWeightInTotal,
        checklist,
        items
      };
      try {
        localStorage.setItem('omni_active_product_list', JSON.stringify(listPayload));
      } catch (e) {
        console.warn('LocalStorage quota limit reached, skipping auto-cache:', e);
      }
    } else {
      try {
        localStorage.removeItem('omni_active_product_list');
      } catch (e) {
        // ignore
      }
    }
  }, [listName, brandName, listDate, listNotes, items, currentListId, freightRate, freightUnit, includeWeightInTotal, checklist]);

  // Reset / Refresh Product List Builder to clean default state
  const resetToDefaultBuilder = () => {
    onUpdateItems([]);
    setListName('');
    setBrandName('OMNI SOURCING');
    setListDate(getTodayDate());
    setListNotes('');
    setCurrentListId(null);
    setNewTitle('');
    setNewDetails('');
    setNewPrice('');
    setNewCurrency('RMB');
    setNewWeightVal('');
    setNewWeightUnit('gm');
    setNewQuantity('');
    setNewPaidAmount('');
    setNewProductUrl('');
    setNewImageUrl('');
    setNewImages([]);
    setChecklist(DEFAULT_SOURCING_CHECKLIST);
    try {
      localStorage.removeItem('omni_active_product_list');
      localStorage.removeItem('omni_builder_checklist');
    } catch (e) {
      // ignore
    }
  };

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

  // Weight & Freight Price Math (Defaults to 1.2 Tk/gm = 1,200 Tk/kg)
  const calculateUnitWeightPriceBdt = (weightKg: number, rateStr: string, unit: 'per_gm' | 'per_kg'): number => {
    const rate = Number(rateStr) || 0;
    if (rate <= 0 || weightKg <= 0) return 0;
    if (unit === 'per_gm') {
      const weightGm = weightKg * 1000.0;
      return weightGm * rate;
    } else {
      return weightKg * rate;
    }
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
    const qty = Math.max(1, Number(newQuantity) || 1);

    // Dynamic Weight Price Calculation
    const unitWeightPrice = calculateUnitWeightPriceBdt(weightKg, freightRate, freightUnit);
    const lineWeightPrice = unitWeightPrice * qty;
    const lineProductTotal = priceBdt * qty;
    const combinedLineTotal = lineProductTotal + lineWeightPrice;

    const lineTotalBdt = includeWeightInTotal ? combinedLineTotal : lineProductTotal;
    const paidNum = Math.max(0, Number(newPaidAmount) || 0);
    const dueNum = Math.max(0, lineTotalBdt - paidNum);
    const itemStatus: 'paid' | 'partial' | 'unpaid' =
      dueNum === 0 && paidNum > 0 ? 'paid' : (paidNum > 0 ? 'partial' : 'unpaid');

    // Collect all added images
    const imagesList = [...newImages];
    if (newImageUrl.trim() && !imagesList.includes(newImageUrl.trim())) {
      imagesList.push(newImageUrl.trim());
    }
    const defaultPlaceholder = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80';
    const primaryImg = imagesList[0] || defaultPlaceholder;
    const finalImages = imagesList.length > 0 ? imagesList : [primaryImg];

    const newItem: ProductItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTitle.trim(),
      details: newDetails.trim(),
      price: priceNum,
      currency: newCurrency,
      price_bdt: priceBdt,
      weight_kg: Number(weightKg.toFixed(3)),
      quantity: qty,
      weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
      line_weight_price_bdt: Number(lineWeightPrice.toFixed(2)),
      combined_unit_price_bdt: Number((priceBdt + unitWeightPrice).toFixed(2)),
      combined_line_total_bdt: Number(combinedLineTotal.toFixed(2)),
      product_url: newProductUrl.trim() ? formatExternalUrl(newProductUrl) : undefined,
      image_url: primaryImg,
      images: finalImages,
      platform: newPlatform,
      paid_amount: paidNum,
      due_amount: dueNum,
      payment_status: itemStatus
    };

    onUpdateItems([...items, newItem]);
    showToast(`✅ Added "${newItem.title}" (${finalImages.length} photo${finalImages.length > 1 ? 's' : ''}) to product list!`);

    // Reset form to empty boxes by default
    setNewTitle('');
    setNewDetails('');
    setNewPrice('');
    setNewCurrency('RMB');
    setNewWeightVal('');
    setNewWeightUnit('gm');
    setNewPaidAmount('');
    setNewProductUrl('');
    setNewImageUrl('');
    setNewImages([]);
    setNewQuantity('');
    setNewPlatform('Pinduoduo');
  };

  // Handler for Smart Screenshot Extractor auto-fill
  const handleAutoFillFromScreenshot = (data: ExtractedProductData) => {
    if (data.productName) {
      setNewTitle(data.productName);
    }
    if (typeof data.priceCNY === 'number' && data.priceCNY > 0) {
      setNewPrice(String(data.priceCNY));
      setNewCurrency('RMB');
    }
    if (data.exchangeRate && data.exchangeRate > 0) {
      setRmbRate(String(data.exchangeRate));
    }

    // Weight: ONLY if explicit weight was found on screenshot, calculate and fill 1.2x weight.
    // If no weight was found in screenshot, leave it empty for manual input.
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    if (hasWeight && data.finalWeightKg) {
      if (newWeightUnit === 'gm') {
        setNewWeightVal(String(Math.round(data.finalWeightKg * 1000)));
      } else {
        setNewWeightVal(String(data.finalWeightKg));
      }
    } else {
      // User requirement: No automatic/base weight - leave empty for manual input!
      setNewWeightVal('');
    }

    // Available Colors / Variants
    if (data.colors && data.colors.length > 0) {
      const colorSpec = `Colors: ${data.colors.join(', ')}`;
      setNewDetails((prev) => (prev ? `${prev} | ${colorSpec}` : colorSpec));
    }

    // Cropped or uploaded product image thumbnail
    const primaryImg = data.croppedImageDataUrl || data.originalImageDataUrl;
    if (primaryImg) {
      setNewImages((prev) => [primaryImg, ...prev.filter((img) => img !== primaryImg)]);
    }

    if (data.platformDetected) {
      setNewPlatform(data.platformDetected);
    }
  };

  // Handler to add extracted screenshot directly to the product list
  const handleAddDirectlyToListFromScreenshot = (data: ExtractedProductData) => {
    const priceNum = data.priceCNY || 0;
    const rateNum = Number(data.exchangeRate || rmbRate || 17.5);
    const priceBdt = Math.round(priceNum * rateNum * 100) / 100;
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    const finalWeightKg = hasWeight && data.finalWeightKg ? data.finalWeightKg : 0;
    const unitWeightPrice = finalWeightKg > 0 ? calculateUnitWeightPriceBdt(finalWeightKg, freightRate, freightUnit) : 0;

    const primaryImg = data.croppedImageDataUrl || data.originalImageDataUrl || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80';

    const newItem: ProductItem = {
      id: `prod_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.productName || 'Imported Sourced Product',
      details: data.colors && data.colors.length > 0 ? `Colors: ${data.colors.join(', ')}` : '',
      price: priceNum,
      currency: 'RMB',
      price_bdt: priceBdt,
      weight_kg: Number(finalWeightKg.toFixed(3)),
      quantity: 1,
      weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
      line_weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
      combined_unit_price_bdt: Number((priceBdt + unitWeightPrice).toFixed(2)),
      combined_line_total_bdt: Number((priceBdt + unitWeightPrice).toFixed(2)),
      image_url: primaryImg,
      images: [primaryImg],
      platform: data.platformDetected || '1688',
      paid_amount: 0,
      due_amount: Number((priceBdt + unitWeightPrice).toFixed(2)),
      payment_status: 'unpaid'
    };

    onUpdateItems([...items, newItem]);
    showToast(
      hasWeight
        ? `✅ Added "${newItem.title}" with 1.2× packaging weight to product list!`
        : `✅ Added "${newItem.title}" to product list (weight left empty for manual update)!`
    );
  };

  // Helper calculations for items
  const getItemProductLineTotal = (item: ProductItem): number => {
    return (item.price_bdt || 0) * (item.quantity || 1);
  };

  const getItemUnitWeightPrice = (item: ProductItem): number => {
    if (typeof item.weight_price_bdt === 'number' && item.weight_price_bdt > 0) {
      return item.weight_price_bdt;
    }
    return calculateUnitWeightPriceBdt(item.weight_kg || 0, freightRate, freightUnit);
  };

  const getItemLineWeightPrice = (item: ProductItem): number => {
    if (typeof item.line_weight_price_bdt === 'number' && item.line_weight_price_bdt > 0) {
      return item.line_weight_price_bdt;
    }
    return getItemUnitWeightPrice(item) * (item.quantity || 1);
  };

  const getItemCombinedLineTotal = (item: ProductItem): number => {
    const productLine = getItemProductLineTotal(item);
    const weightLine = getItemLineWeightPrice(item);
    return includeWeightInTotal ? (productLine + weightLine) : productLine;
  };

  const getItemLineTotal = (item: ProductItem): number => {
    return getItemCombinedLineTotal(item);
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
    const newTotalDue = Math.max(0, effectiveTotalOrderBdt - newTotalPaid);
    setShowDepositModal(false);
    showToast(`💰 Applied ৳${deposit.toLocaleString()} deposit! Remaining balance: ৳${newTotalDue.toLocaleString()}`);
  };

  // Image Upload File Reader (Multiple Files Supported with Client-Side Canvas Compression)
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      showToast(`📸 Optimizing & uploading ${files.length} photo(s)...`);
      try {
        const compressedUrls = await Promise.all(files.map(f => compressImageFile(f)));
        const validUrls = compressedUrls.filter(Boolean);
        setNewImages((prev) => [...prev, ...validUrls]);
        showToast(`✅ ${validUrls.length} image(s) optimized & uploaded!`);
      } catch (err) {
        console.error('Image compression failed:', err);
        showToast('⚠️ Failed to optimize image(s)');
      }
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setNewImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
    showToast('📸 Image URL added!');
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Add more images to an existing item directly in the list with client-side canvas compression
  const handleAddImagesToExistingItem = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      showToast(`📸 Optimizing & adding ${files.length} photo(s)...`);
      try {
        const compressedUrls = await Promise.all(files.map(f => compressImageFile(f)));
        const validUrls = compressedUrls.filter(Boolean);
        if (validUrls.length > 0) {
          onUpdateItems(items.map(it => {
            if (it.id === itemId) {
              const currentImages = (it.images && it.images.length > 0) ? [...it.images] : (it.image_url ? [it.image_url] : []);
              const updatedImages = [...currentImages, ...validUrls];
              return {
                ...it,
                images: updatedImages,
                image_url: updatedImages[0]
              };
            }
            return it;
          }));
          showToast(`📸 Added ${validUrls.length} optimized image(s) to product!`);
        }
      } catch (err) {
        console.error('Add image to item failed:', err);
        showToast('⚠️ Failed to optimize image(s)');
      }
      e.target.value = '';
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
        const lineProduct = item.price_bdt * qty;
        const unitWeightPrice = getItemUnitWeightPrice(item);
        const lineWeight = unitWeightPrice * qty;
        const combined = lineProduct + lineWeight;
        const lineTotal = includeWeightInTotal ? combined : lineProduct;
        const paid = Math.min(lineTotal, getItemPaid(item));
        const due = Math.max(0, lineTotal - paid);
        const status: 'paid' | 'partial' | 'unpaid' = due === 0 && paid > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
        return {
          ...item,
          quantity: qty,
          line_weight_price_bdt: Number(lineWeight.toFixed(2)),
          combined_line_total_bdt: Number(combined.toFixed(2)),
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
        const editedWeightKg = Math.max(0, editItemState.weight_kg ?? item.weight_kg);

        const unitWeightPrice = calculateUnitWeightPriceBdt(editedWeightKg, freightRate, freightUnit);
        const lineWeight = unitWeightPrice * editedQty;
        const lineProduct = editedPriceBdt * editedQty;
        const combined = lineProduct + lineWeight;
        const lineTotal = includeWeightInTotal ? combined : lineProduct;

        const paid = Math.min(lineTotal, editItemState.paid_amount ?? getItemPaid(item));
        const due = Math.max(0, lineTotal - paid);
        const status: 'paid' | 'partial' | 'unpaid' = due === 0 && paid > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
        return {
          ...item,
          ...editItemState,
          price: editedPrice,
          currency: editedCurr,
          price_bdt: editedPriceBdt,
          weight_kg: editedWeightKg,
          quantity: editedQty,
          weight_price_bdt: Number(unitWeightPrice.toFixed(2)),
          line_weight_price_bdt: Number(lineWeight.toFixed(2)),
          combined_unit_price_bdt: Number((editedPriceBdt + unitWeightPrice).toFixed(2)),
          combined_line_total_bdt: Number(combined.toFixed(2)),
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

  // Total Calculations (Itemized Product Value + Weight Freight Price)
  const totalProductPriceBdt = items.reduce((sum, item) => sum + getItemProductLineTotal(item), 0);
  const totalWeightKg = items.reduce((sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 1), 0);
  const totalWeightPriceBdt = items.reduce((sum, item) => sum + getItemLineWeightPrice(item), 0);
  const grandTotalBdt = totalProductPriceBdt + totalWeightPriceBdt;
  const totalPriceBdt = totalProductPriceBdt; // pure product price for backend compatibility
  const effectiveTotalOrderBdt = includeWeightInTotal ? grandTotalBdt : totalProductPriceBdt;
  const totalPaidBdt = items.reduce((sum, item) => sum + getItemPaid(item), 0);
  const totalDueBdt = Math.max(0, effectiveTotalOrderBdt - totalPaidBdt);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalItemsCount = items.length;

  // Sourcing & Order Checklist metrics
  const checklistCompletedCount = checklist.filter(t => t.completed).length;
  const checklistProgress = checklist.length > 0 ? Math.round((checklistCompletedCount / checklist.length) * 100) : 0;
  const checkedItemsCount = items.filter(it => it.is_checked).length;

  // Estimated Landed Cost (Total Product Price + Air Freight + 20% Duty/Fees)
  const totalFreightBdt = totalWeightPriceBdt > 0 ? totalWeightPriceBdt : totalWeightKg * 1200;
  const estimatedLandedTotalBdt = totalPriceBdt + totalFreightBdt + totalPriceBdt * 0.20;

  // Clear List
  const handleClearList = () => {
    if (items.length === 0) return;
    if (confirm('Are you sure you want to clear all products from this list?')) {
      resetToDefaultBuilder();
      showToast('🧹 Product list cleared and refreshed to default');
    }
  };

  // Checklists and Tasks Handlers
  const handleToggleChecklistTask = (id: string) => {
    setChecklist(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      try {
        localStorage.setItem('omni_builder_checklist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleAddCustomTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newChecklistText.trim();
    if (!trimmed) return;
    const newTask: ChecklistTask = {
      id: `custom-task-${Date.now()}`,
      text: trimmed,
      completed: false,
      category: 'custom'
    };
    setChecklist(prev => {
      const updated = [...prev, newTask];
      try {
        localStorage.setItem('omni_builder_checklist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setNewChecklistText('');
    showToast('✓ Custom to-do task added');
  };

  const handleRemoveChecklistTask = (id: string) => {
    setChecklist(prev => {
      const updated = prev.filter(t => t.id !== id);
      try {
        localStorage.setItem('omni_builder_checklist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast('Task removed from checklist');
  };

  const handleResetChecklist = () => {
    setChecklist(DEFAULT_SOURCING_CHECKLIST);
    try {
      localStorage.setItem('omni_builder_checklist', JSON.stringify(DEFAULT_SOURCING_CHECKLIST));
    } catch (e) {}
    showToast('🔄 Checklist reset to default milestones');
  };

  const handleToggleItemChecked = (itemId: string) => {
    const updated = items.map(it => it.id === itemId ? { ...it, is_checked: !it.is_checked } : it);
    onUpdateItems(updated);
  };

  const handleCheckAllItems = () => {
    const updated = items.map(it => ({ ...it, is_checked: true }));
    onUpdateItems(updated);
    showToast('✓ All product items marked as sourced!');
  };

  const handleUncheckAllItems = () => {
    const updated = items.map(it => ({ ...it, is_checked: false }));
    onUpdateItems(updated);
    showToast('Unchecked all product items');
  };

  // Open Save Sourcing List Modal
  const handleOpenSaveModal = () => {
    if (items.length === 0) {
      showToast('⚠️ Cannot save an empty list! Add some products first.');
      return;
    }
    setSaveListNameInput(listName.trim() || `Sourcing Order - ${listDate}`);
    setSaveBrandNameInput(brandName.trim() || 'OMNI SOURCING');
    setSaveDateInput(listDate);
    setSaveNotesInput(listNotes || '');
    setShowSaveListModal(true);
  };

  // Save alias that opens the save modal
  const handleSaveToServer = () => {
    handleOpenSaveModal();
  };

  // Execute Save (Dual option: Keep Working vs Start New List)
  const handleExecuteSave = async (startNewList: boolean = false) => {
    if (items.length === 0) {
      showToast('⚠️ Cannot save an empty list! Add some products first.');
      return;
    }

    const finalListName = saveListNameInput.trim() || listName.trim() || 'My Sourcing Product List';
    const finalBrandName = saveBrandNameInput.trim() || brandName.trim() || 'OMNI SOURCING';
    const finalDate = saveDateInput || listDate;
    const finalNotes = saveNotesInput.trim();

    setListName(finalListName);
    setBrandName(finalBrandName);
    setListDate(finalDate);
    setListNotes(finalNotes);

    setSavingToServer(true);
    try {
      const payload = {
        name: finalListName,
        brand_name: finalBrandName,
        date: finalDate,
        notes: finalNotes,
        freight_rate: Number(freightRate) || 1.2,
        freight_unit: freightUnit,
        checklist: checklist || [],
        items: items.map(it => {
          const unitWeightPrice = getItemUnitWeightPrice(it);
          const lineWeightPrice = getItemLineWeightPrice(it);
          const lineProductPrice = getItemProductLineTotal(it);
          const combinedLineTotal = lineProductPrice + lineWeightPrice;
          return {
            ...it,
            images: (it.images && it.images.length > 0) ? it.images : (it.image_url ? [it.image_url] : []),
            weight_price_bdt: unitWeightPrice,
            line_weight_price_bdt: lineWeightPrice,
            combined_unit_price_bdt: it.price_bdt + unitWeightPrice,
            combined_line_total_bdt: combinedLineTotal,
            paid_amount: getItemPaid(it),
            paid_amount_bdt: getItemPaid(it),
            due_amount: getItemDue(it),
            due_amount_bdt: getItemDue(it),
            payment_status: getItemStatus(it),
            is_checked: !!it.is_checked
          };
        }),
        total_price_bdt: totalProductPriceBdt,
        total_weight_price_bdt: totalWeightPriceBdt,
        grand_total_bdt: grandTotalBdt,
        total_paid_bdt: totalPaidBdt,
        total_due_bdt: totalDueBdt,
        payment_status: totalDueBdt === 0 && effectiveTotalOrderBdt > 0 ? 'paid' : (totalPaidBdt > 0 ? 'partial' : 'unpaid')
      };

      let res;
      if (currentListId) {
        res = await fetch(`${apiUrl}/product-lists/${currentListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${apiUrl}/product-lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });
      }

      if (res && res.ok) {
        try {
          const savedData = await res.json();
          if (savedData?.id) {
            setCurrentListId(savedData.id);
          }
        } catch (e) {}
      }

      // Also persist to localStorage omni_saved_product_lists as safe backup
      try {
        const localSaved = localStorage.getItem('omni_saved_product_lists');
        const listArr: SavedProductList[] = localSaved ? JSON.parse(localSaved) : [];
        const newEntry: SavedProductList = {
          id: currentListId || `local-${Date.now()}`,
          name: finalListName,
          brand_name: finalBrandName,
          date: finalDate,
          items: items,
          total_price_bdt: totalProductPriceBdt,
          total_weight_kg: totalWeightKg,
          total_items_count: items.length,
          total_quantity: totalQuantity,
          total_paid_bdt: totalPaidBdt,
          total_due_bdt: totalDueBdt,
          total_weight_price_bdt: totalWeightPriceBdt,
          grand_total_bdt: grandTotalBdt,
          freight_rate: Number(freightRate) || 1.2,
          freight_unit: freightUnit,
          notes: finalNotes,
          checklist: checklist
        };
        const existingIdx = listArr.findIndex(l => l.id === newEntry.id);
        if (existingIdx >= 0) {
          listArr[existingIdx] = newEntry;
        } else {
          listArr.unshift(newEntry);
        }
        localStorage.setItem('omni_saved_product_lists', JSON.stringify(listArr));
      } catch (e) {}

      setShowSaveListModal(false);

      if (startNewList) {
        showToast(`💾 Saved "${finalListName}"! Starting a fresh new list.`);
        resetToDefaultBuilder();
      } else {
        showToast(`💾 List "${finalListName}" saved successfully! You can keep editing.`);
      }
    } catch (err) {
      console.error('Save error:', err);
      setShowSaveListModal(false);
      if (startNewList) {
        showToast('💾 Saved list locally! Starting fresh new list.');
        resetToDefaultBuilder();
      } else {
        showToast('💾 List saved locally to browser storage! You can keep editing.');
      }
    } finally {
      setSavingToServer(false);
    }
  };

  // Fetch Saved Lists from Server
  const handleOpenSavedModal = async () => {
    setShowSavedModal(true);
    setLoadingSaved(true);
    try {
      const res = await fetch(`${apiUrl}/product-lists`, {
        headers: getAuthHeaders()
      });
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
    if (saved.brand_name) setBrandName(saved.brand_name);
    setListDate(saved.date);
    setListNotes(saved.notes || '');
    if (saved.freight_rate) setFreightRate(String(saved.freight_rate));
    if (saved.freight_unit && (saved.freight_unit === 'per_gm' || saved.freight_unit === 'per_kg')) {
      setFreightUnit(saved.freight_unit as any);
    }

    if (saved.checklist && Array.isArray(saved.checklist) && saved.checklist.length > 0) {
      setChecklist(saved.checklist);
      try {
        localStorage.setItem('omni_builder_checklist', JSON.stringify(saved.checklist));
      } catch (e) {}
    } else {
      setChecklist(DEFAULT_SOURCING_CHECKLIST);
    }

    const loadedItems: ProductItem[] = (saved.items || []).map((it) => {
      const paid = Number(it.paid_amount ?? (it as any).paid_amount_bdt) || 0;
      const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
      const unitWeightPrice = typeof it.weight_price_bdt === 'number' && it.weight_price_bdt > 0
        ? it.weight_price_bdt
        : calculateUnitWeightPriceBdt(it.weight_kg || 0, String(saved.freight_rate || freightRate), (saved.freight_unit as any) || freightUnit);
      const lineWeightPrice = unitWeightPrice * (it.quantity || 1);
      const combinedLineTotal = lineProduct + lineWeightPrice;
      const lineTotal = combinedLineTotal;
      const due = typeof it.due_amount === 'number' 
        ? it.due_amount 
        : (typeof (it as any).due_amount_bdt === 'number' 
            ? (it as any).due_amount_bdt 
            : Math.max(0, lineTotal - paid));
      const status = (it.payment_status as any) || (due === 0 && paid > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));
      return {
        ...it,
        images: (it.images && it.images.length > 0) ? it.images : (it.image_url ? [it.image_url] : []),
        weight_price_bdt: unitWeightPrice,
        line_weight_price_bdt: lineWeightPrice,
        combined_unit_price_bdt: (it.price_bdt || 0) + unitWeightPrice,
        combined_line_total_bdt: combinedLineTotal,
        paid_amount: paid,
        due_amount: due,
        payment_status: status,
        is_checked: !!it.is_checked
      };
    });

    onUpdateItems(loadedItems);
    setShowSavedModal(false);
    showToast(`📂 Loaded list: "${saved.name}" with weight prices`);
  };

  // Delete Saved List
  const handleDeleteSavedList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved list?')) return;
    try {
      await fetch(`${apiUrl}/product-lists/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      setSavedLists(savedLists.filter((l) => l.id !== id));
      showToast('🗑️ Saved list deleted');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Share Summary Text with Weight Price, Paid & Due tracking
  const handleShareSummary = () => {
    if (items.length === 0) {
      showToast('⚠️ Add items to list before sharing!');
      return;
    }

    const lines = [
      `📋 PRODUCT SOURCING, WEIGHT PRICE & PAYMENT SUMMARY: ${listName}`,
      `📅 Date: ${listDate}`,
      `✈️ Freight Rate: ৳${freightRate}/${freightUnit === 'per_gm' ? 'gm' : 'kg'}`,
      `----------------------------------------`,
      ...items.map((it, i) => {
        const lineProduct = getItemProductLineTotal(it);
        const lineWeight = getItemLineWeightPrice(it);
        const unitWeight = getItemUnitWeightPrice(it);
        const combined = lineProduct + lineWeight;
        const paid = getItemPaid(it);
        const due = getItemDue(it);
        const status = getItemStatus(it).toUpperCase();
        return `${i + 1}. ${it.title} (${it.quantity} pcs)\n   📦 Product: ৳${lineProduct.toLocaleString()} (৳${it.price_bdt}/u)\n   ⚖️ Weight Price: ৳${lineWeight.toLocaleString()} (৳${unitWeight.toFixed(0)}/u, ${(it.weight_kg * it.quantity).toFixed(3)}kg)\n   💰 Combined Line Total: ৳${combined.toLocaleString()} | Paid: ৳${paid.toLocaleString()} | Due: ৳${due.toLocaleString()} [${status}]\n   Link: ${it.product_url || 'N/A'}`;
      }),
      `----------------------------------------`,
      `📦 Total Items: ${totalItemsCount} (${totalQuantity} pcs)`,
      `⚖️ TOTAL WEIGHT: ${totalWeightKg.toFixed(3)} kg`,
      `✈️ TOTAL WEIGHT FREIGHT PRICE: ৳${totalWeightPriceBdt.toLocaleString()} BDT`,
      `💵 TOTAL FACTORY PRODUCT VALUE: ৳${totalProductPriceBdt.toLocaleString()} BDT`,
      `💰 COMBINED GRAND TOTAL: ৳${grandTotalBdt.toLocaleString()} BDT`,
      `✅ TOTAL CUSTOMER PAID: ৳${totalPaidBdt.toLocaleString()} BDT`,
      `⚠️ OUTSTANDING CUSTOMER DUE: ৳${totalDueBdt.toLocaleString()} BDT`,
      listNotes ? `📝 Notes: ${listNotes}` : ''
    ];

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    showToast('📋 Sourcing, weight price & payment summary copied to clipboard!');
  };

  // Formatted WhatsApp message generator
  const generateWhatsAppMessage = (): string => {
    const parts: string[] = [];
    parts.push(`*📦 OMNI SOURCING QUOTATION*`);
    if (listName.trim()) {
      parts.push(`*List:* ${listName.trim()}`);
    }
    parts.push(`*Date:* ${listDate}`);
    if (waIncludeFreight) {
      parts.push(`*Cargo Freight Rate:* ৳${freightRate}/${freightUnit === 'per_gm' ? 'gm' : 'kg'} (1,200 Tk/kg)`);
    }
    parts.push(`━━━━━━━━━━━━━━━━━━━━━`);

    items.forEach((item, idx) => {
      const productLine = getItemProductLineTotal(item);
      const lineWeight = getItemLineWeightPrice(item);
      const combined = getItemCombinedLineTotal(item);
      const paid = getItemPaid(item);
      const due = getItemDue(item);

      parts.push(`*${idx + 1}. ${item.title}*`);
      parts.push(`• Quantity: ${item.quantity} pcs`);
      parts.push(`• Product Price: ৳${productLine.toLocaleString()} (৳${item.price_bdt.toLocaleString()}/unit)`);
      if (waIncludeFreight) {
        parts.push(`• Weight Price: ৳${lineWeight.toFixed(0)} (${((item.weight_kg || 0) * (item.quantity || 1)).toFixed(3)} kg)`);
      }
      parts.push(`• Line Total: *৳${combined.toLocaleString()} BDT*`);
      if (paid > 0 || due > 0) {
        parts.push(`• Paid: ৳${paid.toLocaleString()} | Due: *৳${due.toLocaleString()}*`);
      }
      if (waIncludeLinks && item.product_url) {
        parts.push(`• Source Link: ${formatExternalUrl(item.product_url)}`);
      }
      parts.push(``);
    });

    parts.push(`━━━━━━━━━━━━━━━━━━━━━`);
    parts.push(`*📊 ORDER SUMMARY:*`);
    parts.push(`• Total Products: ${totalItemsCount} (${totalQuantity} pcs)`);
    parts.push(`• Total Weight: ${totalWeightKg.toFixed(3)} kg`);
    parts.push(`• Factory Product Value: ৳${totalProductPriceBdt.toLocaleString()} BDT`);
    if (waIncludeFreight) {
      parts.push(`• Total Freight Charge: ৳${totalWeightPriceBdt.toLocaleString()} BDT`);
    }
    parts.push(`• *GRAND TOTAL: ৳${grandTotalBdt.toLocaleString()} BDT*`);
    if (totalPaidBdt > 0 || totalDueBdt > 0) {
      parts.push(`• *Total Paid: ৳${totalPaidBdt.toLocaleString()} BDT*`);
      parts.push(`• *Balance Due: ৳${totalDueBdt.toLocaleString()} BDT*`);
    }

    if (listNotes.trim()) {
      parts.push(`\n📝 *Notes:* ${listNotes.trim()}`);
    }

    if (waIncludeFacebook) {
      parts.push(`\n🌐 *Facebook Page:* https://facebook.com/omnisourcing`);
    }

    if (waIncludeGroup) {
      parts.push(`💬 *VIP Sourcing WhatsApp Group:* ${WHATSAPP_GROUP_URL}`);
    }

    parts.push(`_Quotation generated via OMNI Sourcing & Intelligence Engine_`);

    return parts.join('\n');
  };

  const handleSendWhatsApp = (toGroup: boolean = false) => {
    if (items.length === 0) {
      showToast('⚠️ Please add products before sharing to WhatsApp!');
      return;
    }
    const cleanPhone = toGroup ? '' : whatsAppPhone.replace(/[^0-9]/g, '');
    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(message);
      }
    } catch (e) {
      // ignore
    }

    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}` 
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setShowWhatsAppModal(false);
    showToast(toGroup ? '💬 Opening WhatsApp to share in VIP Group!' : '💬 Opening WhatsApp with formatted quotation!');
  };

  const handleCopyWhatsAppText = () => {
    if (items.length === 0) {
      showToast('⚠️ No items to copy!');
      return;
    }
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    showToast('📋 WhatsApp quotation copied to clipboard!');
  };

  // Export CSV with Weight Price, Paid & Due tracking
  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast('⚠️ No items to export!');
      return;
    }
    const headers = [
      '#', 
      'Product Title', 
      'Platform', 
      'Unit Product Price (BDT)', 
      'Quantity', 
      'Line Product Total (BDT)', 
      'Unit Weight (kg)', 
      'Line Weight (kg)', 
      'Unit Weight Price (BDT)', 
      'Line Weight Price (BDT)', 
      'Combined Line Total (BDT)', 
      'Paid Amount (BDT)', 
      'Due Amount (BDT)', 
      'Payment Status', 
      'Product Link', 
      'Details'
    ];
    const rows = items.map((it, idx) => {
      const lineProduct = getItemProductLineTotal(it);
      const unitWeightPrice = getItemUnitWeightPrice(it);
      const lineWeightPrice = getItemLineWeightPrice(it);
      const combined = lineProduct + lineWeightPrice;
      const paid = getItemPaid(it);
      const due = getItemDue(it);
      const status = getItemStatus(it);
      return [
        idx + 1,
        `"${it.title.replace(/"/g, '""')}"`,
        `"${it.platform || 'N/A'}"`,
        it.price_bdt,
        it.quantity,
        lineProduct,
        it.weight_kg,
        (it.weight_kg * it.quantity).toFixed(3),
        unitWeightPrice.toFixed(2),
        lineWeightPrice.toFixed(2),
        combined,
        paid,
        due,
        `"${status.toUpperCase()}"`,
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
    showToast('📊 CSV file downloaded! Refreshed to default Product List Builder.');
    resetToDefaultBuilder();
  };

  // Export formatted Excel (.xlsx) file
  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('⚠️ No items to export!');
      return;
    }
    try {
      exportSingleOrderToExcel({
        name: listName,
        brand_name: brandName,
        date: listDate,
        items,
        freight_rate: Number(freightRate) || 1.2,
        freight_unit: freightUnit,
        notes: listNotes,
      });
      showToast('📗 Excel (.xlsx) file downloaded successfully!');
    } catch (err: any) {
      console.error('Excel export error:', err);
      showToast('❌ Excel export failed');
    }
  };

  // Export A4 PDF Download (supports 'single_page' strict 1-page fit & 'multi_page' full manifest flow)
  const handleDownloadA4Pdf = async () => {
    if (items.length === 0) {
      showToast('⚠️ Please add at least one product before exporting to PDF!');
      return;
    }

    setDownloadingPdf(true);
    showToast(`⏳ Preparing ${pdfExportMode === 'single_page' ? 'strict 1-page' : 'multi-page'} A4 PDF document...`);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.getElementById('a4-pdf-content');
      if (!element) {
        showToast('❌ PDF export element not found');
        return;
      }

      const opt = {
        margin: [0, 0, 0, 0] as [number, number, number, number],
        filename: `${(listName.trim() || 'sourcing_list').toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${listDate}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        enableLinks: true
      };

      const worker = html2pdf().set(opt).from(element);
      const pdf: any = await (worker as any).toPdf().get('pdf');

      if (pdfExportMode === 'single_page') {
        // Strictly enforce exactly 1 single page in the generated PDF document
        const totalPages = pdf.internal.getNumberOfPages();
        for (let p = totalPages; p > 1; p--) {
          pdf.deletePage(p);
        }
        pdf.save(opt.filename);
        showToast('📄 A4 Single-Page PDF downloaded successfully!');
      } else {
        const totalPages = pdf.internal.getNumberOfPages();
        pdf.save(opt.filename);
        showToast(`📑 A4 Multi-Page PDF downloaded successfully (${totalPages} page${totalPages > 1 ? 's' : ''})!`);
      }
      resetToDefaultBuilder();
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('🖨️ Opening browser A4 print PDF renderer...');
      window.print();
      resetToDefaultBuilder();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
    resetToDefaultBuilder();
  };

  // Common Input Base Style Object (Neumorphic Sunken Well)
  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--neu-inset-border)',
    borderRadius: '12px',
    boxShadow: 'var(--neu-sunken)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px'
  };

  const buttonActionStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '0.84rem',
    fontWeight: 600,
    border: '1px solid var(--neu-rim)',
    boxShadow: 'var(--neu-flat-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* FULL-SCREEN LIGHTBOX PHOTO VIEWER MODAL */}
      {previewModal && (
        <div
          onClick={() => setPreviewModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {/* Top Bar */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '1200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '650px',
              }}>
                {previewModal.title}
              </h3>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                whiteSpace: 'nowrap',
              }}>
                Photo {previewModal.currentIndex + 1} of {previewModal.images.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {previewModal.productUrl && (
                <a
                  href={formatExternalUrl(previewModal.productUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Supplier Link</span>
                </a>
              )}

              <button
                onClick={() => setPreviewModal(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                title="Close viewer (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Center Main Photo Stage */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0',
            }}
          >
            {/* Previous Button */}
            {previewModal.images.length > 1 && (
              <button
                onClick={() => {
                  setPreviewModal((prev) => {
                    if (!prev) return null;
                    const nextIdx = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1;
                    return { ...prev, currentIndex: nextIdx };
                  });
                }}
                style={{
                  position: 'absolute',
                  left: '16px',
                  zIndex: 2,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
                title="Previous photo (Left arrow)"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Displayed Large Image */}
            <img
              src={previewModal.images[previewModal.currentIndex]}
              alt={previewModal.title}
              style={{
                maxWidth: '88vw',
                maxHeight: '74vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.75)',
                userSelect: 'none',
              }}
            />

            {/* Next Button */}
            {previewModal.images.length > 1 && (
              <button
                onClick={() => {
                  setPreviewModal((prev) => {
                    if (!prev) return null;
                    const nextIdx = prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0;
                    return { ...prev, currentIndex: nextIdx };
                  });
                }}
                style={{
                  position: 'absolute',
                  right: '16px',
                  zIndex: 2,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
                title="Next photo (Right arrow)"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip (If Multiple Images) */}
          {previewModal.images.length > 1 && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                gap: '8px',
                maxWidth: '90vw',
                overflowX: 'auto',
                padding: '6px',
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {previewModal.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewModal((prev) => prev ? { ...prev, currentIndex: idx } : null)}
                  style={{
                    padding: 0,
                    background: 'transparent',
                    border: idx === previewModal.currentIndex ? '2.5px solid var(--omni-red, #dc2626)' : '2px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: idx === previewModal.currentIndex ? 1 : 0.6,
                    transform: idx === previewModal.currentIndex ? 'scale(1.05)' : 'none',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTAINER CARD FOR PRODUCT LIST BUILDER */}
      {/* ------------------------------------------------------------- */}
      <div 
        className="no-print"
        style={{
          background: 'var(--bg-card, rgba(24, 24, 27, 0.72))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-card, 0 4px 24px -1px rgba(0, 0, 0, 0.45))'
        }}
      >
        {/* TOP BAR: Title & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #27272a)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              <Sparkles style={{ width: '16px', height: '16px' }} />
              <span>Sourcing List Creator & Cost Engine</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package style={{ width: '28px', height: '28px', color: '#dc2626' }} />
              Product List Builder
            </h1>
            <p style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
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

            <a
              href="/orders"
              style={{
                ...buttonActionStyle,
                backgroundColor: 'rgba(16, 124, 65, 0.15)',
                color: '#34d399',
                borderColor: 'rgba(16, 124, 65, 0.4)',
                textDecoration: 'none'
              }}
              title="Open Separate Excel Orders Record System"
            >
              <FileSpreadsheet style={{ width: '16px', height: '16px', color: '#34d399' }} />
              <span>Excel Records</span>
            </a>

            <a
              href="/checklist"
              style={{
                ...buttonActionStyle,
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                color: '#818cf8',
                borderColor: 'rgba(79, 70, 229, 0.4)',
                textDecoration: 'none'
              }}
              title="Open Standalone Sourcing & Order To-Do Checklist"
            >
              <CheckSquare style={{ width: '16px', height: '16px', color: '#818cf8' }} />
              <span>To-Do Checklist</span>
            </a>

            <button
              onClick={handleOpenSaveModal}
              disabled={savingToServer}
              style={{
                ...buttonActionStyle,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: '#34d399'
              }}
              title="Save List with options to keep working or start fresh"
            >
              <Save style={{ width: '16px', height: '16px', color: '#34d399' }} />
              <span>{savingToServer ? 'Saving...' : 'Save List'}</span>
            </button>

            {/* WhatsApp Share Action Button */}
            <button
              type="button"
              onClick={() => {
                if (items.length === 0) {
                  showToast('⚠️ Please add at least one product before sharing to WhatsApp!');
                  return;
                }
                setShowWhatsAppModal(true);
              }}
              style={{
                ...buttonActionStyle,
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#4ade80'
              }}
              title="Share quotation directly to WhatsApp with live preview"
            >
              <MessageSquare style={{ width: '16px', height: '16px', color: '#22c55e' }} />
              <span>WhatsApp</span>
            </button>

            {/* Direct WhatsApp VIP Group Link Button */}
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...buttonActionStyle,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#86efac',
                textDecoration: 'none'
              }}
              title="Join or Open OMNI WhatsApp VIP Sourcing Group"
            >
              <span style={{ fontSize: '0.95rem' }}>💬</span>
              <span>VIP Group</span>
            </a>

            <button
              onClick={handleShareSummary}
              style={buttonActionStyle}
              title="Copy plain text summary to clipboard"
            >
              <Share2 style={{ width: '16px', height: '16px', color: '#c084fc' }} />
              <span>Copy Text</span>
            </button>

            <button
              onClick={handleExportCsv}
              style={buttonActionStyle}
              title="Download simple CSV file"
            >
              <Download style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              style={{
                ...buttonActionStyle,
                backgroundColor: 'rgba(16, 124, 65, 0.15)',
                border: '1px solid rgba(16, 124, 65, 0.4)',
                color: '#4ade80'
              }}
              title="Download full formatted Excel Workbook (.xlsx)"
            >
              <FileSpreadsheet style={{ width: '16px', height: '16px', color: '#4ade80' }} />
              <span>Excel (.xlsx)</span>
            </button>

            {/* PDF Mode Selector & Download Button Combo */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-surface, #18181b)', border: '1px solid var(--border-color, #3f3f46)', borderRadius: '10px', padding: '2px', gap: '4px' }}>
              <select
                value={pdfExportMode}
                onChange={(e) => setPdfExportMode(e.target.value as any)}
                title="Select single-page or multi-page PDF mode"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary, #e2e8f0)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '6px 8px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="single_page" style={{ backgroundColor: 'var(--bg-card, #18181b)', color: 'var(--text-primary, #ffffff)' }}>📄 1-Page Summary</option>
                <option value="multi_page" style={{ backgroundColor: 'var(--bg-card, #18181b)', color: 'var(--text-primary, #ffffff)' }}>📑 Multi-Page Flow</option>
              </select>

              <button
                onClick={handleDownloadA4Pdf}
                disabled={downloadingPdf}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)'
                }}
              >
                <FileText style={{ width: '15px', height: '15px' }} />
                <span>{downloadingPdf ? 'Exporting...' : 'Download PDF'}</span>
              </button>
            </div>

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
        <div style={{ marginTop: '1.25rem', backgroundColor: 'var(--bg-surface, #09090b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>

            {/* List Name */}
            <div>
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

            {/* Cargo Freight Rate (Weight Price) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <Scale style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                  Cargo Freight Rate <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>
                  {freightUnit === 'per_gm' ? `≈ ৳${((Number(freightRate) || 0) * 1000).toLocaleString()}/kg` : `≈ ৳${((Number(freightRate) || 0) / 1000).toFixed(2)}/gm`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={freightRate}
                  onChange={(e) => setFreightRate(e.target.value)}
                  style={{ ...inputStyle, flex: 1, fontWeight: 700, color: '#fbbf24' }}
                />
                <select
                  value={freightUnit}
                  onChange={(e) => setFreightUnit(e.target.value as any)}
                  style={{ ...inputStyle, width: '105px', backgroundColor: 'var(--bg-card, #18181b)', fontWeight: 700 }}
                >
                  <option value="per_gm">Tk / gm</option>
                  <option value="per_kg">Tk / kg</option>
                </select>
              </div>

              {/* Quick Rate Presets */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setFreightRate('1.2'); setFreightUnit('per_gm'); }}
                  style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', backgroundColor: freightRate === '1.2' && freightUnit === 'per_gm' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card, #27272a)', border: freightRate === '1.2' && freightUnit === 'per_gm' ? '1px solid #fbbf24' : '1px solid var(--border-color, #3f3f46)', color: '#fbbf24', cursor: 'pointer', fontWeight: 700 }}
                >
                  1.2 Tk/gm (Air)
                </button>
                <button
                  type="button"
                  onClick={() => { setFreightRate('1.0'); setFreightUnit('per_gm'); }}
                  style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', backgroundColor: freightRate === '1.0' && freightUnit === 'per_gm' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card, #27272a)', border: freightRate === '1.0' && freightUnit === 'per_gm' ? '1px solid #fbbf24' : '1px solid var(--border-color, #3f3f46)', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
                >
                  1.0 Tk/gm
                </button>
                <button
                  type="button"
                  onClick={() => { setFreightRate('850'); setFreightUnit('per_kg'); }}
                  style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', backgroundColor: freightRate === '850' && freightUnit === 'per_kg' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card, #27272a)', border: freightRate === '850' && freightUnit === 'per_kg' ? '1px solid #fbbf24' : '1px solid var(--border-color, #3f3f46)', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
                >
                  850 Tk/kg
                </button>
                <button
                  type="button"
                  onClick={() => { setFreightRate('350'); setFreightUnit('per_kg'); }}
                  style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', backgroundColor: freightRate === '350' && freightUnit === 'per_kg' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card, #27272a)', border: freightRate === '350' && freightUnit === 'per_kg' ? '1px solid #fbbf24' : '1px solid var(--border-color, #3f3f46)', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
                >
                  350 Tk/kg (Sea)
                </button>
              </div>
            </div>

            {/* Toggle: Include Weight in Total & Due */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary, #e2e8f0)' }}>
                <input
                  type="checkbox"
                  checked={includeWeightInTotal}
                  onChange={(e) => setIncludeWeightInTotal(e.target.checked)}
                  style={{ accentColor: '#dc2626', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Include Weight Price in Customer Total & Due</span>
              </label>
            </div>

            {/* List Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ ...labelStyle, color: 'var(--text-muted, #a1a1aa)' }}>
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

        {/* Payment Quick Actions Bar */}
        {items.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface, #09090b)',
              border: '1px solid var(--border-color, #27272a)',
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
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>Customer Payment Status:</span>
              <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ৳{totalPaidBdt.toLocaleString()} Paid ({effectiveTotalOrderBdt > 0 ? Math.round((totalPaidBdt / effectiveTotalOrderBdt) * 100) : 0}%)
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

        {/* Separate To-Do Checklist Quick Access Banner */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            border: '1px solid rgba(79, 70, 229, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(79, 70, 229, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <CheckSquare style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                Sourcing & Order To-Do Checklist (Separate Feature)
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #a1a1aa)' }}>
                Track China supplier verification, payments, China warehouse arrival, air/sea cargo transit & final delivery in the dedicated Checklist module.
              </div>
            </div>
          </div>

          <a
            href="/checklist"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <span>Open Checklist Feature</span>
            <ExternalLink style={{ width: '12px', height: '12px' }} />
          </a>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ADD PRODUCT FORM (SEQUENTIAL ENTRY) */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: '1.5rem', backgroundColor: 'var(--bg-surface, #09090b)', border: '1px solid rgba(220, 38, 38, 0.4)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color, #27272a)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus style={{ width: '20px', height: '20px', color: '#dc2626' }} />
              Add Product Sequentially
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)' }}>Products are added step-by-step to the list below</span>
          </div>

          {/* AI-Powered Smart Screenshot Extractor (1688, AliExpress, Pinduoduo) */}
          <SmartScreenshotExtractor
            apiUrl={apiUrl}
            defaultExchangeRate={rmbRate || '17.5'}
            onAutoFill={handleAutoFillFromScreenshot}
            onAddDirectlyToList={handleAddDirectlyToListFromScreenshot}
            showToast={showToast}
            isOpenByDefault={true}
          />

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
                    placeholder="Enter price"
                    style={{ ...inputStyle, paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#94a3b8', pointerEvents: 'none', fontWeight: 700 }}>
                    {newCurrency === 'RMB' ? '¥' : newCurrency === 'USD' ? '$' : '৳'}
                  </span>
                </div>
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as any)}
                  style={{ ...inputStyle, width: '95px', backgroundColor: 'var(--bg-card, #18181b)', fontWeight: 700 }}
                >
                  <option value="RMB">RMB (¥)</option>
                  <option value="BDT">BDT (৳)</option>
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

                  {Number(newQuantity) > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#67e8f9', borderTop: '1px dashed rgba(6, 182, 212, 0.25)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Batch Total ({newQuantity} units):</span>
                      <span style={{ fontWeight: 800 }}>
                        ¥{((Number(newPrice) || 0) * (Number(newQuantity) || 1)).toFixed(2)} ≈ ৳{((Number(newPrice) || 0) * (Number(rmbRate) || 20.0) * (Number(newQuantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
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

                  {Number(newQuantity) > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#86efac', borderTop: '1px dashed rgba(16, 185, 129, 0.25)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Batch Total ({newQuantity} units):</span>
                      <span style={{ fontWeight: 800 }}>
                        ${((Number(newPrice) || 0) * (Number(newQuantity) || 1)).toFixed(2)} ≈ ৳{((Number(newPrice) || 0) * (Number(usdRate) || 120.0) * (Number(newQuantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                  )}
                </div>
              )}

              {newCurrency === 'BDT' && Number(newQuantity) > 1 && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    color: '#a1a1aa',
                    fontWeight: 500
                  }}
                >
                  Batch Total ({newQuantity} units): <strong style={{ color: '#f8fafc' }}>৳{((Number(newPrice) || 0) * (Number(newQuantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT</strong>
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <Scale style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
                  Unit Weight <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {Number(newWeightVal) > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24' }}>
                    ≈ ৳{(calculateUnitWeightPriceBdt(calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit), freightRate, freightUnit)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / unit
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  step="0.001"
                  required
                  min="0"
                  value={newWeightVal}
                  onChange={(e) => setNewWeightVal(e.target.value)}
                  placeholder="Weight (gm)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={newWeightUnit}
                  onChange={(e) => setNewWeightUnit(e.target.value as any)}
                  style={{ ...inputStyle, width: '70px', backgroundColor: 'var(--bg-card, #18181b)', fontWeight: 700 }}
                >
                  <option value="gm">gm</option>
                  <option value="kg">kg</option>
                </select>
              </div>

              {/* Dynamic Live Weight Price Preview Box */}
              {Number(newWeightVal) > 0 && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 800 }}>
                        ⚖️ {(calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit) * 1000).toFixed(0)} gm
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>➔</span>
                      <span style={{ fontSize: '0.88rem', color: '#fde047', fontWeight: 900 }}>
                        ৳{(calculateUnitWeightPriceBdt(calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit), freightRate, freightUnit)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      Rate: ৳{freightRate}/{freightUnit === 'per_gm' ? 'gm' : 'kg'}
                    </span>
                  </div>

                  {Number(newQuantity) > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#fde68a', borderTop: '1px dashed rgba(245, 158, 11, 0.25)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Batch Weight Price ({newQuantity} units):</span>
                      <span style={{ fontWeight: 800 }}>
                        ৳{(calculateUnitWeightPriceBdt(calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit), freightRate, freightUnit) * (Number(newQuantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#34d399', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4px', marginTop: '2px' }}>
                    <span>Combined Unit (Product + Freight):</span>
                    <strong style={{ color: '#4ade80' }}>
                      ৳{(calculatePriceBdt(Number(newPrice) || 0, newCurrency) + calculateUnitWeightPriceBdt(calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit), freightRate, freightUnit)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label style={labelStyle}>Quantity (Units)</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="1"
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

            {/* Product Images (Multiple Images Supported) */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <ImageIcon style={{ width: '14px', height: '14px', color: '#34d399' }} />
                  Product Images {newImages.length > 0 && `(${newImages.length} added)`}
                </label>
                {newImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNewImages([])}
                    style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear all images
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="Paste image URL & click + Add, or upload files..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!newImageUrl.trim()}
                  style={{
                    ...buttonActionStyle,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    opacity: newImageUrl.trim() ? 1 : 0.5
                  }}
                >
                  + Add URL
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ ...buttonActionStyle, padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap', backgroundColor: 'var(--bg-card, #27272a)' }}
                >
                  Upload Photos
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileUpload}
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              {/* Added Images Thumbnail Strip */}
              {newImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', padding: '8px', backgroundColor: 'var(--bg-card, #18181b)', borderRadius: '8px', border: '1px solid var(--border-color, #27272a)' }}>
                  {newImages.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '52px',
                        height: '52px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color, #3f3f46)',
                        backgroundColor: 'var(--bg-surface, #09090b)',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={img}
                        alt={`Photo ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(idx)}
                        title="Remove this photo"
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          color: '#ffffff',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '10px',
                          lineHeight: '1',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '1px',
                          left: '2px',
                          fontSize: '8px',
                          color: '#ffffff',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          padding: '0 3px',
                          borderRadius: '2px'
                        }}
                      >
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '6px',
                      border: '1px dashed #52525b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#a1a1aa',
                      fontSize: '9px',
                      gap: '2px'
                    }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} />
                    <span>More</span>
                  </div>
                </div>
              )}
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
                  Due: <strong style={{ color: Number(newPaidAmount) >= (calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (Number(newQuantity) || 1)) ? '#34d399' : '#f87171' }}>
                    ৳{Math.max(0, (calculatePriceBdt(Number(newPrice) || 0, newCurrency) * (Number(newQuantity) || 1)) - (Number(newPaidAmount) || 0)).toLocaleString()}
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
                    const priceBdt = calculatePriceBdt(Number(newPrice) || 0, newCurrency);
                    const weightKg = calculateWeightKg(Number(newWeightVal) || 0, newWeightUnit);
                    const unitWeightPrice = calculateUnitWeightPriceBdt(weightKg, freightRate, freightUnit);
                    const combinedLineTotal = (priceBdt + unitWeightPrice) * (Number(newQuantity) || 1);
                    const fullAmount = includeWeightInTotal ? combinedLineTotal : priceBdt * (Number(newQuantity) || 1);
                    setNewPaidAmount(String(Math.round(fullAmount)));
                  }}
                  title="Set 100% paid (including weight price)"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--bg-card, #27272a)',
                    color: '#34d399',
                    border: '1px solid var(--border-color, #3f3f46)',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ width: '20px', height: '20px', color: '#f87171' }} />
                Products in List ({items.length})
              </h3>

              {items.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: checkedItemsCount === items.length && items.length > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(161, 161, 170, 0.12)',
                    color: checkedItemsCount === items.length && items.length > 0 ? '#4ade80' : '#a1a1aa',
                    border: '1px solid ' + (checkedItemsCount === items.length && items.length > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(161, 161, 170, 0.25)')
                  }}>
                    Checklist: {checkedItemsCount}/{items.length} Sourced
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckAllItems}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#4ade80',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Check All
                  </button>
                  <button
                    type="button"
                    onClick={handleUncheckAllItems}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(161, 161, 170, 0.1)',
                      border: '1px solid rgba(161, 161, 170, 0.25)',
                      color: '#a1a1aa',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Uncheck All
                  </button>
                </div>
              )}
            </div>

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
            <div style={{ backgroundColor: 'var(--bg-surface, #09090b)', border: '1px dashed var(--border-color, #27272a)', borderRadius: '12px', padding: '3rem 1rem', textAlign: 'center' }}>
              <Package style={{ width: '48px', height: '48px', color: 'var(--border-color, #3f3f46)', margin: '0 auto 12px auto' }} />
              <p style={{ color: 'var(--text-primary, #e2e8f0)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Your product list is currently empty</p>
              <p style={{ color: 'var(--text-muted, #71717a)', fontSize: '0.85rem', marginTop: '6px', margin: 0 }}>
                Use the sequential product form above or add products from Categories & Calculator!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item, index) => {
                const lineProductPrice = getItemProductLineTotal(item);
                const unitWeightPrice = getItemUnitWeightPrice(item);
                const lineWeightPrice = getItemLineWeightPrice(item);
                const combinedLineTotal = lineProductPrice + lineWeightPrice;
                const lineTotalBdt = includeWeightInTotal ? combinedLineTotal : lineProductPrice;
                const lineTotalWeightKg = item.weight_kg * item.quantity;
                const itemPaid = getItemPaid(item);
                const itemDue = getItemDue(item);
                const itemStatus = getItemStatus(item);

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: 'var(--bg-surface, #09090b)',
                      border: '1px solid var(--border-color, #27272a)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    {/* Item Serial, Checklist Box, Image & Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: 1 }}>
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={() => handleToggleItemChecked(item.id)}
                        title={item.is_checked ? 'Mark as pending' : 'Mark as sourced / verified'}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: item.is_checked ? '2px solid #22c55e' : '2px solid #52525b',
                          backgroundColor: item.is_checked ? '#16a34a' : 'transparent',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {item.is_checked ? <Check style={{ width: '14px', height: '14px' }} strokeWidth={3} /> : null}
                      </button>

                      <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--bg-card, #18181b)', border: '1px solid var(--border-color, #3f3f46)', color: 'var(--text-primary, #f8fafc)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {index + 1}
                      </span>

                      {/* Image container & Multiple Images */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div 
                          onClick={() => {
                            const allImgs = (item.images && item.images.length > 0) ? item.images : (item.image_url ? [item.image_url] : []);
                            if (allImgs.length > 0) {
                              setPreviewModal({
                                title: item.title,
                                images: allImgs,
                                currentIndex: 0,
                                productUrl: item.product_url,
                              });
                            }
                          }}
                          title={item.image_url || (item.images && item.images.length > 0) ? 'Click to view photo in lightbox' : undefined}
                          style={{
                            position: 'relative',
                            width: '56px',
                            height: '56px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-card, #18181b)',
                            border: '1px solid var(--border-color, #27272a)',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: item.image_url || (item.images && item.images.length > 0) ? 'pointer' : 'default',
                          }}
                        >
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
                          {item.images && item.images.length > 1 && (
                            <span style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.85)', color: '#ffffff', fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '4px' }}>
                              +{item.images.length - 1}
                            </span>
                          )}
                        </div>
                        {/* Add extra photos button */}
                        <div>
                          <input
                            type="file"
                            id={`add-photo-${item.id}`}
                            multiple
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleAddImagesToExistingItem(item.id, e)}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`add-photo-${item.id}`)?.click()}
                            title="Add more photos to this product"
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#27272a',
                              border: '1px solid #3f3f46',
                              color: '#a1a1aa',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <Plus style={{ width: '10px', height: '10px', color: '#34d399' }} />
                            <span>Photo</span>
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: item.is_checked ? '#86efac' : 'var(--text-primary, #ffffff)',
                            textDecoration: item.is_checked ? 'line-through' : 'none',
                            margin: 0
                          }}>
                            {item.title}
                          </h4>
                          {item.is_checked && (
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(34, 197, 94, 0.18)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.4)'
                            }}>
                              ✓ Sourced
                            </span>
                          )}
                          {item.platform && (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, backgroundColor: 'rgba(220, 38, 38, 0.2)', color: '#f87171', border: '1px solid rgba(220, 38, 38, 0.3)', textTransform: 'uppercase' }}>
                              {item.platform}
                            </span>
                          )}
                        </div>

                        {item.details && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: 0 }}>{item.details}</p>
                        )}

                        {/* Extra image thumbnails if product has multiple images */}
                        {item.images && item.images.length > 1 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Photos ({item.images.length}):</span>
                            {item.images.map((img, imgIdx) => (
                              <div
                                key={imgIdx}
                                onClick={() => {
                                  setPreviewModal({
                                    title: item.title,
                                    images: item.images || [img],
                                    currentIndex: imgIdx,
                                    productUrl: item.product_url,
                                  });
                                }}
                                title="Click to view photo in lightbox"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  border: item.image_url === img ? '2px solid #dc2626' : '1px solid #3f3f46',
                                  cursor: 'pointer'
                                }}
                              >
                                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        )}

                        {item.product_url ? (
                          <a
                            href={formatExternalUrl(item.product_url)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card, #18181b)', border: '1px solid var(--border-color, #3f3f46)', borderRadius: '8px', padding: '4px' }}>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--bg-surface, #27272a)', color: 'var(--text-primary, #ffffff)', fontWeight: 800, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ width: '32px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--bg-surface, #27272a)', color: 'var(--text-primary, #ffffff)', fontWeight: 800, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Weight & Freight Price Badge */}
                      <div style={{ textAlign: 'right', minWidth: '95px' }}>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <Scale style={{ width: '11px', height: '11px' }} />
                          <span>Weight Price</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24' }}>
                          ৳{lineWeightPrice.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #a1a1aa)' }}>
                          {lineTotalWeightKg.toFixed(3)} kg (@ ৳{unitWeightPrice.toFixed(0)}/u)
                        </div>
                      </div>

                      {/* Product Price Badge */}
                      <div style={{ textAlign: 'right', minWidth: '95px' }}>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted, #a1a1aa)' }}>
                          Product Value
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>
                          ৳{lineProductPrice.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#71717a' }}>
                          {item.currency !== 'BDT' ? (
                            <span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{item.currency === 'RMB' ? '¥' : '$'}{item.price}</span>
                              {' '}➔ ৳{item.price_bdt.toLocaleString()}/u
                            </span>
                          ) : (
                            `৳${item.price_bdt.toLocaleString()}/u`
                          )}
                        </div>
                      </div>

                      {/* Combined Line Total Badge */}
                      <div style={{ textAlign: 'right', minWidth: '105px' }}>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: '#f87171' }}>
                          Combined Total
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-primary, #ffffff)' }}>
                          ৳{combinedLineTotal.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                          ৳{lineProductPrice.toLocaleString()} + ৳{lineWeightPrice.toLocaleString()} wt
                        </div>
                      </div>

                      {/* Customer Payment & Due Box */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          backgroundColor: 'var(--bg-card, #18181b)',
                          border: `1px solid ${itemStatus === 'paid' ? 'rgba(16, 185, 129, 0.4)' : itemStatus === 'partial' ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color, #27272a)'}`,
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
                          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted, #a1a1aa)' }}>
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
                                  backgroundColor: 'var(--bg-surface, #09090b)',
                                  border: '1px solid var(--border-color, #3f3f46)',
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
                                backgroundColor: 'var(--bg-surface, #27272a)',
                                color: '#34d399',
                                border: '1px solid var(--border-color, #3f3f46)',
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
          <div style={{ backgroundColor: 'var(--bg-card, #18181b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '16px', maxWidth: '600px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color, #27272a)', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen style={{ width: '20px', height: '20px', color: '#60a5fa' }} />
                Orders Record
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {savedLists.length > 0 && (
                  <button
                    onClick={() => {
                      exportAllOrdersToExcel(savedLists);
                      showToast(`📗 Master Excel Sheet downloaded (${savedLists.length} orders)!`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#107c41',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Export All Saved Orders to Excel (.xlsx)"
                  >
                    <FileSpreadsheet style={{ width: '15px', height: '15px' }} />
                    <span>Export All Excel</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSavedModal(false)}
                  style={{ padding: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: 'none', borderRadius: '8px', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </div>

            {loadingSaved ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.9rem' }}>Loading saved product lists...</div>
            ) : savedLists.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.9rem' }}>
                No saved product lists found on the server. Save your current list to see it here!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {savedLists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => handleLoadList(list)}
                    style={{ padding: '12px 16px', backgroundColor: 'var(--bg-surface, #09090b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)', margin: 0 }}>{list.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '4px 0 0 0' }}>
                        Date: {list.date} | Items: {list.total_items_count} ({list.total_quantity} pcs)
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                          ৳{(list.grand_total_bdt || list.total_price_bdt).toLocaleString()}
                        </div>
                        {typeof list.total_weight_price_bdt === 'number' && list.total_weight_price_bdt > 0 && (
                          <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
                            Freight: ৳{list.total_weight_price_bdt.toLocaleString()}
                          </div>
                        )}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            exportSingleOrderToExcel(list);
                            showToast(`📗 Excel downloaded for "${list.name}"`);
                          } catch (err: any) {
                            showToast('❌ Export failed');
                          }
                        }}
                        style={{ padding: '6px', backgroundColor: 'rgba(16, 124, 65, 0.2)', border: '1px solid rgba(16, 124, 65, 0.4)', borderRadius: '6px', color: '#4ade80', cursor: 'pointer' }}
                        title="Download order as Excel (.xlsx)"
                      >
                        <FileSpreadsheet style={{ width: '16px', height: '16px' }} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteSavedList(list.id, e)}
                        style={{ padding: '6px', backgroundColor: 'var(--bg-card, #27272a)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
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
          <div style={{ backgroundColor: 'var(--bg-card, #18181b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color, #27272a)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <CreditCard style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                    Record Customer Advance / Deposit
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '2px 0 0 0' }}>
                    Allocate advance payment across product line items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                style={{ padding: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: 'none', borderRadius: '8px', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: 'var(--bg-surface, #09090b)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color, #27272a)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #a1a1aa)', textTransform: 'uppercase', fontWeight: 700 }}>Total Order</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', marginTop: '2px' }}>৳{effectiveTotalOrderBdt.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface, #09090b)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.65rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Current Paid</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>৳{totalPaidBdt.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface, #09090b)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
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
                  style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: '1px solid var(--border-color, #3f3f46)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Pay Full Balance (৳{totalDueBdt.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmountInput(String(Math.round(effectiveTotalOrderBdt * 0.5)))}
                  style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: '1px solid var(--border-color, #3f3f46)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  50% Advance (৳{Math.round(effectiveTotalOrderBdt * 0.5).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmountInput(String(Math.round(effectiveTotalOrderBdt * 0.3)))}
                  style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: '1px solid var(--border-color, #3f3f46)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  30% Advance (৳{Math.round(effectiveTotalOrderBdt * 0.3).toLocaleString()})
                </button>
              </div>
            </div>

            {/* Allocation Strategy */}
            <div style={{ marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface, #09090b)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #27272a)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #e2e8f0)', marginBottom: '8px' }}>
                Allocation Mode:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                  <input
                    type="radio"
                    name="allocation_strategy"
                    checked={depositStrategy === 'sequential'}
                    onChange={() => setDepositStrategy('sequential')}
                  />
                  <span><strong>Sequential:</strong> Clear items top-to-bottom in order</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
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
      {/* 💬 WHATSAPP DIRECT QUOTATION SHARING MODAL */}
      {/* ------------------------------------------------------------- */}
      {showWhatsAppModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card, #18181b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color, #27272a)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                  <MessageSquare style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                    Share Quotation via WhatsApp
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '2px 0 0 0' }}>
                    Send instant formatted quotation directly to customer's WhatsApp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                style={{ padding: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: 'none', borderRadius: '8px', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {/* Phone Number Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>
                  Customer WhatsApp Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="e.g. 8801712345678 or 01712345678 (leave blank to select in WhatsApp)"
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted, #71717a)', margin: '4px 0 0 0' }}>
                  Include country code (e.g. 880 for Bangladesh) or leave blank to choose contact manually in WhatsApp.
                </p>
              </div>

              {/* Message Options */}
              <div style={{ backgroundColor: 'var(--bg-surface, #09090b)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #27272a)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #e2e8f0)', marginBottom: '8px' }}>
                  Quotation Content Options:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                    <input
                      type="checkbox"
                      checked={waIncludeLinks}
                      onChange={(e) => setWaIncludeLinks(e.target.checked)}
                      style={{ accentColor: '#22c55e' }}
                    />
                    <span>Include Product Links</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                    <input
                      type="checkbox"
                      checked={waIncludeFreight}
                      onChange={(e) => setWaIncludeFreight(e.target.checked)}
                      style={{ accentColor: '#22c55e' }}
                    />
                    <span>Include Weight & Freight</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                    <input
                      type="checkbox"
                      checked={waIncludeFacebook}
                      onChange={(e) => setWaIncludeFacebook(e.target.checked)}
                      style={{ accentColor: '#22c55e' }}
                    />
                    <span>Include Facebook Page</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary, #f8fafc)' }}>
                    <input
                      type="checkbox"
                      checked={waIncludeGroup}
                      onChange={(e) => setWaIncludeGroup(e.target.checked)}
                      style={{ accentColor: '#22c55e' }}
                    />
                    <span>Include VIP WhatsApp Group</span>
                  </label>
                </div>
              </div>

              {/* Live Preview Box */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>
                    Live Message Preview:
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppText}
                    style={{ fontSize: '0.72rem', color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                  >
                    <Copy style={{ width: '12px', height: '12px' }} />
                    Copy
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: 'var(--bg-surface, #09090b)',
                    border: '1px solid var(--border-color, #27272a)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #d4d4d8)',
                    fontFamily: 'Consolas, Monaco, monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    margin: 0
                  }}
                >
                  {generateWhatsAppMessage()}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #27272a)' }}>
              <button
                type="button"
                onClick={openWhatsAppGroup}
                style={{
                  ...buttonActionStyle,
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#86efac',
                }}
                title="Open or Join OMNI WhatsApp VIP Group"
              >
                <span>💬</span>
                <span>Open VIP Group</span>
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  style={{ ...buttonActionStyle, backgroundColor: 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  style={{ ...buttonActionStyle, backgroundColor: 'var(--bg-surface, #27272a)' }}
                >
                  <Copy style={{ width: '15px', height: '15px', color: 'var(--text-muted, #a1a1aa)' }} />
                  <span>Copy Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(true)}
                  style={{
                    ...buttonActionStyle,
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    border: '1px solid #22c55e',
                    fontWeight: 700,
                  }}
                  title="Share formatted quotation directly into the WhatsApp VIP Group"
                >
                  <span>📲</span>
                  <span>Post to VIP Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  <Send style={{ width: '16px', height: '16px' }} />
                  <span>Open in WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 💾 SAVE SOURCING LIST & ORDER MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSaveListModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card, #18181b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color, #27272a)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <Save style={{ width: '22px', height: '22px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                    Save Sourcing List & Order
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '2px 0 0 0' }}>
                    Choose whether to keep working on this list or start a fresh new order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveListModal(false)}
                style={{ padding: '6px', backgroundColor: 'var(--bg-surface, #27272a)', border: 'none', borderRadius: '8px', color: 'var(--text-muted, #a1a1aa)', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Summary Card */}
            <div style={{
              backgroundColor: 'var(--bg-surface, #09090b)',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #27272a)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '1.25rem'
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Items</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {items.length} items ({totalQuantity} pcs)
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>Gross Weight</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                  {totalWeightKg.toFixed(3)} kg
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Grand Total</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                  ৳{grandTotalBdt.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>
                  Order / List Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveListNameInput}
                  onChange={(e) => setSaveListNameInput(e.target.value)}
                  placeholder="e.g. Alibaba Electronics Order #4"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Brand / Client Name</label>
                  <input
                    type="text"
                    value={saveBrandNameInput}
                    onChange={(e) => setSaveBrandNameInput(e.target.value)}
                    placeholder="e.g. OMNI SOURCING"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Order Date</label>
                  <input
                    type="date"
                    value={saveDateInput}
                    onChange={(e) => setSaveDateInput(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notes / Special Instructions (Optional)</label>
                <input
                  type="text"
                  value={saveNotesInput}
                  onChange={(e) => setSaveNotesInput(e.target.value)}
                  placeholder="e.g. Sea cargo, urgent shipment, check battery certifications..."
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Dual Save Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Save & Keep Working */}
                <button
                  type="button"
                  disabled={savingToServer}
                  onClick={() => handleExecuteSave(false)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#107c41',
                    color: '#ffffff',
                    border: '1px solid #16a34a',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: savingToServer ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    boxShadow: '0 4px 12px rgba(16, 124, 65, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save style={{ width: '16px', height: '16px' }} />
                    <span>{savingToServer ? 'Saving...' : 'Save & Keep Working'}</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#bbf7d0', fontWeight: 500 }}>
                    Does NOT clear items from screen
                  </span>
                </button>

                {/* Save & Start New List */}
                <button
                  type="button"
                  disabled={savingToServer}
                  onClick={() => handleExecuteSave(true)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: '1px solid #3b82f6',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: savingToServer ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus style={{ width: '16px', height: '16px' }} />
                    <span>{savingToServer ? 'Saving...' : 'Save & Start New List'}</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#bfdbfe', fontWeight: 500 }}>
                    Saves & refreshes to blank builder
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowSaveListModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted, #a1a1aa)',
                  border: 'none',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 📄 A4 FORMATTED PRINT & PDF DOCUMENT TEMPLATE */}
      {/* ------------------------------------------------------------- */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
        <div
          id="a4-pdf-content"
          style={{
            width: '210mm',
            minHeight: pdfExportMode === 'single_page' ? '296mm' : undefined,
            height: pdfExportMode === 'single_page' ? '296mm' : 'auto',
            maxHeight: pdfExportMode === 'single_page' ? '296mm' : 'none',
            padding: '7mm 10mm',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
            boxSizing: 'border-box',
            overflow: pdfExportMode === 'single_page' ? 'hidden' : 'visible',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: pdfExportMode === 'single_page' ? 'space-between' : 'flex-start'
          }}
        >
          {/* TOP SECTION: Header + Table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: pdfExportMode === 'single_page' ? 'hidden' : 'visible' }}>
            
            {/* 📄 1-PAGE A4 HEADER: Centered Logo, List Name & Date | Right: QR Code (Facebook Page) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #dc2626', paddingBottom: '8px', marginBottom: '10px' }}>
              
              {/* Left: Official Tag */}
              <div style={{ width: '110px', flexShrink: 0 }}>
                <div style={{ display: 'inline-block', border: '1.5px solid #dc2626', borderRadius: '5px', padding: '3px 8px', backgroundColor: '#fef2f2' }}>
                  <div style={{ fontSize: '8.5px', color: '#dc2626', fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    OMNI
                  </div>
                  <div style={{ fontSize: '6.5px', color: '#7f1d1d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Sourcing List
                  </div>
                </div>
              </div>

              {/* Center: Official Logo (replacing Brand Name text) + List Name + Date */}
              <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
                <img
                  src={OMNI_LOGO_BASE64}
                  alt="OMNI Logo"
                  style={{
                    maxHeight: '44px',
                    maxWidth: '175px',
                    objectFit: 'contain',
                    margin: '0 auto 3px auto',
                    display: 'block'
                  }}
                />
                <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#dc2626', margin: '0 0 2px 0', letterSpacing: '-0.2px', textTransform: 'uppercase' }}>
                  {listName.trim() || 'Sourcing Product List'}
                </h2>
                <p style={{ fontSize: '9.5px', color: '#64748b', margin: 0, fontWeight: 600 }}>
                  Date: <strong>{listDate}</strong>
                </p>
                {listNotes && (
                  <div style={{ marginTop: '4px', display: 'inline-block', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 10px', fontSize: '8.5px', color: '#334155' }}>
                    <strong>Notes:</strong> {listNotes}
                  </div>
                )}
              </div>

              {/* Right: QR Code with "Facebook Page" underneath */}
              <div style={{ width: '110px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center' }}>
                <div style={{ padding: '2px', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                  <img
                    src={OMNI_QR_BASE64}
                    alt="Facebook Page"
                    style={{
                      width: '52px',
                      height: '52px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                </div>
                <span style={{ fontSize: '8px', color: '#1877f2', marginTop: '2.5px', fontWeight: 800, letterSpacing: '0.2px', textAlign: 'center', width: '60px', textTransform: 'uppercase' }}>
                  Facebook Page
                </span>
              </div>

            </div>

            {/* Simple & Clean Sourcing Table (Sized for single-page fit or multi-page flow) */}
            {(() => {
              const count = items.length;
              const isSinglePage = pdfExportMode === 'single_page';
              const singleImgPx = isSinglePage ? (count <= 3 ? 76 : (count <= 6 ? 64 : 52)) : 76;
              const multiImgPx = isSinglePage ? (count <= 3 ? 56 : (count <= 6 ? 46 : 38)) : 56;
              const cellPadding = isSinglePage ? (count <= 3 ? '6px 6px' : (count <= 6 ? '4px 6px' : '2.5px 5px')) : '6px 6px';
              const fontSize = isSinglePage ? (count <= 4 ? '9px' : (count <= 7 ? '8.5px' : '8px')) : '9.5px';

              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize, marginBottom: '8px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                      <th style={{ padding: '6px 5px', width: '20px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '6px 8px' }}>Product Details & Images</th>
                      <th style={{ padding: '6px 6px', width: '68px', textAlign: 'center' }}>Source Link</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right', width: '80px' }}>Product Price (Tk)</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right', width: '78px' }}>Weight (Tk)</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right', width: '85px' }}>Total Amount (Tk)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const productLine = getItemProductLineTotal(item);
                      const lineWeightPrice = getItemLineWeightPrice(item);
                      const combinedLineTotal = getItemCombinedLineTotal(item);
                      const itemTotalWeight = (item.weight_kg || 0) * (item.quantity || 1);
                      const itemImages = (item.images && item.images.length > 0)
                        ? item.images
                        : (item.image_url ? [item.image_url] : []);

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid'
                          }}
                        >
                          {/* # */}
                          <td style={{ padding: cellPadding, textAlign: 'center', fontWeight: 'bold', color: '#64748b', verticalAlign: 'top' }}>
                            {idx + 1}
                          </td>

                          {/* Product Details & Bigger Images */}
                          <td style={{ padding: cellPadding, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              {/* Enlarged Images Container */}
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '170px', flexShrink: 0 }}>
                                {itemImages.length > 0 ? (
                                  itemImages.map((img, imgIdx) => (
                                    <img
                                      key={imgIdx}
                                      src={img}
                                      alt=""
                                      crossOrigin="anonymous"
                                      style={{
                                        width: itemImages.length === 1 ? `${singleImgPx}px` : `${multiImgPx}px`,
                                        height: itemImages.length === 1 ? `${singleImgPx}px` : `${multiImgPx}px`,
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        border: '1.5px solid #cbd5e1'
                                      }}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"%3E%3Crect width="60" height="60" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="8" font-family="sans-serif"%3ENo Photo%3C/text%3E%3C/svg%3E';
                                      }}
                                    />
                                  ))
                                ) : (
                                  <div style={{ width: `${singleImgPx}px`, height: `${singleImgPx}px`, backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '9px', border: '1px dashed #cbd5e1' }}>
                                    No Image
                                  </div>
                                )}
                              </div>

                              {/* Title & Details */}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: count <= 4 ? '10px' : '9px', lineHeight: 1.3 }}>
                                  {item.title}
                                </div>
                                {item.details && (
                                  <div style={{ color: '#475569', fontSize: count <= 4 ? '8.5px' : '8px', marginTop: '2px', lineHeight: 1.25 }}>
                                    {item.details}
                                  </div>
                                )}
                                {item.quantity > 1 && (
                                  <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '8px', color: '#334155', fontWeight: 600, marginTop: '3px' }}>
                                    Qty: {item.quantity} pcs
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Source Link */}
                          <td style={{ padding: cellPadding, textAlign: 'center', verticalAlign: 'top' }}>
                            {item.product_url ? (
                              <a
                                href={formatExternalUrl(item.product_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#2563eb',
                                  textDecoration: 'underline',
                                  fontWeight: 600,
                                  fontSize: '9px',
                                  display: 'inline-block'
                                }}
                              >
                                Source Link ↗
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '8.5px' }}>—</span>
                            )}
                          </td>

                          {/* Product Price in Tk */}
                          <td style={{ padding: cellPadding, textAlign: 'right', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '10.5px' }}>
                              ৳{productLine.toLocaleString()}
                            </div>
                            {item.quantity > 1 && (
                              <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px' }}>
                                (৳{item.price_bdt.toLocaleString()} × {item.quantity})
                              </div>
                            )}
                          </td>

                          {/* Weight in Tk */}
                          <td style={{ padding: cellPadding, textAlign: 'right', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '10.5px' }}>
                              ৳{lineWeightPrice.toFixed(0)}
                            </div>
                            <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px' }}>
                              {itemTotalWeight.toFixed(3)} kg
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td style={{ padding: cellPadding, textAlign: 'right', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '11px' }}>
                              ৳{combinedLineTotal.toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Summary Footer */}
                  <tfoot style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <td colSpan={3} style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9.5px', color: '#0f172a' }}>
                        <strong>TOTALS</strong> ({totalItemsCount} Products • {totalQuantity} pcs)
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: '10.5px', color: '#0f172a' }}>
                        ৳{totalProductPriceBdt.toLocaleString()}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: '10.5px', color: '#0284c7' }}>
                        ৳{totalWeightPriceBdt.toLocaleString()}
                        <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 'normal' }}>
                          {totalWeightKg.toFixed(3)} kg
                        </div>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: '11.5px', color: '#dc2626', fontWeight: 800 }}>
                        ৳{grandTotalBdt.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}

          </div>

          {/* BOTTOM SECTION: Statement Card + Footer Note */}
          <div style={{ flexShrink: 0, marginTop: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            {/* Grand Total Statement Card */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '7px', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Grand Total Statement
                </div>
                <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '1px' }}>
                  Cargo Freight Rate: {freightRate} Tk/{freightUnit === 'per_gm' ? 'gm' : 'kg'} (1,200 Tk/kg)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>Total Weight</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{totalWeightKg.toFixed(3)} kg</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Product Price</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>৳{totalProductPriceBdt.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Weight (Tk)</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>৳{totalWeightPriceBdt.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right', paddingLeft: '12px', borderLeft: '1px solid #334155' }}>
                  <div style={{ fontSize: '8px', color: '#f87171', textTransform: 'uppercase', fontWeight: 800 }}>Grand Total</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>৳{grandTotalBdt.toLocaleString()} Tk</div>
                </div>
              </div>
            </div>

            {/* Footer note with logo and QR verification */}
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={OMNI_LOGO_BASE64} alt="" style={{ height: '13px', objectFit: 'contain' }} />
                <span>Official Sourcing & Cost Quotation</span>
              </div>
              <div>
                Generated on {listDate} • Scan QR for Facebook Page
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
