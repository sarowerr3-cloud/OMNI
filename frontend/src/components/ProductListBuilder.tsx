'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Trash2, Package } from 'lucide-react';
import { 
  ProductItem, 
  ChecklistTask, 
  SavedProductList, 
  LightboxState, 
  DEFAULT_SOURCING_CHECKLIST 
} from '@/types/listBuilder';
import { formatExternalUrl, compressImageFile } from '@/lib/imageUtils';
import { exportSingleOrderToExcel } from '@/lib/excelExport';
import { getAuthHeaders } from '@/services/customerApi';
import {
  ProductItemCard,
  ProductItemForm,
  DepositModal,
  WhatsAppModal,
  SavedListsModal,
  SaveListModal,
  LightboxModal,
  ListToolbar,
  ListMetadataForm,
  PaymentActionBar,
  PdfPrintTemplate,
} from './list-builder';
import EmptyState from '@/components/shared/EmptyState';
import ViewModeToggle, { ViewMode } from '@/components/shared/ViewModeToggle';

// Re-export types and helpers for external compatibility
export type { ProductItem, ChecklistTask, SavedProductList };
export { DEFAULT_SOURCING_CHECKLIST, formatExternalUrl, compressImageFile };

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

export default function ProductListBuilder({
  items,
  onUpdateItems,
  apiUrl,
  showToast,
  defaultRmbRate,
  defaultUsdRate,
  defaultFreightRate,
  defaultFreightUnit,
  onPitchToCustomers,
}: ProductListBuilderProps) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // List Metadata
  const [listName, setListName] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('OMNI SOURCING');
  const [listDate, setListDate] = useState<string>(getTodayDate());
  const [listNotes, setListNotes] = useState<string>('');
  const [currentListId, setCurrentListId] = useState<string | null>(null);

  // Currency & Freight Rates
  const [rmbRate, setRmbRate] = useState<string>(defaultRmbRate || '20.00');
  const [usdRate, setUsdRate] = useState<string>(defaultUsdRate || '120.00');
  const [freightRate, setFreightRate] = useState<string>(defaultFreightRate || '1.2');
  const [freightUnit, setFreightUnit] = useState<'per_gm' | 'per_kg'>(defaultFreightUnit || 'per_gm');
  const [includeWeightInTotal, setIncludeWeightInTotal] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modals
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [savedLists, setSavedLists] = useState<SavedProductList[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [savingToServer, setSavingToServer] = useState<boolean>(false);
  const [showSaveListModal, setShowSaveListModal] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [pdfExportMode, setPdfExportMode] = useState<'single_page' | 'multi_page'>('single_page');
  const [previewModal, setPreviewModal] = useState<LightboxState | null>(null);

  // Keep rates updated from parent props
  useEffect(() => {
    if (defaultRmbRate && Number(defaultRmbRate) > 0) setRmbRate(defaultRmbRate);
  }, [defaultRmbRate]);

  useEffect(() => {
    if (defaultUsdRate && Number(defaultUsdRate) > 0) setUsdRate(defaultUsdRate);
  }, [defaultUsdRate]);

  useEffect(() => {
    if (defaultFreightRate && Number(defaultFreightRate) > 0) setFreightRate(defaultFreightRate);
  }, [defaultFreightRate]);

  useEffect(() => {
    if (defaultFreightUnit) setFreightUnit(defaultFreightUnit);
  }, [defaultFreightUnit]);

  // Calculations
  const totalItemsCount = items.length;
  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalProductPriceBdt = items.reduce(
    (acc, it) => acc + (it.price_bdt || 0) * (it.quantity || 1),
    0
  );
  const totalWeightKg = Number(
    items
      .reduce((acc, it) => acc + (it.weight_kg || 0) * (it.quantity || 1), 0)
      .toFixed(3)
  );

  const calculateUnitWeightPriceBdt = (weightKg: number, rateStr: string, unit: 'per_gm' | 'per_kg'): number => {
    const rate = Number(rateStr) || 0;
    if (rate <= 0 || weightKg <= 0) return 0;
    return unit === 'per_gm' ? weightKg * 1000.0 * rate : weightKg * rate;
  };

  const totalWeightPriceBdt = Math.round(
    items.reduce((acc, it) => {
      const lineWeightPrice =
        it.line_weight_price_bdt !== undefined
          ? it.line_weight_price_bdt
          : calculateUnitWeightPriceBdt(it.weight_kg || 0, freightRate, freightUnit) * (it.quantity || 1);
      return acc + lineWeightPrice;
    }, 0)
  );

  const grandTotalBdt = totalProductPriceBdt + totalWeightPriceBdt;
  const effectiveTotalOrderBdt = includeWeightInTotal ? grandTotalBdt : totalProductPriceBdt;

  const totalPaidBdt = items.reduce((acc, it) => acc + (it.paid_amount || 0), 0);
  const totalDueBdt = Math.max(0, effectiveTotalOrderBdt - totalPaidBdt);
  const checkedItemsCount = items.filter((it) => it.is_checked).length;

  // Reset Builder
  const resetToDefaultBuilder = () => {
    onUpdateItems([]);
    setListName('');
    setBrandName('OMNI SOURCING');
    setListDate(getTodayDate());
    setListNotes('');
    setCurrentListId(null);
    try {
      localStorage.removeItem('omni_active_product_list');
    } catch {}
  };

  // Item Actions
  const handleToggleItemChecked = (id: string) => {
    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, is_checked: !it.is_checked } : it))
    );
  };

  const handleCheckAllItems = () => {
    onUpdateItems(items.map((it) => ({ ...it, is_checked: true })));
    showToast('✓ All items marked as sourced!');
  };

  const handleUncheckAllItems = () => {
    onUpdateItems(items.map((it) => ({ ...it, is_checked: false })));
  };

  const handleDeleteItem = (id: string) => {
    onUpdateItems(items.filter((it) => it.id !== id));
    showToast('🗑️ Product removed from list');
  };

  const handleClearList = () => {
    if (window.confirm('Are you sure you want to clear all products from the list?')) {
      resetToDefaultBuilder();
      showToast('🗑️ Product list cleared!');
    }
  };

  const handleQuantityChange = (id: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    onUpdateItems(
      items.map((it) => {
        if (it.id !== id) return it;
        const lineProductPrice = (it.price_bdt || 0) * qty;
        const lineWeightPrice = (it.weight_price_bdt || 0) * qty;
        const combined = lineProductPrice + lineWeightPrice;
        return {
          ...it,
          quantity: qty,
          line_weight_price_bdt: lineWeightPrice,
          combined_line_total_bdt: combined,
          due_amount: Math.max(0, combined - (it.paid_amount || 0)),
        };
      })
    );
  };

  const handleItemPaidChange = (id: string, paidVal: number) => {
    onUpdateItems(
      items.map((it) => {
        if (it.id !== id) return it;
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        const paid = Math.min(lineTotal, Math.max(0, paidVal));
        const due = Math.max(0, lineTotal - paid);
        return {
          ...it,
          paid_amount: paid,
          due_amount: due,
          payment_status: due === 0 && paid > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        };
      })
    );
  };

  const handleMarkItemPaid = (id: string) => {
    onUpdateItems(
      items.map((it) => {
        if (it.id !== id) return it;
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        return {
          ...it,
          paid_amount: lineTotal,
          due_amount: 0,
          payment_status: 'paid',
        };
      })
    );
    showToast('✅ Marked item as fully paid!');
  };

  const handleResetItemPayment = (id: string) => {
    onUpdateItems(
      items.map((it) => {
        if (it.id !== id) return it;
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        return {
          ...it,
          paid_amount: 0,
          due_amount: lineTotal,
          payment_status: 'unpaid',
        };
      })
    );
  };

  const handleMoveItem = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    onUpdateItems(copy);
  };

  const handleAddImagesToExistingItem = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      onUpdateItems(
        items.map((it) => {
          if (it.id !== id) return it;
          const currentImgs = it.images && it.images.length > 0 ? it.images : it.image_url ? [it.image_url] : [];
          const updatedImgs = [...currentImgs, ...newCompressed];
          return {
            ...it,
            images: updatedImgs,
            image_url: updatedImgs[0] || it.image_url,
          };
        })
      );
      showToast(`✅ Added ${newCompressed.length} photo(s) to product!`);
    }
    e.target.value = '';
  };

  // Payment Batch Actions
  const handleMarkAllPaid = () => {
    onUpdateItems(
      items.map((it) => {
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        return {
          ...it,
          paid_amount: lineTotal,
          due_amount: 0,
          payment_status: 'paid',
        };
      })
    );
    showToast('🎉 All products marked as 100% paid!');
  };

  const handleResetAllPayments = () => {
    onUpdateItems(
      items.map((it) => {
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        return {
          ...it,
          paid_amount: 0,
          due_amount: lineTotal,
          payment_status: 'unpaid',
        };
      })
    );
    showToast('🔄 Reset all customer payments.');
  };

  const handleApplyDeposit = (depositAmount: number, strategy: 'sequential' | 'proportional') => {
    if (depositAmount <= 0) return;

    if (strategy === 'sequential') {
      let remaining = depositAmount;
      const updated = items.map((it) => {
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        const currentPaid = it.paid_amount || 0;
        const currentDue = Math.max(0, lineTotal - currentPaid);

        if (currentDue <= 0 || remaining <= 0) return it;

        const allocated = Math.min(currentDue, remaining);
        remaining -= allocated;
        const newPaid = currentPaid + allocated;
        const newDue = Math.max(0, lineTotal - newPaid);

        return {
          ...it,
          paid_amount: newPaid,
          due_amount: newDue,
          payment_status: newDue === 0 && newPaid > 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid',
        } as ProductItem;
      });
      onUpdateItems(updated);
      showToast(`💳 Applied ৳${depositAmount.toLocaleString()} deposit sequentially!`);
    } else {
      const orderTotal = effectiveTotalOrderBdt;
      if (orderTotal <= 0) return;

      const updated = items.map((it) => {
        const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
        const lineWeight = it.line_weight_price_bdt ?? (it.weight_price_bdt || 0) * (it.quantity || 1);
        const lineTotal = includeWeightInTotal ? lineProduct + lineWeight : lineProduct;
        const propShare = Math.round((lineTotal / orderTotal) * depositAmount);
        const newPaid = Math.min(lineTotal, (it.paid_amount || 0) + propShare);
        const newDue = Math.max(0, lineTotal - newPaid);

        return {
          ...it,
          paid_amount: newPaid,
          due_amount: newDue,
          payment_status: newDue === 0 && newPaid > 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid',
        } as ProductItem;
      });
      onUpdateItems(updated);
      showToast(`💳 Distributed ৳${depositAmount.toLocaleString()} deposit proportionally!`);
    }
  };

  // Export Actions
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
      'Source URL',
      'Details',
    ];

    const rows = items.map((it, idx) => {
      const lineProduct = (it.price_bdt || 0) * (it.quantity || 1);
      const unitWeightPrice = it.weight_price_bdt || 0;
      const lineWeightPrice = it.line_weight_price_bdt ?? unitWeightPrice * (it.quantity || 1);
      const combined = it.combined_line_total_bdt ?? lineProduct + lineWeightPrice;
      const paid = it.paid_amount || 0;
      const due = it.due_amount !== undefined ? it.due_amount : Math.max(0, combined - paid);
      const status = due === 0 && paid > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

      return [
        idx + 1,
        `"${it.title.replace(/"/g, '""')}"`,
        `"${it.platform || '1688'}"`,
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
        `"${status}"`,
        `"${it.product_url || ''}"`,
        `"${(it.details || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(listName || 'sourcing_list').toLowerCase().replace(/\s+/g, '_')}_${listDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 CSV file downloaded!');
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      showToast('⚠️ No items to export!');
      return;
    }
    try {
      exportSingleOrderToExcel({
        name: listName || 'Sourcing List',
        brand_name: brandName,
        date: listDate,
        items,
        freight_rate: Number(freightRate) || 1.2,
        freight_unit: freightUnit,
        notes: listNotes,
      });
      showToast('📗 Excel (.xlsx) file downloaded successfully!');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('❌ Excel export failed');
    }
  };

  const handleDownloadA4Pdf = async () => {
    if (items.length === 0) {
      showToast('⚠️ Please add at least one product before exporting to PDF!');
      return;
    }

    setDownloadingPdf(true);
    showToast(`⏳ Preparing ${pdfExportMode === 'single_page' ? 'strict 1-page' : 'multi-page'} A4 PDF document...`);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;

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
        enableLinks: true,
      };

      const worker = html2pdf().set(opt).from(element);
      const pdf: any = await (worker as any).toPdf().get('pdf');

      if (pdfExportMode === 'single_page') {
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
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('🖨️ Opening browser A4 print PDF renderer...');
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleShareSummary = () => {
    if (items.length === 0) {
      showToast('⚠️ No items in list to share!');
      return;
    }
    const lines = [
      `📦 OMNI SOURCING LIST: ${listName || 'Untitled'}`,
      `📅 Date: ${listDate}`,
      `🏷️ Total Products: ${totalItemsCount} (${totalQuantity} pcs)`,
      `⚖️ Total Gross Weight: ${totalWeightKg} kg`,
      `💰 Factory Value: ৳${totalProductPriceBdt.toLocaleString()} BDT`,
      `✈️ Freight Charge: ৳${totalWeightPriceBdt.toLocaleString()} BDT`,
      `🎯 COMBINED GRAND TOTAL: ৳${grandTotalBdt.toLocaleString()} BDT`,
      `✅ TOTAL CUSTOMER PAID: ৳${totalPaidBdt.toLocaleString()} BDT`,
      `⚠️ OUTSTANDING CUSTOMER DUE: ৳${totalDueBdt.toLocaleString()} BDT`,
      listNotes ? `📝 Notes: ${listNotes}` : '',
    ];

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    showToast('📋 Sourcing summary copied to clipboard!');
  };

  // Save / Load Lists
  const handleOpenSavedModal = async () => {
    setShowSavedModal(true);
    setLoadingSaved(true);
    try {
      const res = await fetch(`${apiUrl}/product-lists`, {
        headers: getAuthHeaders(),
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

  const handleExecuteSave = async (startNewList: boolean) => {
    const finalListName = listName.trim() || `Sourcing List - ${listDate}`;
    setSavingToServer(true);

    try {
      const payload = {
        name: finalListName,
        brand_name: brandName,
        date: listDate,
        notes: listNotes,
        freight_rate: Number(freightRate) || 1.2,
        freight_unit: freightUnit,
        items,
        total_price_bdt: totalProductPriceBdt,
        total_weight_price_bdt: totalWeightPriceBdt,
        grand_total_bdt: grandTotalBdt,
        total_paid_bdt: totalPaidBdt,
        total_due_bdt: totalDueBdt,
        payment_status: totalDueBdt === 0 && effectiveTotalOrderBdt > 0 ? 'paid' : totalPaidBdt > 0 ? 'partial' : 'unpaid',
      };

      const endpoint = currentListId ? `${apiUrl}/product-lists/${currentListId}` : `${apiUrl}/product-lists`;
      const method = currentListId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        if (savedData?.id) setCurrentListId(savedData.id);
      }

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
      showToast('💾 List saved locally!');
    } finally {
      setSavingToServer(false);
    }
  };

  const handleLoadList = (list: SavedProductList) => {
    if (list.items && Array.isArray(list.items)) {
      onUpdateItems(list.items);
      setListName(list.name || '');
      setBrandName(list.brand_name || 'OMNI SOURCING');
      setListDate(list.date || getTodayDate());
      setListNotes(list.notes || '');
      setCurrentListId(list.id || null);
      if (list.freight_rate) setFreightRate(String(list.freight_rate));
      if (list.freight_unit === 'per_gm' || list.freight_unit === 'per_kg') {
        setFreightUnit(list.freight_unit);
      }
      setShowSavedModal(false);
      showToast(`📂 Loaded "${list.name}" (${list.items.length} items)!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteSavedList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved list?')) return;
    try {
      await fetch(`${apiUrl}/product-lists/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSavedLists((prev) => prev.filter((l) => l.id !== id));
      showToast('🗑️ Deleted saved list.');
    } catch {
      showToast('❌ Failed to delete list');
    }
  };

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Lightbox Viewer */}
      <LightboxModal
        previewModal={previewModal}
        onClose={() => setPreviewModal(null)}
        onIndexChange={(idx) =>
          setPreviewModal((prev) => (prev ? { ...prev, currentIndex: idx } : null))
        }
      />

      {/* Main Container Card */}
      <div
        className="no-print"
        style={{
          background: 'var(--bg-card, rgba(24, 24, 27, 0.72))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-card, 0 4px 24px -1px rgba(0, 0, 0, 0.45))',
        }}
      >
        {/* Toolbar Header */}
        <ListToolbar
          onOpenSavedModal={handleOpenSavedModal}
          onOpenSaveModal={() => setShowSaveListModal(true)}
          onOpenWhatsAppModal={() => {
            if (items.length === 0) {
              showToast('⚠️ Please add products before sharing to WhatsApp!');
              return;
            }
            setShowWhatsAppModal(true);
          }}
          onShareSummary={handleShareSummary}
          onExportCsv={handleExportCsv}
          onExportExcel={handleExportExcel}
          pdfExportMode={pdfExportMode}
          setPdfExportMode={setPdfExportMode}
          onDownloadPdf={handleDownloadA4Pdf}
          downloadingPdf={downloadingPdf}
          onNativePrint={() => window.print()}
          savingToServer={savingToServer}
        />

        {/* Metadata Configuration Form */}
        <ListMetadataForm
          listName={listName}
          setListName={setListName}
          listDate={listDate}
          setListDate={setListDate}
          rmbRate={rmbRate}
          setRmbRate={setRmbRate}
          freightRate={freightRate}
          setFreightRate={setFreightRate}
          freightUnit={freightUnit}
          setFreightUnit={setFreightUnit}
          includeWeightInTotal={includeWeightInTotal}
          setIncludeWeightInTotal={setIncludeWeightInTotal}
          listNotes={listNotes}
          setListNotes={setListNotes}
        />

        {/* Payment Summary & Actions */}
        <PaymentActionBar
          itemsCount={items.length}
          effectiveTotalOrderBdt={effectiveTotalOrderBdt}
          totalPaidBdt={totalPaidBdt}
          totalDueBdt={totalDueBdt}
          onOpenDepositModal={() => setShowDepositModal(true)}
          onMarkAllPaid={handleMarkAllPaid}
          onResetAllPayments={handleResetAllPayments}
        />

        {/* Sequential Add Product Form */}
        <ProductItemForm
          apiUrl={apiUrl}
          rmbRate={rmbRate}
          usdRate={usdRate}
          freightRate={freightRate}
          freightUnit={freightUnit}
          includeWeightInTotal={includeWeightInTotal}
          onAddProduct={(newItem) => onUpdateItems([...items, newItem])}
          showToast={showToast}
        />

        {/* Products in List Table / Cards View */}
        <div style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--text-primary, #ffffff)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Layers style={{ width: '20px', height: '20px', color: '#f87171' }} />
                Products in List ({items.length})
              </h3>

              {items.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor:
                        checkedItemsCount === items.length && items.length > 0
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(161, 161, 170, 0.12)',
                      color:
                        checkedItemsCount === items.length && items.length > 0 ? '#4ade80' : '#a1a1aa',
                      border:
                        '1px solid ' +
                        (checkedItemsCount === items.length && items.length > 0
                          ? 'rgba(34, 197, 94, 0.4)'
                          : 'rgba(161, 161, 170, 0.25)'),
                    }}
                  >
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
                      cursor: 'pointer',
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
                      cursor: 'pointer',
                    }}
                  >
                    Uncheck All
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearList}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#f87171',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={<Package size={28} style={{ color: 'var(--text-muted)' }} />}
              title="Your product list is currently empty"
              description="Use the sequential product form above or add products from Categories & Calculator to create quotations."
            />
          ) : (
            <div
              style={
                viewMode === 'grid'
                  ? {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '1rem',
                    }
                  : {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }
              }
            >
              {items.map((item, index) => (
                <ProductItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={items.length}
                  includeWeightInTotal={includeWeightInTotal}
                  onToggleChecked={handleToggleItemChecked}
                  onOpenLightbox={(prod, imgIdx) => {
                    const allImgs =
                      prod.images && prod.images.length > 0
                        ? prod.images
                        : prod.image_url
                        ? [prod.image_url]
                        : [];
                    if (allImgs.length > 0) {
                      setPreviewModal({
                        title: prod.title,
                        images: allImgs,
                        currentIndex: imgIdx,
                        productUrl: prod.product_url,
                      });
                    }
                  }}
                  onAddImages={handleAddImagesToExistingItem}
                  onQuantityChange={handleQuantityChange}
                  onPaidChange={handleItemPaidChange}
                  onMarkPaid={handleMarkItemPaid}
                  onResetPayment={handleResetItemPayment}
                  onMove={handleMoveItem}
                  onDelete={handleDeleteItem}
                  onPitchToCustomers={onPitchToCustomers}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SavedListsModal
        isOpen={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        savedLists={savedLists}
        loadingSaved={loadingSaved}
        onLoadList={handleLoadList}
        onDeleteList={handleDeleteSavedList}
        showToast={showToast}
      />

      <SaveListModal
        isOpen={showSaveListModal}
        onClose={() => setShowSaveListModal(false)}
        listName={listName}
        setListName={setListName}
        brandName={brandName}
        setBrandName={setBrandName}
        listDate={listDate}
        setListDate={setListDate}
        listNotes={listNotes}
        setListNotes={setListNotes}
        savingToServer={savingToServer}
        onSave={handleExecuteSave}
      />

      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        effectiveTotalOrderBdt={effectiveTotalOrderBdt}
        totalPaidBdt={totalPaidBdt}
        totalDueBdt={totalDueBdt}
        onApplyDeposit={handleApplyDeposit}
      />

      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        items={items}
        listName={listName}
        listDate={listDate}
        listNotes={listNotes}
        freightRate={freightRate}
        freightUnit={freightUnit}
        totalItemsCount={totalItemsCount}
        totalQuantity={totalQuantity}
        totalWeightKg={totalWeightKg}
        totalProductPriceBdt={totalProductPriceBdt}
        totalWeightPriceBdt={totalWeightPriceBdt}
        grandTotalBdt={grandTotalBdt}
        totalPaidBdt={totalPaidBdt}
        totalDueBdt={totalDueBdt}
        showToast={showToast}
      />

      {/* A4 PDF Print Template */}
      <PdfPrintTemplate
        items={items}
        listName={listName}
        listDate={listDate}
        listNotes={listNotes}
        freightRate={freightRate}
        freightUnit={freightUnit}
        pdfExportMode={pdfExportMode}
        totalItemsCount={totalItemsCount}
        totalQuantity={totalQuantity}
        totalProductPriceBdt={totalProductPriceBdt}
        totalWeightKg={totalWeightKg}
        totalWeightPriceBdt={totalWeightPriceBdt}
        grandTotalBdt={grandTotalBdt}
      />
    </div>
  );
}
