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

interface RawGeminiExtraction {
  productName?: string;
  colors?: string[];
  priceCNY?: number;
  baseWeightKg?: number | null;
  boundingBoxForProductImage?: BoundingBox;
  platform?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert AI sourcing vision analyst for Chinese e-commerce platforms (1688.com, AliExpress, Pinduoduo, Taobao).
Analyze the provided product screenshot and extract structured information with extreme accuracy.

REQUIREMENTS:
1. "productName": Translate the Chinese or foreign product title into a clear, attractive, professional English product title. Filter out spammy promotional keywords (such as "工厂直销", "跨境热销", "一件代发") and keep the real product title and key features.
2. "colors": Extract all visible color, model, or style variants shown in the screenshot (look at SKU selectors, thumbnail swatches, or options like 颜色/规格), translated into English as a list of strings (e.g. ["Midnight Black", "Starlight Silver", "Alpine Green"]).
3. "priceCNY": Extract the original item price in Chinese Yuan (CNY / RMB ¥).
   - Look for prices marked with '¥', '元', or 'RMB'.
   - If a wholesale tiered price is shown (e.g. "2-99件 ¥42.00", ">=100件 ¥38.00"), extract the single or primary unit purchase price.
   - Return as a clean number (e.g. 45.5).
   - If only USD or another currency is visible, convert or estimate the equivalent CNY.
4. "baseWeightKg": Extract the base product weight in kilograms (kg) ONLY if it is explicitly written or shown in the screenshot (look in specs, parameter table, packaging details, or title: e.g. "重量", "单件重量", "毛重", "净重", "500g" -> 0.5, "350克" -> 0.35, "1.2kg" -> 1.2).
   - CRITICAL RULE: If the weight is NOT explicitly written or found anywhere on the screenshot, you MUST return null. Do NOT guess, do NOT estimate based on product type, and do NOT provide any default or automatic base weight.
   - Return either a positive number in kg (e.g. 0.5) OR null.
5. "boundingBoxForProductImage": Detect the bounding box for the main primary product showcase photo/thumbnail in the screenshot (excluding unrelated ads, reviews, or bottom navigation).
   - Coordinates must be numbers from 0 to 100 representing percentage coordinates:
     { "ymin": 0 to 100, "xmin": 0 to 100, "ymax": 0 to 100, "xmax": 0 to 100 }
6. "platform": Detect the source platform: "1688", "AliExpress", "Pinduoduo", "Taobao", or "Other".

You MUST strictly return a valid JSON object matching this schema:
{
  "productName": "Translated English name of the product",
  "colors": ["Color 1 in English", "Color 2 in English"],
  "priceCNY": 45.50,
  "baseWeightKg": null,
  "boundingBoxForProductImage": {
    "ymin": 12,
    "xmin": 8,
    "ymax": 58,
    "xmax": 92
  },
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
    const exchangeRate = Number(rateParam) > 0 ? Number(rateParam) : 17.5;

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

    const colors = Array.isArray(extracted.colors) && extracted.colors.length > 0 
      ? extracted.colors 
      : ['Standard / Factory Original'];

    const productName = extracted.productName?.trim() || 'Chinese E-Commerce Sourced Product';

    // Normalize bounding box to 0-100 percentage range
    const rawBox = extracted.boundingBoxForProductImage;
    const boundingBox = normalizeBoundingBox(rawBox);

    const platform = (extracted.platform as any) || '1688';

    return NextResponse.json({
      productName,
      colors,
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
      colors: ['Space Gray', 'Starlight Silver', 'Alpine Orange', 'Midnight Black'],
      priceCNY: 48.0,
      baseWeightKg: 0.16,
      boundingBoxForProductImage: { ymin: 12, xmin: 15, ymax: 62, xmax: 85 },
      platform: '1688',
    };
  } else if (lower.includes('shoe') || lower.includes('sneaker')) {
    return {
      productName: 'Breathable Lightweight Running Shoes Anti-Slip Sports Sneakers',
      colors: ['Triple Black', 'Pure White', 'Slate Gray', 'Navy Blue'],
      priceCNY: 65.0,
      baseWeightKg: 0.75,
      boundingBoxForProductImage: { ymin: 15, xmin: 10, ymax: 68, xmax: 90 },
      platform: 'Pinduoduo',
    };
  } else if (lower.includes('headphone') || lower.includes('earphone') || lower.includes('audio')) {
    return {
      productName: 'Active Noise Cancelling Wireless Bluetooth Headphones with HiFi Audio',
      colors: ['Matte Black', 'Pearl White', 'Rose Gold'],
      priceCNY: 52.5,
      baseWeightKg: 0.32,
      boundingBoxForProductImage: { ymin: 10, xmin: 18, ymax: 64, xmax: 82 },
      platform: 'AliExpress',
    };
  }

  return {
    productName: 'Multi-functional High Quality Consumer Electronics & Sourcing Item',
    colors: ['Obsidian Black', 'Titanium Silver', 'Crystal Blue'],
    priceCNY: 45.5,
    baseWeightKg: null,
    boundingBoxForProductImage: { ymin: 12, xmin: 12, ymax: 60, xmax: 88 },
    platform: '1688',
  };
}
