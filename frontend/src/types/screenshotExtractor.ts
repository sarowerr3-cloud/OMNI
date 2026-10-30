export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface SelectedProductFeatures {
  color?: string | null;
  size?: string | null;
  model?: string | null;
  style?: string | null;
  shape?: string | null;
  combination?: string | null;
  rawSelectedText?: string | null;
  summaryList: string[];
}

export interface ExtractedProductData {
  isProductScreenshot?: boolean; // false if the image is not an e-commerce product screenshot
  productName: string;
  hasSelectedFeatures: boolean;
  selectedFeatures?: SelectedProductFeatures;
  colors: string[]; // Backwards compatibility: contains selected features list
  priceCNY: number | null; // null if not explicitly found in screenshot
  baseWeightKg: number | null; // null if not explicitly found in screenshot
  boundingBoxForProductImage?: BoundingBox;

  // Custom Business Logic / Calculated Fields
  exchangeRate?: number; // CNY to BDT (default: 20.0)
  priceBDT?: number | null; // priceCNY * exchangeRate if priceCNY is valid, else null
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
