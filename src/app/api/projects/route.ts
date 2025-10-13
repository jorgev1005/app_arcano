import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const projects = await Project.find({}).populate('user');
    return Response.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { title, userId, description } = await request.json();
    const project = new Project({ title, user: userId, description });
    await project.save();
    return Response.json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}