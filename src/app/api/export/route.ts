import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

export async function POST(request: NextRequest) {
  await dbConnect();

  const { projectId } = await request.json();

  const files = await File.find({ project: projectId, type: 'file' });

  let html = '<html><body><h1>Proyecto Arcano</h1>';

  files.forEach(file => {
    html += `<h2>${file.title}</h2><p>${file.content}</p>`;
  });

  html += '</body></html>';

  const htmlPdfModule = await import('html-pdf');
  const htmlPdf = htmlPdfModule.default ?? htmlPdfModule;

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    htmlPdf.create(html).toBuffer((err: Error | null, buffer: Buffer) => {
      if (err || !buffer) {
        reject(err ?? new Error('No se pudo generar el PDF'));
      } else {
        resolve(buffer);
      }
    });
  });

  const pdfUint8Array = new Uint8Array(pdfBuffer);

  return new Response(pdfUint8Array, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="proyecto.pdf"',
    },
  });
}