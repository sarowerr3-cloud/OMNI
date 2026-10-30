import { 
  ProfileFolder, 
  FolderProduct, 
  UserProfile, 
  ProductStatus, 
  calculateFolderFinancials 
} from '@/types/profileFolder';

const FOLDERS_STORAGE_KEY = 'omni_profile_folders_v1';
const PROFILES_STORAGE_KEY = 'omni_user_profiles_v1';
const CUSTOMERS_CACHE_KEY = 'omni_customers_cache_v2';

export const profileFolderService = {
  /**
   * Get all profiles without any presets or fake suggestions.
   */
  getProfiles(): UserProfile[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
      let profiles: UserProfile[] = stored ? JSON.parse(stored) : [];

      // Also merge any existing customer records from CustomerManager cache if present
      const custStored = localStorage.getItem(CUSTOMERS_CACHE_KEY);
      if (custStored) {
        const customers = JSON.parse(custStored);
        if (Array.isArray(customers)) {
          customers.forEach((c: any) => {
            if (c.id && !profiles.some((p) => p.id === c.id)) {
              profiles.push({
                id: c.id,
                name: c.name || 'Unnamed Profile',
                phone: c.phone || '',
                notes: c.notes || '',
                createdAt: c.created_at || new Date().toISOString(),
              });
            }
          });
        }
      }

      return profiles;
    } catch (e) {
      console.warn('Error reading profiles from localStorage:', e);
      return [];
    }
  },

  /**
   * Save a new profile.
   */
  saveProfile(profile: Omit<UserProfile, 'id' | 'createdAt'>): UserProfile {
    const profiles = this.getProfiles();
    const newProfile: UserProfile = {
      id: 'prof_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      name: profile.name.trim(),
      phone: profile.phone?.trim() || '',
      notes: profile.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    const updated = [newProfile, ...profiles];
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    }
    return newProfile;
  },

  /**
   * Update an existing profile.
   */
  updateProfile(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    profiles[idx] = { ...profiles[idx], ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }
    return profiles[idx];
  },

  /**
   * Delete a profile and all its folders.
   */
  deleteProfile(profileId: string): void {
    const profiles = this.getProfiles().filter((p) => p.id !== profileId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      // Also delete associated folders
      const allFolders = this.getAllFolders().filter((f) => f.profileId !== profileId);
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(allFolders));
    }
  },

  /**
   * Get all folders across all profiles.
   */
  getAllFolders(): ProfileFolder[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(FOLDERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading folders from localStorage:', e);
      return [];
    }
  },

  /**
   * Get folders belonging to a specific profile.
   */
  getFoldersByProfile(profileId: string): ProfileFolder[] {
    return this.getAllFolders().filter((f) => f.profileId === profileId);
  },

  /**
   * Generates a unique, small order number (e.g., ORD-101, ORD-102).
   */
  generateUniqueOrderNumber(): string {
    const allFolders = this.getAllFolders();
    const existingNumbers = new Set(allFolders.map((f) => f.orderNumber.toUpperCase().trim()));

    let maxNum = 100;
    allFolders.forEach((f) => {
      const match = f.orderNumber.match(/ORD-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    let nextNum = maxNum + 1;
    let candidate = `ORD-${nextNum}`;
    while (existingNumbers.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `ORD-${nextNum}`;
    }
    return candidate;
  },

  /**
   * Checks whether an order number is unique (excluding a specific folder if updating).
   */
  isOrderNumberUnique(orderNumber: string, currentFolderId?: string): boolean {
    const trimmed = orderNumber.trim().toUpperCase();
    const allFolders = this.getAllFolders();
    return !allFolders.some(
      (f) => f.id !== currentFolderId && f.orderNumber.trim().toUpperCase() === trimmed
    );
  },

  /**
   * Create a new folder in a profile.
   */
  createFolder(params: {
    profileId: string;
    name: string;
    date: string;
    orderNumber?: string;
    note?: string;
    exchangeRate?: number;
  }): ProfileFolder {
    const orderNumber = (params.orderNumber && params.orderNumber.trim()) 
      ? params.orderNumber.trim().toUpperCase() 
      : this.generateUniqueOrderNumber();

    const newFolder: ProfileFolder = {
      id: 'fld_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      profileId: params.profileId,
      orderNumber,
      name: params.name.trim() || 'Untitled Folder',
      date: params.date || new Date().toISOString().split('T')[0],
      note: params.note?.trim() || '',
      exchangeRate: params.exchangeRate && params.exchangeRate > 0 ? params.exchangeRate : 20.0,
      paidAmountTk: 0,
      isDelivered: false,
      products: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allFolders = [newFolder, ...this.getAllFolders()];
    if (typeof window !== 'undefined') {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(allFolders));
    }
    return newFolder;
  },

  /**
   * Update folder details (name, date, orderNumber, note, paidAmountTk, isDelivered, exchangeRate).
   * If orderNumber changes, cascades to update all product assigned numbers.
   */
  updateFolder(folderId: string, updates: Partial<ProfileFolder>): ProfileFolder | null {
    const allFolders = this.getAllFolders();
    const idx = allFolders.findIndex((f) => f.id === folderId);
    if (idx === -1) return null;

    const oldFolder = allFolders[idx];
    const newOrderNumber = updates.orderNumber ? updates.orderNumber.trim().toUpperCase() : oldFolder.orderNumber;
    const orderNumberChanged = newOrderNumber !== oldFolder.orderNumber;

    let updatedProducts = updates.products || oldFolder.products;
    if (orderNumberChanged) {
      updatedProducts = updatedProducts.map((p) => ({
        ...p,
        assignedNumber: `${newOrderNumber}-${p.sequenceNumber}`,
      }));
    }

    const exchangeRate = updates.exchangeRate !== undefined ? updates.exchangeRate : oldFolder.exchangeRate;
    if (updates.exchangeRate !== undefined && updates.exchangeRate !== oldFolder.exchangeRate) {
      updatedProducts = updatedProducts.map((p) => ({
        ...p,
        equivalentTk: Math.round(p.totalRmb * exchangeRate),
      }));
    }

    const updatedFolder: ProfileFolder = {
      ...oldFolder,
      ...updates,
      orderNumber: newOrderNumber,
      products: updatedProducts,
      updatedAt: new Date().toISOString(),
    };

    allFolders[idx] = updatedFolder;
    if (typeof window !== 'undefined') {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(allFolders));
    }
    return updatedFolder;
  },

  /**
   * Delete a folder by ID.
   */
  deleteFolder(folderId: string): void {
    const allFolders = this.getAllFolders().filter((f) => f.id !== folderId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(allFolders));
    }
  },

  /**
   * Add a product to a folder. Numbers sequentially starting from 1.
   * Product assigned number = `${folder.orderNumber}-${seq}`.
   */
  addProductToFolder(
    folderId: string,
    product: {
      name: string;
      priceRmb: number;
      quantity?: number;
      note?: string;
      imageUrl?: string;
      images?: string[];
      weightKg?: number;
      weightPriceTk?: number;
      platform?: string;
      currency?: 'RMB' | 'BDT' | 'USD';
      originalPrice?: number;
      productUrl?: string;
    }
  ): ProfileFolder | null {
    const allFolders = this.getAllFolders();
    const folder = allFolders.find((f) => f.id === folderId);
    if (!folder) return null;

    const seq = folder.products.length + 1;
    const assignedNumber = `${folder.orderNumber}-${seq}`;
    const qty = product.quantity && product.quantity > 0 ? product.quantity : 1;
    const priceRmb = Number(product.priceRmb) || 0;
    const totalRmb = Number((priceRmb * qty).toFixed(2));
    const rate = folder.exchangeRate > 0 ? folder.exchangeRate : 20;
    const equivalentTk = Math.round(totalRmb * rate);

    const newProduct: FolderProduct = {
      id: 'prd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      sequenceNumber: seq,
      assignedNumber,
      name: product.name.trim() || `Product #${seq}`,
      priceRmb,
      quantity: qty,
      totalRmb,
      equivalentTk,
      status: 'active',
      note: product.note?.trim() || '',
      imageUrl: product.imageUrl,
      images: product.images,
      weightKg: product.weightKg,
      weightPriceTk: product.weightPriceTk,
      platform: product.platform,
      currency: product.currency || 'RMB',
      originalPrice: product.originalPrice,
      productUrl: product.productUrl,
      createdAt: new Date().toISOString(),
    };

    const updatedProducts = [...folder.products, newProduct];
    return this.updateFolder(folderId, { products: updatedProducts });
  },

  /**
   * Update product status (active, cancelled, returned).
   */
  setProductStatus(folderId: string, productId: string, status: ProductStatus): ProfileFolder | null {
    const allFolders = this.getAllFolders();
    const folder = allFolders.find((f) => f.id === folderId);
    if (!folder) return null;

    const updatedProducts = folder.products.map((p) => {
      if (p.id === productId) {
        return { ...p, status };
      }
      return p;
    });

    return this.updateFolder(folderId, { products: updatedProducts });
  },

  /**
   * Update an existing product within a folder.
   */
  updateProduct(
    folderId: string,
    productId: string,
    updates: Partial<FolderProduct>
  ): ProfileFolder | null {
    const allFolders = this.getAllFolders();
    const folder = allFolders.find((f) => f.id === folderId);
    if (!folder) return null;

    const rate = folder.exchangeRate > 0 ? folder.exchangeRate : 20;

    const updatedProducts = folder.products.map((p) => {
      if (p.id === productId) {
        const merged = { ...p, ...updates };
        const qty = merged.quantity && merged.quantity > 0 ? merged.quantity : 1;
        const totalRmb = Number((merged.priceRmb * qty).toFixed(2));
        const equivalentTk = Math.round(totalRmb * rate);
        return {
          ...merged,
          quantity: qty,
          totalRmb,
          equivalentTk,
        };
      }
      return p;
    });

    return this.updateFolder(folderId, { products: updatedProducts });
  },

  /**
   * Delete a product from a folder and re-index sequence numbers.
   */
  deleteProduct(folderId: string, productId: string): ProfileFolder | null {
    const allFolders = this.getAllFolders();
    const folder = allFolders.find((f) => f.id === folderId);
    if (!folder) return null;

    const filtered = folder.products.filter((p) => p.id !== productId);
    // Re-sequence remaining items
    const reindexed: FolderProduct[] = filtered.map((p, idx) => {
      const seq = idx + 1;
      return {
        ...p,
        sequenceNumber: seq,
        assignedNumber: `${folder.orderNumber}-${seq}`,
      };
    });

    return this.updateFolder(folderId, { products: reindexed });
  },
};
