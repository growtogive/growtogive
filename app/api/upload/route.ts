import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique file name to prevent naming collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filepath = path.join(process.cwd(), 'public/uploads', filename);

    // Save file to public/uploads folder
    await writeFile(filepath, buffer);

    // Return the accessible public URL path
    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: fileUrl }, { status: 201 });
  } catch (error: any) {
    console.error('File Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload image', details: error.message }, { status: 500 });
  }
}