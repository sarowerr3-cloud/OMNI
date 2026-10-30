export type ProductStatus = 'active' | 'cancelled' | 'returned';

export interface FolderProduct {
  id: string;
  sequenceNumber: number; // 1, 2, 3, etc.
  assignedNumber: string; // e.g., "ORD-101-1" (folder order number + sequence number)
  name: string;
  priceRmb: number;
  quantity: number;
  totalRmb: number;
  equivalentTk: number;
  status: ProductStatus;
  note?: string;
  imageUrl?: string;
  images?: string[];
  weightKg?: number;
  weightPriceTk?: number;
  platform?: string;
  currency?: 'RMB' | 'BDT' | 'USD';
  originalPrice?: number;
  productUrl?: string;
  createdAt: string;
}

export type FolderPaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface ProfileFolder {
  id: string;
  profileId: string;
  orderNumber: string; // Unique small order number (e.g. "ORD-101")
  name: string; // Folder name
  date: string; // Assigned date (YYYY-MM-DD)
  note?: string; // Small note about the folder
  exchangeRate: number; // RMB to Tk rate (e.g. 20.00)
  paidAmountTk: number; // Amount paid in Tk
  isDelivered: boolean; // Whether goods have been delivered
  products: FolderProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface FolderFinancials {
  totalValueRmb: number;
  grossValueRmb: number;
  equivalentAmountTk: number;
  grossAmountTk: number;
  paidAmountTk: number;
  remainingDueTk: number;
  paymentStatus: FolderPaymentStatus;
  isDelivered: boolean;
  hasReturnedItems: boolean;
  hasCancelledItems: boolean;
  returnedItems: FolderProduct[];
  cancelledItems: FolderProduct[];
  activeItems: FolderProduct[];
}

/**
 * Calculates financials, payment status, delivery status, and return/cancelled item summaries.
 */
export function calculateFolderFinancials(folder: ProfileFolder): FolderFinancials {
  const products = folder.products || [];
  const exchangeRate = folder.exchangeRate > 0 ? folder.exchangeRate : 20;

  const activeItems = products.filter((p) => p.status === 'active');
  const returnedItems = products.filter((p) => p.status === 'returned');
  const cancelledItems = products.filter((p) => p.status === 'cancelled');

  // Active value excludes cancelled and returned items from the active payable total
  const totalValueRmb = activeItems.reduce((sum, p) => sum + (p.totalRmb || p.priceRmb * (p.quantity || 1)), 0);
  const grossValueRmb = products.reduce((sum, p) => sum + (p.totalRmb || p.priceRmb * (p.quantity || 1)), 0);

  const equivalentAmountTk = Math.round(totalValueRmb * exchangeRate);
  const grossAmountTk = Math.round(grossValueRmb * exchangeRate);

  const paidAmountTk = Math.max(0, folder.paidAmountTk || 0);
  const remainingDueTk = Math.max(0, equivalentAmountTk - paidAmountTk);

  let paymentStatus: FolderPaymentStatus = 'unpaid';
  if (paidAmountTk >= equivalentAmountTk && equivalentAmountTk > 0) {
    paymentStatus = 'paid';
  } else if (paidAmountTk > 0) {
    paymentStatus = 'partial';
  } else if (equivalentAmountTk === 0 && paidAmountTk === 0) {
    paymentStatus = 'paid';
  }

  return {
    totalValueRmb: Number(totalValueRmb.toFixed(2)),
    grossValueRmb: Number(grossValueRmb.toFixed(2)),
    equivalentAmountTk,
    grossAmountTk,
    paidAmountTk,
    remainingDueTk,
    paymentStatus,
    isDelivered: !!folder.isDelivered,
    hasReturnedItems: returnedItems.length > 0,
    hasCancelledItems: cancelledItems.length > 0,
    returnedItems,
    cancelledItems,
    activeItems,
  };
}
