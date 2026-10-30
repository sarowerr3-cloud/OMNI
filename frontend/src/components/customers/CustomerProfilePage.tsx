'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  FolderOpen,
  Package,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Phone,
  MapPin,
  MessageSquare,
  Coins,
  Scale,
  FileSpreadsheet,
  ArrowUpDown,
  CheckCircle2,
  X,
  Truck,
  Layers,
  Sparkles,
  ShoppingBag,
  Image as ImageIcon,
  Link as LinkIcon,
  UploadCloud,
  Zap,
  Check,
  ExternalLink,
  Tag,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Customer, CustomerOrder, CustomerPayload } from '@/types/customer';
import { ProfileFolder, FolderProduct, calculateFolderFinancials, ProductStatus } from '@/types/profileFolder';
import { profileFolderService } from '@/services/profileFolderService';
import ViewModeToggle, { ViewMode } from '@/components/shared/ViewModeToggle';
import { getWhatsappShareUrl, formatWhatsappPhone } from '@/utils/customerMessaging';
import { exportSingleCustomerOrdersToExcel } from '@/lib/excelExport';
import SmartScreenshotExtractor from '@/components/SmartScreenshotExtractor';
import { ExtractedProductData } from '@/types/screenshotExtractor';
import { compressImageFile, formatExternalUrl } from '@/lib/imageUtils';

interface CustomerProfilePageProps {
  customer: Customer;
  onBack: () => void;
  onUpdateProfile: (customerId: string, payload: Partial<CustomerPayload>) => Promise<void>;
  onAddNewOrder: (customer: Customer) => void;
  onEditOrder?: (order: CustomerOrder) => void;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  onToggleOrderStatus?: (order: CustomerOrder, isDelivered: boolean, isCancelled: boolean) => Promise<void>;
  onEditCustomerProfile: (customer: Customer) => void;
  showToast: (msg: string) => void;
  globalRmbRate?: number;
  globalFreightRate?: number;
  globalFreightUnit?: 'per_gm' | 'per_kg';
  apiUrl?: string;
}

type ProfileTab = 'folders' | 'products' | 'orders' | 'notes';
type ProductSortOption = 'folder_asc' | 'folder_desc' | 'date_desc' | 'date_asc' | 'seq_asc';

export default function CustomerProfilePage({
  customer,
  onBack,
  onUpdateProfile,
  onAddNewOrder,
  onEditOrder,
  onDeleteOrder,
  onToggleOrderStatus,
  onEditCustomerProfile,
  showToast,
  globalRmbRate = 20.0,
  globalFreightRate = 1.2,
  globalFreightUnit = 'per_gm',
  apiUrl = 'http://127.0.0.1:8000',
}: CustomerProfilePageProps) {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<ProfileTab>('folders');

  // Customer Orders Filter state
  const [activeOrderFilter, setActiveOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  const filteredCustomerOrders = useMemo(() => {
    const list = customer.orders || [];
    if (activeOrderFilter === 'active') return list.filter((o) => !o.is_delivered && !o.is_cancelled);
    if (activeOrderFilter === 'delivered') return list.filter((o) => o.is_delivered);
    if (activeOrderFilter === 'cancelled') return list.filter((o) => o.is_cancelled);
    return list;
  }, [customer.orders, activeOrderFilter]);

  // Customer specific RMB and Weight rate settings
  const ratesStorageKey = `omni_cust_rates_${customer.id}`;
  const [customerRmbRate, setCustomerRmbRate] = useState<number>(() => {
    if (typeof window === 'undefined') return globalRmbRate;
    try {
      const stored = localStorage.getItem(ratesStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.rmbRate && parsed.rmbRate > 0) return parsed.rmbRate;
      }
    } catch {}
    return globalRmbRate;
  });

  const [customerFreightRate, setCustomerFreightRate] = useState<number>(() => {
    if (typeof window === 'undefined') return globalFreightRate;
    try {
      const stored = localStorage.getItem(ratesStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.freightRate && parsed.freightRate > 0) return parsed.freightRate;
      }
    } catch {}
    return globalFreightRate;
  });

  const [customerFreightUnit, setCustomerFreightUnit] = useState<'per_gm' | 'per_kg'>(() => {
    if (typeof window === 'undefined') return globalFreightUnit;
    try {
      const stored = localStorage.getItem(ratesStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.freightUnit) return parsed.freightUnit;
      }
    } catch {}
    return globalFreightUnit;
  });

  // Dedicated string buffers for rate inputs so users can edit, backspace, type decimals, and change freely
  const [rmbRateInput, setRmbRateInput] = useState<string>(() => String(customerRmbRate));
  const [freightRateInput, setFreightRateInput] = useState<string>(() => String(customerFreightRate));

  // Sync inputs when customer or rates change
  useEffect(() => {
    setRmbRateInput(String(customerRmbRate));
    setFreightRateInput(String(customerFreightRate));
  }, [customer.id]);

  const [hasSavedRates, setHasSavedRates] = useState<boolean>(false);

  // Check if inputs have unapplied changes
  const isRatesDirty = useMemo(() => {
    return (
      rmbRateInput.trim() !== String(customerRmbRate) ||
      freightRateInput.trim() !== String(customerFreightRate)
    );
  }, [rmbRateInput, freightRateInput, customerRmbRate, customerFreightRate]);

  const handleSaveCustomerRates = () => {
    const parsedRmb = parseFloat(rmbRateInput.trim());
    const parsedFreight = parseFloat(freightRateInput.trim());

    if (isNaN(parsedRmb) || parsedRmb <= 0) {
      showToast('⚠️ Please enter a valid RMB exchange rate (e.g. 20.0 or 21.5)');
      return;
    }

    if (isNaN(parsedFreight) || parsedFreight <= 0) {
      showToast('⚠️ Please enter a valid Freight rate (e.g. 1.2 or 0.8)');
      return;
    }

    setCustomerRmbRate(parsedRmb);
    setCustomerFreightRate(parsedFreight);
    setRmbRateInput(String(parsedRmb));
    setFreightRateInput(String(parsedFreight));

    try {
      localStorage.setItem(
        ratesStorageKey,
        JSON.stringify({
          rmbRate: parsedRmb,
          freightRate: parsedFreight,
          freightUnit: customerFreightUnit,
        })
      );

      // Cascade update to all folders for this customer so their stored equivalent amounts update
      const allFolders = profileFolderService.getAllFolders();
      const userProfiles = profileFolderService.getProfiles();
      const matchingProfileIds = new Set<string>([customer.id, `prof_${customer.id}`]);
      const cleanCustName = customer.name.trim().toLowerCase();
      userProfiles.forEach((p) => {
        const pName = p.name ? p.name.trim().toLowerCase() : '';
        if (
          (pName && cleanCustName && (pName === cleanCustName || pName.includes(cleanCustName) || cleanCustName.includes(pName))) ||
          (p.phone && customer.phone && p.phone.replace(/\D/g, '') === customer.phone.replace(/\D/g, ''))
        ) {
          matchingProfileIds.add(p.id);
        }
      });

      allFolders.forEach((f) => {
        if (matchingProfileIds.has(f.profileId)) {
          profileFolderService.updateFolder(f.id, { exchangeRate: parsedRmb });
        }
      });

      loadFolders();
      setHasSavedRates(true);
      showToast(`✅ Rates updated for ${customer.name}: 1 RMB = ৳${parsedRmb.toFixed(2)}, Cargo = ৳${parsedFreight}/${customerFreightUnit === 'per_gm' ? 'g' : 'kg'}`);
      setTimeout(() => setHasSavedRates(false), 3000);
    } catch {
      showToast('❌ Failed to save customer rates');
    }
  };

  const handleResetToBenchmarkRates = () => {
    setRmbRateInput(String(globalRmbRate));
    setFreightRateInput(String(globalFreightRate));
    setCustomerFreightUnit(globalFreightUnit);
    setCustomerRmbRate(globalRmbRate);
    setCustomerFreightRate(globalFreightRate);
    try {
      localStorage.removeItem(ratesStorageKey);
      loadFolders();
      showToast(`🔄 Reset rates to benchmark defaults: 1 RMB = ৳${globalRmbRate}, Cargo = ৳${globalFreightRate}/${globalFreightUnit === 'per_gm' ? 'g' : 'kg'}`);
    } catch {}
  };

  // Folders State
  const [folders, setFolders] = useState<ProfileFolder[]>([]);
  const loadFolders = () => {
    // Look up folders matching either customer.id, 'prof_' + customer.id, or userProfile matching name/phone
    const all = profileFolderService.getAllFolders();
    const userProfiles = profileFolderService.getProfiles();
    const matchingProfileIds = new Set<string>([customer.id, `prof_${customer.id}`]);
    const cleanCustName = customer.name.trim().toLowerCase();
    userProfiles.forEach((p) => {
      const pName = p.name ? p.name.trim().toLowerCase() : '';
      if (
        (pName && cleanCustName && (pName === cleanCustName || pName.includes(cleanCustName) || cleanCustName.includes(pName))) ||
        (p.phone && customer.phone && p.phone.replace(/\D/g, '') === customer.phone.replace(/\D/g, ''))
      ) {
        matchingProfileIds.add(p.id);
      }
    });

    const matched = all.filter((f) => matchingProfileIds.has(f.profileId));
    setFolders(matched);
  };

  useEffect(() => {
    loadFolders();
  }, [customer.id, customer.name]);

  // Product View & Sorting
  const [productViewMode, setProductViewMode] = useState<ViewMode>('list');
  const [productSortBy, setProductSortBy] = useState<ProductSortOption>('folder_asc');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  // New Folder Modal
  const [showAddFolderModal, setShowAddFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderDate, setNewFolderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newFolderOrderNumber, setNewFolderOrderNumber] = useState<string>('');
  const [newFolderNote, setNewFolderNote] = useState<string>('');

  // Add Product to Folder State (Matches List Builder system)
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [targetFolderForProduct, setTargetFolderForProduct] = useState<ProfileFolder | null>(null);
  const [newProdTitle, setNewProdTitle] = useState<string>('');
  const [newProdDetails, setNewProdDetails] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('');
  const [newProdCurrency, setNewProdCurrency] = useState<'RMB' | 'BDT' | 'USD'>('RMB');
  const [newProdWeightVal, setNewProdWeightVal] = useState<string>('');
  const [newProdWeightUnit, setNewProdWeightUnit] = useState<'gm' | 'kg'>('gm');
  const [newProdQty, setNewProdQty] = useState<string>('1');
  const [newProdPlatform, setNewProdPlatform] = useState<string>('1688');
  const [newProdUrl, setNewProdUrl] = useState<string>('');
  const [newProdImageUrl, setNewProdImageUrl] = useState<string>('');
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const prodFileInputRef = useRef<HTMLInputElement>(null);

  // Manual Structured Features (Color, Size, Model, Style, Shape, Combination)
  const [manualColor, setManualColor] = useState<string>('');
  const [manualSize, setManualSize] = useState<string>('');
  const [manualModel, setManualModel] = useState<string>('');
  const [manualStyle, setManualStyle] = useState<string>('');
  const [manualShape, setManualShape] = useState<string>('');
  const [manualCombination, setManualCombination] = useState<string>('');
  const [manualCustomNote, setManualCustomNote] = useState<string>('');

  const activeManualFeatures = useMemo(() => {
    const list: Array<{ label: string; value: string; icon: string }> = [];
    if (manualColor.trim()) list.push({ label: 'Color', value: manualColor.trim(), icon: '🎨' });
    if (manualSize.trim()) list.push({ label: 'Size', value: manualSize.trim(), icon: '📏' });
    if (manualModel.trim()) list.push({ label: 'Model', value: manualModel.trim(), icon: '⚙️' });
    if (manualStyle.trim()) list.push({ label: 'Style', value: manualStyle.trim(), icon: '✨' });
    if (manualShape.trim()) list.push({ label: 'Shape', value: manualShape.trim(), icon: '🔷' });
    if (manualCombination.trim()) list.push({ label: 'Combo', value: manualCombination.trim(), icon: '📦' });
    return list;
  }, [manualColor, manualSize, manualModel, manualStyle, manualShape, manualCombination]);

  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<boolean>(false);
  const [notesText, setNotesText] = useState<string>(customer.notes || '');

  // Collect and sort all products across all folders
  const allFolderProducts = useMemo(() => {
    const list: Array<FolderProduct & {
      folderId: string;
      folderName: string;
      folderOrderNumber: string;
      folderDate: string;
      folderExchangeRate: number;
    }> = [];

    folders.forEach((folder) => {
      folder.products.forEach((prod) => {
        list.push({
          ...prod,
          folderId: folder.id,
          folderName: folder.name,
          folderOrderNumber: folder.orderNumber,
          folderDate: folder.date,
          folderExchangeRate: folder.exchangeRate || customerRmbRate,
        });
      });
    });

    // Filter by selected folder if applicable
    const filtered = folderFilter === 'all' 
      ? list 
      : list.filter((p) => p.folderId === folderFilter);

    // Apply sorting
    return filtered.sort((a, b) => {
      if (productSortBy === 'folder_asc') {
        const cmp = a.folderName.localeCompare(b.folderName);
        return cmp !== 0 ? cmp : a.sequenceNumber - b.sequenceNumber;
      }
      if (productSortBy === 'folder_desc') {
        const cmp = b.folderName.localeCompare(a.folderName);
        return cmp !== 0 ? cmp : a.sequenceNumber - b.sequenceNumber;
      }
      if (productSortBy === 'date_desc') {
        return new Date(b.folderDate).getTime() - new Date(a.folderDate).getTime();
      }
      if (productSortBy === 'date_asc') {
        return new Date(a.folderDate).getTime() - new Date(b.folderDate).getTime();
      }
      return a.sequenceNumber - b.sequenceNumber;
    });
  }, [folders, folderFilter, productSortBy, customerRmbRate]);

  // Aggregate totals
  const totalRmbValue = useMemo(() => {
    return allFolderProducts
      .filter((p) => p.status !== 'cancelled')
      .reduce((acc, p) => acc + (p.totalRmb || 0), 0);
  }, [allFolderProducts]);

  const totalBdtValue = useMemo(() => {
    return Math.round(totalRmbValue * customerRmbRate);
  }, [totalRmbValue, customerRmbRate]);

  // Create folder handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      showToast('⚠️ Please enter a folder name');
      return;
    }

    try {
      const userProfiles = profileFolderService.getProfiles();
      const cleanCustName = customer.name.trim().toLowerCase();
      const existing = userProfiles.find(
        (p) =>
          p.id === customer.id ||
          (p.name && cleanCustName && p.name.trim().toLowerCase() === cleanCustName)
      );
      const targetProfileId = existing ? existing.id : customer.id;

      profileFolderService.createFolder({
        profileId: targetProfileId,
        name: newFolderName.trim(),
        date: newFolderDate || new Date().toISOString().split('T')[0],
        orderNumber: newFolderOrderNumber.trim() || undefined,
        note: newFolderNote.trim() || undefined,
        exchangeRate: customerRmbRate,
      });

      loadFolders();
      setShowAddFolderModal(false);
      setNewFolderName('');
      setNewFolderOrderNumber('');
      setNewFolderNote('');
      showToast(`📁 Created folder "${newFolderName.trim()}" for ${customer.name}`);
    } catch {
      showToast('❌ Failed to create folder');
    }
  };

  // Reset Product Form
  const resetAddProductForm = () => {
    setNewProdTitle('');
    setNewProdDetails('');
    setNewProdPrice('');
    setNewProdCurrency('RMB');
    setNewProdWeightVal('');
    setNewProdWeightUnit('gm');
    setNewProdQty('1');
    setNewProdUrl('');
    setNewProdImageUrl('');
    setNewProdImages([]);
    setNewProdPlatform('1688');
    setManualColor('');
    setManualSize('');
    setManualModel('');
    setManualStyle('');
    setManualShape('');
    setManualCombination('');
    setManualCustomNote('');
    if (prodFileInputRef.current) prodFileInputRef.current.value = '';
  };

  // Image Upload with compression (Matches List Builder)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    showToast(`⏳ Optimizing ${files.length} image${files.length > 1 ? 's' : ''}...`);
    const newCompressed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file, 900, 0.82);
        if (compressed) newCompressed.push(compressed);
      }
    }

    if (newCompressed.length > 0) {
      setNewProdImages((prev) => [...prev, ...newCompressed]);
      showToast(`✅ ${newCompressed.length} photo${newCompressed.length > 1 ? 's' : ''} added!`);
    }
    if (prodFileInputRef.current) prodFileInputRef.current.value = '';
  };

  // Add Image via URL
  const handleAddImageUrl = () => {
    if (!newProdImageUrl.trim()) return;
    const url = newProdImageUrl.trim();
    if (!newProdImages.includes(url)) {
      setNewProdImages((prev) => [...prev, url]);
      showToast('🖼️ Photo URL attached!');
    }
    setNewProdImageUrl('');
  };

  // Remove uploaded/attached image
  const handleRemoveImage = (idx: number) => {
    setNewProdImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // AI Screenshot Extractor: Auto Fill Form
  const handleAutoFillFromScreenshot = (data: ExtractedProductData) => {
    if (data.isProductScreenshot === false && !data.priceCNY && !data.hasSelectedFeatures) {
      showToast('⚠️ No product details detected in this screenshot to auto-fill.');
      return;
    }
    if (data.productName && data.productName !== 'No data found') {
      setNewProdTitle(data.productName);
    }
    if (typeof data.priceCNY === 'number' && data.priceCNY > 0) {
      setNewProdPrice(String(data.priceCNY));
      setNewProdCurrency('RMB');
    } else {
      setNewProdPrice('');
    }
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    if (hasWeight && data.finalWeightKg) {
      if (newProdWeightUnit === 'gm') {
        setNewProdWeightVal(String(Math.round(data.finalWeightKg * 1000)));
      } else {
        setNewProdWeightVal(String(data.finalWeightKg));
      }
    } else {
      setNewProdWeightVal('');
    }
    if (data.hasSelectedFeatures && data.selectedFeatures?.summaryList && data.selectedFeatures.summaryList.length > 0) {
      const specText = data.selectedFeatures.summaryList.join(' | ');
      setNewProdDetails(specText);
    } else if (data.colors && data.colors.length > 0) {
      const specText = data.colors.join(' | ');
      setNewProdDetails(specText);
    } else {
      setNewProdDetails('');
    }

    // Populate structured manual feature fields directly from AI extraction
    if (data.selectedFeatures) {
      setManualColor(data.selectedFeatures.color || '');
      setManualSize(data.selectedFeatures.size || '');
      setManualModel(data.selectedFeatures.model || '');
      setManualStyle(data.selectedFeatures.style || '');
      setManualShape(data.selectedFeatures.shape || '');
      setManualCombination(data.selectedFeatures.combination || '');
      setManualCustomNote('');
    } else {
      setManualColor('');
      setManualSize('');
      setManualModel('');
      setManualStyle('');
      setManualShape('');
      setManualCombination('');
      setManualCustomNote('');
    }
    const primaryImg = data.croppedImageDataUrl || data.originalImageDataUrl;
    if (primaryImg) {
      setNewProdImages((prev) => [primaryImg, ...prev.filter((img) => img !== primaryImg)]);
    }
    if (data.platformDetected) {
      setNewProdPlatform(data.platformDetected);
    }
    showToast('✨ Auto-filled product details from AI extraction!');
  };

  // AI Screenshot Extractor: Add Directly to Folder
  const handleAddDirectlyFromScreenshot = (data: ExtractedProductData) => {
    if (data.isProductScreenshot === false && !data.priceCNY && !data.hasSelectedFeatures) {
      showToast('⚠️ Cannot add product: No product or pricing data found in screenshot. Please enter details manually.');
      return;
    }

    let folder = targetFolderForProduct;
    if (!folder && folders.length > 0) {
      folder = folders[0];
    }
    if (!folder) {
      showToast('⚠️ Please create a folder first to add products!');
      return;
    }

    const priceNum = typeof data.priceCNY === 'number' && data.priceCNY > 0 ? data.priceCNY : 0;
    const hasWeight = typeof data.finalWeightKg === 'number' && data.finalWeightKg > 0;
    const finalWeightKg = hasWeight && data.finalWeightKg ? data.finalWeightKg : 0;
    const unitWeightPrice = finalWeightKg > 0 
      ? (customerFreightUnit === 'per_gm' ? finalWeightKg * 1000 * customerFreightRate : finalWeightKg * customerFreightRate) 
      : 0;
    const primaryImg = data.croppedImageDataUrl || data.originalImageDataUrl;

    const selectedDetails = data.hasSelectedFeatures && data.selectedFeatures?.summaryList && data.selectedFeatures.summaryList.length > 0
      ? data.selectedFeatures.summaryList.join(' | ')
      : (data.colors && data.colors.length > 0 ? data.colors.join(' | ') : undefined);

    const added = profileFolderService.addProductToFolder(folder.id, {
      name: data.productName || 'Imported Sourced Product',
      priceRmb: priceNum,
      quantity: 1,
      note: selectedDetails,
      imageUrl: primaryImg,
      images: primaryImg ? [primaryImg] : [],
      weightKg: Number(finalWeightKg.toFixed(3)),
      weightPriceTk: Math.round(unitWeightPrice),
      platform: data.platformDetected || '1688',
      currency: 'RMB',
    });

    if (added) {
      loadFolders();
      setShowAddProductModal(false);
      resetAddProductForm();
      showToast(`⚡ AI Extracted & Added "${data.productName || 'Product'}" to folder ${folder.orderNumber}!`);
    } else {
      showToast('❌ Failed to add product to folder');
    }
  };

  // Manual Form Submit (Like List Builder)
  const handleSubmitManualProduct = (e: React.FormEvent) => {
    e.preventDefault();
    let folder = targetFolderForProduct;
    if (!folder && folders.length > 0) {
      folder = folders[0];
    }
    if (!folder) {
      showToast('⚠️ Please create or select a folder first');
      return;
    }

    if (!newProdTitle.trim()) {
      showToast('⚠️ Please enter a product title!');
      return;
    }

    const qty = Math.max(1, parseInt(newProdQty, 10) || 1);
    const rawPrice = Math.max(0, parseFloat(newProdPrice) || 0);

    // Calculate RMB equivalent for accurate folder financials
    let priceRmb = rawPrice;
    if (newProdCurrency === 'BDT') {
      priceRmb = customerRmbRate > 0 ? rawPrice / customerRmbRate : rawPrice / 20.0;
    } else if (newProdCurrency === 'USD') {
      const bdt = rawPrice * 120.0;
      priceRmb = customerRmbRate > 0 ? bdt / customerRmbRate : bdt / 20.0;
    }
    priceRmb = Number(priceRmb.toFixed(2));

    const rawWeight = Math.max(0, parseFloat(newProdWeightVal) || 0);
    const weightKg = newProdWeightUnit === 'gm' ? rawWeight / 1000 : rawWeight;
    const unitWeightPrice = weightKg > 0 
      ? (customerFreightUnit === 'per_gm' ? weightKg * 1000 * customerFreightRate : weightKg * customerFreightRate) 
      : 0;

    const allImages = [...newProdImages];
    if (newProdImageUrl.trim() && !allImages.includes(newProdImageUrl.trim())) {
      allImages.push(newProdImageUrl.trim());
    }
    const primaryImg = allImages[0] || undefined;

    // Combine structured manual features (Color, Size, Model, Style, Shape, Combination)
    const featureStrings = activeManualFeatures.map((f) => `${f.label}: ${f.value}`);
    if (manualCustomNote.trim()) featureStrings.push(manualCustomNote.trim());
    const finalNote = featureStrings.length > 0 ? featureStrings.join(' | ') : (newProdDetails.trim() || undefined);

    const added = profileFolderService.addProductToFolder(folder.id, {
      name: newProdTitle.trim(),
      priceRmb,
      quantity: qty,
      note: finalNote,
      imageUrl: primaryImg,
      images: allImages,
      weightKg: weightKg > 0 ? Number(weightKg.toFixed(3)) : undefined,
      weightPriceTk: unitWeightPrice > 0 ? Math.round(unitWeightPrice) : undefined,
      platform: newProdPlatform,
      currency: newProdCurrency,
      originalPrice: rawPrice,
      productUrl: newProdUrl.trim() ? formatExternalUrl(newProdUrl) : undefined,
    });

    if (added) {
      loadFolders();
      setShowAddProductModal(false);
      resetAddProductForm();
      showToast(`✅ Added "${newProdTitle.trim()}" to folder ${folder.orderNumber}!`);
    } else {
      showToast('❌ Failed to add product to folder');
    }
  };

  // Change Product Status
  const handleSetProductStatus = (folderId: string, productId: string, status: ProductStatus) => {
    profileFolderService.setProductStatus(folderId, productId, status);
    loadFolders();
    showToast(`Status updated to ${status.toUpperCase()}`);
  };

  // Delete Product
  const handleDeleteProduct = (folderId: string, productId: string, assignedNumber: string) => {
    if (!window.confirm(`Delete product ${assignedNumber}? Remaining items will be resequenced.`)) return;
    profileFolderService.deleteProduct(folderId, productId);
    loadFolders();
    showToast(`🗑️ Removed ${assignedNumber}`);
  };

  // Delete Folder
  const handleDeleteFolder = (folderId: string, folderName: string, orderNumber: string) => {
    if (!window.confirm(`Delete folder "${folderName}" (${orderNumber}) and all its products?`)) return;
    profileFolderService.deleteFolder(folderId);
    loadFolders();
    showToast(`🗑️ Deleted folder ${orderNumber}`);
  };

  // WhatsApp Url
  const whatsappUrl = getWhatsappShareUrl(
    formatWhatsappPhone(customer.phone),
    `Assalamu Alaikum ${customer.name}, regarding your orders at OMNI Sourcing:`
  );

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. TOP BREADCRUMB & BACK BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Return to Customer Directory"
        >
          <ArrowLeft size={16} />
          <span>Back to Customers</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {customer.phone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp Chat</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => onEditCustomerProfile(customer)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Edit3 size={14} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. CUSTOMER IDENTITY HERO CARD */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Left: Avatar & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              flexShrink: 0,
            }}
          >
            {customer.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {customer.name}
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--omni-red)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                {customer.group}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={13} style={{ color: 'var(--omni-red)' }} />
                  <a href={`tel:${customer.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    {customer.phone}
                  </a>
                </div>
              )}

              {customer.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Highlights Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Folders</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{folders.length}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Products</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{allFolderProducts.length}</div>
          </div>
          <div style={{ textAlign: 'right', padding: '8px 14px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Value (BDT)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--omni-red)' }}>৳{totalBdtValue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 3. PROFILE-SPECIFIC RMB & WEIGHT RATE CONFIGURATION CARD */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={16} style={{ color: '#eab308' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Profile Exchange & Freight Rates ({customer.name})
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Rates used to convert product costs and cargo shipping for this customer.
            </span>
          </div>

          {hasSavedRates && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} />
              <span>Rates Saved Successfully</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* RMB to BDT Rate with unrestricted text typing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
            <label htmlFor="cust-rmb-rate" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              1 RMB = ৳
            </label>
            <input
              id="cust-rmb-rate"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 20.0"
              value={rmbRateInput}
              onChange={(e) => setRmbRateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCustomerRates();
              }}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: isRatesDirty ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                outline: 'none',
              }}
              title="Enter conversion rate freely (e.g. 20, 20.5, 21.58). Press Enter or click Apply to save."
            />
          </div>

          {/* Weight / Freight Rate with unrestricted text typing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
            <label htmlFor="cust-freight-rate" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Scale size={13} style={{ color: '#06b6d4' }} />
              <span>Freight:</span>
            </label>
            <input
              id="cust-freight-rate"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1.2 or 850"
              value={freightRateInput}
              onChange={(e) => setFreightRateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCustomerRates();
              }}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: isRatesDirty ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                outline: 'none',
              }}
              title="Enter shipping cost freely (e.g. 1.2 for Tk/g, 850 for Tk/kg). Press Enter or click Apply to save."
            />
            <select
              value={customerFreightUnit}
              onChange={(e) => setCustomerFreightUnit(e.target.value as 'per_gm' | 'per_kg')}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <option value="per_gm">৳/gm</option>
              <option value="per_kg">৳/kg</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSaveCustomerRates}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                background: isRatesDirty
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'var(--omni-red)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: isRatesDirty
                  ? '0 3px 12px rgba(239, 68, 68, 0.45)'
                  : '0 2px 8px rgba(220, 38, 38, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.18s ease',
              }}
              title="Click to apply rates to all products & folders and save"
            >
              <Check size={14} />
              <span>{isRatesDirty ? 'Apply & Save Rates *' : 'Apply & Save Rates'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToBenchmarkRates}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Reset customer rates back to global benchmark defaults"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN NAVIGATION TABS (FOLDERS, PRODUCTS, ORDERS, NOTES) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('folders')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: activeTab === 'folders' ? '1px solid var(--omni-red)' : '1px solid transparent',
              background: activeTab === 'folders' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              color: activeTab === 'folders' ? 'var(--omni-red)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <FolderOpen size={16} />
            <span>Folders ({folders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: activeTab === 'products' ? '1px solid var(--omni-red)' : '1px solid transparent',
              background: activeTab === 'products' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              color: activeTab === 'products' ? 'var(--omni-red)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <Package size={16} />
            <span>Products ({allFolderProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: activeTab === 'orders' ? '1px solid var(--omni-red)' : '1px solid transparent',
              background: activeTab === 'orders' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              color: activeTab === 'orders' ? 'var(--omni-red)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <ShoppingBag size={16} />
            <span>Customer Orders ({customer.orders?.length || 0})</span>
          </button>
        </div>

        {/* Tab Right Quick Action */}
        <div>
          {activeTab === 'folders' && (
            <button
              type="button"
              onClick={() => {
                setNewFolderOrderNumber(profileFolderService.generateUniqueOrderNumber());
                setShowAddFolderModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'var(--omni-red)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Create Folder</span>
            </button>
          )}

          {activeTab === 'orders' && (
            <button
              type="button"
              onClick={() => onAddNewOrder(customer)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'var(--omni-red)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>New Order</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. TAB CONTENT: FOLDERS */}
      {activeTab === 'folders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {folders.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <FolderOpen size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Folders Created Yet for {customer.name}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Organize this customer's products into sequential folders (e.g. ORD-101, ORD-102) with custom dates and conversion rates.
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewFolderOrderNumber(profileFolderService.generateUniqueOrderNumber());
                  setShowAddFolderModal(true);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                <Plus size={14} />
                <span>Create First Folder</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '14px',
              }}
            >
              {folders.map((folder) => {
                const fin = calculateFolderFinancials(folder);

                return (
                  <div
                    key={folder.id}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.16s ease',
                    }}
                  >
                    {/* Top: Order Number & Name */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--omni-red)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                        >
                          {folder.orderNumber}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          <span>{folder.date}</span>
                        </div>
                      </div>

                      <h4 style={{ margin: '4px 0 2px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {folder.name}
                      </h4>
                      {folder.note && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {folder.note}
                        </div>
                      )}
                    </div>

                    {/* Financials Strip */}
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Items</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {folder.products.length}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total RMB</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          ¥{fin.totalValueRmb.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total BDT</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--omni-red)' }}>
                          ৳{fin.equivalentAmountTk.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Add Product to Folder & Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetFolderForProduct(folder);
                          setShowAddProductModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--omni-red)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Plus size={13} />
                        <span>Add Product</span>
                      </button>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setFolderFilter(folder.id);
                            setActiveTab('products');
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                          }}
                          title="View items in this folder"
                        >
                          View Products
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder.id, folder.name, folder.orderNumber)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            background: 'transparent',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                          }}
                          title="Delete folder"
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
        </div>
      )}

      {/* 6. TAB CONTENT: PRODUCTS (WITH FOLDER & DATE SORTING) */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls Bar: Folder Filter, Sort By, View Mode */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Filter by Folder */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Folder Filter:
              </span>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Folders ({folders.length})</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.orderNumber} - {f.name} ({f.products.length})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort by: Folder Name or Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUpDown size={14} style={{ color: 'var(--omni-red)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Sort By:
                </span>
                <select
                  value={productSortBy}
                  onChange={(e) => setProductSortBy(e.target.value as ProductSortOption)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <option value="folder_asc">Folder Name (A → Z)</option>
                  <option value="folder_desc">Folder Name (Z → A)</option>
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="seq_asc">Sequence Number</option>
                </select>
              </div>

              <ViewModeToggle viewMode={productViewMode} onChange={setProductViewMode} />

              <button
                type="button"
                onClick={() => {
                  if (folders.length === 0) {
                    showToast('⚠️ Please create a folder first!');
                    setActiveTab('folders');
                    return;
                  }
                  const matched = folderFilter !== 'all' ? folders.find((f) => f.id === folderFilter) : folders[0];
                  setTargetFolderForProduct(matched || folders[0]);
                  setShowAddProductModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                }}
              >
                <Plus size={14} />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Product Items List / Grid */}
          {allFolderProducts.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Package size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Products Found
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {folders.length === 0
                  ? 'First create a folder in the Folders tab to start cataloging sequential products for this customer.'
                  : 'Add products into folders to see them listed here with folder and date sorting.'}
              </p>
              {folders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const matched = folderFilter !== 'all' ? folders.find((f) => f.id === folderFilter) : folders[0];
                    setTargetFolderForProduct(matched || folders[0]);
                    setShowAddProductModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  <Plus size={15} />
                  <span>Add First Product</span>
                </button>
              )}
            </div>
          ) : productViewMode === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allFolderProducts.map((p) => {
                const isReturned = p.status === 'returned';
                const isCancelled = p.status === 'cancelled';

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: isReturned
                        ? 'rgba(239, 68, 68, 0.06)'
                        : isCancelled
                        ? 'rgba(100, 116, 139, 0.06)'
                        : 'var(--bg-card)',
                      border: isReturned
                        ? '1px solid rgba(239, 68, 68, 0.35)'
                        : '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap',
                      transition: 'all 0.16s ease',
                    }}
                  >
                    {/* Left: Code, Thumbnail, Folder, Date, Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: '1 1 280px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: 'var(--omni-red)',
                          flexShrink: 0,
                        }}
                      >
                        {p.assignedNumber}
                      </span>

                      {p.imageUrl ? (
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            flexShrink: 0,
                            background: '#0f172a',
                          }}
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : null}

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            📁 {p.folderName} ({p.folderOrderNumber})
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            📅 {p.folderDate}
                          </span>
                          {p.platform && (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                              }}
                            >
                              {p.platform}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginTop: '2px',
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {p.weightKg ? (
                            <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600 }}>
                              ⚖️ {p.weightKg >= 1 ? `${p.weightKg} kg` : `${Math.round(p.weightKg * 1000)} gm`}
                            </span>
                          ) : null}
                          {p.note && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Note: {p.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Pricing Breakdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>RMB Cost</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          ¥{p.totalRmb.toFixed(2)}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '3px' }}>
                            (¥{p.priceRmb} × {p.quantity})
                          </span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Converted (BDT)</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--omni-red)' }}>
                          ৳{Math.round(p.totalRmb * customerRmbRate).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={p.status}
                        onChange={(e) => handleSetProductStatus(p.folderId, p.id, e.target.value as ProductStatus)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background:
                            p.status === 'returned'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : p.status === 'cancelled'
                              ? 'rgba(100, 116, 139, 0.15)'
                              : 'var(--bg-surface)',
                          color:
                            p.status === 'returned'
                              ? '#ef4444'
                              : p.status === 'cancelled'
                              ? 'var(--text-muted)'
                              : '#10b981',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="returned">Returned</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.folderId, p.id, p.assignedNumber)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                        title="Delete product"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {allFolderProducts.map((p) => {
                const isReturned = p.status === 'returned';
                const isCancelled = p.status === 'cancelled';

                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '14px',
                      border: isReturned ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-color)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div>
                      {p.imageUrl && (
                        <div
                          style={{
                            width: '100%',
                            height: '140px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            marginBottom: '10px',
                            background: '#0f172a',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--omni-red)',
                          }}
                        >
                          {p.assignedNumber}
                        </span>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          📅 {p.folderDate}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          📁 {p.folderName} ({p.folderOrderNumber})
                        </span>
                        {p.platform && (
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                            }}
                          >
                            {p.platform}
                          </span>
                        )}
                      </div>

                      <h4
                        style={{
                          margin: '4px 0 2px',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          textDecoration: isCancelled ? 'line-through' : 'none',
                        }}
                      >
                        {p.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {p.weightKg ? (
                          <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600 }}>
                            ⚖️ {p.weightKg >= 1 ? `${p.weightKg} kg` : `${Math.round(p.weightKg * 1000)} gm`}
                          </span>
                        ) : null}
                        {p.note && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {p.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          ¥{p.priceRmb} × {p.quantity}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          ¥{p.totalRmb.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>BDT</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--omni-red)' }}>
                          ৳{Math.round(p.totalRmb * customerRmbRate).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <select
                        value={p.status}
                        onChange={(e) => handleSetProductStatus(p.folderId, p.id, e.target.value as ProductStatus)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'var(--bg-surface)',
                          color: p.status === 'returned' ? '#ef4444' : p.status === 'cancelled' ? 'var(--text-muted)' : '#10b981',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="returned">Returned</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.folderId, p.id, p.assignedNumber)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Controls: Filters & New Order Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {(['all', 'active', 'delivered', 'cancelled'] as const).map((filterKey) => {
                const count =
                  filterKey === 'all'
                    ? customer.orders?.length || 0
                    : filterKey === 'active'
                    ? (customer.orders || []).filter((o) => !o.is_delivered && !o.is_cancelled).length
                    : filterKey === 'delivered'
                    ? (customer.orders || []).filter((o) => o.is_delivered).length
                    : (customer.orders || []).filter((o) => o.is_cancelled).length;
                const isActive = activeOrderFilter === filterKey;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setActiveOrderFilter(filterKey)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isActive ? '1px solid var(--omni-red)' : '1px solid var(--border-color)',
                      background: isActive ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                      color: isActive ? 'var(--omni-red)' : 'var(--text-secondary)',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {filterKey} ({count})
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onAddNewOrder(customer)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'var(--omni-red)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Input New Order</span>
            </button>
          </div>

          {/* Orders List / Empty State */}
          {(!customer.orders || customer.orders.length === 0) ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <ShoppingBag size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Customer Orders Logged Yet
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Log incoming or historical customer orders directly to track payments, delivery status, and profit margins.
              </p>
              <button
                type="button"
                onClick={() => onAddNewOrder(customer)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                <Plus size={14} />
                <span>Create Order Record</span>
              </button>
            </div>
          ) : filteredCustomerOrders.length === 0 ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '14px',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.86rem',
              }}
            >
              No orders match the filter &quot;{activeOrderFilter}&quot;.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredCustomerOrders.map((order, idx) => {
                const isDelivered = !!order.is_delivered;
                const isCancelled = !!order.is_cancelled;
                const isPaid = order.remaining_balance <= 0 && order.total_amount > 0;
                const isPartial = !isPaid && (order.advance_payment || 0) > 0;

                return (
                  <div
                    key={order.id || idx}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      padding: '16px',
                      boxShadow: 'var(--neu-flat-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      opacity: isCancelled ? 0.65 : 1,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {/* Top Row: Thumbnail + Product Name + Badges + Financials */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 280px' }}>
                        {/* Thumbnail image or placeholder icon */}
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '10px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {order.product_image ? (
                            <img
                              src={order.product_image}
                              alt={order.product_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Package size={22} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>

                        {/* Title, External Link, Badges */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.98rem',
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                lineHeight: '1.25',
                              }}
                            >
                              {order.product_name}
                            </span>

                            {order.product_link && (
                              <a
                                href={order.product_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--omni-red)', display: 'inline-flex', alignItems: 'center' }}
                                title="Open original product URL"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>

                          {/* Status Pills */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {/* Delivery Status Pill */}
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: isCancelled
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : isDelivered
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(245, 158, 11, 0.12)',
                                color: isCancelled ? '#ef4444' : isDelivered ? '#10b981' : '#f59e0b',
                                border: isCancelled
                                  ? '1px solid rgba(239, 68, 68, 0.25)'
                                  : isDelivered
                                  ? '1px solid rgba(16, 185, 129, 0.25)'
                                  : '1px solid rgba(245, 158, 11, 0.25)',
                              }}
                            >
                              {isCancelled ? '❌ Cancelled' : isDelivered ? '✅ Delivered' : '⏳ Pending Delivery'}
                            </span>

                            {/* Payment Status Pill */}
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: isPaid
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : isPartial
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                                color: isPaid ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444',
                                border: isPaid
                                  ? '1px solid rgba(16, 185, 129, 0.25)'
                                  : isPartial
                                  ? '1px solid rgba(245, 158, 11, 0.25)'
                                  : '1px solid rgba(239, 68, 68, 0.25)',
                              }}
                            >
                              {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Numbers Strip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Value</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            ৳{order.total_amount?.toLocaleString() || 0}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Advance Paid</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                            ৳{order.advance_payment?.toLocaleString() || 0}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.68rem', color: order.remaining_balance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                            Balance Due
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: order.remaining_balance > 0 ? '#ef4444' : '#10b981' }}>
                            ৳{order.remaining_balance?.toLocaleString() || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Specs, Weights, Date & Notes */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span>
                          <strong>Qty:</strong> {order.quantity || 1}
                        </span>
                        {order.price !== undefined && (
                          <span>
                            <strong>Unit Price:</strong> ৳{order.price?.toLocaleString()}
                          </span>
                        )}
                        {order.weight && (
                          <span>
                            <strong>Weight:</strong> {order.weight} {order.weight_unit || 'kg'}
                          </span>
                        )}
                        <span>
                          <strong>Date:</strong> {order.date_time}
                        </span>
                      </div>

                      {order.notes && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '350px' }}>
                          📝 {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Controls: Quick Status Checkboxes + Edit & Delete Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-color)',
                      }}
                    >
                      {/* Left: Interactive Checkboxes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: isDelivered ? '#10b981' : 'var(--text-secondary)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isDelivered}
                            onChange={(e) => {
                              onToggleOrderStatus?.(order, e.target.checked, false);
                            }}
                            style={{ width: '15px', height: '15px', accentColor: '#10b981', cursor: 'pointer' }}
                          />
                          <span>Mark Delivered</span>
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: isCancelled ? '#ef4444' : 'var(--text-secondary)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCancelled}
                            onChange={(e) => {
                              onToggleOrderStatus?.(order, false, e.target.checked);
                            }}
                            style={{ width: '15px', height: '15px', accentColor: '#ef4444', cursor: 'pointer' }}
                          />
                          <span>Mark Cancelled</span>
                        </label>
                      </div>

                      {/* Right: EDIT and DELETE Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onEditOrder?.(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover-neu-lift"
                          title="Edit order details, pricing, payments, notes"
                        >
                          <Edit3 size={13} style={{ color: '#3b82f6' }} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete order "${order.product_name}"?`)) {
                              onDeleteOrder?.(order.id);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover-neu-lift"
                          title="Delete this order record permanently"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE FOLDER */}
      {showAddFolderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => setShowAddFolderModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '460px',
              padding: '20px',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Create Folder for {customer.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFolderModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Folder Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Winter Jackets, Electronics Lot A"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={newFolderOrderNumber}
                    onChange={(e) => setNewFolderOrderNumber(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={newFolderDate}
                    onChange={(e) => setNewFolderDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Special shipment instructions or remarks..."
                  value={newFolderNote}
                  onChange={(e) => setNewFolderNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PRODUCT TO FOLDER (MATCHES LIST BUILDER: AI EXTRACTOR + MANUAL ENTRY) */}
      {showAddProductModal && targetFolderForProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => {
            setShowAddProductModal(false);
            resetAddProductForm();
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Title, Target Folder Selector & Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--omni-red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Add Product to Folder
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Folder: <strong>{targetFolderForProduct.orderNumber} - {targetFolderForProduct.name}</strong> • Next Code:{' '}
                    <code style={{ color: 'var(--omni-red)', fontWeight: 800 }}>
                      {targetFolderForProduct.orderNumber}-{targetFolderForProduct.products.length + 1}
                    </code>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {folders.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Folder:</span>
                    <select
                      value={targetFolderForProduct.id}
                      onChange={(e) => {
                        const f = folders.find((item) => item.id === e.target.value);
                        if (f) setTargetFolderForProduct(f);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.orderNumber} - {f.name} ({f.products.length} items)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    resetAddProductForm();
                  }}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* SECTION 1: AI SCREENSHOT EXTRACTOR (MATCHES LIST BUILDER) */}
            <div
              style={{
                background: 'var(--bg-surface)',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: 'var(--omni-red)' }} />
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    AI Screenshot Extractor
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--omni-red)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    1688 / Taobao / Pinduoduo
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Paste or upload image to auto-detect title, RMB price, weight & photos
                </span>
              </div>

              <SmartScreenshotExtractor
                apiUrl={apiUrl}
                defaultExchangeRate={customerRmbRate || 20.0}
                onAutoFill={handleAutoFillFromScreenshot}
                onAddDirectlyToList={handleAddDirectlyFromScreenshot}
                showToast={showToast}
                isOpenByDefault={true}
              />
            </div>

            {/* SECTION 2: MANUAL PRODUCT ENTRY FORM (MATCHES LIST BUILDER) */}
            <form onSubmit={handleSubmitManualProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <Edit3 size={15} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Manual Product Details & Verification
                </span>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Product Title / Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Fleece Warm Jacket Black L"
                  value={newProdTitle}
                  onChange={(e) => setNewProdTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Price, Currency, Weight, Unit & Quantity in Responsive Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {/* Price & Currency */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Unit Price <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {parseFloat(newProdPrice) > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--omni-red)' }}>
                        ≈ ৳{Math.round(
                          newProdCurrency === 'RMB'
                            ? (parseFloat(newProdPrice) || 0) * customerRmbRate
                            : newProdCurrency === 'USD'
                            ? (parseFloat(newProdPrice) || 0) * 120.0
                            : parseFloat(newProdPrice) || 0
                        ).toLocaleString()} BDT
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 45.00"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <select
                      value={newProdCurrency}
                      onChange={(e) => setNewProdCurrency(e.target.value as any)}
                      style={{
                        width: '85px',
                        padding: '8px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="RMB">RMB (¥)</option>
                      <option value="BDT">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                {/* Weight & Unit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Scale size={13} style={{ color: '#06b6d4' }} />
                      <span>Unit Weight</span>
                    </label>
                    {parseFloat(newProdWeightVal) > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#06b6d4' }}>
                        ≈ ৳{Math.round(
                          (newProdWeightUnit === 'gm'
                            ? (parseFloat(newProdWeightVal) || 0) / 1000
                            : parseFloat(newProdWeightVal) || 0) *
                            (customerFreightUnit === 'per_gm' ? 1000 * customerFreightRate : customerFreightRate)
                        ).toLocaleString()} cargo
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={newProdWeightUnit === 'gm' ? 'e.g. 350' : 'e.g. 0.35'}
                      value={newProdWeightVal}
                      onChange={(e) => setNewProdWeightVal(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <select
                      value={newProdWeightUnit}
                      onChange={(e) => setNewProdWeightUnit(e.target.value as any)}
                      style={{
                        width: '75px',
                        padding: '8px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="gm">gm</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Quantity <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProdQty}
                    onChange={(e) => setNewProdQty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Platform */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Source Platform
                  </label>
                  <select
                    value={newProdPlatform}
                    onChange={(e) => setNewProdPlatform(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="1688">1688.com</option>
                    <option value="Taobao">Taobao</option>
                    <option value="Pinduoduo">Pinduoduo</option>
                    <option value="Weidian">Weidian</option>
                    <option value="Alibaba">Alibaba</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Product Photos Section (Upload + URL Attachment) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--omni-red)' }} />
                  <span>Product Photos / Images</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({newProdImages.length} attached)
                  </span>
                </label>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="file"
                    ref={prodFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => prodFileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <UploadCloud size={14} style={{ color: 'var(--omni-red)' }} />
                    <span>Upload Image(s)</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px', flex: '1 1 240px' }}>
                    <input
                      type="url"
                      placeholder="Or paste image web link..."
                      value={newProdImageUrl}
                      onChange={(e) => setNewProdImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Attach
                    </button>
                  </div>
                </div>

                {/* Thumbnails list */}
                {newProdImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {newProdImages.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '54px',
                          height: '54px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          background: '#0f172a',
                        }}
                      >
                        <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '4px',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product URL */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <LinkIcon size={12} style={{ color: 'var(--text-muted)' }} />
                  <span>Product / Supplier URL (Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://detail.1688.com/offer/..."
                  value={newProdUrl}
                  onChange={(e) => setNewProdUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* STRUCTURED MANUAL PRODUCT FEATURES (COLOR, SIZE, MODEL, STYLE, SHAPE, COMBINATION) */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={15} style={{ color: 'var(--omni-red)' }} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Selected Product Features & Specifications
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Only filled features will be displayed; empty fields are hidden.
                  </span>
                </div>

                {/* Live Feature Preview Strip */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '26px', alignItems: 'center' }}>
                  {activeManualFeatures.length > 0 ? (
                    activeManualFeatures.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{f.icon}</span>
                        <span>{f.label}: {f.value}</span>
                      </span>
                    ))
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(148, 163, 184, 0.08)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        color: '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle size={12} style={{ color: '#fbbf24' }} />
                      <span>No features present (fill any option below to set features)</span>
                    </div>
                  )}
                </div>

                {/* Grid of 6 Specific Feature Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  {/* Color */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      🎨 Color
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Matte Black"
                      value={manualColor}
                      onChange={(e) => setManualColor(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Size */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      📏 Size
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. XL, 42 EU, 100cm"
                      value={manualSize}
                      onChange={(e) => setManualSize(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      ⚙️ Model / Specs
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pro Edition, 2026"
                      value={manualModel}
                      onChange={(e) => setManualModel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Style */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      ✨ Style / Pattern
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hooded, Striped"
                      value={manualStyle}
                      onChange={(e) => setManualStyle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Shape */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      🔷 Shape
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Round, Square"
                      value={manualShape}
                      onChange={(e) => setManualShape(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Combination / Bundle */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      📦 Combo / Bundle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Host + 2 Batteries"
                      value={manualCombination}
                      onChange={(e) => setManualCombination(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Additional remarks */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Extra Remarks / Specifications (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special packaging requested, sample piece"
                    value={manualCustomNote}
                    onChange={(e) => setManualCustomNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Real-time Financial Breakdown Strip */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Product Cost</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {parseFloat(newProdPrice) > 0 ? (
                      <>
                        ¥{((parseFloat(newProdPrice) || 0) * (parseInt(newProdQty, 10) || 1)).toFixed(2)}
                        <span style={{ fontSize: '0.72rem', color: 'var(--omni-red)', marginLeft: '4px' }}>
                          (≈ ৳{Math.round(
                            (parseFloat(newProdPrice) || 0) * (parseInt(newProdQty, 10) || 1) * customerRmbRate
                          ).toLocaleString()})
                        </span>
                      </>
                    ) : (
                      '¥0.00'
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Estimated Freight (Cargo)</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#06b6d4' }}>
                    ৳{Math.round(
                      (newProdWeightUnit === 'gm'
                        ? (parseFloat(newProdWeightVal) || 0) / 1000
                        : parseFloat(newProdWeightVal) || 0) *
                        (parseInt(newProdQty, 10) || 1) *
                        (customerFreightUnit === 'per_gm' ? 1000 * customerFreightRate : customerFreightRate)
                    ).toLocaleString()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Landed Equivalent</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--omni-red)' }}>
                    ৳{Math.round(
                      (parseFloat(newProdPrice) || 0) * (parseInt(newProdQty, 10) || 1) * customerRmbRate +
                        (newProdWeightUnit === 'gm'
                          ? (parseFloat(newProdWeightVal) || 0) / 1000
                          : parseFloat(newProdWeightVal) || 0) *
                          (parseInt(newProdQty, 10) || 1) *
                          (customerFreightUnit === 'per_gm' ? 1000 * customerFreightRate : customerFreightRate)
                    ).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    resetAddProductForm();
                  }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>Add Product to {targetFolderForProduct.orderNumber}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
