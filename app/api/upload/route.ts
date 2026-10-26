// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Initialize GCS supporting Local root keyfile, Render Secret Files, environment variables, or default
let storage: Storage;
try {
  const localKeyPath = path.join(process.cwd(), 'gcs-key.json');
  
  // Checks local root first, then environment variable, then Render secret path
  const secretFileKeyPath = fs.existsSync(localKeyPath)
    ? localKeyPath
    : (process.env.GOOGLE_APPLICATION_CREDENTIALS || '/etc/secrets/gcs-key.json');

  if (fs.existsSync(secretFileKeyPath)) {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || 'media-gtg-website',
      keyFilename: secretFileKeyPath,
    });
  } else if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || 'media-gtg-website',
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });
  } else {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || 'media-gtg-website',
    });
  }
} catch (error) {
  console.error('Failed to initialize Google Cloud Storage:', error);
  storage = new Storage({ projectId: 'media-gtg-website' });
}

// Fixed bucket name based on your GCS error logs
const bucketName = process.env.GCS_BUCKET_NAME || 'media-gtg-website';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process and compress image with Sharp (resizes max width 1200px, WebP format at 80% quality)
    // Falls back to raw buffer if the file is not a valid image format for sharp
    let uploadBuffer = buffer;
    let contentType = file.type || 'image/webp';
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const fileName = `${Date.now()}-${baseName}.webp`;

    try {
      uploadBuffer = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      contentType = 'image/webp';
    } catch (sharpErr) {
      console.warn('Sharp processing skipped/failed, uploading original buffer:', sharpErr);
    }

    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('GCS Stream Error:', err);
        reject(err);
      });

      blobStream.on('finish', () => {
        resolve(true);
      });

      blobStream.end(uploadBuffer);
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (err: any) {
    console.error('GCS Upload Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}