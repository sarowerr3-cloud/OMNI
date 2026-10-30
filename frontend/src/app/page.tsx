'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppHeader, { MainTab } from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import CustomerSearchStrip from '@/components/home/CustomerSearchStrip';
import CategoryProductManager from '@/components/CategoryProductManager';
import ProductPriceCalculator from '@/components/ProductPriceCalculator';
import ProductListBuilder, { ProductItem } from '@/components/ProductListBuilder';
import SourcingChecklistManager from '@/components/SourcingChecklistManager';
import OrdersManager from '@/components/OrdersManager';
import CustomerManager from '@/components/CustomerManager';
import ProfileFoldersManager from '@/components/ProfileFoldersManager';
import CustomerProfileModal from '@/components/customers/CustomerProfileModal';
import CustomerOrderModal from '@/components/customers/CustomerOrderModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import CommandPalette from '@/components/shared/CommandPalette';
import { Customer, CustomerGroup, CustomerOrder, CustomerOrderPayload, CustomerPayload } from '@/types/customer';
import { customerApi } from '@/services/customerApi';
import { CategorizedProduct } from '@/types/catalog';
import { useToast } from '@/context/ToastContext';

export default function Home() {
  const { showToast, toast } = useToast();
  const [activeTab, setActiveTabState] = useState<MainTab>('categories');

  // Shared List Builder Items
  const [listItems, setListItems] = useState<ProductItem[]>([]);

  // Product passed to Calculator
  const [selectedForCalculator, setSelectedForCalculator] = useState<CategorizedProduct | null>(null);

  // Global Sourcing Rates (saved in localStorage)
  const [rmbRate, setRmbRate] = useState<number>(20.0);
  const [freightRate, setFreightRate] = useState<number>(1.2);
  const [freightUnit, setFreightUnit] = useState<'per_gm' | 'per_kg'>('per_gm');
  const [backendHealth, setBackendHealth] = useState<'online' | 'offline' | 'checking'>('checking');

  // Customer Management & Universal Search State
  const [homeProfileCustomer, setHomeProfileCustomer] = useState<Customer | null>(null);
  const [homeOrderCustomer, setHomeOrderCustomer] = useState<Customer | null>(null);
  const [homeOrderToEdit, setHomeOrderToEdit] = useState<CustomerOrder | null>(null);
  const [homeShowAddCustomer, setHomeShowAddCustomer] = useState<boolean>(false);
  const [homePrefillQuery, setHomePrefillQuery] = useState<string>('');
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [savingCustomer, setSavingCustomer] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [selectedProfileForFolders, setSelectedProfileForFolders] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // URL Tab Sync
  const setActiveTab = useCallback((tab: MainTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'categories') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Keyboard Shortcuts (Ctrl+K, Ctrl+1 to Ctrl+6, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K: Toggle Universal Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const tabMap: Record<string, MainTab> = {
          '1': 'categories',
          '2': 'calculator',
          '3': 'list',
          '4': 'folders',
          '5': 'customers',
          '6': 'checklist',
          '7': 'orders',
        };
        if (tabMap[e.key]) {
          e.preventDefault();
          setActiveTab(tabMap[e.key]);
        }
      } else if (e.key === 'Escape') {
        if (showCommandPalette) setHomeShowAddCustomer(false);
        else if (homeShowAddCustomer) setHomeShowAddCustomer(false);
        else if (homeOrderCustomer) {
          setHomeOrderCustomer(null);
          setHomeOrderToEdit(null);
        } else if (homeProfileCustomer) {
          setHomeProfileCustomer(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, homeShowAddCustomer, homeOrderCustomer, homeProfileCustomer, setActiveTab]);

  // Load stored list items & rates on mount + sync URL tab
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab') as MainTab | null;
        if (urlTab && ['categories', 'calculator', 'list', 'orders', 'checklist', 'customers'].includes(urlTab)) {
          setActiveTabState(urlTab);
        }
      }

      const storedItems = localStorage.getItem('omni_builder_items');
      if (storedItems) setListItems(JSON.parse(storedItems));

      const storedRmb = localStorage.getItem('omni_user_rmb_rate');
      if (storedRmb && Number(storedRmb) > 0 && !['17.5', '16.5', '21.58'].includes(storedRmb)) {
        setRmbRate(Number(storedRmb));
      } else {
        setRmbRate(20.0);
        localStorage.setItem('omni_user_rmb_rate', '20.0');
      }

      const storedFreight = localStorage.getItem('omni_user_freight_rate');
      if (storedFreight && Number(storedFreight) > 0 && storedFreight !== '1000' && storedFreight !== '850' && storedFreight !== '350') {
        setFreightRate(Number(storedFreight));
      } else {
        setFreightRate(1.2);
        localStorage.setItem('omni_user_freight_rate', '1.2');
      }

      const storedUnit = localStorage.getItem('omni_user_freight_unit');
      if (storedUnit === 'per_gm' || storedUnit === 'per_kg') {
        setFreightUnit(storedUnit);
      } else {
        setFreightUnit('per_gm');
        localStorage.setItem('omni_user_freight_unit', 'per_gm');
      }
    } catch {
      // ignore
    }

    // Check backend health & fetch customer groups
    fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) })
      .then((res) => {
        if (res.ok) setBackendHealth('online');
        else setBackendHealth('offline');
      })
      .catch(() => setBackendHealth('offline'));

    customerApi.getGroups(apiUrl).then(setCustomerGroups).catch(() => {});
  }, [apiUrl]);

  // Handlers for Universal Search & Customer Actions
  const handleHomeSelectCustomer = (customer: Customer) => {
    setHomeProfileCustomer(customer);
  };

  const handleHomeOpenNewOrder = (customer: Customer) => {
    setHomeOrderCustomer(customer);
    setHomeOrderToEdit(null);
  };

  const handleHomeCreateCustomer = (prefill?: string) => {
    setHomePrefillQuery(prefill || '');
    setHomeShowAddCustomer(true);
  };

  const handleHomeSaveCustomer = async (payload: CustomerPayload) => {
    setSavingCustomer(true);
    try {
      const created = await customerApi.createCustomer(apiUrl, payload);
      toast.success(`🎉 Customer profile created for "${created.name}"!`);
      setHomeShowAddCustomer(false);
      setHomeProfileCustomer(created);
    } catch {
      toast.error('❌ Error creating customer profile');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleHomeSaveOrder = async (orderPayload: CustomerOrderPayload, orderId?: string) => {
    if (!homeOrderCustomer) return;
    try {
      if (orderId) {
        await customerApi.updateCustomerOrder(apiUrl, homeOrderCustomer.id, orderId, orderPayload);
        toast.success('✅ Order updated successfully!');
      } else {
        await customerApi.addCustomerOrder(apiUrl, homeOrderCustomer.id, orderPayload);
        toast.success('✅ Order saved to customer profile!');
      }
      const refreshed = await customerApi.getCustomer(apiUrl, homeOrderCustomer.id);
      setHomeProfileCustomer(refreshed);
      setHomeOrderCustomer(null);
      setHomeOrderToEdit(null);
    } catch {
      toast.error('❌ Error saving order');
    }
  };

  // Save list items to localStorage
  const handleUpdateListItems = (updated: ProductItem[]) => {
    setListItems(updated);
    try {
      localStorage.setItem('omni_builder_items', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save list items:', e);
    }
  };

  // Add a product to list
  const handleAddToList = (product: any) => {
    const priceBdt = product.price_bdt || Math.round((product.source_price || product.price || 0) * rmbRate);
    const weightKg = product.weight_kg || (product.weight_val ? (product.weight_unit === 'gm' ? product.weight_val / 1000 : product.weight_val) : 0.3);
    const qty = product.quantity || product.moq || 1;
    const unitFreightBdt = Math.round(freightUnit === 'per_gm' ? weightKg * 1000 * freightRate : weightKg * freightRate);
    const combinedUnitBdt = product.combined_unit_price_bdt || product.computed_landed_cost || (priceBdt + unitFreightBdt);
    const combinedLineBdt = product.combined_line_total_bdt || (combinedUnitBdt * qty);

    const newItem: ProductItem = {
      id: product.id || 'item-' + Date.now(),
      title: product.title || 'Untitled Product',
      details: product.details || product.category || '',
      price: product.source_price || product.price || 0,
      currency: product.currency || 'RMB',
      price_bdt: priceBdt,
      weight_kg: weightKg,
      quantity: qty,
      image_url: product.image_url || '',
      images: product.images || (product.image_url ? [product.image_url] : []),
      product_url: product.product_url || '',
      platform: product.platform || '1688',
      notes: product.notes || '',
      paid_amount: product.paid_amount || 0,
      due_amount: product.due_amount || combinedLineBdt,
      payment_status: product.payment_status || 'unpaid',
      weight_price_bdt: unitFreightBdt,
      line_weight_price_bdt: unitFreightBdt * qty,
      combined_unit_price_bdt: combinedUnitBdt,
      combined_line_total_bdt: combinedLineBdt,
    };
    handleUpdateListItems([newItem, ...listItems]);
    toast.success(`➕ Added "${newItem.title.slice(0, 24)}..." to List Builder!`);
  };

  // Send to Calculator and switch tab
  const handleSendToCalculator = (product: CategorizedProduct) => {
    setSelectedForCalculator(product);
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save updated rate
  const handleSaveRates = (newRmb: number, newFreight: number, newUnit: 'per_gm' | 'per_kg') => {
    setRmbRate(newRmb);
    setFreightRate(newFreight);
    setFreightUnit(newUnit);
    try {
      localStorage.setItem('omni_user_rmb_rate', String(newRmb));
      localStorage.setItem('omni_user_freight_rate', String(newFreight));
      localStorage.setItem('omni_user_freight_unit', newUnit);
      toast.success('✅ Benchmark rates updated!');
    } catch {}
  };

  const handleOpenFoldersForProfile = (profileId: string) => {
    setSelectedProfileForFolders(profileId);
    setActiveTab('folders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-family)',
        position: 'relative',
      }}
    >
      {/* Top Header */}
      <AppHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        listCount={listItems.length}
        rmbRate={rmbRate}
        setRmbRate={setRmbRate}
        freightRate={freightRate}
        setFreightRate={setFreightRate}
        freightUnit={freightUnit}
        setFreightUnit={setFreightUnit}
        onSaveRates={handleSaveRates}
        apiUrl={apiUrl}
        showToast={showToast}
        onOpenSearch={() => setShowCommandPalette(true)}
      />

      {/* Universal Customer Search Hero Strip (shown on products tab) */}
      {activeTab === 'categories' && (
        <CustomerSearchStrip
          apiUrl={apiUrl}
          onSelectCustomer={handleHomeSelectCustomer}
          onOpenNewOrder={handleHomeOpenNewOrder}
          onCreateNewCustomer={handleHomeCreateCustomer}
          onOpenCustomerManager={() => setActiveTab('customers')}
          showToast={showToast}
        />
      )}

      {/* Main Tab Content */}
      <main style={{ flex: 1, padding: '1.5rem 0' }}>
        {activeTab === 'categories' && (
          <CategoryProductManager
            onSelectForCalculator={handleSendToCalculator}
            onAddToList={handleAddToList}
            rmbRate={rmbRate}
            freightRate={freightRate}
            freightUnit={freightUnit}
          />
        )}

        {activeTab === 'calculator' && (
          <ProductPriceCalculator
            initialProduct={selectedForCalculator}
            onAddToList={handleAddToList}
            globalRmbRate={rmbRate}
            globalFreightRate={freightRate}
            globalFreightUnit={freightUnit}
          />
        )}

        {activeTab === 'list' && (
          <ProductListBuilder
            items={listItems}
            onUpdateItems={handleUpdateListItems}
            apiUrl={apiUrl}
            showToast={showToast}
            defaultRmbRate={String(rmbRate)}
            defaultFreightRate={String(freightRate)}
            defaultFreightUnit={freightUnit}
            onPitchToCustomers={(item) => {
              const platform: '1688' | 'Taobao' | 'Pinduoduo' | 'AliExpress' | 'Factory Direct' | 'Other' =
                item.platform === 'Taobao' ||
                item.platform === 'Pinduoduo' ||
                item.platform === 'AliExpress' ||
                item.platform === 'Factory Direct' ||
                item.platform === 'Other'
                  ? item.platform
                  : '1688';
              const currency: 'RMB' | 'USD' = item.currency === 'USD' ? 'USD' : 'RMB';

              setSelectedForCalculator({
                id: item.id,
                title: item.title,
                category: item.details || 'general',
                platform,
                source_price: item.price || 0,
                currency,
                weight_val: (item.weight_kg || 0.3) * 1000,
                weight_unit: 'gm',
                weight_kg: item.weight_kg || 0.3,
                moq: item.quantity || 1,
                target_selling_price: item.combined_unit_price_bdt || 0,
                created_at: new Date().toISOString(),
              });
              setActiveTab('calculator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'folders' && (
          <ProfileFoldersManager
            initialProfileId={selectedProfileForFolders}
            showToast={showToast}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager
            apiUrl={apiUrl}
            productListItems={listItems}
            showToast={showToast}
            onOpenFolders={handleOpenFoldersForProfile}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersManager
            apiUrl={apiUrl}
            showToast={showToast}
            onOpenOrderInBuilder={(order) => {
              handleUpdateListItems(order.items || []);
              setActiveTab('list');
              toast.info(`📂 Loaded "${order.name}" into Product List Builder`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCreateNewOrder={() => {
              setActiveTab('list');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'checklist' && (
          <SourcingChecklistManager apiUrl={apiUrl} showToast={showToast} />
        )}
      </main>

      {/* Customer Modals */}
      {homeProfileCustomer && (
        <CustomerProfileModal
          isOpen={!!homeProfileCustomer}
          onClose={() => setHomeProfileCustomer(null)}
          customer={homeProfileCustomer}
          onUpdateProfile={async (cid, payload) => {
            const updated = await customerApi.updateCustomer(apiUrl, cid, payload);
            setHomeProfileCustomer(updated);
          }}
          onAddNewOrder={(cust) => {
            setHomeOrderCustomer(cust);
            setHomeOrderToEdit(null);
          }}
          onEditOrder={(ord) => {
            setHomeOrderCustomer(homeProfileCustomer);
            setHomeOrderToEdit(ord);
          }}
          onToggleOrderStatus={async (ord, isDel, isCan) => {
            await customerApi.updateCustomerOrder(apiUrl, homeProfileCustomer.id, ord.id, {
              is_delivered: isDel,
              is_cancelled: isCan,
            });
            const refreshed = await customerApi.getCustomer(apiUrl, homeProfileCustomer.id);
            setHomeProfileCustomer(refreshed);
            toast.info(isDel ? '📦 Marked as Delivered!' : isCan ? '❌ Marked as Cancelled!' : '🔄 Order updated.');
          }}
          onDeleteOrder={async (ordId) => {
            await customerApi.deleteCustomerOrder(apiUrl, homeProfileCustomer.id, ordId);
            const refreshed = await customerApi.getCustomer(apiUrl, homeProfileCustomer.id);
            setHomeProfileCustomer(refreshed);
            toast.info('🗑️ Order removed from profile.');
          }}
          onEditCustomerProfile={() => {
            setActiveTab('customers');
            setHomeProfileCustomer(null);
          }}
          showToast={showToast}
          onOpenFolders={handleOpenFoldersForProfile}
        />
      )}

      {homeOrderCustomer && (
        <CustomerOrderModal
          isOpen={!!homeOrderCustomer}
          onClose={() => {
            setHomeOrderCustomer(null);
            setHomeOrderToEdit(null);
          }}
          customer={homeOrderCustomer}
          orderToEdit={homeOrderToEdit}
          onSaveOrder={handleHomeSaveOrder}
          showToast={showToast}
          apiUrl={apiUrl}
          defaultExchangeRate="20.0"
        />
      )}

      <CustomerFormModal
        isOpen={homeShowAddCustomer}
        onClose={() => setHomeShowAddCustomer(false)}
        editingCustomer={null}
        groups={customerGroups}
        prefilledQuery={homePrefillQuery}
        onSave={handleHomeSaveCustomer}
        isSaving={savingCustomer}
      />

      {/* Global Universal Search (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigateTab={setActiveTab}
        onSelectCustomer={handleHomeSelectCustomer}
      />

      {/* Footer */}
      <AppFooter backendHealth={backendHealth} />
    </div>
  );
}
