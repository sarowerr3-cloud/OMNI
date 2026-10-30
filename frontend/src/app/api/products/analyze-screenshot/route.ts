import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

interface RawSelectedFeatures {
  color?: string | null;
  size?: string | null;
  model?: string | null;
  style?: string | null;
  shape?: string | null;
  combination?: string | null;
  rawSelectedText?: string | null;
}

interface RawGeminiExtraction {
  productName?: string;
  hasSelectedFeatures?: boolean;
  selectedFeatures?: RawSelectedFeatures;
  colors?: string[];
  priceCNY?: number;
  baseWeightKg?: number | null;
  boundingBoxForProductImage?: BoundingBox;
  platform?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert AI sourcing vision analyst for Chinese e-commerce platforms (1688.com, AliExpress, Pinduoduo, Taobao, Weidian).
Analyze the provided product screenshot and extract structured information with extreme accuracy.

CRITICAL FEATURE SELECTION RULES (COLOR, SIZE, MODEL, STYLE, SHAPE, COMBINATIONS):
- In Chinese e-commerce screenshots, users often select specific options before purchasing. You must identify ONLY the specific features that are ACTIVELY SELECTED or INDICATED in the screenshot.
- Features to extract:
  1. "color": Selected color name in English (e.g. "Matte Black", "Cream White", "Navy Blue")
  2. "size": Selected size/dimension (e.g. "XL", "42 EU", "120cm x 60cm", "500ml")
  3. "model": Selected device/specification model (e.g. "Pro Max Edition", "Type-C Fast Charge", "Upgraded 2026")
  4. "style": Selected style/pattern (e.g. "Hooded Thickened", "Round Collar", "Striped")
  5. "shape": Selected shape/geometry (e.g. "Round", "Square", "Oval", "Curved")
  6. "combination": Selected package bundle or combo (e.g. "1 Host + 2 Batteries + Fast Charger", "Pack of 5", "Gift Box")

HOW TO RECOGNIZE WHAT IS ACTIVELY SELECTED (VISUAL ANCHORS):
- Look for the Chinese summary text: "已选" (Selected) or "已选择" (e.g., "已选: 曜石黑, XL, 旗舰版"). Anything following "已选" is 100% the selected feature combination!
- Look for visual button/chip indicators:
  * An active colored border (typically bright orange #ff5000, red #e02e24, or cyan/blue border) while other unselected options have pale grey or white borders.
  * A filled colored background or bold text on a specific option button.
  * A small checkmark icon (✓) or colored badge in the bottom-right corner of the active thumbnail or option box.
  * In 1688 wholesale tiered lists: whichever row has a quantity entered (> 0, e.g. "10件").
- DO NOT list all unselected options! Never output options that are NOT selected.
- If an option is selected, translate it into clean, professional English.

STRICT NEGATIVE RULE:
- If NO feature is selected, highlighted, or indicated in the screenshot (for instance, the screenshot only shows the main product photo, title, or all option chips are unselected/inactive):
  * "hasSelectedFeatures" MUST be false.
  * "selectedFeatures" fields (color, size, model, style, shape, combination) MUST all be null.
  * "colors" MUST be an empty array [].
  * Do NOT invent, assume, or default to any variant!

OTHER FIELDS:
1. "productName": Translate the product title into clear, attractive, professional English. Remove spammy supplier keywords ("工厂直销", "跨境热销", "一件代发").
2. "priceCNY": Extract the item price in Chinese Yuan (¥ / RMB). Return as a clean number (e.g. 45.5).
3. "baseWeightKg": Extract the base product weight in kilograms ONLY if explicitly printed on the screenshot (e.g. "重量", "单件重量", "毛重", "500g" -> 0.5, "350克" -> 0.35, "1.2kg" -> 1.2). If NOT written anywhere on the image, you MUST return null.
4. "boundingBoxForProductImage": Bounding box coordinates {ymin, xmin, ymax, xmax} in 0-100 percentage for the primary product showcase photo.
5. "platform": Detect "1688", "AliExpress", "Pinduoduo", "Taobao", or "Other".

You MUST strictly return a valid JSON object matching this schema:
{
  "productName": "English title",
  "hasSelectedFeatures": true,
  "selectedFeatures": {
    "color": "Matte Black",
    "size": "XL",
    "model": "Pro Edition",
    "style": "Hooded",
    "shape": null,
    "combination": "1 Host + 2 Batteries",
    "rawSelectedText": "已选: 黑色, XL, 升级款"
  },
  "colors": ["Color: Matte Black", "Size: XL", "Model: Pro Edition"],
  "priceCNY": 45.50,
  "baseWeightKg": 0.35,
  "boundingBoxForProductImage": { "ymin": 12, "xmin": 8, "ymax": 58, "xmax": 92 },
  "platform": "1688"
}`;

/**
 * Helper to get the Gemini API key from environment or .env files.
 */
function getGeminiApiKey(): string | null {
  let key = process.env.GEMINI_API_KEY?.trim();
  if (key && !key.startsWith('your_') && !key.includes('placeholder')) {
    return key;
  }

  // Attempt reading from frontend/.env.local or root .env
  const candidatePaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    'f:/OMNI/.env',
    'f:/OMNI/frontend/.env.local',
  ];

  for (const envPath of candidatePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match && match[1]) {
          const val = match[1].trim();
          if (val && !val.startsWith('your_') && !val.includes('placeholder')) {
            return val;
          }
        }
      }
    } catch (e) {
      // ignore file read error
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('image') || formData.get('screenshot')) as File | null;
    const rateParam = formData.get('cnyRate') || formData.get('exchangeRate');
    const exchangeRate = Number(rateParam) > 0 ? Number(rateParam) : 20.0;

    if (!file) {
      return NextResponse.json(
        { error: 'No screenshot image file provided. Please upload an image.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const apiKey = getGeminiApiKey();
    const isValidKey = Boolean(apiKey);

    let extracted: RawGeminiExtraction = {};
    let usedModel: string = 'smart-fallback';
    let isAiLive = false;

    if (isValidKey && apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      // Fallback model chain in case of retirement (404) or capacity spikes (503)
      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-3-flash-preview',
        'gemini-3.8-flash',
        'gemini-2.5-pro',
        'gemini-flash-latest',
        'gemini-3.5-flash',
      ].filter(Boolean) as string[];

      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`[Gemini Vision] Attempting model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                text: EXTRACTION_SYSTEM_PROMPT,
              },
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const responseText = response.text || '';
          if (responseText) {
            try {
              extracted = JSON.parse(responseText);
            } catch (parseErr) {
              const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              extracted = JSON.parse(cleanJson);
            }

            if (extracted && (extracted.productName || extracted.priceCNY !== undefined)) {
              usedModel = modelName;
              isAiLive = true;
              console.log(`[Gemini Vision] Successfully extracted with ${modelName}:`, extracted.productName);
              break;
            }
          }
        } catch (geminiErr: any) {
          console.warn(`[Gemini Vision] Model ${modelName} failed:`, geminiErr.message || geminiErr);
          lastError = geminiErr;
        }
      }

      if (!isAiLive) {
        console.error('[Gemini Vision] All Gemini models failed or timed out:', lastError);
        extracted = generateSmartFallback(file.name);
      }
    } else {
      console.warn('GEMINI_API_KEY is not configured. Returning intelligent mock extraction.');
      extracted = generateSmartFallback(file.name);
    }

    // Business Logic Calculations
    const priceCNY = typeof extracted.priceCNY === 'number' && extracted.priceCNY > 0 ? extracted.priceCNY : 45.5;
    const priceBDT = Math.round(priceCNY * exchangeRate * 100) / 100;

    // Weight Calculation:
    // Only extract and calculate weight if explicitly identified in the screenshot.
    // If not found, leave baseWeightKg, finalWeightKg, and finalWeightGm as null so the form field remains empty for manual input.
    const baseWeightKg: number | null = (typeof extracted.baseWeightKg === 'number' && extracted.baseWeightKg > 0)
      ? extracted.baseWeightKg
      : null;
    // Final Calculated Weight = Base Weight × 1.2 (+20% safety factor for packaging/carton)
    const finalWeightKg: number | null = baseWeightKg !== null
      ? Math.round(baseWeightKg * 1.2 * 1000) / 1000
      : null;
    const finalWeightGm: number | null = finalWeightKg !== null
      ? Math.round(finalWeightKg * 1000)
      : null;

    // Build Structured Selected Features (Color, Size, Model, Style, Shape, Combination)
    const rawSel = extracted.selectedFeatures || {};
    const summaryList: string[] = [];
    if (rawSel.color) summaryList.push(`Color: ${rawSel.color}`);
    if (rawSel.size) summaryList.push(`Size: ${rawSel.size}`);
    if (rawSel.model) summaryList.push(`Model: ${rawSel.model}`);
    if (rawSel.style) summaryList.push(`Style: ${rawSel.style}`);
    if (rawSel.shape) summaryList.push(`Shape: ${rawSel.shape}`);
    if (rawSel.combination) summaryList.push(`Combo: ${rawSel.combination}`);

    // If summaryList is empty but raw extracted.colors has items (without old generic placeholders), use them
    if (summaryList.length === 0 && Array.isArray(extracted.colors) && extracted.colors.length > 0) {
      extracted.colors.forEach((c) => {
        if (c && !c.toLowerCase().includes('factory original') && !c.toLowerCase().includes('standard edition')) {
          summaryList.push(c);
        }
      });
    }

    const hasSelectedFeatures = extracted.hasSelectedFeatures !== undefined
      ? Boolean(extracted.hasSelectedFeatures && summaryList.length > 0)
      : summaryList.length > 0;

    const selectedFeatures = {
      color: rawSel.color || null,
      size: rawSel.size || null,
      model: rawSel.model || null,
      style: rawSel.style || null,
      shape: rawSel.shape || null,
      combination: rawSel.combination || null,
      rawSelectedText: rawSel.rawSelectedText || null,
      summaryList: hasSelectedFeatures ? summaryList : [],
    };

    const productName = extracted.productName?.trim() || 'Chinese E-Commerce Sourced Product';

    // Normalize bounding box to 0-100 percentage range
    const rawBox = extracted.boundingBoxForProductImage;
    const boundingBox = normalizeBoundingBox(rawBox);

    const platform = (extracted.platform as any) || '1688';

    return NextResponse.json({
      productName,
      hasSelectedFeatures,
      selectedFeatures,
      colors: hasSelectedFeatures ? summaryList : [],
      priceCNY,
      baseWeightKg,
      boundingBoxForProductImage: boundingBox,
      // Custom business logic calculations
      exchangeRate,
      priceBDT,
      finalWeightKg,
      finalWeightGm,
      platformDetected: platform,
      isAiPowered: isAiLive,
      modelUsed: usedModel,
      note: isAiLive 
        ? `Live extraction powered by Google Gemini Vision (${usedModel})` 
        : 'Mock fallback demonstration',
    });
  } catch (error: any) {
    console.error('Error analyzing screenshot:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while analyzing screenshot' },
      { status: 500 }
    );
  }
}

/**
 * Normalizes bounding box coordinates into [0, 100] percentage bounds.
 */
function normalizeBoundingBox(rawBox?: BoundingBox): BoundingBox {
  if (!rawBox || typeof rawBox.ymin !== 'number') {
    return { ymin: 10, xmin: 10, ymax: 60, xmax: 90 };
  }

  let { ymin, xmin, ymax, xmax } = rawBox;

  // If in 0-1 range
  if (ymax <= 1 && xmax <= 1) {
    ymin *= 100;
    xmin *= 100;
    ymax *= 100;
    xmax *= 100;
  } else if (ymax > 100 || xmax > 100) {
    // If in 0-1000 range
    ymin = (ymin / 1000) * 100;
    xmin = (xmin / 1000) * 100;
    ymax = (ymax / 1000) * 100;
    xmax = (xmax / 1000) * 100;
  }

  // Ensure validity
  ymin = Math.max(0, Math.min(ymin, 95));
  xmin = Math.max(0, Math.min(xmin, 95));
  ymax = Math.max(ymin + 5, Math.min(ymax, 100));
  xmax = Math.max(xmin + 5, Math.min(xmax, 100));

  return {
    ymin: Math.round(ymin),
    xmin: Math.round(xmin),
    ymax: Math.round(ymax),
    xmax: Math.round(xmax),
  };
}

/**
 * High-quality fallback for environments without an active Gemini API key.
 */
function generateSmartFallback(filename: string): RawGeminiExtraction {
  const lower = filename.toLowerCase();
  if (lower.includes('watch') || lower.includes('smart')) {
    return {
      productName: 'Ultra 8 NFC Smart Watch with HD AMOLED Display & Waterproof Strap',
      hasSelectedFeatures: true,
      selectedFeatures: {
        color: 'Midnight Black',
        model: 'Ultra 8 Series',
        combination: 'Standard 49mm + Orange Alpine Loop',
        rawSelectedText: '已选: 黑色 + 橙色高山回环表带',
      },
      colors: ['Color: Midnight Black', 'Model: Ultra 8 Series', 'Combo: 49mm + Orange Alpine Loop'],
      priceCNY: 48.0,
      baseWeightKg: 0.16,
      boundingBoxForProductImage: { ymin: 12, xmin: 15, ymax: 62, xmax: 85 },
      platform: '1688',
    };
  } else if (lower.includes('shoe') || lower.includes('sneaker')) {
    return {
      productName: 'Breathable Lightweight Running Shoes Anti-Slip Sports Sneakers',
      hasSelectedFeatures: true,
      selectedFeatures: {
        color: 'Triple Black',
        size: '43 EU',
        rawSelectedText: '已选: 纯黑透气款, 43码',
      },
      colors: ['Color: Triple Black', 'Size: 43 EU'],
      priceCNY: 65.0,
      baseWeightKg: 0.75,
      boundingBoxForProductImage: { ymin: 15, xmin: 10, ymax: 68, xmax: 90 },
      platform: 'Pinduoduo',
    };
  }

  // If screenshot does not indicate specific selected options
  return {
    productName: 'Multi-functional High Quality Consumer Electronics & Sourcing Item',
    hasSelectedFeatures: false,
    selectedFeatures: {
      color: null,
      size: null,
      model: null,
      style: null,
      shape: null,
      combination: null,
      rawSelectedText: null,
    },
    colors: [],
    priceCNY: 45.5,
    baseWeightKg: null,
    boundingBoxForProductImage: { ymin: 12, xmin: 12, ymax: 60, xmax: 88 },
    platform: '1688',
  };
}
