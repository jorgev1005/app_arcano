import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();

  const { content, notes, synopsis, status } = await request.json();

  const file = await File.findByIdAndUpdate(params.id, { content, notes, synopsis, status }, { new: true });

  return Response.json({ file });
}