import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import File from '@/models/File';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const projects = await Project.find({ user: session.user.id });
    return Response.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
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
    const { title, description, settings, coverImage } = await request.json();
    const project = new Project({
      title,
      user: session.user.id,
      description,
      settings,
      coverImage
    });
    await project.save();

    // Crear carpetas de sistema por defecto para el proyecto
    await File.create([
      {
        title: 'Extras',
        project: project._id,
        type: 'folder',
        parent: null,
        isSystem: true,
        order: 998
      },
      {
        title: 'Sandbox',
        project: project._id,
        type: 'folder',
        parent: null,
        isSystem: true,
        order: 999
      }
    ]);

    return Response.json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}