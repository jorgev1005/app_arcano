import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import File from '@/models/File';
import { auth } from '@/auth';

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

        await dbConnect();

        // 1. Fetch Project
        const project = await Project.findById(params.id);
        if (!project) {
            return Response.json({ error: 'Proyecto no encontrado' }, { status: 404 });
        }

        // 2. Fetch Files
        const files = await File.find({ project: params.id }).sort({ order: 1 });

        // 3. Construct Export Data
        const exportData = {
            meta: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                user: session.user.email
            },
            project: project,
            files: files
        };

        // 4. Return as Downloadable JSON
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup_${dateStr}.json"`
            }
        });

    } catch (error) {
        console.error('Error exporting project:', error);
        return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
