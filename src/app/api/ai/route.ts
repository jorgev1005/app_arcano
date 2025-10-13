import openai from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const { prompt, type } = await request.json();

    let systemPrompt = '';

    if (type === 'character') {
      systemPrompt = 'Generate a detailed character description for a story.';
    } else if (type === 'environment') {
      systemPrompt = 'Describe a vivid environment or setting for a story.';
    } else {
      systemPrompt = 'Provide creative writing assistance.';
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    const result = response.choices[0].message.content;

    return Response.json({ result });
  } catch (error) {
    console.error('Error with AI:', error);
    return Response.json({ error: 'Error con la IA' }, { status: 500 });
  }
}