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
  isProductScreenshot?: boolean;
  productName?: string | null;
  hasSelectedFeatures?: boolean;
  selectedFeatures?: RawSelectedFeatures | null;
  colors?: string[];
  priceCNY?: number | null;
  baseWeightKg?: number | null;
  boundingBoxForProductImage?: BoundingBox | null;
  platform?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert AI sourcing vision analyst for Chinese e-commerce platforms (1688.com, AliExpress, Pinduoduo, Taobao, Weidian).
Analyze the provided image and extract structured information with extreme accuracy and ZERO hallucination or fabrication.

CRITICAL NON-PRODUCT / RANDOM IMAGE DETECTION RULE:
- First, evaluate whether the provided image is genuinely an e-commerce product screenshot or product listing page (such as 1688, Taobao, Pinduoduo, AliExpress, or similar online shop).
- If the image is NOT an e-commerce product screenshot (for example: a personal photo, scenery, random document, meme, chart, app UI, receipt without product details, or unrelated graphic):
  * "isProductScreenshot": false
  * "productName": "No data found"
  * "hasSelectedFeatures": false
  * "selectedFeatures": null
  * "colors": []
  * "priceCNY": null
  * "baseWeightKg": null
  * "boundingBoxForProductImage": null
  * "platform": "Other"
  * Return this immediately without fabricating any product, price, or details!

CRITICAL PRICE EXTRACTION RULE (ABSOLUTE NO FABRICATION):
- ONLY extract "priceCNY" if a specific price in Chinese Yuan (¥ / RMB) or unit price is CLEARLY and EXPLICITLY visible on the screenshot.
- Look for numeric values adjacent to "¥", "￥", "RMB", "元", or in the primary price display block.
- If no price is visibly shown or legible on the screenshot, you MUST set "priceCNY": null.
- NEVER invent, estimate, guess, or default to any price! If missing, return null.

CRITICAL PRODUCT TITLE / NAME RULE:
- "productName": Extract and translate the product title into clear, attractive, professional English. Remove spammy supplier keywords ("工厂直销", "跨境热销", "一件代发").
- If there is NO visible product title, or the image is not a product, return "No data found". NEVER invent or assume a product title.

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

STRICT NEGATIVE RULE FOR FEATURES:
- If NO feature is selected, highlighted, or indicated in the screenshot (for instance, the screenshot only shows the main product photo, title, or all option chips are unselected/inactive):
  * "hasSelectedFeatures" MUST be false.
  * "selectedFeatures" fields (color, size, model, style, shape, combination) MUST all be null.
  * "colors" MUST be an empty array [].
  * Do NOT invent, assume, or default to any variant!

OTHER FIELDS:
- "baseWeightKg": Extract the base product weight in kilograms ONLY if explicitly printed on the screenshot (e.g. "重量", "单件重量", "毛重", "500g" -> 0.5, "350克" -> 0.35, "1.2kg" -> 1.2). If NOT written anywhere on the image, you MUST return null.
- "boundingBoxForProductImage": Bounding box coordinates {ymin, xmin, ymax, xmax} in 0-100 percentage for the primary product showcase photo. If no product photo is present, return null.
- "platform": Detect "1688", "AliExpress", "Pinduoduo", "Taobao", or "Other".

You MUST strictly return a valid JSON object matching this schema:
{
  "isProductScreenshot": true,
  "productName": "English title or No data found",
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

      // Fallback model chain prioritizing active, high-speed vision models
      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-3-flash-preview',
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-flash-latest',
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

            if (extracted && (extracted.isProductScreenshot !== undefined || extracted.productName || extracted.priceCNY !== undefined)) {
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
      console.warn('GEMINI_API_KEY is not configured. Returning zero-hallucination mock extraction.');
      extracted = generateSmartFallback(file.name);
    }

    // Business Logic Calculations (Zero Fabrication / Strict Verification)
    const isProduct = extracted.isProductScreenshot !== false &&
      Boolean(extracted.productName && extracted.productName.trim().toLowerCase() !== 'no data found');

    // Price Calculation: ONLY accept explicit positive numbers; do NOT fallback to 45.5!
    const priceCNY = (isProduct && typeof extracted.priceCNY === 'number' && extracted.priceCNY > 0)
      ? extracted.priceCNY
      : null;
    const priceBDT = priceCNY !== null
      ? Math.round(priceCNY * exchangeRate * 100) / 100
      : null;

    // Weight Calculation:
    // Only extract and calculate weight if explicitly identified in the screenshot.
    // If not found, leave baseWeightKg, finalWeightKg, and finalWeightGm as null so the form field remains empty for manual input.
    const baseWeightKg: number | null = (isProduct && typeof extracted.baseWeightKg === 'number' && extracted.baseWeightKg > 0)
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
    if (isProduct) {
      if (rawSel.color) summaryList.push(`Color: ${rawSel.color}`);
      if (rawSel.size) summaryList.push(`Size: ${rawSel.size}`);
      if (rawSel.model) summaryList.push(`Model: ${rawSel.model}`);
      if (rawSel.style) summaryList.push(`Style: ${rawSel.style}`);
      if (rawSel.shape) summaryList.push(`Shape: ${rawSel.shape}`);
      if (rawSel.combination) summaryList.push(`Combo: ${rawSel.combination}`);

      // If summaryList is empty but raw extracted.colors has items (without generic placeholders), use them
      if (summaryList.length === 0 && Array.isArray(extracted.colors) && extracted.colors.length > 0) {
        extracted.colors.forEach((c) => {
          if (c && !c.toLowerCase().includes('factory original') && !c.toLowerCase().includes('standard edition') && !c.toLowerCase().includes('no features')) {
            summaryList.push(c);
          }
        });
      }
    }

    const hasSelectedFeatures = isProduct && extracted.hasSelectedFeatures !== undefined
      ? Boolean(extracted.hasSelectedFeatures && summaryList.length > 0)
      : Boolean(isProduct && summaryList.length > 0);

    const selectedFeatures = {
      color: isProduct ? (rawSel.color || null) : null,
      size: isProduct ? (rawSel.size || null) : null,
      model: isProduct ? (rawSel.model || null) : null,
      style: isProduct ? (rawSel.style || null) : null,
      shape: isProduct ? (rawSel.shape || null) : null,
      combination: isProduct ? (rawSel.combination || null) : null,
      rawSelectedText: isProduct ? (rawSel.rawSelectedText || null) : null,
      summaryList: hasSelectedFeatures ? summaryList : [],
    };

    const productName = isProduct
      ? (extracted.productName?.trim() || 'No data found')
      : 'No data found';

    // Normalize bounding box to 0-100 percentage range (only if real product photo detected)
    const rawBox = isProduct ? extracted.boundingBoxForProductImage : undefined;
    const boundingBox = rawBox ? normalizeBoundingBox(rawBox) : undefined;

    const platform = (extracted.platform as any) || (isProduct ? '1688' : 'Other');

    return NextResponse.json({
      isProductScreenshot: isProduct,
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
        : 'Zero-hallucination safe extraction',
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
 * Zero-hallucination fallback when AI models are unavailable or unconfigured.
 * Strictly returns "No data found" and null price to prevent fabricated data.
 */
function generateSmartFallback(filename: string): RawGeminiExtraction {
  return {
    isProductScreenshot: false,
    productName: 'No data found',
    hasSelectedFeatures: false,
    selectedFeatures: null,
    colors: [],
    priceCNY: null,
    baseWeightKg: null,
    boundingBoxForProductImage: null,
    platform: 'Other',
  };
}
