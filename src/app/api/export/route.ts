import dbConnect from '@/lib/mongodb';
import File from '@/models/File';
import { compile } from 'html-pdf';

export async function POST(request: Request) {
  await dbConnect();

  const { projectId } = await request.json();

  const files = await File.find({ project: projectId, type: 'file' });

  let html = '<html><body><h1>Proyecto Arcano</h1>';

  files.forEach(file => {
    html += `<h2>${file.title}</h2><p>${file.content}</p>`;
  });

  html += '</body></html>';

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    compile(html, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="proyecto.pdf"',
    },
  });
}