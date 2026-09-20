import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';
import Project from '@/models/Project';
import { auth } from '@/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();

  const body = await request.json();
  const { id } = await params;

  try {
    const existingFile = await File.findById(id);
    if (!existingFile) {
      return Response.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    // Validar que el archivo pertenezca a un proyecto del usuario en sesión
    const project = await Project.findOne({ _id: existingFile.project, user: session.user.id });
    if (!project) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    let updateData = { ...body };
    // Evitar alteración del campo project
    delete updateData.project;

    if (body.parent === null) {
      updateData = { ...body, parent: null };
    }

    const file = await File.findByIdAndUpdate(id, updateData, { new: true });
    return Response.json({ file });
  } catch (error) {
    console.error('Error updating file:', error);
    return Response.json({ error: 'Error al actualizar archivo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  try {
    const existingFile = await File.findById(id);
    if (!existingFile) {
      return Response.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    // Validar que el archivo pertenezca a un proyecto del usuario en sesión
    const project = await Project.findOne({ _id: existingFile.project, user: session.user.id });
    if (!project) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    await File.findByIdAndDelete(id);
    return Response.json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return Response.json({ error: 'Error al eliminar archivo' }, { status: 500 });
  }
}