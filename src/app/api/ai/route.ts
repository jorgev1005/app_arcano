import genAI from '@/lib/gemini';
import { auth } from '@/auth';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { prompt, type } = await request.json();

    let systemInstruction = '';

    if (type === 'character') {
      systemInstruction = 'Eres un asistente experto en escritura creativa. Tu objetivo es ayudar al escritor a completar y profundizar sus ideas para PERSONAJES. Proporciona detalles sensoriales, motivaciones ocultas, defectos interesantes o trasfondos únicos basados ​​en la breve descripción del usuario. Responde siempre en Español.';
    } else if (type === 'location' || type === 'environment') {
      systemInstruction = 'Eres un asistente experto en escritura creativa. Tu objetivo es ayudar al escritor a describir LUGARES y AMBIENTES. Enfócate en la atmósfera, el clima, los olores, los sonidos y detalles visuales evocadores que den vida al lugar sugerido por el usuario. Responde siempre en Español.';
    } else if (type === 'object' || type === 'item') {
      systemInstruction = 'Eres un asistente experto en escritura creativa. Tu objetivo es ayudar al escritor a desarrollar OBJETOS significativos. Describe su apariencia, textura, peso, posibles orígenes, propiedades mágicas o tecnológicas y su relevancia simbólica para la historia. Responde siempre en Español.';
    } else if (type === 'analysis') {
      systemInstruction = `
    Analiza el siguiente texto para un escritor profesional. 
    Extrae la idea principal y las ideas secundarias.
    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "idea_principal": "string",
      "ideas_secundarias": ["string", "string", ...]
    }
    Responde siempre en Español.
      `;
    } else {
      systemInstruction = 'Eres un asistente experto en escritura creativa. Ayuda al usuario a desbloquear su creatividad y mejorar su prosa. Responde siempre en Español.';
    }

    console.log('Gemini Request - Type:', type);
    console.log('Gemini Key Present:', !!process.env.GOOGLE_API_KEY);

    // For Gemini, we combine the system instruction with the user prompt or use specific system instruction parameters if supported by the model version.
    // For simplicity with gemini-1.5-flash, we will prepend the instruction.

    if (!process.env.GOOGLE_API_KEY) {
      console.log('Mocking response due to missing key');
      await new Promise(r => setTimeout(r, 1000));
      // Return mock JSON for analysis
      if (type === 'analysis') {
        return Response.json({
          result: JSON.stringify({
            idea_principal: "Simulación: La dualidad del héroe frente a su destino.",
            ideas_secundarias: ["El sacrificio personal.", "La corrupción del poder.", "La esperanza en tiempos oscuros."]
          })
        });
      }
      return Response.json({ result: "Modo Simulación (Falta API Key): Configura tu GOOGLE_API_KEY." });
    }

    // Fallback to the most standard model if flash fails
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const fullPrompt = `${systemInstruction}\n\nTexto a analizar: "${prompt}"`;

    console.log('Sending prompt to Gemini (gemini-2.5-flash)...');
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();
    console.log('Gemini Success. Result length:', text.length);

    // Clean Markdown for JSON if present
    if (type === 'analysis') {
      text = text.replace(/```json|```/g, "").trim();
    }

    return Response.json({ result: text });
  } catch (error: any) {
    console.error('Error with AI:', error);

    let availableModels = 'No se pudo obtener la lista.';
    try {
      const key = process.env.GOOGLE_API_KEY;
      if (key) {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const listData = await listRes.json();
        if (listData.models) {
          availableModels = listData.models.map((m: any) => m.name.replace('models/', '')).join(', ');
          console.log('AVAILABLE MODELS:', availableModels);
        }
      }
    } catch (e) { console.error('Error listing models:', e); }

    const errorMsg = `Error: El modelo no está disponible. Modelos que SÍ tienes: [${availableModels}]. Detalle: ${error.message || error}`;
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}