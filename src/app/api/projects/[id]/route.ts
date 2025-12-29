import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { auth } from '@/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    try {
        // Ideally verify project belongs to user
        const project = await Project.findOneAndUpdate(
            { _id: id, user: session.user.id }, // Ensure ownership
            { $set: body },
            { new: true }
        );

        if (!project) {
            return Response.json({ error: 'Proyecto no encontrado o no autorizado' }, { status: 404 });
        }

        return Response.json({ project });
    } catch (error) {
        console.error('Error updating project:', error);
        return Response.json({ error: 'Error al actualizar proyecto', details: (error as Error).message }, { status: 500 });
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
        const project = await Project.findOneAndDelete({ _id: id, user: session.user.id });

        if (!project) {
            return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 });
        }

        // TODO: Delete all files associated with this project to avoid orphans
        // await File.deleteMany({ project: id }); 

        return Response.json({ message: 'Proyecto eliminado' });
    } catch (error) {
        console.error('Error deleting project:', error);
        return Response.json({ error: 'Error interno' }, { status: 500 });
    }
}
