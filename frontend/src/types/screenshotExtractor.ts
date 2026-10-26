export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ExtractedProductData {
  productName: string;
  colors: string[];
  priceCNY: number;
  baseWeightKg: number | null; // null if not explicitly found in screenshot
  boundingBoxForProductImage?: BoundingBox;

  // Custom Business Logic / Calculated Fields
  exchangeRate?: number; // CNY to BDT (default: 17.5)
  priceBDT?: number; // priceCNY * exchangeRate
  finalWeightKg?: number | null; // baseWeightKg * 1.2 if weight exists, else null
  finalWeightGm?: number | null; // finalWeightKg * 1000 if weight exists, else null
  croppedImageDataUrl?: string; // Cropped thumbnail from canvas
  originalImageDataUrl?: string; // Base64 preview of the uploaded screenshot
  platformDetected?: '1688' | 'AliExpress' | 'Pinduoduo' | 'Taobao' | 'Other';
  isAiPowered?: boolean;
  modelUsed?: string;
  note?: string;
  rawResponse?: any;
}
