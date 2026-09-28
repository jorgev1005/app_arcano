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
    // Si el ID no es un ObjectId válido de 24 hex (ej: proviene de un temp_file_ creado offline)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      // Buscar el proyecto del usuario
      const projectQuery: any = { user: session.user.id };
      if (body.projectId) {
        projectQuery._id = body.projectId;
      }
      let project = await Project.findOne(projectQuery);
      if (!project) {
        project = await Project.findOne({ user: session.user.id });
      }
      if (!project) {
        return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      // Rescatar y crear la escena en MongoDB para no perder ningún texto redactado offline
      const lastFile = await File.findOne({ project: project._id }).sort({ order: -1 });
      const order = lastFile ? lastFile.order + 1 : 0;

      const newFile = new File({
        title: body.title || 'Nueva Escena',
        project: project._id,
        type: body.type || 'file',
        parent: body.parent || null,
        content: body.content || '',
        wordCount: body.wordCount || 0,
        order,
        status: body.status || 'draft',
        sceneData: body.sceneData,
        timeData: body.timeData,
        synopsis: body.synopsis,
        customData: body.customData,
        attachments: body.attachments,
        links: body.links
      });
      await newFile.save();
      console.log(`[Auto-Rescue] Escena temporal ${id} guardada con éxito en MongoDB como ${newFile._id}`);
      return Response.json({ file: newFile, rescuedFromTemp: id });
    }

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
    // Si era un ID temporal descartar sin error 500
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return Response.json({ message: 'Archivo temporal descartado correctamente' });
    }

    const existingFile = await File.findById(id);
    if (!existingFile) {
      return Response.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

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