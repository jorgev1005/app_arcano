import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import File from '@/models/File';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return Response.json({ error: 'No autorizado' }, { status: 401 });
        }

        const data = await request.json();
        const { project, files } = data;

        if (!project || !Array.isArray(files)) {
            return Response.json({ error: 'Formato de archivo inválido' }, { status: 400 });
        }

        await dbConnect();

        // 1. Create New Project
        // We strip the _id to let Mongo generate a new one, ensuring no collisions
        // We keep the original title (maybe appends (Imported) optional? lets keep it simple first)
        const newProject = new Project({
            title: project.title + ' (Importado)',
            description: project.description,
            user: session.user.id, // Assign to CURRENT user
            settings: project.settings,
            coverImage: project.coverImage,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const savedProject = await newProject.save();
        const newProjectId = savedProject._id.toString();

        // 2. Map Old File IDs to New File IDs
        const idMap = new Map<string, string>();

        // Pre-generate IDs for all files so we can map parents correctly
        const filesToCreate = files.map((f: any) => {
            // Generate a new ID for this file
            // We can't use 'new File()' yet if we want bulk insert, 
            // but we need the ID for mapping. 
            // Let's do it iteratively or use just object mapping strings.
            // Actually, best way is to insert one by one or create instances.
            // Let's create instances to get _ids.
            const fileDoc = new File({
                project: newProjectId,
                title: f.title,
                type: f.type,
                content: f.content || '',
                synopsis: f.synopsis || '',
                customData: f.customData || {},
                tags: f.tags || [],
                isOpen: false,
                order: f.order || 0,
                wordCount: f.wordCount || 0,
                attachments: f.attachments || []
            });
            idMap.set(f._id, fileDoc._id.toString());
            return { original: f, doc: fileDoc };
        });

        // 3. Fix Parent References
        const finalDocs = filesToCreate.map(({ original, doc }: any) => {
            if (original.parent && idMap.has(original.parent)) {
                doc.parent = idMap.get(original.parent);
            } else {
                doc.parent = null; // Root if parent not found or was root
            }
            return doc;
        });

        // 4. Save All Files
        // Using save() in loop to ensure validation logic runs if any
        for (const doc of finalDocs) {
            await doc.save();
        }

        return Response.json({ project: savedProject });

    } catch (error) {
        console.error('Error importing project:', error);
        return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
