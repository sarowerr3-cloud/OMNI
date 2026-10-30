'use client';

import React from 'react';
import { FolderOpen, X, FileSpreadsheet, Trash2 } from 'lucide-react';
import { SavedProductList } from '@/types/listBuilder';
import { exportSingleOrderToExcel, exportAllOrdersToExcel } from '@/lib/excelExport';

interface SavedListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLists: SavedProductList[];
  loadingSaved: boolean;
  onLoadList: (list: SavedProductList) => void;
  onDeleteList: (id: string, e: React.MouseEvent) => void;
  showToast: (msg: string) => void;
}

export default function SavedListsModal({
  isOpen,
  onClose,
  savedLists,
  loadingSaved,
  onLoadList,
  onDeleteList,
  showToast,
}: SavedListsModalProps) {
  if (!isOpen) return null;

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
          maxWidth: '600px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
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
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--text-primary, #ffffff)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FolderOpen style={{ width: '20px', height: '20px', color: '#60a5fa' }} />
            Orders Record
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {savedLists.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  exportAllOrdersToExcel(savedLists);
                  showToast(`📗 Master Excel Sheet downloaded (${savedLists.length} orders)!`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#107c41',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Export All Saved Orders to Excel (.xlsx)"
              >
                <FileSpreadsheet style={{ width: '15px', height: '15px' }} />
                <span>Export All Excel</span>
              </button>
            )}
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
        </div>

        {loadingSaved ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.9rem' }}>
            Loading saved product lists...
          </div>
        ) : savedLists.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #a1a1aa)', fontSize: '0.9rem' }}>
            No saved product lists found on the server. Save your current list to see it here!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
            {savedLists.map((list) => (
              <div
                key={list.id}
                onClick={() => onLoadList(list)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface, #09090b)',
                  border: '1px solid var(--border-color, #27272a)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)', margin: 0 }}>
                    {list.name}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #a1a1aa)', margin: '4px 0 0 0' }}>
                    Date: {list.date} | Items: {list.total_items_count} ({list.total_quantity} pcs)
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                      ৳{(list.grand_total_bdt || list.total_price_bdt).toLocaleString()}
                    </div>
                    {typeof list.total_weight_price_bdt === 'number' && list.total_weight_price_bdt > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
                        Freight: ৳{list.total_weight_price_bdt.toLocaleString()}
                      </div>
                    )}
                    {typeof list.total_paid_bdt === 'number' && (
                      <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                        Paid: ৳{list.total_paid_bdt.toLocaleString()}
                      </div>
                    )}
                    {typeof list.total_due_bdt === 'number' && list.total_due_bdt > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>
                        Due: ৳{list.total_due_bdt.toLocaleString()}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{list.total_weight_kg} kg</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        exportSingleOrderToExcel(list);
                        showToast(`📗 Excel downloaded for "${list.name}"`);
                      } catch (err: any) {
                        showToast('❌ Export failed');
                      }
                    }}
                    style={{
                      padding: '6px',
                      backgroundColor: 'rgba(16, 124, 65, 0.2)',
                      border: '1px solid rgba(16, 124, 65, 0.4)',
                      borderRadius: '6px',
                      color: '#4ade80',
                      cursor: 'pointer',
                    }}
                    title="Download order as Excel (.xlsx)"
                  >
                    <FileSpreadsheet style={{ width: '16px', height: '16px' }} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => onDeleteList(list.id, e)}
                    style={{
                      padding: '6px',
                      backgroundColor: 'var(--bg-card, #27272a)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#f87171',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
