import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const session = await auth();
        // Allow feedback even if session is missing? For now, let's track user if available, but allow anonymous if needed. 
        // User requested control so probably authenticated users mainly.

        const { type, message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        await dbConnect();

        const feedback = new Feedback({
            userId: session?.user?.id || 'anonymous',
            userEmail: session?.user?.email || 'anonymous',
            type: type || 'other',
            message,
        });

        await feedback.save();

        return NextResponse.json({ success: true, feedback }, { status: 201 });
    } catch (error) {
        console.error('Error saving feedback:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
