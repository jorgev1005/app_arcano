import dbConnect from '@/lib/mongodb';
import File from '@/models/File';
import Project from '@/models/Project';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return Response.json({ error: 'Falta projectId' }, { status: 400 });
    }

    // Validar que el proyecto pertenezca al usuario autenticado
    const project = await Project.findOne({ _id: projectId, user: session.user.id });
    if (!project) {
      return Response.json({ error: 'Proyecto no encontrado o no autorizado' }, { status: 404 });
    }

    const files = await File.find({ project: projectId }).sort({ order: 1, createdAt: 1 });
    return Response.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const { title, projectId, type, parent, isSystem, status } = await request.json();

    if (!projectId) {
      return Response.json({ error: 'Falta projectId' }, { status: 400 });
    }

    // Validar que el proyecto pertenezca al usuario autenticado
    const project = await Project.findOne({ _id: projectId, user: session.user.id });
    if (!project) {
      return Response.json({ error: 'Proyecto no encontrado o no autorizado' }, { status: 404 });
    }

    // Get max order to append to end
    const lastFile = await File.findOne({ project: projectId }).sort({ order: -1 });
    const order = lastFile ? lastFile.order + 1 : 0;

    const file = new File({ title, project: projectId, type, parent, order, isSystem, status });
    await file.save();
    return Response.json({ file });
  } catch (error) {
    console.error('Error creating file:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    if (Array.isArray(body)) {
      if (body.length === 0) {
        return Response.json({ success: true });
      }

      // Validar que el archivo pertenezca a un proyecto del usuario
      const sampleFile = await File.findById(body[0]._id);
      if (!sampleFile) {
        return Response.json({ error: 'Archivo no encontrado' }, { status: 404 });
      }

      const project = await Project.findOne({ _id: sampleFile.project, user: session.user.id });
      if (!project) {
        return Response.json({ error: 'No autorizado' }, { status: 403 });
      }

      // Batch update for reordering
      const updates = body.map((file: any, index: number) => {
        const updateDoc: any = { order: index }; // Always sync order
        if (file.title) updateDoc.title = file.title;
        if (file.parent !== undefined) updateDoc.parent = file.parent; // Allow bulk moving

        return {
          updateOne: {
            filter: { _id: file._id, project: sampleFile.project },
            update: { $set: updateDoc }
          }
        };
      });
      await File.bulkWrite(updates);
      return Response.json({ success: true });
    } else {
      return Response.json({ error: 'Use /api/files/[id] for single updates' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating files:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}