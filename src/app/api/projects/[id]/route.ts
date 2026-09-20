import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import File from '@/models/File';
import { auth } from '@/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    try {
        const project = await Project.findOne({ _id: id, user: session.user.id });
        if (!project) {
            return Response.json({ error: 'Proyecto no encontrado o no autorizado' }, { status: 404 });
        }

        return Response.json({ project });
    } catch (error) {
        console.error('Error fetching project:', error);
        return Response.json({ error: 'Error al obtener proyecto' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    try {
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

        // Borrado en cascada para evitar archivos huérfanos
        await File.deleteMany({ project: id });

        return Response.json({ message: 'Proyecto y sus archivos eliminados correctamente' });
    } catch (error) {
        console.error('Error deleting project:', error);
        return Response.json({ error: 'Error interno' }, { status: 500 });
    }
}
