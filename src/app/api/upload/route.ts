import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '');

        // Save to public/uploads
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const path = join(uploadDir, filename);

        await writeFile(path, buffer);

        const url = `/uploads/${filename}`;

        return NextResponse.json({ url, name: file.name, type: file.type });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
    }
}
