import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';
import { auth } from '@/auth';
import mongoose from 'mongoose';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();

  const body = await request.json();
  const { id } = await params;

  console.log('API PUT receiving update for:', id);
  console.log('Payload:', body);

  // Ideally verify file belongs to user's project
  let updateData = { ...body };
  if (body.parent === null) {
    updateData = { ...body, parent: null }; // Ensure null is passed
    // Or use $unset if needed, but lets try forcing explicit null first or use $set: { parent: null } works in mongoose usually
  }

  console.log('Update Data for DB:', updateData);

  const file = await File.findByIdAndUpdate(id, updateData, { new: true });
  console.log('Updated file result:', file);

  return Response.json({ file });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  try {
    const file = await File.findByIdAndDelete(id);
    if (!file) {
      return Response.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }
    return Response.json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return Response.json({ error: 'Error al eliminar archivo' }, { status: 500 });
  }
}