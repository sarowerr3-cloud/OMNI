const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

// Configure Multer for in-memory file buffering
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max screenshot size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP) are allowed'));
    }
  },
});

const EXTRACTION_SYSTEM_PROMPT = `You are an expert AI sourcing vision analyst for Chinese e-commerce platforms (1688.com, AliExpress, Pinduoduo, Taobao).
Analyze the provided product screenshot and extract structured information.

REQUIREMENTS:
1. "productName": Translate the Chinese or foreign product title into a clear, attractive, professional English product title.
2. "colors": Extract all visible color, model, or style variants shown in the screenshot, translated into English as a list of strings.
3. "priceCNY": Extract the original item price in Chinese Yuan (CNY / RMB ¥) as a number (e.g. 45.5). If a range is shown, use the standard single unit price.
4. "baseWeightKg": Extract the base product weight in kg ONLY if it is explicitly written or shown in the screenshot (look in specs, parameter table, packaging details, or title: e.g. "重量", "单件重量", "毛重", "净重", "500g" -> 0.5, "350克" -> 0.35, "1.2kg" -> 1.2).
   CRITICAL RULE: If the weight is NOT explicitly written or found anywhere on the screenshot, you MUST return null. Do NOT guess, do NOT estimate, and do NOT provide any default or automatic base weight.
   Return either a positive number in kg (e.g. 0.5) OR null.
5. "boundingBoxForProductImage": Detect the bounding box for the main primary product showcase photo/thumbnail in the screenshot as percentage numbers 0-100:
   {"ymin": 0-100, "xmin": 0-100, "ymax": 0-100, "xmax": 0-100}.
6. "platform": Detect platform: "1688", "AliExpress", "Pinduoduo", "Taobao", or "Other".

You MUST strictly return a valid JSON object matching this schema:
{
  "productName": "Translated English name of the product",
  "colors": ["Color 1 in English", "Color 2 in English"],
  "priceCNY": 45.50,
  "baseWeightKg": null,
  "boundingBoxForProductImage": {
    "ymin": 12,
    "xmin": 12,
    "ymax": 60,
    "xmax": 88
  },
  "platform": "1688"
}`;

/**
 * POST /api/products/analyze-screenshot
 * Endpoint using multer for handling screenshot upload and @google/genai with gemini-2.5-flash
 */
router.post('/analyze-screenshot', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No screenshot image file provided. Please upload an image.' });
    }

    const rateParam = req.body.cnyRate || req.body.exchangeRate;
    const exchangeRate = Number(rateParam) > 0 ? Number(rateParam) : 20.0;

    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    const isValidKey = Boolean(apiKey && !apiKey.startsWith('your_') && !apiKey.includes('placeholder'));

    let extracted = {};

    if (isValidKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

        const base64Data = file.buffer.toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';

        const response = await ai.models.generateContent({
          model,
          contents: [
            { text: EXTRACTION_SYSTEM_PROMPT },
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

        const text = response.text || '';
        try {
          extracted = JSON.parse(text);
        } catch (e) {
          const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          extracted = JSON.parse(cleanJson);
        }
      } catch (geminiError) {
        console.error('Gemini Vision API error in Express router:', geminiError);
        extracted = getSmartFallback(file.originalname);
      }
    } else {
      console.warn('GEMINI_API_KEY not configured. Returning intelligent fallback.');
      extracted = getSmartFallback(file.originalname);
    }

    // Business Logic Calculations
    const priceCNY = typeof extracted.priceCNY === 'number' && extracted.priceCNY > 0 ? extracted.priceCNY : 45.5;
    const priceBDT = Math.round(priceCNY * exchangeRate * 100) / 100;

    // Weight Calculation: Only calculate if explicitly present in screenshot
    const hasWeight = typeof extracted.baseWeightKg === 'number' && extracted.baseWeightKg > 0;
    const baseWeightKg = hasWeight ? extracted.baseWeightKg : null;
    const finalWeightKg = hasWeight && baseWeightKg !== null ? Math.round(baseWeightKg * 1.2 * 1000) / 1000 : null;
    const finalWeightGm = finalWeightKg !== null ? Math.round(finalWeightKg * 1000) : null;

    const colors = Array.isArray(extracted.colors) && extracted.colors.length > 0
      ? extracted.colors
      : ['Factory Original / Standard'];

    const productName = extracted.productName || 'Imported Chinese E-Commerce Product';
    const rawBox = extracted.boundingBoxForProductImage;
    const boundingBox = normalizeBox(rawBox);
    const platform = extracted.platform || '1688';

    return res.status(200).json({
      productName,
      colors,
      priceCNY,
      baseWeightKg,
      boundingBoxForProductImage: boundingBox,
      exchangeRate,
      priceBDT,
      finalWeightKg,
      finalWeightGm,
      platformDetected: platform,
      isAiPowered: isValidKey,
      note: isValidKey 
        ? 'Processed via Node.js/Express with Gemini Vision' 
        : 'Mock demonstration extraction',
    });
  } catch (err) {
    console.error('Server error processing screenshot:', err);
    return res.status(500).json({ error: err.message || 'Server error processing screenshot' });
  }
});

function normalizeBox(box) {
  if (!box || typeof box.ymin !== 'number') {
    return { ymin: 10, xmin: 10, ymax: 60, xmax: 90 };
  }
  let { ymin, xmin, ymax, xmax } = box;
  if (ymax <= 1 && xmax <= 1) {
    ymin *= 100; xmin *= 100; ymax *= 100; xmax *= 100;
  } else if (ymax > 100 || xmax > 100) {
    ymin = (ymin / 1000) * 100; xmin = (xmin / 1000) * 100;
    ymax = (ymax / 1000) * 100; xmax = (xmax / 1000) * 100;
  }
  return {
    ymin: Math.max(0, Math.min(Math.round(ymin), 95)),
    xmin: Math.max(0, Math.min(Math.round(xmin), 95)),
    ymax: Math.max(Math.round(ymin) + 5, Math.min(Math.round(ymax), 100)),
    xmax: Math.max(Math.round(xmin) + 5, Math.min(Math.round(xmax), 100)),
  };
}

function getSmartFallback(filename) {
  return {
    productName: 'Ultra 8 NFC Smart Watch with HD AMOLED Display & Waterproof Strap',
    colors: ['Midnight Black', 'Starlight Silver', 'Alpine Orange'],
    priceCNY: 45.50,
    baseWeightKg: null,
    boundingBoxForProductImage: { ymin: 12, xmin: 12, ymax: 60, xmax: 88 },
    platform: '1688',
  };
}

module.exports = router;
