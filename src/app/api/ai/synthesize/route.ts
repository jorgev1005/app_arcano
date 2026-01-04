import genAI from '@/lib/gemini';
import { auth } from '@/auth';

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const { ideas, length = 'medium' } = await request.json();

        if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
            return Response.json({ error: 'Se requieren ideas para sintetizar.' }, { status: 400 });
        }

        const systemInstruction = `
        Eres un "Tejedor Narrativo" (Narrative Weaver). Tu tarea es tomar fragmentos de ideas, notas sueltas o conceptos desconectados y tejerlos en una sinopsis narrativa coherente y emocionante.
        
        INSTRUCCIONES:
        1. Analiza los fragmentos proporcionados.
        2. Encuentra hilos conductores, temáticas comunes o relaciones causa-efecto potenciales.
        3. Genera un texto que integre estas ideas en una escena o resumen de historia fluido.
           - Longitud deseada: ${length.toUpperCase()} (${length === 'short' ? '100-200' : length === 'long' ? '500-800' : '300-500'} palabras aprox).
        4. No enumeres las ideas en el texto principal, NÁRRALAS.
        5. Si hay contradicciones, resuélvelas creativamente.
        6. AL FINAL DEL TEXTO, agrega un pie de página titulado "\n\n### 📝 Referencia de Ideas" listando brevemente qué ideas inspiraron qué parte (o simplemente enumerando las fuentes originales de forma resumida).
        7. Responde SIEMPRE en Español.
    `;

        const fragmentsText = ideas.map((idea, index) => `Fragmento ${index + 1}: "${idea}"`).join('\n');
        const fullPrompt = `${systemInstruction}\n\nIDEAS A CONECTAR:\n${fragmentsText}`;

        if (!process.env.GOOGLE_API_KEY) {
            // Mock Response
            await new Promise(r => setTimeout(r, 1000));
            return Response.json({ result: "Simulación (Sin API Key): Las ideas convergen en un punto donde el protagonista descubre que el artefacto perdido era, en realidad, una llave para su propio pasado..." });
        }

        // Use the same model as the main route
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log('Synthesizing ideas with Gemini...');
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return Response.json({ result: text });

    } catch (error: any) {
        console.error('Error synthesizing:', error);
        return Response.json({ error: error.message || 'Error al generar síntesis' }, { status: 500 });
    }
}
