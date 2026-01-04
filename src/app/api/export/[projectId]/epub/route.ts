import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth'; // Correct NextAuth v5 import
import dbConnect from '@/lib/mongodb'; // Correct DB import
import Project from '@/models/Project';
import File from '@/models/File';
import path from 'path';
import fs from 'fs';
import os from 'os';

// epub-gen doesn't have proper typescript types, so we require it
const Epub = require('epub-gen');

export const runtime = 'nodejs'; // Enforce Node.js runtime for file system usage

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ projectId: string }> }
): Promise<NextResponse> {
    const { projectId } = await context.params;
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        const project = await Project.findOne({
            _id: projectId,
            userId: session.user.id
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Fetch all files (excluding system folders like Sandbox/Extras for the book)
        const files = await File.find({
            projectId: projectId,
            isSystem: { $ne: true } // Exclude system folders
        }).sort({ order: 1 });

        // Structure Content
        // Strategy: 
        // 1. Find Root Folders (Chapters)
        // 2. Find Files inside those folders (Scenes)
        // 3. Find Root Files (Unorganized Scenes - maybe treat as Prologue/Epilogue or loose chapters)

        const content: any[] = [];

        // Helper to process a file node into HTML
        const processScene = (file: any) => {
            // Simple HTML construction. 
            // In a real app, we might want to convert Delta/Markdown to HTML if stored that way.
            // Assuming content is stored as plain text or simple HTML in `content` field.
            // If it's pure text, we wrap in paragraphs.
            let htmlContent = file.content || '';

            // Basic text-to-html formatter if content looks like plain text
            if (!htmlContent.includes('<p>')) {
                htmlContent = htmlContent.split('\n').map((line: string) => `<p>${line}</p>`).join('');
            }

            return {
                title: file.title,
                data: `<h2>${file.title}</h2>${htmlContent}`
            };
        };

        const rootFolders = files.filter(f => f.type === 'folder' && !f.parent);
        const rootFiles = files.filter(f => f.type === 'file' && !f.parent);

        // Add Root Files first (Prologues?)
        rootFiles.forEach(f => {
            content.push(processScene(f));
        });

        // Add Chapters
        rootFolders.forEach(folder => {
            const folderScenes = files.filter(f => f.parent && f.parent.toString() === folder._id.toString() && f.type === 'file');
            folderScenes.sort((a, b) => (a.order || 0) - (b.order || 0));

            // If folder has scenes, add them. 
            // We can treat the Folder Title as a Section Header, or just add scenes sequentially.
            // Valid ePub structure usually flattens specific chapters.

            // Option: Add a "Chapter Title" page
            content.push({
                title: folder.title,
                data: `<h1 style="text-align:center; margin-top: 30%;">${folder.title}</h1>`
            });

            folderScenes.forEach(scene => {
                content.push(processScene(scene));
            });
        });

        const options = {
            title: project.title,
            author: project.settings?.author || "Autor Desconocido",
            publisher: "Arcano Writer",
            version: 3, // ePub version handling
            content: content
        };

        // Generate Temp File
        const tempDir = os.tmpdir();
        const fileName = `arcano-export-${project._id}-${Date.now()}.epub`;
        const tempPath = path.join(tempDir, fileName);

        await new Epub(options, tempPath).promise;

        // Read and Stream
        const fileBuffer = fs.readFileSync(tempPath);

        // Cleanup
        fs.unlinkSync(tempPath);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/epub+zip',
                'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.epub"`
            }
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
