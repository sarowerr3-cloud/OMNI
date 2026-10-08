import React, { useState, useEffect } from 'react';
import { Send, Copy, CheckCircle2, X } from 'lucide-react';
import { Customer, CustomerGroup } from '@/components/CustomerManager';
import { ProductItem } from '@/components/ProductListBuilder';
import { generateMessageText, MessageTemplateType } from '@/utils/customerMessaging';
import { inputStyle, labelStyle, buttonActionStyle } from './customerStyles';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  groups: CustomerGroup[];
  productListItems: ProductItem[];
  initialSelectedProduct?: ProductItem | null;
  onSendWhatsapp: (customer: Customer, text: string) => void;
  onCopyMessage: (customer: Customer, text: string) => void;
  onCopyGroupPhones: (targetGroup: string) => void;
  sentCustomerIds: Record<string, boolean>;
}

export default function BroadcastModal({
  isOpen,
  onClose,
  customers,
  groups,
  productListItems,
  initialSelectedProduct,
  onSendWhatsapp,
  onCopyMessage,
  onCopyGroupPhones,
  sentCustomerIds
}: BroadcastModalProps) {
  const [broadcastTargetGroup, setBroadcastTargetGroup] = useState<string>('All');
  const [selectedProductAttachment, setSelectedProductAttachment] = useState<string>('custom');
  const [productTitle, setProductTitle] = useState('');
  const [productPriceBdt, setProductPriceBdt] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [templateType, setTemplateType] = useState<MessageTemplateType>('new_arrival');

  useEffect(() => {
    if (initialSelectedProduct) {
      setProductTitle(initialSelectedProduct.title);
      setProductPriceBdt(String(initialSelectedProduct.price_bdt));
      setProductUrl(initialSelectedProduct.product_url || '');
      setSelectedProductAttachment(initialSelectedProduct.id);
    }
  }, [initialSelectedProduct]);

  if (!isOpen) return null;

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

  const targetList = customers.filter(
    (c) => broadcastTargetGroup === 'All' || c.group.toLowerCase() === broadcastTargetGroup.toLowerCase()
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', maxWidth: '720px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #27272a', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
              Mass Customer Outreach
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
              Broadcast New Product to Group
            </h3>
          </div>
          <button onClick={onClose} style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Target Group Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>
              Select Target Group <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={broadcastTargetGroup}
              onChange={(e) => setBroadcastTargetGroup(e.target.value)}
              style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 800, color: '#38bdf8' }}
            >
              <option value="All">All Groups ({customers.length} total customers)</option>
              {groups.map((grp) => {
                const count = customers.filter((c) => c.group.toLowerCase() === grp.name.toLowerCase()).length;
                return (
                  <option key={grp.id} value={grp.name}>
                    {grp.name} ({count} customers)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Attach Sourced Product</label>
            <select
              value={selectedProductAttachment}
              onChange={(e) => handleSelectProduct(e.target.value)}
              style={{ ...inputStyle, backgroundColor: '#09090b', fontWeight: 600 }}
            >
              <option value="custom">✏️ Enter Product Manually Below</option>
              {productListItems.map((item) => (
                <option key={item.id} value={item.id}>
                  📦 {item.title} (৳{item.price_bdt.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Specifications */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Product Title / Announcement</label>
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              placeholder="e.g. Smart Watch Ultra 8 Series with AMOLED"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Target Price (BDT ৳)</label>
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
          <label style={labelStyle}>Message Template</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTemplateType('new_arrival')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: templateType === 'new_arrival' ? '#38bdf8' : '#09090b',
                color: templateType === 'new_arrival' ? '#09090b' : '#ffffff',
                border: '1px solid #27272a',
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
                backgroundColor: templateType === 'discount_offer' ? '#38bdf8' : '#09090b',
                color: templateType === 'discount_offer' ? '#09090b' : '#ffffff',
                border: '1px solid #27272a',
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
                backgroundColor: templateType === 'restock_preorder' ? '#38bdf8' : '#09090b',
                color: templateType === 'restock_preorder' ? '#09090b' : '#ffffff',
                border: '1px solid #27272a',
                cursor: 'pointer'
              }}
            >
              📦 Cargo Pre-Order
            </button>
          </div>
        </div>

        {/* Interactive Recipient Queue */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Recipients Queue ({targetList.length} Retailers)
            </label>
            <button
              type="button"
              onClick={() => onCopyGroupPhones(broadcastTargetGroup)}
              style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Copy style={{ width: '12px', height: '12px' }} />
              <span>Copy All Phone Numbers</span>
            </button>
          </div>

          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #27272a', borderRadius: '10px', padding: '8px', backgroundColor: '#09090b' }}>
            {targetList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                No members in this group yet. Add customers to &ldquo;{broadcastTargetGroup}&rdquo; first.
              </div>
            ) : (
              targetList.map((member, idx) => {
                const isSent = sentCustomerIds[member.id];
                const msg = generateMessageText(member, productTitle, productPriceBdt, productUrl, templateType);
                return (
                  <div
                    key={member.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1a1aa', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#34d399' }}>
                          {member.phone} • {member.city || 'Dhaka'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onCopyMessage(member, msg)}
                        title="Copy personalized message for this customer"
                        style={{ padding: '6px', backgroundColor: '#27272a', border: 'none', borderRadius: '6px', color: '#a1a1aa', cursor: 'pointer' }}
                      >
                        <Copy style={{ width: '12px', height: '12px' }} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onSendWhatsapp(member, msg)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: isSent ? '#047857' : '#10b981',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {isSent ? <CheckCircle2 style={{ width: '12px', height: '12px' }} /> : <Send style={{ width: '12px', height: '12px' }} />}
                        <span>{isSent ? 'Sent' : 'Send WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...buttonActionStyle, backgroundColor: '#27272a' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
