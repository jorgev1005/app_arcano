
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { addWords } = await req.json();
        const { id } = await params;

        if (typeof addWords !== 'number') {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        await dbConnect();

        // 1. Get today's date key YYYY-MM-DD
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];

        // 2. Find Project
        const project = await Project.findOne({ _id: id, user: session.user.id });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // 3. Initialize stats structure if missing
        if (!project.stats) project.stats = {};
        if (!project.stats.dailyProgress) project.stats.dailyProgress = new Map();

        // 4. Update Progress
        const currentVal = project.stats.dailyProgress.get(dateKey) || 0;
        const newVal = Math.max(0, currentVal + addWords);

        const finalVal = Math.max(0, currentVal + addWords);

        project.stats.dailyProgress.set(dateKey, finalVal);
        project.markModified('stats');

        await project.save();

        return NextResponse.json({ success: true, newTotal: finalVal });
    } catch (error) {
        console.error('Error updating goals:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
