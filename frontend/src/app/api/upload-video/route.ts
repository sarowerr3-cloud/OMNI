import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const targetPath = path.join(publicDir, 'intro.mp4');

    fs.writeFileSync(targetPath, buffer);

    return NextResponse.json({
      success: true,
      message: 'Custom video saved as default permanent video',
      url: `/intro.mp4?v=${Date.now()}`,
    });
  } catch (error: any) {
    console.error('Error saving custom video:', error);
    return NextResponse.json({ error: error.message || 'Failed to save video' }, { status: 500 });
  }
}
