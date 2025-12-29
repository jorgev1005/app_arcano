'use client';

import { useState, useEffect } from 'react';
import { FileNode } from '@/types/models';
import { Sparkles, Save, X, Clock, BarChart3, Activity, HelpCircle } from 'lucide-react';
import { calculateSmartPace } from '@/lib/narrative-engine';
import NarrativeHelpModal from './NarrativeHelpModal';

// Time Data Interface
interface TimeData {
  startDay: number;
  startHour: number;
  startMinute: number;
  durationDay: number;
  durationHour: number;
  durationMinute: number;
}

const TimeSheet = ({ data, onChange }: { data: TimeData, onChange: (d: TimeData) => void }) => {
  const update = (field: keyof TimeData, value: number) => {
    onChange({ ...data, [field]: isNaN(value) ? 0 : value });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
          <Clock size={14} /> Comienza la escena
        </label>

        <div className="flex gap-4 items-center justify-center">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">DÍA</span>
            <input
              type="number" min="0"
              value={data.startDay}
              onChange={e => update('startDay', parseInt(e.target.value))}
              className="w-16 p-2 bg-black/40 border border-white/10 rounded text-center font-mono text-lg"
            />
          </div>
          <span className="text-gray-600 mt-4">:</span>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">HORA</span>
            <input
              type="number" min="0" max="23"
              value={data.startHour}
              onChange={e => update('startHour', parseInt(e.target.value))}
              className="w-16 p-2 bg-black/40 border border-white/10 rounded text-center font-mono text-lg"
            />
          </div>
          <span className="text-gray-600 mt-4">:</span>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">MIN</span>
            <input
              type="number" min="0" max="59"
              value={data.startMinute}
              onChange={e => update('startMinute', parseInt(e.target.value))}
              className="w-16 p-2 bg-black/40 border border-white/10 rounded text-center font-mono text-lg"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
          <Clock size={14} /> Duración de la escena
        </label>

        <div className="flex gap-4 items-center justify-center">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">DÍAS</span>
            <input
              type="number" min="0"
              value={data.durationDay}
              onChange={e => update('durationDay', parseInt(e.target.value))}
              className="w-16 p-2 bg-black/40 border border-white/10 rounded text-center font-mono text-lg"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">HORAS</span>
            <input
              type="number" min="0"
              value={data.durationHour}
              onChange={e => update('durationHour', parseInt(e.target.value))}
              className="w-16 p-2 bg-black/40 border border-white/10 rounded text-center font-mono text-lg"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">MIN</span>
            <input
              type="number" min="0"
              value={data.durationMinute}
              onChange={e => update('durationMinute', parseInt(e.target.value))}
              className="w-16 p-2 bg-black/40 border border-white/10 rounded text-center font-mono text-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components for specific sheets
const CharacterSheet = ({ data, onChange }: { data: Record<string, string>, onChange: (d: Record<string, string>) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Rol en la historia</label>
      <input
        value={data.role || ''}
        onChange={e => onChange({ ...data, role: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm placeholder-gray-600"
        placeholder="Protagonista, Antagonista, Mentor..."
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Edad</label>
        <input
          value={data.age || ''}
          onChange={e => onChange({ ...data, age: e.target.value })}
          className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Género</label>
        <input
          value={data.gender || ''}
          onChange={e => onChange({ ...data, gender: e.target.value })}
          className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
        />
      </div>
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Objetivo (Deseo)</label>
      <textarea
        value={data.goal || ''}
        onChange={e => onChange({ ...data, goal: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-20 resize-none"
        placeholder="¿Qué quiere conseguir más que nada?"
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Conflicto / Obstáculo</label>
      <textarea
        value={data.conflict || ''}
        onChange={e => onChange({ ...data, conflict: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-20 resize-none"
        placeholder="¿Qué le impide conseguirlo?"
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Debilidad / Miedo</label>
      <input
        value={data.weakness || ''}
        onChange={e => onChange({ ...data, weakness: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
        placeholder="Su talón de Aquiles"
      />
    </div>
  </div>
);

const LocationSheet = ({ data, onChange }: { data: Record<string, string>, onChange: (d: Record<string, string>) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Tipo de Lugar</label>
      <input
        value={data.locationType || ''}
        onChange={e => onChange({ ...data, locationType: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
        placeholder="Ciudad, Bosque, Taberna..."
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Clima / Atmósfera</label>
      <input
        value={data.climate || ''}
        onChange={e => onChange({ ...data, climate: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Detalles Sensoriales</label>
      <textarea
        value={data.sensory || ''}
        onChange={e => onChange({ ...data, sensory: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-24 resize-none"
        placeholder="Olores, sonidos, colores predominantes..."
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Habitantes / Cultura</label>
      <textarea
        value={data.inhabitants || ''}
        onChange={e => onChange({ ...data, inhabitants: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-24 resize-none"
      />
    </div>
  </div>
);

const ItemSheet = ({ data, onChange }: { data: Record<string, string>, onChange: (d: Record<string, string>) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Tipo de Objeto</label>
      <input
        value={data.itemType || ''}
        onChange={e => onChange({ ...data, itemType: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
        placeholder="Arma, Artefacto, Herramienta..."
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Rareza / Valor</label>
      <input
        value={data.rarity || ''}
        onChange={e => onChange({ ...data, rarity: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm"
        placeholder="Común, Legendario, Único..."
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Propiedades / Habilidades</label>
      <textarea
        value={data.properties || ''}
        onChange={e => onChange({ ...data, properties: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-24 resize-none"
        placeholder="¿Qué hace? ¿Es mágico?"
      />
    </div>
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Origen / Historia</label>
      <textarea
        value={data.origin || ''}
        onChange={e => onChange({ ...data, origin: e.target.value })}
        className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-24 resize-none"
      />
    </div>
  </div>
);

// Scene Data Interface
interface SceneData {
  goal?: string;
  conflict?: string;
  outcome?: string;
  characters?: string[];
}

const SceneSheet = ({ data, onChange, allFiles }: { data: SceneData, onChange: (d: SceneData) => void, allFiles: FileNode[] }) => {
  const characters = allFiles.filter(f => f.type === 'character');

  const toggleCharacter = (charId: string) => {
    const current = data.characters || [];
    const newChars = current.includes(charId)
      ? current.filter(id => id !== charId)
      : [...current, charId];
    onChange({ ...data, characters: newChars });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Objetivo de la Escena</label>
        <textarea
          value={data.goal || ''}
          onChange={e => onChange({ ...data, goal: e.target.value })}
          className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-20 resize-none"
          placeholder="¿Qué definirá el éxito de esta escena?"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Conflicto Central</label>
        <textarea
          value={data.conflict || ''}
          onChange={e => onChange({ ...data, conflict: e.target.value })}
          className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-20 resize-none"
          placeholder="¿Qué fuerzas se oponen?"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Resultado / Desenlace</label>
        <textarea
          value={data.outcome || ''}
          onChange={e => onChange({ ...data, outcome: e.target.value })}
          className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm h-20 resize-none"
          placeholder="¿Cómo cambia la situación?"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Personajes Presentes</label>
        <div className="space-y-1 max-h-40 overflow-y-auto bg-black/20 p-2 rounded border border-white/10">
          {characters.length === 0 && <p className="text-xs text-gray-600 italic">No hay personajes creados.</p>}
          {characters.map(char => (
            <div
              key={char._id}
              onClick={() => toggleCharacter(char._id)}
              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-sm transition-colors ${(data.characters || []).includes(char._id)
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                : 'hover:bg-white/5 text-gray-400'
                }`}
            >
              <div className={`w-3 h-3 rounded-full border ${(data.characters || []).includes(char._id) ? 'bg-purple-500 border-purple-400' : 'border-gray-600'
                }`} />
              {char.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Narrative Analysis Sheet
interface NarrativeMetrics {
  focus: number;
  dissonance: number;
  polarity: number;
}

const NarrativeSheet = ({
  data,
  wordCount,
  onChange,
  projectGenre = 'custom',
  onShowHelp
}: {
  data: NarrativeMetrics,
  wordCount: number,
  onChange: (d: NarrativeMetrics) => void,
  projectGenre?: string,
  onShowHelp: () => void
}) => {

  // Calculate pace on the fly based on current slider values
  const { score, label, tip } = calculateSmartPace({ ...data, wordCount }, projectGenre);

  const getScoreColor = (s: number) => {
    if (s < 30) return 'bg-blue-500'; // Slow
    if (s > 70) return 'bg-red-500';  // Fast
    return 'bg-green-500';            // Balanced
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg relative group">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          <Activity size={14} /> Ritmo Calculado
        </label>

        <button
          onClick={onShowHelp}
          className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
          title="¿Cómo funciona?"
        >
          <HelpCircle size={14} />
        </button>

        <div className="h-4 bg-black/40 rounded-full overflow-hidden mb-2 border border-white/5 relative">
          <div
            className={`h-full transition-all duration-500 ease-out ${getScoreColor(score)}`}
            style={{ width: `${score}%` }}
          />
          {/* Markers for reference */}
          <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/10" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
          <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/10" />
        </div>

        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xl font-bold text-white">{score}<span className="text-xs text-gray-500 font-normal">/100</span></span>
          <span className="text-xs font-medium text-gray-300">{label}</span>
        </div>

        {tip && (
          <div className="mt-2 text-xs text-blue-300 italic flex gap-2 items-start bg-blue-500/10 p-2 rounded">
            <span>💡</span>
            <span>{tip}</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
          <span className="flex items-center gap-1">Foco <span title="0=Interno (Pensamiento), 10=Externo (Acción)"><HelpCircle size={10} className="text-gray-600 cursor-help" /></span></span>
          <span className="text-gray-300">{data.focus <= 3 ? 'Reflexivo' : data.focus >= 7 ? 'Acción' : 'Equilibrado'} ({data.focus})</span>
        </div>
        <input
          type="range" min="0" max="10" step="1"
          value={data.focus}
          onChange={e => onChange({ ...data, focus: parseInt(e.target.value) })}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Interno</span>
          <span>Externo</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
          <span className="flex items-center gap-1">Disonancia <span title="1=Calma, 10=Tensión Máxima"><HelpCircle size={10} className="text-gray-600 cursor-help" /></span></span>
          <span className="text-gray-300">{data.dissonance <= 3 ? 'Calma' : data.dissonance >= 7 ? 'Alta Tensión' : 'Moderada'} ({data.dissonance})</span>
        </div>
        <input
          type="range" min="1" max="10" step="1"
          value={data.dissonance}
          onChange={e => onChange({ ...data, dissonance: parseInt(e.target.value) })}
          className="w-full accent-purple-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Armonía</span>
          <span>Giro/Caos</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
          <span className="flex items-center gap-1">Polaridad <span title="-10=Tragedia, +10=Victoria"><HelpCircle size={10} className="text-gray-600 cursor-help" /></span></span>
          <span className={`font-bold ${data.polarity > 0 ? 'text-green-400' : data.polarity < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {data.polarity > 0 ? `+${data.polarity}` : data.polarity}
          </span>
        </div>
        <input
          type="range" min="-10" max="10" step="1"
          value={data.polarity}
          onChange={e => onChange({ ...data, polarity: parseInt(e.target.value) })}
          className="w-full accent-yellow-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Negativo (Tragedia)</span>
          <span>Positivo (Éxito)</span>
        </div>
      </div>
    </div>
  );
};

interface InspectorProps {
  file: FileNode | null;
  onSave: (file: FileNode) => void;
}

export default function Inspector({
  file,
  onSave,
  allFiles = [],
  projectSettings
}: InspectorProps & {
  allFiles?: FileNode[],
  projectSettings?: { genre?: string }
}) {
  const [synopsis, setSynopsis] = useState('');
  const [status, setStatus] = useState('draft');
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [sceneData, setSceneData] = useState<SceneData>({});
  const [timeData, setTimeData] = useState<TimeData>({ startDay: 0, startHour: 0, startMinute: 0, durationDay: 0, durationHour: 0, durationMinute: 0 });
  const [narrativeMetrics, setNarrativeMetrics] = useState<NarrativeMetrics>({ focus: 5, dissonance: 1, polarity: 0 });
  const [activeTab, setActiveTab] = useState<'details' | 'analysis' | 'time'>('details');
  const [showHelp, setShowHelp] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');


  useEffect(() => {
    if (file) {
      setSynopsis(file.synopsis || '');
      setStatus(file.status || 'draft');
      setCustomData(file.customData || {});
      setSceneData(file.sceneData || {});
      setTimeData(file.timeData || { startDay: 0, startHour: 0, startMinute: 0, durationDay: 0, durationHour: 0, durationMinute: 0 });
      setNarrativeMetrics(file.metrics || { focus: 5, dissonance: 1, polarity: 0 });
    }
  }, [file]);

  const saveMetadata = async () => {
    if (!file) return;

    const updates = {
      synopsis,
      status,
      customData,
      sceneData,
      timeData,
      metrics: narrativeMetrics
    };

    try {
      const res = await fetch(`/api/files/${file._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        if (onSave) onSave(data.file);
      } else {
        throw new Error('Falló el guardado');
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
      alert('Error al guardar los cambios');
    }
  };


  // AI Logic (Kept same)
  const generateAI = async (type: string, manualPrompt?: string) => {
    setIsLoadingAI(true);
    setAiError('');
    setAiResult('');

    const finalPrompt = manualPrompt !== undefined ? manualPrompt : aiPrompt;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, type }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar respuesta');
      }

      setAiResult(data.result);
    } catch (err: any) {
      console.error('AI Error:', err);
      setAiError(err.message || 'Hubo un problema al conectar con la IA.');
    } finally {
      setIsLoadingAI(false);
    }
  };


  if (!file) return <div className="p-6 text-gray-500 text-sm text-center mt-10">Selecciona un archivo para ver sus detalles</div>;

  return (
    <div className="flex flex-col h-full p-4 text-gray-300 overflow-y-auto">
      {/* ... (Header matches existing) ... */}
      <div className="flex justify-between items-start mb-6">
        <div className="overflow-hidden">
          <h3 className="font-bold text-lg text-white truncate" title={file.title}>{file.title}</h3>
          <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
            <span>{file.type.toUpperCase()}</span>
            {file.wordCount !== undefined && <span>• {file.wordCount} palabras</span>}
          </div>
        </div>
        <span className="text-xs bg-white/10 px-2 py-1 rounded uppercase tracking-wider text-gray-400">{file.type}</span>
      </div>

      {/* Tabs */}
      {file.type === 'file' && (
        <div className="flex border-b border-white/10 mb-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Detalles
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'time' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Tiempo
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Análisis
          </button>
        </div>
      )}

      <div className="space-y-6">
        {activeTab === 'details' ? (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="draft">Borrador</option>
                <option value="revised">Revisado</option>
                <option value="final">Final</option>
              </select>
            </div>

            {/* Dynamic Sheets */}
            {file.type === 'file' && (
              <SceneSheet data={sceneData} onChange={setSceneData} allFiles={allFiles} />
            )}
            {file.type === 'character' && (
              <CharacterSheet data={customData} onChange={setCustomData} />
            )}
            {file.type === 'location' && (
              <LocationSheet data={customData} onChange={setCustomData} />
            )}
            {file.type === 'item' && (
              <ItemSheet data={customData} onChange={setCustomData} />
            )}

            {/* Fallback / General Check */}
            {file.type !== 'file' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-sm h-32 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  placeholder="Escribe aquí..."
                />
              </div>
            )}

            {file.type === 'file' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Resumen / Sinopsis</label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-sm h-24 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                />
              </div>
            )}
          </>
        ) : activeTab === 'time' ? (
          <TimeSheet data={timeData} onChange={setTimeData} />
        ) : (
          <NarrativeSheet
            data={narrativeMetrics}
            onChange={setNarrativeMetrics}
            wordCount={file.wordCount || 0}
            projectGenre={projectSettings?.genre}
            onShowHelp={() => setShowHelp(true)}
          />
        )}

        {showHelp && <NarrativeHelpModal onClose={() => setShowHelp(false)} />}

        <button onClick={saveMetadata} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-all text-sm font-medium shadow-lg shadow-blue-900/20">
          <Save size={16} />
          Guardar Cambios
        </button>

        {/* AI Assistant (Only related to details actually, but let's keep it visible in detail mode only as per structure) */}
        {activeTab === 'details' && (
          // ... (AI Section Content) ...
          <div className="border-t border-white/10 pt-6 mt-2">
            <div className="flex items-center gap-2 mb-4 text-purple-400">
              <Sparkles size={16} />
              <h4 className="font-bold text-sm">Asistente IA</h4>
            </div>
            {/* ... Rest of AI UI ... */}
            <p className="text-xs text-gray-500 mb-3 italic">
              Pide ayuda para complementar tus ideas. Describe brevemente lo que tienes en mente y deja que la IA te sugiera detalles.
            </p>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej: Un mercenario que odia el frío..."
              disabled={isLoadingAI}
              className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-sm mb-3 focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50"
            />
            {/* ... And buttons ... */}
            <button
              onClick={() => {
                const stripHtml = (html: string) => {
                  const tmp = document.createElement("DIV");
                  tmp.innerHTML = html;
                  return tmp.textContent || tmp.innerText || "";
                };

                const cleanContent = file?.content ? stripHtml(file.content).trim() : '';
                const textToAnalyze = (synopsis && synopsis.trim())
                  ? synopsis
                  : cleanContent;

                if (!textToAnalyze) {
                  setAiError('No hay texto para analizar. Escribe un resumen o contenido en la escena.');
                  return;
                }

                setAiPrompt(textToAnalyze);
                generateAI('analysis', textToAnalyze);
              }}
              disabled={isLoadingAI}
              className="w-full mb-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={12} /> Analizar Idea (Extracto)
            </button>

            <div className="flex gap-2 mb-4">
              <button onClick={() => generateAI('character')} disabled={isLoadingAI} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isLoadingAI ? '...' : 'Personaje'}</button>
              <button onClick={() => generateAI('location')} disabled={isLoadingAI} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isLoadingAI ? '...' : 'Lugar'}</button>
              <button onClick={() => generateAI('object')} disabled={isLoadingAI} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isLoadingAI ? '...' : 'Objeto'}</button>
            </div>

            {/* Load/Error/Result Display */}
            {isLoadingAI && <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 animate-pulse text-center">Generando ideas creativas...</div>}
            {aiError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-200"><strong>Error:</strong> {aiError}</div>}
            {aiResult && !isLoadingAI && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs leading-relaxed text-gray-300">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-purple-300">Respuesta:</span>
                  <button onClick={() => setAiResult('')} className="text-gray-500 hover:text-white"><X size={12} /></button>
                </div>
                <div className="whitespace-pre-wrap">{aiResult}</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}