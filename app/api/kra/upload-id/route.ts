import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const maxDuration = 30;

function matchesMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 12) return false;
  switch (mimeType) {
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    case 'image/webp':
      return (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'application/pdf':
      return buf.subarray(0, 5).toString('ascii') === '%PDF-';
    default:
      return false;
  }
}

function sanitizeFilename(name: string): string {
  const base = (name || 'id-document').split(/[\\/]/).pop() || 'id-document';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned || 'id-document';
}

/**
 * POST /api/kra/upload-id
 * Accepts an authenticated multipart form with a file field named "idImage".
 * Validates MIME type, magic bytes, and size in-memory with ZERO disk storage.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth().catch(() => ({ userId: null }));
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to upload ID documents.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('idImage') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload JPG, PNG, WEBP, or PDF.' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size === 0 || file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File must be between 1 byte and 5 MB.' },
        { status: 400 }
      );
    }

    // Zero disk storage policy: Process in-memory buffer and verify magic bytes
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: 'File content does not match the declared file format.' },
        { status: 400 }
      );
    }

    const safeName = sanitizeFilename(file.name);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      filename: safeName,
      dataUrl,
      filePath: null,
      message: 'ID document format validated in-memory. Zero server disk retention enforced.',
    });
  } catch (error: any) {
    log.error('[upload-id] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
