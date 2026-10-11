/**
 * Central WhatsApp Configuration & Sharing Utilities for OMNI SOURCING
 * Group URL: https://chat.whatsapp.com/HDcEWiYHabm4oZKlhJbY4r
 */

export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/HDcEWiYHabm4oZKlhJbY4r';
export const WHATSAPP_GROUP_NAME = 'OMNI VIP Sourcing Community';

/**
 * Safely open the WhatsApp Group invite link in a new tab.
 */
export function openWhatsAppGroup(): void {
  if (typeof window !== 'undefined') {
    window.open(WHATSAPP_GROUP_URL, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Format a phone number to standard international format without symbols.
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return '88' + cleaned;
  }
  return cleaned;
}

/**
 * Share text to WhatsApp.
 * - If phone is specified: opens direct 1-on-1 chat (wa.me)
 * - If phone is omitted: opens WhatsApp share selector (api.whatsapp.com/send)
 *   where the user can pick the OMNI VIP group or any contact.
 * Also copies text to clipboard as a reliable fallback.
 */
export function shareToWhatsApp(text: string, phone?: string): boolean {
  if (typeof window === 'undefined') return false;

  // Copy text to clipboard so it's always ready to paste
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  } catch (e) {
    console.warn('Failed to copy to clipboard:', e);
  }

  const cleanPhone = phone ? formatPhoneNumber(phone) : '';
  const shareUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  window.open(shareUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Generate a WhatsApp message for a single sourced product
 */
export interface ProductSharePayload {
  title: string;
  priceRmb: number | string;
  priceBdt?: number | string;
  weightKg?: number | string;
  landedCostBdt?: number | string;
  platform?: string;
  productUrl?: string;
}

export function formatProductShareMessage(payload: ProductSharePayload): string {
  const lines: string[] = [
    '🔥 *HOT CHINA FACTORY SOURCING ALERT*',
    '━━━━━━━━━━━━━━━━━━━━━',
    `📦 *Product:* ${payload.title}`,
    `🏷️ *Factory Price:* ¥${payload.priceRmb} RMB${payload.priceBdt ? ` (~৳${Number(payload.priceBdt).toLocaleString()} BDT)` : ''}`,
  ];

  if (payload.weightKg) {
    lines.push(`⚖️ *Est. Weight:* ${payload.weightKg} kg`);
  }

  if (payload.landedCostBdt) {
    lines.push(`🚀 *Est. Landed Cost (BD):* ৳${Number(payload.landedCostBdt).toLocaleString()} BDT / pc`);
  }

  if (payload.platform) {
    lines.push(`🛒 *Supplier Platform:* ${payload.platform}`);
  }

  if (payload.productUrl && payload.productUrl.trim()) {
    lines.push(`🔗 *Source Link:* ${payload.productUrl.trim()}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━');
  lines.push('💬 *Join our VIP WhatsApp Sourcing Group for pre-orders & wholesale:*');
  lines.push(WHATSAPP_GROUP_URL);
  lines.push('\n_Generated via OMNI Sourcing & Costing Intelligence_');

  return lines.join('\n');
}

/**
 * Generate a WhatsApp message for the Standalone Calculator quotation
 */
export interface CalculatorSharePayload {
  title?: string;
  rmbPrice: string | number;
  rmbRate: string | number;
  qty: string | number;
  totalWeightKg: string | number;
  freightRate: string | number;
  freightUnit: string;
  totalProductPriceBdt: string | number;
  totalFreightBdt: string | number;
  totalLandedCostBdt: string | number;
  perUnitLandedCostBdt: string | number;
  targetPriceBdt?: string | number;
  netProfitBdt?: string | number;
}

export function formatCalculatorShareMessage(payload: CalculatorSharePayload): string {
  const lines: string[] = [
    '📦 *OMNI SOURCING & LANDED COST BREAKDOWN*',
    '━━━━━━━━━━━━━━━━━━━━━',
    `🏷️ *Product:* ${payload.title || 'China Factory Sourced Item'}`,
    `💴 *Factory Price:* ¥${payload.rmbPrice} (Rate: ৳${payload.rmbRate}/RMB)`,
    `🔢 *Order Quantity:* ${payload.qty} pcs`,
    `⚖️ *Total Weight:* ${payload.totalWeightKg} kg`,
    `✈️ *Freight Rate:* ৳${payload.freightRate}/${payload.freightUnit === 'per_gm' ? 'gm' : 'kg'}`,
    '─────────────────────',
    `💵 *Total Product Cost:* ৳${Number(payload.totalProductPriceBdt).toLocaleString()} BDT`,
    `📦 *Total Freight Cost:* ৳${Number(payload.totalFreightBdt).toLocaleString()} BDT`,
    `🎯 *Total Landed Cost:* ৳${Number(payload.totalLandedCostBdt).toLocaleString()} BDT`,
    `⭐ *PER UNIT LANDED COST:* ৳${Number(payload.perUnitLandedCostBdt).toLocaleString()} BDT`,
  ];

  if (payload.targetPriceBdt && Number(payload.targetPriceBdt) > 0) {
    lines.push(`🏷️ *Target Selling Price:* ৳${Number(payload.targetPriceBdt).toLocaleString()} BDT`);
    if (payload.netProfitBdt) {
      lines.push(`💰 *Est. Net Profit / Unit:* ৳${Number(payload.netProfitBdt).toLocaleString()} BDT`);
    }
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━');
  lines.push('💬 *Join our VIP WhatsApp Sourcing Group:*');
  lines.push(WHATSAPP_GROUP_URL);
  lines.push('\n_Generated via OMNI Sourcing & Costing Engine_');

  return lines.join('\n');
}
