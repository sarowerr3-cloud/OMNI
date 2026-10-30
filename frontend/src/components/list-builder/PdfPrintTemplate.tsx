'use client';

import React from 'react';
import { ProductItem } from '@/types/listBuilder';
import { OMNI_LOGO_BASE64, OMNI_QR_BASE64 } from '@/lib/pdfAssets';
import { formatExternalUrl } from '@/lib/imageUtils';

interface PdfPrintTemplateProps {
  items: ProductItem[];
  listName: string;
  listDate: string;
  listNotes: string;
  freightRate: string;
  freightUnit: 'per_gm' | 'per_kg';
  pdfExportMode: 'single_page' | 'multi_page';
  totalItemsCount: number;
  totalQuantity: number;
  totalProductPriceBdt: number;
  totalWeightKg: number;
  totalWeightPriceBdt: number;
  grandTotalBdt: number;
}

export default function PdfPrintTemplate({
  items,
  listName,
  listDate,
  listNotes,
  freightRate,
  freightUnit,
  pdfExportMode,
  totalItemsCount,
  totalQuantity,
  totalProductPriceBdt,
  totalWeightKg,
  totalWeightPriceBdt,
  grandTotalBdt,
}: PdfPrintTemplateProps) {
  const count = items.length;
  const isSinglePage = pdfExportMode === 'single_page';
  const singleImgPx = isSinglePage ? (count <= 3 ? 76 : count <= 6 ? 64 : 52) : 76;
  const multiImgPx = isSinglePage ? (count <= 3 ? 56 : count <= 6 ? 46 : 38) : 56;
  const cellPadding = isSinglePage
    ? count <= 3
      ? '6px 6px'
      : count <= 6
      ? '4px 6px'
      : '2.5px 5px'
    : '6px 6px';
  const fontSize = isSinglePage ? (count <= 4 ? '9px' : count <= 7 ? '8.5px' : '8px') : '9.5px';

  return (
    <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
      <div
        id="a4-pdf-content"
        style={{
          width: '210mm',
          minHeight: pdfExportMode === 'single_page' ? '296mm' : undefined,
          height: pdfExportMode === 'single_page' ? '296mm' : 'auto',
          maxHeight: pdfExportMode === 'single_page' ? '296mm' : 'none',
          padding: '7mm 10mm',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
          boxSizing: 'border-box',
          overflow: pdfExportMode === 'single_page' ? 'hidden' : 'visible',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: pdfExportMode === 'single_page' ? 'space-between' : 'flex-start',
        }}
      >
        {/* TOP SECTION: Header + Table */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: pdfExportMode === 'single_page' ? 'hidden' : 'visible' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #dc2626', paddingBottom: '8px', marginBottom: '10px' }}>
            {/* Left: Official Tag */}
            <div style={{ width: '110px', flexShrink: 0 }}>
              <div style={{ display: 'inline-block', border: '1.5px solid #dc2626', borderRadius: '5px', padding: '3px 8px', backgroundColor: '#fef2f2' }}>
                <div style={{ fontSize: '8.5px', color: '#dc2626', fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  OMNI
                </div>
                <div style={{ fontSize: '6.5px', color: '#7f1d1d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Sourcing List
                </div>
              </div>
            </div>

            {/* Center: Official Logo + List Name + Date */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
              <img
                src={OMNI_LOGO_BASE64}
                alt="OMNI Logo"
                style={{
                  maxHeight: '44px',
                  maxWidth: '175px',
                  objectFit: 'contain',
                  margin: '0 auto 3px auto',
                  display: 'block',
                }}
              />
              <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#dc2626', margin: '0 0 2px 0', letterSpacing: '-0.2px', textTransform: 'uppercase' }}>
                {listName.trim() || 'Sourcing Product List'}
              </h2>
              <p style={{ fontSize: '9.5px', color: '#64748b', margin: 0, fontWeight: 600 }}>
                Date: <strong>{listDate}</strong>
              </p>
              {listNotes && (
                <div style={{ marginTop: '4px', display: 'inline-block', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 10px', fontSize: '8.5px', color: '#334155' }}>
                  <strong>Notes:</strong> {listNotes}
                </div>
              )}
            </div>

            {/* Right: QR Code */}
            <div style={{ width: '110px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center' }}>
              <div style={{ padding: '2px', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                <img
                  src={OMNI_QR_BASE64}
                  alt="Facebook Page"
                  style={{
                    width: '52px',
                    height: '52px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
              <span style={{ fontSize: '8px', color: '#1877f2', marginTop: '2.5px', fontWeight: 800, letterSpacing: '0.2px', textAlign: 'center', width: '60px', textTransform: 'uppercase' }}>
                Facebook Page
              </span>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize, marginBottom: '8px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '6px 5px', width: '20px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '6px 8px' }}>Product Details & Images</th>
                <th style={{ padding: '6px 6px', width: '68px', textAlign: 'center' }}>Source Link</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: '80px' }}>Product Price (Tk)</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: '78px' }}>Weight (Tk)</th>
                <th style={{ padding: '6px 6px', textAlign: 'right', width: '85px' }}>Total Amount (Tk)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const productLine = (item.price_bdt || 0) * (item.quantity || 1);
                const lineWeightPrice = item.line_weight_price_bdt ?? ((item.weight_price_bdt || 0) * (item.quantity || 1));
                const combinedLineTotal = item.combined_line_total_bdt ?? (productLine + lineWeightPrice);
                const itemTotalWeight = (item.weight_kg || 0) * (item.quantity || 1);
                const itemImages =
                  item.images && item.images.length > 0 ? item.images : item.image_url ? [item.image_url] : [];

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    <td style={{ padding: cellPadding, textAlign: 'center', fontWeight: 'bold', color: '#64748b', verticalAlign: 'top' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: cellPadding, verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '170px', flexShrink: 0 }}>
                          {itemImages.length > 0 ? (
                            itemImages.map((img, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={img}
                                alt=""
                                crossOrigin="anonymous"
                                style={{
                                  width: itemImages.length === 1 ? `${singleImgPx}px` : `${multiImgPx}px`,
                                  height: itemImages.length === 1 ? `${singleImgPx}px` : `${multiImgPx}px`,
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1.5px solid #cbd5e1',
                                }}
                              />
                            ))
                          ) : (
                            <div style={{ width: `${singleImgPx}px`, height: `${singleImgPx}px`, backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '9px', border: '1px dashed #cbd5e1' }}>
                              No Image
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: count <= 4 ? '10px' : '9px', lineHeight: 1.3 }}>
                            {item.title}
                          </div>
                          {item.details && (
                            <div style={{ color: '#475569', fontSize: count <= 4 ? '8.5px' : '8px', marginTop: '2px', lineHeight: 1.25 }}>
                              {item.details}
                            </div>
                          )}
                          {item.quantity > 1 && (
                            <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '8px', color: '#334155', fontWeight: 600, marginTop: '3px' }}>
                              Qty: {item.quantity} pcs
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: cellPadding, textAlign: 'center', verticalAlign: 'top' }}>
                      {item.product_url ? (
                        <a
                          href={formatExternalUrl(item.product_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#2563eb',
                            textDecoration: 'underline',
                            fontWeight: 600,
                            fontSize: '9px',
                            display: 'inline-block',
                          }}
                        >
                          Source Link ↗
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '8.5px' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: cellPadding, textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '10.5px' }}>
                        ৳{productLine.toLocaleString()}
                      </div>
                      {item.quantity > 1 && (
                        <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px' }}>
                          (৳{item.price_bdt.toLocaleString()} × {item.quantity})
                        </div>
                      )}
                    </td>

                    <td style={{ padding: cellPadding, textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '10.5px' }}>
                        ৳{lineWeightPrice.toFixed(0)}
                      </div>
                      <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px' }}>
                        {itemTotalWeight.toFixed(3)} kg
                      </div>
                    </td>

                    <td style={{ padding: cellPadding, textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '11px' }}>
                        ৳{combinedLineTotal.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td colSpan={3} style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9.5px', color: '#0f172a' }}>
                  <strong>TOTALS</strong> ({totalItemsCount} Products • {totalQuantity} pcs)
                </td>
                <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: '10.5px', color: '#0f172a' }}>
                  ৳{totalProductPriceBdt.toLocaleString()}
                </td>
                <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: '10.5px', color: '#0284c7' }}>
                  ৳{totalWeightPriceBdt.toLocaleString()}
                  <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 'normal' }}>
                    {totalWeightKg.toFixed(3)} kg
                  </div>
                </td>
                <td style={{ padding: '6px 6px', textAlign: 'right', fontSize: '11.5px', color: '#dc2626', fontWeight: 800 }}>
                  ৳{grandTotalBdt.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* BOTTOM SECTION: Statement Card + Footer Note */}
        <div style={{ flexShrink: 0, marginTop: '8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '7px', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Grand Total Statement
              </div>
              <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '1px' }}>
                Cargo Freight Rate: {freightRate} Tk/{freightUnit === 'per_gm' ? 'gm' : 'kg'} (1,200 Tk/kg)
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>Total Weight</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{totalWeightKg.toFixed(3)} kg</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Product Price</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>৳{totalProductPriceBdt.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Weight (Tk)</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>৳{totalWeightPriceBdt.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right', paddingLeft: '12px', borderLeft: '1px solid #334155' }}>
                <div style={{ fontSize: '8px', color: '#f87171', textTransform: 'uppercase', fontWeight: 800 }}>Grand Total</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>৳{grandTotalBdt.toLocaleString()} Tk</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src={OMNI_LOGO_BASE64} alt="" style={{ height: '13px', objectFit: 'contain' }} />
              <span>Official Sourcing & Cost Quotation</span>
            </div>
            <div>
              Generated on {listDate} • Scan QR for Facebook Page
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
