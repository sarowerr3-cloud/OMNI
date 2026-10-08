import { Customer } from '@/components/CustomerManager';

export type MessageTemplateType = 'new_arrival' | 'discount_offer' | 'restock_preorder' | 'custom';

export function formatWhatsappPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return '88' + cleaned;
  } else if (cleaned.startsWith('880') && cleaned.length === 13) {
    return cleaned;
  }
  return cleaned;
}

export function generateMessageText(
  customer: Customer,
  productTitle: string,
  productPriceBdt: string,
  productUrl: string,
  templateType: MessageTemplateType,
  customMsgBody?: string
): string {
  const pTitle = productTitle.trim() || 'Exclusive China Factory Product';
  const pPrice = productPriceBdt.trim()
    ? `৳${Number(productPriceBdt).toLocaleString()} BDT`
    : 'Factory Wholesale Rate';
  const pUrl = productUrl.trim() || 'https://omni-sourcing.bd';

  if (templateType === 'new_arrival') {
    return (
      `Assalamu Alaikum ${customer.name}! 🚀\n\n` +
      `We just sourced an exciting new product directly from China factories:\n` +
      `📦 *${pTitle}*\n` +
      `💰 Special Client Price: *${pPrice}*\n` +
      (pUrl ? `🔗 Product Details: ${pUrl}\n\n` : '\n') +
      `Pre-orders and direct air shipment slots are open now for ${customer.city || 'Dhaka'} delivery.\n` +
      `Please reply to this message to reserve your batch units! ✨`
    );
  } else if (templateType === 'discount_offer') {
    return (
      `Hello ${customer.name}! 🔥\n\n` +
      `Exclusive Flash Offer for our *${customer.group}* partners:\n` +
      `🏷️ Product: *${pTitle}*\n` +
      `💵 Offer Price: *${pPrice}* (Limited Batch)\n` +
      (pUrl ? `🔗 Check Details: ${pUrl}\n\n` : '\n') +
      `First come, first served. Let us know how many units you want to lock in today!`
    );
  } else if (templateType === 'restock_preorder') {
    return (
      `Dear ${customer.name},\n\n` +
      `Our next scheduled China cargo shipment is finalizing this week.\n` +
      `Are you restocking *${pTitle}* for your ${customer.category} inventory?\n` +
      `Factory Landed Rate: ${pPrice}\n` +
      (pUrl ? `Specs Link: ${pUrl}\n\n` : '\n') +
      `Drop us a message if you want to include your volume in this batch.`
    );
  } else if (templateType === 'custom') {
    if (customMsgBody && customMsgBody.trim()) {
      return customMsgBody
        .replace(/\{name\}/g, customer.name)
        .replace(/\{group\}/g, customer.group)
        .replace(/\{category\}/g, customer.category)
        .replace(/\{city\}/g, customer.city || 'Dhaka')
        .replace(/\{product\}/g, pTitle)
        .replace(/\{price\}/g, pPrice)
        .replace(/\{url\}/g, pUrl);
    }
    return `Assalamu Alaikum ${customer.name}! Update regarding ${pTitle}: ${pPrice}.`;
  }

  return `Assalamu Alaikum ${customer.name}! New update for ${pTitle}: ${pPrice}.`;
}

export function getWhatsappShareUrl(phone: string, text: string): string {
  const cleanPhone = formatWhatsappPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function getSmsShareUrl(phone: string, text: string): string {
  const cleanPhone = formatWhatsappPhone(phone);
  return `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
}
