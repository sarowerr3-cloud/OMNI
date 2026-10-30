'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Coins,
  Truck,
  ArrowRight,
  FileText,
  User,
  UserPlus,
  Check,
  ChevronDown,
  X,
  HelpCircle,
  RefreshCw,
  Search,
  Tag,
  Sparkles
} from 'lucide-react';
import {
  ProfileFolder,
  FolderProduct,
  UserProfile,
  ProductStatus,
  calculateFolderFinancials,
  FolderFinancials
} from '@/types/profileFolder';
import { profileFolderService } from '@/services/profileFolderService';
import ViewModeToggle, { ViewMode } from '@/components/shared/ViewModeToggle';

interface ProfileFoldersManagerProps {
  initialProfileId?: string | null;
  onSelectCustomer?: (customer: any) => void;
  showToast?: (msg: string) => void;
}

export default function ProfileFoldersManager({
  initialProfileId = null,
  showToast = () => {},
}: ProfileFoldersManagerProps) {
  // Profiles State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(initialProfileId);
  const [profileSearchQuery, setProfileSearchQuery] = useState<string>('');

  // Folders State
  const [folders, setFolders] = useState<ProfileFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [productsViewMode, setProductsViewMode] = useState<ViewMode>('list');

  // New Profile Modal State
  const [showAddProfileModal, setShowAddProfileModal] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfilePhone, setNewProfilePhone] = useState<string>('');
  const [newProfileNote, setNewProfileNote] = useState<string>('');

  // New Folder Modal State
  const [showAddFolderModal, setShowAddFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderDate, setNewFolderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newFolderOrderNumber, setNewFolderOrderNumber] = useState<string>('');
  const [newFolderNote, setNewFolderNote] = useState<string>('');
  const [newFolderRate, setNewFolderRate] = useState<number>(20.0);

  // Editing Folder Modal/Inline State
  const [editingFolder, setEditingFolder] = useState<ProfileFolder | null>(null);

  // Add Product Inline / Modal State
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductPriceRmb, setNewProductPriceRmb] = useState<string>('');
  const [newProductQty, setNewProductQty] = useState<number>(1);
  const [newProductNote, setNewProductNote] = useState<string>('');

  // Manual Structured Product Features (Color, Size, Model, Style, Shape, Combination)
  const [newProductColor, setNewProductColor] = useState<string>('');
  const [newProductSize, setNewProductSize] = useState<string>('');
  const [newProductModel, setNewProductModel] = useState<string>('');
  const [newProductStyle, setNewProductStyle] = useState<string>('');
  const [newProductShape, setNewProductShape] = useState<string>('');
  const [newProductCombination, setNewProductCombination] = useState<string>('');

  const activeManualFeatures = useMemo(() => {
    const list: { label: string; value: string; color: string }[] = [];
    if (newProductColor.trim()) list.push({ label: 'Color', value: newProductColor.trim(), color: '#ec4899' });
    if (newProductSize.trim()) list.push({ label: 'Size', value: newProductSize.trim(), color: '#3b82f6' });
    if (newProductModel.trim()) list.push({ label: 'Model', value: newProductModel.trim(), color: '#8b5cf6' });
    if (newProductStyle.trim()) list.push({ label: 'Style', value: newProductStyle.trim(), color: '#10b981' });
    if (newProductShape.trim()) list.push({ label: 'Shape', value: newProductShape.trim(), color: '#f59e0b' });
    if (newProductCombination.trim()) list.push({ label: 'Combo', value: newProductCombination.trim(), color: '#06b6d4' });
    return list;
  }, [newProductColor, newProductSize, newProductModel, newProductStyle, newProductShape, newProductCombination]);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<FolderProduct | null>(null);

  // Payment Quick Edit State
  const [editingPaymentFolderId, setEditingPaymentFolderId] = useState<string | null>(null);
  const [tempPaidAmount, setTempPaidAmount] = useState<string>('');

  // Load Initial Data
  const loadData = () => {
    const loadedProfiles = profileFolderService.getProfiles();
    setProfiles(loadedProfiles);

    if (loadedProfiles.length > 0) {
      if (!selectedProfileId || !loadedProfiles.some((p) => p.id === selectedProfileId)) {
        setSelectedProfileId(loadedProfiles[0].id);
      }
    } else {
      setSelectedProfileId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selectedProfileId changes, load its folders
  useEffect(() => {
    if (selectedProfileId) {
      const profileFolders = profileFolderService.getFoldersByProfile(selectedProfileId);
      setFolders(profileFolders);
      if (profileFolders.length > 0) {
        if (!selectedFolderId || !profileFolders.some((f) => f.id === selectedFolderId)) {
          setSelectedFolderId(profileFolders[0].id);
        }
      } else {
        setSelectedFolderId(null);
      }
    } else {
      setFolders([]);
      setSelectedFolderId(null);
    }
  }, [selectedProfileId]);

  // Active Profile & Folder
  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Folder Financials
  const activeFolderFinancials: FolderFinancials | null = useMemo(() => {
    if (!activeFolder) return null;
    return calculateFolderFinancials(activeFolder);
  }, [activeFolder]);

  // Filtered Profiles list for search
  const filteredProfiles = useMemo(() => {
    if (!profileSearchQuery.trim()) return profiles;
    const q = profileSearchQuery.toLowerCase().trim();
    return profiles.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q))
    );
  }, [profiles, profileSearchQuery]);

  // Handlers for Profile
  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      showToast('⚠️ Please enter a profile name');
      return;
    }
    const created = profileFolderService.saveProfile({
      name: newProfileName,
      phone: newProfilePhone,
      notes: newProfileNote,
    });
    setProfiles((prev) => [created, ...prev]);
    setSelectedProfileId(created.id);
    setNewProfileName('');
    setNewProfilePhone('');
    setNewProfileNote('');
    setShowAddProfileModal(false);
    showToast(`✅ Profile "${created.name}" created`);
  };

  const handleDeleteProfile = (profileId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete profile "${name}" and all its folders?`)) return;
    profileFolderService.deleteProfile(profileId);
    const updated = profiles.filter((p) => p.id !== profileId);
    setProfiles(updated);
    if (selectedProfileId === profileId) {
      setSelectedProfileId(updated.length > 0 ? updated[0].id : null);
    }
    showToast(`🗑️ Profile "${name}" deleted`);
  };

  // Handlers for Folder
  const handleOpenAddFolderModal = () => {
    if (!selectedProfileId) {
      showToast('⚠️ Please select or create a profile first');
      return;
    }
    const nextOrderNum = profileFolderService.generateUniqueOrderNumber();
    setNewFolderOrderNumber(nextOrderNum);
    setNewFolderName('');
    setNewFolderDate(new Date().toISOString().split('T')[0]);
    setNewFolderNote('');
    setNewFolderRate(20.0);
    setShowAddFolderModal(true);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;
    if (!newFolderName.trim()) {
      showToast('⚠️ Please enter a folder name');
      return;
    }

    const orderNum = newFolderOrderNumber.trim() || profileFolderService.generateUniqueOrderNumber();
    if (!profileFolderService.isOrderNumberUnique(orderNum)) {
      showToast(`⚠️ Order number "${orderNum}" is already in use. Please use a unique number.`);
      return;
    }

    const created = profileFolderService.createFolder({
      profileId: selectedProfileId,
      name: newFolderName,
      date: newFolderDate,
      orderNumber: orderNum,
      note: newFolderNote,
      exchangeRate: newFolderRate,
    });

    const updatedFolders = profileFolderService.getFoldersByProfile(selectedProfileId);
    setFolders(updatedFolders);
    setSelectedFolderId(created.id);
    setShowAddFolderModal(false);
    showToast(`📂 Folder "${created.name}" created with order #${created.orderNumber}`);
  };

  const handleUpdateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder) return;

    if (!editingFolder.name.trim()) {
      showToast('⚠️ Folder name cannot be empty');
      return;
    }

    if (!profileFolderService.isOrderNumberUnique(editingFolder.orderNumber, editingFolder.id)) {
      showToast(`⚠️ Order number "${editingFolder.orderNumber}" is already in use.`);
      return;
    }

    const updated = profileFolderService.updateFolder(editingFolder.id, {
      name: editingFolder.name,
      orderNumber: editingFolder.orderNumber,
      date: editingFolder.date,
      note: editingFolder.note,
      exchangeRate: Number(editingFolder.exchangeRate) || 20.0,
      isDelivered: editingFolder.isDelivered,
      paidAmountTk: Number(editingFolder.paidAmountTk) || 0,
    });

    if (updated && selectedProfileId) {
      const refreshed = profileFolderService.getFoldersByProfile(selectedProfileId);
      setFolders(refreshed);
      setEditingFolder(null);
      showToast('✅ Folder updated');
    }
  };

  const handleDeleteFolder = (folderId: string, name: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete folder "${name}" (${orderNumber})?`)) return;
    profileFolderService.deleteFolder(folderId);
    if (selectedProfileId) {
      const refreshed = profileFolderService.getFoldersByProfile(selectedProfileId);
      setFolders(refreshed);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(refreshed.length > 0 ? refreshed[0].id : null);
      }
    }
    showToast(`🗑️ Folder "${name}" deleted`);
  };

  const handleToggleDelivered = (folder: ProfileFolder) => {
    const newStatus = !folder.isDelivered;
    const updated = profileFolderService.updateFolder(folder.id, { isDelivered: newStatus });
    if (updated && selectedProfileId) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      showToast(newStatus ? '🚚 Goods marked as Delivered' : '⏳ Goods marked as Pending Delivery');
    }
  };

  const handleSavePaymentAmount = (folderId: string) => {
    const num = Math.max(0, parseFloat(tempPaidAmount) || 0);
    const updated = profileFolderService.updateFolder(folderId, { paidAmountTk: num });
    if (updated && selectedProfileId) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      setEditingPaymentFolderId(null);
      showToast(`💰 Payment updated: ৳${num.toLocaleString()}`);
    }
  };

  const handleMarkFolderFullPaid = (folder: ProfileFolder) => {
    const fin = calculateFolderFinancials(folder);
    const updated = profileFolderService.updateFolder(folder.id, { paidAmountTk: fin.equivalentAmountTk });
    if (updated && selectedProfileId) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      showToast(`✅ Payment cleared in full: ৳${fin.equivalentAmountTk.toLocaleString()}`);
    }
  };

  // Handlers for Products inside Folder
  const handleOpenAddProduct = () => {
    if (!activeFolder) return;
    setNewProductName('');
    setNewProductPriceRmb('');
    setNewProductQty(1);
    setNewProductNote('');
    setNewProductColor('');
    setNewProductSize('');
    setNewProductModel('');
    setNewProductStyle('');
    setNewProductShape('');
    setNewProductCombination('');
    setShowAddProductModal(true);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder) return;
    if (!newProductName.trim()) {
      showToast('⚠️ Please enter product name');
      return;
    }
    const price = parseFloat(newProductPriceRmb);
    if (isNaN(price) || price < 0) {
      showToast('⚠️ Please enter a valid RMB price');
      return;
    }

    // Build structured variations/features summary
    const featureParts: string[] = [];
    if (newProductColor.trim()) featureParts.push(`Color: ${newProductColor.trim()}`);
    if (newProductSize.trim()) featureParts.push(`Size: ${newProductSize.trim()}`);
    if (newProductModel.trim()) featureParts.push(`Model: ${newProductModel.trim()}`);
    if (newProductStyle.trim()) featureParts.push(`Style: ${newProductStyle.trim()}`);
    if (newProductShape.trim()) featureParts.push(`Shape: ${newProductShape.trim()}`);
    if (newProductCombination.trim()) featureParts.push(`Combination: ${newProductCombination.trim()}`);
    if (newProductNote.trim()) featureParts.push(newProductNote.trim());
    const finalNote = featureParts.join(' | ');

    const updatedFolder = profileFolderService.addProductToFolder(activeFolder.id, {
      name: newProductName,
      priceRmb: price,
      quantity: newProductQty,
      note: finalNote,
    });

    if (updatedFolder && selectedProfileId) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      setShowAddProductModal(false);
      setNewProductName('');
      setNewProductPriceRmb('');
      setNewProductQty(1);
      setNewProductNote('');
      setNewProductColor('');
      setNewProductSize('');
      setNewProductModel('');
      setNewProductStyle('');
      setNewProductShape('');
      setNewProductCombination('');
      const nextSeq = updatedFolder.products.length;
      showToast(`➕ Added item #${nextSeq} (${updatedFolder.orderNumber}-${nextSeq})`);
    }
  };

  const handleSetProductStatus = (productId: string, status: ProductStatus) => {
    if (!activeFolder || !selectedProfileId) return;
    const updatedFolder = profileFolderService.setProductStatus(activeFolder.id, productId, status);
    if (updatedFolder) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      const prd = updatedFolder.products.find((p) => p.id === productId);
      if (prd) {
        if (status === 'returned') {
          showToast(`⚠️ Item ${prd.assignedNumber} marked as RETURNED`);
        } else if (status === 'cancelled') {
          showToast(`🚫 Item ${prd.assignedNumber} marked as CANCELLED`);
        } else {
          showToast(`✅ Item ${prd.assignedNumber} set to Active`);
        }
      }
    }
  };

  const handleDeleteProduct = (productId: string, assignedNumber: string) => {
    if (!activeFolder || !selectedProfileId) return;
    if (!confirm(`Delete product ${assignedNumber}? Subsequent items will be automatically renumbered.`)) return;

    const updatedFolder = profileFolderService.deleteProduct(activeFolder.id, productId);
    if (updatedFolder) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      showToast(`🗑️ Deleted item ${assignedNumber}`);
    }
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !selectedProfileId || !editingProduct) return;

    const updatedFolder = profileFolderService.updateProduct(activeFolder.id, editingProduct.id, {
      name: editingProduct.name,
      priceRmb: Number(editingProduct.priceRmb) || 0,
      quantity: Number(editingProduct.quantity) || 1,
      note: editingProduct.note,
      status: editingProduct.status,
    });

    if (updatedFolder) {
      setFolders(profileFolderService.getFoldersByProfile(selectedProfileId));
      setEditingProduct(null);
      showToast(`✅ Updated item ${editingProduct.assignedNumber}`);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
      {/* TOP HEADER: TITLE & CLEAN MINIMALIST CONTROLS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={22} style={{ color: 'var(--omni-red)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Profile Folders
            </h1>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--omni-red)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              Order Management
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Organize products into folders within each profile, track unique sequential IDs, payment due, delivery, and return statuses.
          </p>
        </div>

        {/* Global Action: Add Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowAddProfileModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={15} style={{ color: 'var(--omni-red)' }} />
            <span>New Profile</span>
          </button>

          {activeProfile && (
            <button
              type="button"
              onClick={handleOpenAddFolderModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: 'var(--omni-red)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <FolderPlus size={15} />
              <span>Create Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* PROFILES BAR (CLEAN, MINIMALIST HORIZONTAL SELECTOR) */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Profile:
          </span>

          {profiles.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No profiles yet. Click "+ New Profile" to create one.
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {profiles.map((p) => {
                const isSelected = p.id === selectedProfileId;
                const profileFoldersCount = folders.filter((f) => f.profileId === p.id).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfileId(p.id);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--omni-red)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                      color: isSelected ? 'var(--omni-red)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <User size={13} />
                    <span>{p.name}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isSelected ? 'var(--omni-red)' : 'var(--bg-primary)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {profileFolderService.getFoldersByProfile(p.id).length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDeleteProfile(activeProfile.id, activeProfile.name)}
              title="Delete this profile and its folders"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '0.74rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Trash2 size={13} style={{ color: '#ef4444' }} />
              <span>Delete Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* MAIN TWO-COLUMN / MASTER-DETAIL WORKSPACE */}
      {!activeProfile ? (
        /* Empty State: No Profile Selected or Exists */
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <User size={42} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            No Profile Selected
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
            Create a profile to begin organizing products into folders. Each profile maintains its own isolated folders, products, and financials.
          </p>
          <button
            type="button"
            onClick={() => setShowAddProfileModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--omni-red)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={16} />
            <span>Create First Profile</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 340px) 1fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {/* LEFT SIDEBAR: FOLDERS LIST IN CURRENT PROFILE */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Header & Folder Count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Folders ({folders.length})
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Profile: {activeProfile.name}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddFolderModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  background: 'var(--omni-red)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>

            {/* Folders List */}
            {folders.length === 0 ? (
              <div
                style={{
                  padding: '30px 14px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-color)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FolderOpen size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  No folders yet in this profile
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddFolderModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--omni-red)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  + Create Folder
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {folders.map((folder) => {
                  const isSelected = folder.id === selectedFolderId;
                  const fin = calculateFolderFinancials(folder);

                  return (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: isSelected ? 'var(--bg-surface)' : 'transparent',
                        border: isSelected ? '1px solid var(--omni-red)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Top Row: Order # badge and Date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-surface)',
                            color: isSelected ? 'var(--omni-red)' : 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {folder.orderNumber}
                        </span>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} />
                          {folder.date}
                        </span>
                      </div>

                      {/* Folder Name */}
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {folder.name}
                      </div>

                      {/* Financials Strip: RMB & Tk */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.76rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-primary)',
                          padding: '6px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        <span>
                          <strong>¥{fin.totalValueRmb.toLocaleString()}</strong> ({folder.products.length} items)
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          ৳{fin.equivalentAmountTk.toLocaleString()}
                        </span>
                      </div>

                      {/* Badges Strip: Payment, Delivery, Returns */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', fontSize: '0.68rem' }}>
                        {/* Payment Badge */}
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              fin.paymentStatus === 'paid'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : fin.paymentStatus === 'partial'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              fin.paymentStatus === 'paid'
                                ? '#10b981'
                                : fin.paymentStatus === 'partial'
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        >
                          {fin.paymentStatus}
                        </span>

                        {/* Delivery Badge */}
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: fin.isDelivered ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                            color: fin.isDelivered ? '#10b981' : 'var(--text-muted)',
                          }}
                        >
                          {fin.isDelivered ? 'Delivered' : 'Pending'}
                        </span>

                        {/* Return Badge */}
                        {fin.hasReturnedItems && (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                            }}
                          >
                            ⚠️ {fin.returnedItems.length} Returned
                          </span>
                        )}

                        {/* Cancelled Badge */}
                        {fin.hasCancelledItems && (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: 'rgba(100, 116, 139, 0.2)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {fin.cancelledItems.length} Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT MAIN AREA: ACTIVE FOLDER DETAILS & SEQUENTIAL PRODUCTS */}
          {!activeFolder || !activeFolderFinancials ? (
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <FolderOpen size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Folder Selected
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Select a folder from the list or create a new folder to manage products.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* FOLDER TOP OVERVIEW & ACTIONS */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Title Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: 'var(--omni-red)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        {activeFolder.orderNumber}
                      </span>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        {activeFolder.name}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        <span>Date: <strong>{activeFolder.date}</strong></span>
                      </span>
                      <span>•</span>
                      <span>
                        Rate: <strong>1 RMB = ৳{activeFolder.exchangeRate}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit Folder, Delete Folder */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingFolder(activeFolder)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Edit Folder</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(activeFolder.id, activeFolder.name, activeFolder.orderNumber)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Small Note About Folder */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    color: activeFolder.note ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontStyle: activeFolder.note ? 'normal' : 'italic',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}
                >
                  <FileText size={14} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontStyle: 'normal', color: 'var(--text-secondary)', marginRight: '6px' }}>Folder Note:</strong>
                    {activeFolder.note || 'No note added for this folder yet.'}
                  </div>
                </div>

                {/* 4 SUMMARY STAT CARDS: Total RMB & Tk, Payment Status, Delivery, Return Status */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {/* 1. Value RMB & Tk */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Value</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                      ¥{activeFolderFinancials.totalValueRmb.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--omni-red)', marginTop: '1px' }}>
                      ৳{activeFolderFinancials.equivalentAmountTk.toLocaleString()}
                    </div>
                  </div>

                  {/* 2. Payment Tracking: Paid vs Left */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payment</span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background:
                              activeFolderFinancials.paymentStatus === 'paid'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : activeFolderFinancials.paymentStatus === 'partial'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color:
                              activeFolderFinancials.paymentStatus === 'paid'
                                ? '#10b981'
                                : activeFolderFinancials.paymentStatus === 'partial'
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        >
                          {activeFolderFinancials.paymentStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', marginTop: '4px', color: 'var(--text-primary)' }}>
                        Paid: <strong>৳{activeFolderFinancials.paidAmountTk.toLocaleString()}</strong>
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: activeFolderFinancials.remainingDueTk > 0 ? '#ef4444' : '#10b981',
                          fontWeight: 700,
                        }}
                      >
                        Left: ৳{activeFolderFinancials.remainingDueTk.toLocaleString()}
                      </div>
                    </div>

                    {/* Quick Payment Button */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPaymentFolderId(activeFolder.id);
                          setTempPaidAmount(String(activeFolder.paidAmountTk || 0));
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.68rem',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit Paid
                      </button>

                      {activeFolderFinancials.remainingDueTk > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMarkFolderFullPaid(activeFolder)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#10b981',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Delivery Tracking */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Delivery Status</div>
                      <div
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 800,
                          color: activeFolder.isDelivered ? '#10b981' : '#f59e0b',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Truck size={15} />
                        <span>{activeFolder.isDelivered ? 'Goods Delivered' : 'Pending Delivery'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleDelivered(activeFolder)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: activeFolder.isDelivered ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: activeFolder.isDelivered ? 'var(--text-muted)' : '#10b981',
                        cursor: 'pointer',
                        marginTop: '6px',
                      }}
                    >
                      {activeFolder.isDelivered ? 'Set to Pending' : 'Mark as Delivered'}
                    </button>
                  </div>

                  {/* 4. Return & Cancel Status */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: activeFolderFinancials.hasReturnedItems
                        ? 'rgba(239, 68, 68, 0.08)'
                        : 'var(--bg-surface)',
                      border: activeFolderFinancials.hasReturnedItems
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Items Return Status</div>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        color: activeFolderFinancials.hasReturnedItems ? '#ef4444' : '#10b981',
                        marginTop: '2px',
                      }}
                    >
                      {activeFolderFinancials.hasReturnedItems
                        ? `⚠️ ${activeFolderFinancials.returnedItems.length} Item(s) Returned`
                        : 'None Returned'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {activeFolderFinancials.hasCancelledItems
                        ? `${activeFolderFinancials.cancelledItems.length} cancelled`
                        : 'No cancellations'}
                    </div>
                  </div>
                </div>

                {/* PROMINENT NOTICES FOR RETURNED OR CANCELLED ITEMS */}
                {(activeFolderFinancials.hasReturnedItems || activeFolderFinancials.hasCancelledItems) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    {activeFolderFinancials.hasReturnedItems && (
                      <div style={{ fontSize: '0.82rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800 }}>⚠️ Returned Items from this folder:</span>
                        {activeFolderFinancials.returnedItems.map((item) => (
                          <span
                            key={item.id}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                          >
                            #{item.sequenceNumber} {item.assignedNumber} ({item.name})
                          </span>
                        ))}
                      </div>
                    )}

                    {activeFolderFinancials.hasCancelledItems && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>🚫 Cancelled Items:</span>
                        {activeFolderFinancials.cancelledItems.map((item) => (
                          <span
                            key={item.id}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                            }}
                          >
                            #{item.sequenceNumber} {item.assignedNumber} ({item.name})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PRODUCTS LIST SECTION */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Section Header & Add Product Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Products in {activeFolder.orderNumber} ({activeFolder.products.length})
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Numbered sequentially (1, 2, 3...). Product numbers contain folder order number: <code>{activeFolder.orderNumber}-[#]</code>
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <ViewModeToggle viewMode={productsViewMode} onChange={setProductsViewMode} />

                    <button
                      type="button"
                      onClick={handleOpenAddProduct}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: 'var(--omni-red)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      <Plus size={15} />
                      <span>Add Product</span>
                    </button>
                  </div>
                </div>

                {/* Products Table / Cards */}
                {activeFolder.products.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      borderRadius: '14px',
                      border: '1px dashed var(--border-color)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      No products added to folder "{activeFolder.name}" yet.
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Click "+ Add Product" to add your first item. It will be assigned sequential #1 ({activeFolder.orderNumber}-1).
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddProduct}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        background: 'var(--omni-red)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      <Plus size={14} />
                      <span>Add First Product</span>
                    </button>
                  </div>
                ) : productsViewMode === 'list' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeFolder.products.map((product) => {
                      const isReturned = product.status === 'returned';
                      const isCancelled = product.status === 'cancelled';

                      return (
                        <div
                          key={product.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: isReturned
                              ? 'rgba(239, 68, 68, 0.06)'
                              : isCancelled
                              ? 'rgba(100, 116, 139, 0.06)'
                              : 'var(--bg-surface)',
                            border: isReturned
                              ? '1px solid rgba(239, 68, 68, 0.35)'
                              : isCancelled
                              ? '1px solid var(--border-color)'
                              : '1px solid var(--border-color)',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(140px, 180px) 1fr auto auto',
                            alignItems: 'center',
                            gap: '14px',
                            opacity: isCancelled ? 0.7 : 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Sequential Number & Assigned Code */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              #{product.sequenceNumber}
                            </span>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.84rem',
                                  fontWeight: 800,
                                  color: isReturned ? '#ef4444' : 'var(--text-primary)',
                                  letterSpacing: '-0.01em',
                                }}
                              >
                                {product.assignedNumber}
                              </span>

                              {/* Status Tag */}
                              {isReturned && (
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    color: '#ef4444',
                                    textTransform: 'uppercase',
                                    marginTop: '1px',
                                  }}
                                >
                                  [RETURNED]
                                </span>
                              )}
                              {isCancelled && (
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    marginTop: '1px',
                                  }}
                                >
                                  [CANCELLED]
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Product Name & Note */}
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                textDecoration: isCancelled ? 'line-through' : 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={product.name}
                            >
                              {product.name}
                            </div>
                            {product.note && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                                Note: {product.note}
                              </div>
                            )}
                          </div>

                          {/* Price, Qty & Totals */}
                          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              ¥{product.totalRmb.toFixed(2)}
                              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>
                                (¥{product.priceRmb} × {product.quantity})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--omni-red)', fontWeight: 700 }}>
                              ৳{product.equivalentTk.toLocaleString()}
                            </div>
                          </div>

                          {/* Status Dropdown & Action Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Status Selector */}
                            <select
                              value={product.status}
                              onChange={(e) => handleSetProductStatus(product.id, e.target.value as ProductStatus)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background:
                                  product.status === 'returned'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : product.status === 'cancelled'
                                    ? 'rgba(100, 116, 139, 0.15)'
                                    : 'var(--bg-card)',
                                color:
                                  product.status === 'returned'
                                    ? '#ef4444'
                                    : product.status === 'cancelled'
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

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => setEditingProduct(product)}
                              title="Edit product"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id, product.assignedNumber)}
                              title="Delete product and resequence remaining"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <Trash2 size={14} />
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
                    {activeFolder.products.map((product) => {
                      const isReturned = product.status === 'returned';
                      const isCancelled = product.status === 'cancelled';

                      return (
                        <div
                          key={product.id}
                          style={{
                            padding: '14px',
                            borderRadius: '14px',
                            background: isReturned
                              ? 'rgba(239, 68, 68, 0.06)'
                              : isCancelled
                              ? 'rgba(100, 116, 139, 0.06)'
                              : 'var(--bg-surface)',
                            border: isReturned
                              ? '1px solid rgba(239, 68, 68, 0.35)'
                              : '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            opacity: isCancelled ? 0.7 : 1,
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Card Top: Sequential Badge + Code + Status */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                }}
                              >
                                #{product.sequenceNumber}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  color: isReturned ? '#ef4444' : 'var(--text-primary)',
                                }}
                              >
                                {product.assignedNumber}
                              </span>
                            </div>

                            <select
                              value={product.status}
                              onChange={(e) => handleSetProductStatus(product.id, e.target.value as ProductStatus)}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '6px',
                                background:
                                  product.status === 'returned'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : product.status === 'cancelled'
                                    ? 'rgba(100, 116, 139, 0.15)'
                                    : 'var(--bg-card)',
                                color:
                                  product.status === 'returned'
                                    ? '#ef4444'
                                    : product.status === 'cancelled'
                                    ? 'var(--text-muted)'
                                    : '#10b981',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="active">Active</option>
                              <option value="returned">Returned</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          {/* Card Body: Name + Note */}
                          <div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                textDecoration: isCancelled ? 'line-through' : 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                minHeight: '2.4em',
                              }}
                              title={product.name}
                            >
                              {product.name}
                            </div>
                            {product.note && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                                Note: {product.note}
                              </div>
                            )}
                          </div>

                          {/* Card Pricing */}
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                ¥{product.priceRmb} × {product.quantity}
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                ¥{product.totalRmb.toFixed(2)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BDT</div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--omni-red)', fontWeight: 800 }}>
                                ৳{product.equivalentTk.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingProduct(product)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id, product.assignedNumber)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD NEW PROFILE */}
      {showAddProfileModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddProfileModal(false);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: 'var(--omni-red)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Create New Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Profile Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. John Doe / Sourcing Client"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Phone / Contact (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01700000000"
                  value={newProfilePhone}
                  onChange={(e) => setNewProfilePhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Profile Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any specific instructions or client details"
                  value={newProfileNote}
                  onChange={(e) => setNewProfileNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE FOLDER */}
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
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddFolderModal(false);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={18} style={{ color: 'var(--omni-red)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Create New Folder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFolderModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Unique Order # *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFolderOrderNumber}
                    onChange={(e) => setNewFolderOrderNumber(e.target.value)}
                    placeholder="e.g. ORD-101"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Folder Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newFolderDate}
                    onChange={(e) => setNewFolderDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Summer Electronics Batch"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Exchange Rate (RMB to Tk)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={newFolderRate}
                  onChange={(e) => setNewFolderRate(parseFloat(e.target.value) || 20.0)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Small Note About Folder (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Special packing required, supplier in Yiwu"
                  value={newFolderNote}
                  onChange={(e) => setNewFolderNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
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

      {/* MODAL 3: EDIT FOLDER */}
      {editingFolder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingFolder(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} style={{ color: 'var(--omni-red)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Folder Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Order Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingFolder.orderNumber}
                    onChange={(e) => setEditingFolder({ ...editingFolder, orderNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingFolder.date}
                    onChange={(e) => setEditingFolder({ ...editingFolder, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingFolder.name}
                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Exchange Rate (RMB to Tk)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={editingFolder.exchangeRate}
                  onChange={(e) => setEditingFolder({ ...editingFolder, exchangeRate: parseFloat(e.target.value) || 20 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Small Note About Folder
                </label>
                <textarea
                  rows={2}
                  value={editingFolder.note || ''}
                  onChange={(e) => setEditingFolder({ ...editingFolder, note: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD PRODUCT TO FOLDER */}
      {showAddProductModal && activeFolder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddProductModal(false);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Add Product to {activeFolder.orderNumber}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--omni-red)', fontWeight: 700, marginTop: '2px' }}>
                  Assigned ID: {activeFolder.orderNumber}-{activeFolder.products.length + 1} (Sequential #{activeFolder.products.length + 1})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Wireless Bluetooth Earbuds"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Unit Price (RMB ¥) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={newProductPriceRmb}
                    onChange={(e) => setNewProductPriceRmb(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductQty}
                    onChange={(e) => setNewProductQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Live Preview of Equivalent in Tk */}
              {newProductPriceRmb && !isNaN(parseFloat(newProductPriceRmb)) && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Value:</span>
                  <span style={{ fontWeight: 700, color: 'var(--omni-red)' }}>
                    ¥{(parseFloat(newProductPriceRmb) * newProductQty).toFixed(2)} = ৳
                    {Math.round(parseFloat(newProductPriceRmb) * newProductQty * (activeFolder.exchangeRate || 20)).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Structured Product Features & Options */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    <Tag size={13} style={{ color: 'var(--omni-red)' }} />
                    <span>Product Features & Variations</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Only entered features will be recorded & displayed
                  </span>
                </div>

                {/* Live Active Feature Badges or "No features present" indicator */}
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                    minHeight: '34px',
                  }}
                >
                  {activeManualFeatures.length > 0 ? (
                    activeManualFeatures.map((feat) => (
                      <span
                        key={feat.label}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: `${feat.color}18`,
                          color: feat.color,
                          border: `1px solid ${feat.color}40`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ opacity: 0.75 }}>{feat.label}:</span>
                        <strong>{feat.value}</strong>
                      </span>
                    ))
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      <AlertCircle size={13} style={{ opacity: 0.7 }} />
                      <span>No features present / entered yet</span>
                    </div>
                  )}
                </div>

                {/* 6 Structured Dimensions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Color
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Matte Black"
                      value={newProductColor}
                      onChange={(e) => setNewProductColor(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Size
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. XL / 250ml"
                      value={newProductSize}
                      onChange={(e) => setNewProductSize(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pro Max 2026"
                      value={newProductModel}
                      onChange={(e) => setNewProductModel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Style
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vintage Leather"
                      value={newProductStyle}
                      onChange={(e) => setNewProductStyle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Shape
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Round / Rectangular"
                      value={newProductShape}
                      onChange={(e) => setNewProductShape(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Combination / Bundle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2-Piece Set"
                      value={newProductCombination}
                      onChange={(e) => setNewProductCombination(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Custom Note / Other Specifications
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Extra gift pouch included"
                    value={newProductNote}
                    onChange={(e) => setNewProductNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT PRODUCT */}
      {editingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingProduct(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Product {editingProduct.assignedNumber}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Sequential #{editingProduct.sequenceNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Unit Price (RMB ¥) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.priceRmb}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceRmb: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Item Status
                </label>
                <select
                  value={editingProduct.status}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as ProductStatus })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="active">Active</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={editingProduct.note || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, note: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: QUICK PAYMENT UPDATE */}
      {editingPaymentFolderId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPaymentFolderId(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} style={{ color: 'var(--omni-red)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Update Paid Amount
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaymentFolderId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Amount Paid in Tk (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  autoFocus
                  value={tempPaidAmount}
                  onChange={(e) => setTempPaidAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              {activeFolderFinancials && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Total Folder Value: <strong>৳{activeFolderFinancials.equivalentAmountTk.toLocaleString()}</strong>
                  <br />
                  Remaining Left: ৳
                  {Math.max(0, activeFolderFinancials.equivalentAmountTk - (parseFloat(tempPaidAmount) || 0)).toLocaleString()}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPaymentFolderId(null)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePaymentAmount(editingPaymentFolderId)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: 'var(--omni-red)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Update Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
