'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Copy, Send } from 'lucide-react';
import { ProductItem } from '@/types/listBuilder';
import { formatExternalUrl } from '@/lib/imageUtils';
import { WHATSAPP_GROUP_URL, openWhatsAppGroup } from '@/config/whatsapp';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProductItem[];
  listName: string;
  listDate: string;
  listNotes: string;
  freightRate: string;
  freightUnit: 'per_gm' | 'per_kg';
  totalItemsCount: number;
  totalQuantity: number;
  totalWeightKg: number;
  totalProductPriceBdt: number;
  totalWeightPriceBdt: number;
  grandTotalBdt: number;
  totalPaidBdt: number;
  totalDueBdt: number;
  showToast: (msg: string) => void;
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  items,
  listName,
  listDate,
  listNotes,
  freightRate,
  freightUnit,
  totalItemsCount,
  totalQuantity,
  totalWeightKg,
  totalProductPriceBdt,
  totalWeightPriceBdt,
  grandTotalBdt,
  totalPaidBdt,
  totalDueBdt,
  showToast,
}: WhatsAppModalProps) {
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('');
  const [waIncludeLinks, setWaIncludeLinks] = useState<boolean>(true);
  const [waIncludeFreight, setWaIncludeFreight] = useState<boolean>(true);
  const [waIncludeFacebook, setWaIncludeFacebook] = useState<boolean>(true);
  const [waIncludeGroup, setWaIncludeGroup] = useState<boolean>(true);

  if (!isOpen) return null;

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
      const productLine = (item.price_bdt || 0) * (item.quantity || 1);
      const lineWeight = (item.line_weight_price_bdt ?? (item.weight_price_bdt || 0) * (item.quantity || 1));
      const combined = (item.combined_line_total_bdt ?? (item.combined_unit_price_bdt || 0) * (item.quantity || 1));
      const paid = item.paid_amount || 0;
      const due = item.due_amount !== undefined ? item.due_amount : Math.max(0, combined - paid);

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
    onClose();
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18181b)',
          border: '1px solid var(--border-color, #27272a)',
          borderRadius: '16px',
          maxWidth: '580px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color, #27272a)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
              }}
            >
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
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'var(--bg-surface, #27272a)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted, #a1a1aa)',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {/* Phone Number Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #e2e8f0)',
                marginBottom: '6px',
              }}
            >
              Customer WhatsApp Phone Number (Optional)
            </label>
            <input
              type="text"
              value={whatsAppPhone}
              onChange={(e) => setWhatsAppPhone(e.target.value)}
              placeholder="e.g. 8801712345678 or 01712345678"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface, #09090b)',
                border: '1px solid var(--border-color, #27272a)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted, #71717a)', margin: '4px 0 0 0' }}>
              Include country code (e.g. 880 for Bangladesh) or leave blank to choose contact manually in WhatsApp.
            </p>
          </div>

          {/* Message Options */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #09090b)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #27272a)',
              marginBottom: '1rem',
            }}
          >
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
                <span>Include VIP Group</span>
              </label>
            </div>
          </div>

          {/* Live Preview Box */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #e2e8f0)', margin: 0 }}>
                Live Message Preview:
              </label>
              <button
                type="button"
                onClick={handleCopyWhatsAppText}
                style={{
                  fontSize: '0.72rem',
                  color: '#4ade80',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700,
                }}
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
                margin: 0,
              }}
            >
              {generateWhatsAppMessage()}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color, #27272a)',
          }}
        >
          <button
            type="button"
            onClick={openWhatsAppGroup}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#86efac',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💬</span>
            <span>Open VIP Group</span>
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color, #27272a)',
                color: 'var(--text-secondary, #a1a1aa)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface, #27272a)',
                border: '1px solid var(--border-color, #3f3f46)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Copy style={{ width: '15px', height: '15px', color: 'var(--text-muted, #a1a1aa)' }} />
              <span>Copy Text</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendWhatsApp(true)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: '1px solid #22c55e',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📲</span>
              <span>Post to VIP Group</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendWhatsApp(false)}
              style={{
                padding: '8px 16px',
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
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)',
              }}
            >
              <Send style={{ width: '16px', height: '16px' }} />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
