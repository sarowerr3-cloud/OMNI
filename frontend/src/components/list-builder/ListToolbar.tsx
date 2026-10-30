'use client';

import React from 'react';
import { 
  Sparkles, 
  Package, 
  FolderOpen, 
  Save, 
  MessageSquare, 
  Share2, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer 
} from 'lucide-react';
import { WHATSAPP_GROUP_URL } from '@/config/whatsapp';

interface ListToolbarProps {
  onOpenSavedModal: () => void;
  onOpenSaveModal: () => void;
  onOpenWhatsAppModal: () => void;
  onShareSummary: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  pdfExportMode: 'single_page' | 'multi_page';
  setPdfExportMode: (mode: 'single_page' | 'multi_page') => void;
  onDownloadPdf: () => void;
  downloadingPdf: boolean;
  onNativePrint: () => void;
  savingToServer: boolean;
}

const buttonActionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '7px 12px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-surface, #27272a)',
  border: '1px solid var(--border-color, #3f3f46)',
  color: 'var(--text-primary, #ffffff)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

export default function ListToolbar({
  onOpenSavedModal,
  onOpenSaveModal,
  onOpenWhatsAppModal,
  onShareSummary,
  onExportCsv,
  onExportExcel,
  pdfExportMode,
  setPdfExportMode,
  onDownloadPdf,
  downloadingPdf,
  onNativePrint,
  savingToServer,
}: ListToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border-color, #27272a)',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#dc2626',
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '4px',
          }}
        >
          <Sparkles style={{ width: '16px', height: '16px' }} />
          <span>Sourcing List Creator & Cost Engine</span>
        </div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary, #ffffff)',
            letterSpacing: '-0.5px',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Package style={{ width: '28px', height: '28px', color: '#dc2626' }} />
          Product List Builder
        </h1>
        <p style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
          Add products sequentially, calculate live total weight & price, and export as an A4 formatted PDF.
        </p>
      </div>

      {/* Action Buttons Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onOpenSavedModal} style={buttonActionStyle}>
          <FolderOpen style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
          <span>Saved Lists</span>
        </button>

        <button
          type="button"
          onClick={onOpenSaveModal}
          disabled={savingToServer}
          style={{
            ...buttonActionStyle,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            color: '#34d399',
          }}
          title="Save List with options to keep working or start fresh"
        >
          <Save style={{ width: '16px', height: '16px', color: '#34d399' }} />
          <span>{savingToServer ? 'Saving...' : 'Save List'}</span>
        </button>

        {/* WhatsApp Share Action Button */}
        <button
          type="button"
          onClick={onOpenWhatsAppModal}
          style={{
            ...buttonActionStyle,
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#4ade80',
          }}
          title="Share quotation directly to WhatsApp with live preview"
        >
          <MessageSquare style={{ width: '16px', height: '16px', color: '#22c55e' }} />
          <span>WhatsApp</span>
        </button>

        {/* Direct WhatsApp VIP Group Link Button */}
        <a
          href={WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...buttonActionStyle,
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#86efac',
            textDecoration: 'none',
          }}
          title="Join or Open OMNI WhatsApp VIP Sourcing Group"
        >
          <span style={{ fontSize: '0.95rem' }}>💬</span>
          <span>VIP Group</span>
        </a>

        <button
          type="button"
          onClick={onShareSummary}
          style={buttonActionStyle}
          title="Copy plain text summary to clipboard"
        >
          <Share2 style={{ width: '16px', height: '16px', color: '#c084fc' }} />
          <span>Copy Text</span>
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          style={buttonActionStyle}
          title="Download simple CSV file"
        >
          <Download style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
          <span>CSV</span>
        </button>

        <button
          type="button"
          onClick={onExportExcel}
          style={{
            ...buttonActionStyle,
            backgroundColor: 'rgba(16, 124, 65, 0.15)',
            border: '1px solid rgba(16, 124, 65, 0.4)',
            color: '#4ade80',
          }}
          title="Download full formatted Excel Workbook (.xlsx)"
        >
          <FileSpreadsheet style={{ width: '16px', height: '16px', color: '#4ade80' }} />
          <span>Excel (.xlsx)</span>
        </button>

        {/* PDF Mode Selector & Download Button Combo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface, #18181b)',
            border: '1px solid var(--border-color, #3f3f46)',
            borderRadius: '10px',
            padding: '2px',
            gap: '4px',
          }}
        >
          <select
            value={pdfExportMode}
            onChange={(e) => setPdfExportMode(e.target.value as 'single_page' | 'multi_page')}
            title="Select single-page or multi-page PDF mode"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #e2e8f0)',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '6px 8px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="single_page" style={{ backgroundColor: 'var(--bg-card, #18181b)', color: 'var(--text-primary, #ffffff)' }}>
              📄 1-Page Summary
            </option>
            <option value="multi_page" style={{ backgroundColor: 'var(--bg-card, #18181b)', color: 'var(--text-primary, #ffffff)' }}>
              📑 Multi-Page Flow
            </option>
          </select>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc2626 0%, #990000 100%)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: downloadingPdf ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)',
            }}
          >
            <FileText style={{ width: '15px', height: '15px' }} />
            <span>{downloadingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNativePrint}
          title="Print to PDF via Browser"
          style={{ ...buttonActionStyle, padding: '9px' }}
        >
          <Printer style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
}
