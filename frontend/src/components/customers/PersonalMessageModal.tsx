import React, { useState, useEffect } from 'react';
import { MessageSquare, ShoppingBag, Sparkles, Smartphone, Copy, Send, X } from 'lucide-react';
import { Customer } from '@/components/CustomerManager';
import { ProductItem } from '@/components/ProductListBuilder';
import { generateMessageText, MessageTemplateType } from '@/utils/customerMessaging';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';

interface PersonalMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCustomer: Customer | null;
  productListItems: ProductItem[];
  initialSelectedProduct?: ProductItem | null;
  onCopyMessage: (customer: Customer, text: string) => void;
  onSendWhatsapp: (customer: Customer, text: string) => void;
  onSendSms: (customer: Customer, text: string) => void;
}

export default function PersonalMessageModal({
  isOpen,
  onClose,
  targetCustomer,
  productListItems,
  initialSelectedProduct,
  onCopyMessage,
  onSendWhatsapp,
  onSendSms
}: PersonalMessageModalProps) {
  const [selectedProductAttachment, setSelectedProductAttachment] = useState<string>('custom');
  const [productTitle, setProductTitle] = useState('');
  const [productPriceBdt, setProductPriceBdt] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [templateType, setTemplateType] = useState<MessageTemplateType>('new_arrival');
  const [customMsgBody, setCustomMsgBody] = useState('');

  useEffect(() => {
    if (initialSelectedProduct) {
      setProductTitle(initialSelectedProduct.title);
      setProductPriceBdt(String(initialSelectedProduct.price_bdt));
      setProductUrl(initialSelectedProduct.product_url || '');
      setSelectedProductAttachment(initialSelectedProduct.id);
    }
  }, [initialSelectedProduct]);

  if (!isOpen || !targetCustomer) return null;

  const handleSelectProduct = (productId: string) => {
    setSelectedProductAttachment(productId);
    if (productId === 'custom' || productId === 'none') {
      return;
    }
    const found = productListItems.find((p) => p.id === productId);
    if (found) {
      setProductTitle(found.title);
      setProductPriceBdt(String(found.price_bdt));
      setProductUrl(found.product_url || '');
    }
  };

  const previewText = generateMessageText(
    targetCustomer,
    productTitle,
    productPriceBdt,
    productUrl,
    templateType,
    customMsgBody
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
              Direct 1-on-1 Personal Message
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare style={{ width: '20px', height: '20px', color: '#10b981' }} />
              Message to {targetCustomer.name}
            </h3>
          </div>
          <button onClick={onClose} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Recipient Meta Bar */}
        <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#09090b', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>
              📱 {targetCustomer.phone}
            </span>
            <span style={{ color: '#52525b' }}>|</span>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
              Group: <strong style={{ color: '#f8fafc' }}>{targetCustomer.group}</strong>
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            📍 {targetCustomer.city || 'Dhaka'}
          </span>
        </div>

        {/* Product Attachment Picker */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>
            <ShoppingBag style={{ width: '14px', height: '14px', color: '#f87171' }} />
            Attach Product From Sourcing List
          </label>
          <select
            value={selectedProductAttachment}
            onChange={(e) => handleSelectProduct(e.target.value)}
            style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 600 }}
          >
            <option value="custom">✏️ Enter Product Manually Below</option>
            {productListItems.map((item) => (
              <option key={item.id} value={item.id}>
                📦 {item.title} (৳{item.price_bdt.toLocaleString()} BDT)
              </option>
            ))}
          </select>
        </div>

        {/* Manual Product Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Product Title</label>
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              placeholder="e.g. Smart Watch Ultra 9 AMOLED"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Price in BDT (৳)</label>
            <input
              type="number"
              value={productPriceBdt}
              onChange={(e) => setProductPriceBdt(e.target.value)}
              placeholder="e.g. 2450"
              style={{ ...inputStyle, fontWeight: 700 }}
            />
          </div>
        </div>

        {/* Template Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>
            <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
            Message Template Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTemplateType('new_arrival')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: templateType === 'new_arrival' ? '#dc2626' : '#09090b',
                color: '#ffffff',
                border: '1px solid',
                borderColor: templateType === 'new_arrival' ? '#dc2626' : '#27272a',
                cursor: 'pointer'
              }}
            >
              🚀 New Arrival Alert
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('discount_offer')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: templateType === 'discount_offer' ? '#dc2626' : '#09090b',
                color: '#ffffff',
                border: '1px solid',
                borderColor: templateType === 'discount_offer' ? '#dc2626' : '#27272a',
                cursor: 'pointer'
              }}
            >
              🔥 VIP Discount Offer
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('restock_preorder')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: templateType === 'restock_preorder' ? '#dc2626' : '#09090b',
                color: '#ffffff',
                border: '1px solid',
                borderColor: templateType === 'restock_preorder' ? '#dc2626' : '#27272a',
                cursor: 'pointer'
              }}
            >
              📦 Cargo Pre-Order
            </button>

            <button
              type="button"
              onClick={() => setTemplateType('custom')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: templateType === 'custom' ? '#dc2626' : '#09090b',
                color: '#ffffff',
                border: '1px solid',
                borderColor: templateType === 'custom' ? '#dc2626' : '#27272a',
                cursor: 'pointer'
              }}
            >
              ✍️ Custom Message
            </button>
          </div>
        </div>

        {/* Custom Message Body */}
        {templateType === 'custom' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Custom Message Text</label>
            <textarea
              rows={4}
              value={customMsgBody}
              onChange={(e) => setCustomMsgBody(e.target.value)}
              placeholder="Type message with tokens: {name}, {group}, {product}, {price}, {city}, {url}"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        )}

        {/* Live WhatsApp Speech Bubble Preview */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>
            <Smartphone style={{ width: '14px', height: '14px', color: '#10b981' }} />
            Live WhatsApp Message Preview
          </label>
          <div
            style={{
              backgroundColor: '#0c1f17',
              border: '1px solid #054c33',
              borderRadius: '12px',
              padding: '14px',
              color: '#e5e7eb',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              position: 'relative',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
            }}
          >
            {previewText}
            <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#6ee7b7', marginTop: '6px' }}>
              Formatted for WhatsApp Web & Mobile ✓✓
            </div>
          </div>
        </div>

        {/* Action Buttons: WhatsApp Direct, SMS, Copy */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
          <button
            type="button"
            onClick={() => onCopyMessage(targetCustomer, previewText)}
            style={buttonActionStyle}
          >
            <Copy style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            <span>Copy Text</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onSendSms(targetCustomer, previewText)}
              style={{ ...buttonActionStyle, backgroundColor: '#27272a' }}
            >
              <MessageSquare style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
              <span>Send SMS</span>
            </button>

            <button
              type="button"
              onClick={() => onSendWhatsapp(targetCustomer, previewText)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
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
