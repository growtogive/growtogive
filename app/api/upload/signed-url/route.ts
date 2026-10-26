// app/api/upload/signed-url/route.ts
import { NextResponse } from 'next/server';
import { bucket } from '@/lib/gcs';

export async function POST(request: Request) {
  try {
    const { filename, fileType } = await request.json();

    if (!filename || !fileType) {
      return NextResponse.json(
        { error: 'Filename and fileType are required' },
        { status: 400 }
      );
    }

    // Create a unique file name to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const destination = `listings/videos/${uniqueSuffix}-${sanitizedFilename}`;

    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
      contentType: fileType,
    };

    // Generate GCS signed upload URL
    const [signedUrl] = await bucket.file(destination).getSignedUrl(options);
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    return NextResponse.json({ signedUrl, publicUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Signed URL Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL', details: error.message },
      { status: 500 }
    );
  }
}