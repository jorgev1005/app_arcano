import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const files = await File.find({ project: projectId }).sort({ createdAt: 1 });
    return Response.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { title, projectId, type, parent } = await request.json();
    const file = new File({ title, project: projectId, type, parent });
    await file.save();
    return Response.json({ file });
  } catch (error) {
    console.error('Error creating file:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}