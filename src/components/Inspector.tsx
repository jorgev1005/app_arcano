'use client';

import { useState } from 'react';

interface InspectorProps {
  file: any;
}

export default function Inspector({ file }: InspectorProps) {
  const [notes, setNotes] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');

  const generateAI = async (type: string) => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt, type }),
    });
    const data = await res.json();
    setAiResult(data.result);
  };

  return (
    <div className="w-64 bg-gray-100 p-4">
      {file && (
        <>
          <h3>{file.title}</h3>
          <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Sinopsis" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" />
          <select>
            <option>Borrador</option>
            <option>Revisado</option>
            <option>Final</option>
          </select>
          <div className="mt-4">
            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Prompt de IA" />
            <button onClick={() => generateAI('character')}>Generar Personaje</button>
            <button onClick={() => generateAI('environment')}>Generar Ambiente</button>
            <p>{aiResult}</p>
          </div>
        </>
      )}
    </div>
  );
}