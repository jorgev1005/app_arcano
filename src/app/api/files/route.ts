import dbConnect from '@/lib/mongodb';
import File from '@/models/File';
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

    // Ideally check if project belongs to user here too, but for now just auth check
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
      // Batch update for reordering
      const updates = body.map((file: any, index: number) => {
        const updateDoc: any = { order: index }; // Always sync order
        if (file.title) updateDoc.title = file.title;
        if (file.parent !== undefined) updateDoc.parent = file.parent; // Allow bulk moving

        return {
          updateOne: {
            filter: { _id: file._id },
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