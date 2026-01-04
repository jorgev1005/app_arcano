import { useState, useEffect } from 'react';
import { Project, FileNode } from '@/types/models';
import { X, Plus, Trash2, Save, Download, Link as LinkIcon, Unlink, BookOpen } from 'lucide-react';

interface ProjectSettingsProps {
    project: Project;
    onClose: () => void;
    onUpdate: (projectId: string, updates: any) => void;
    files?: FileNode[];
}

export default function ProjectSettings({ project, onClose, onUpdate, files = [] }: ProjectSettingsProps) {
    const [variables, setVariables] = useState<{ key: string; value: string; entityId?: string }[]>([]);
    const [settings, setSettings] = useState({
        genre: 'custom',
        structure: 'western',
        sensitivity: 'relaxed'
    });

    useEffect(() => {
        if (project.variables) {
            setVariables(project.variables);
        }
        if (project.settings) {
            setSettings({
                genre: project.settings.genre || 'custom',
                structure: project.settings.structure || 'western',
                sensitivity: project.settings.sensitivity || 'relaxed'
            });
        }
    }, [project]);

    const handleAddVariable = () => {
        setVariables([...variables, { key: '', value: '' }]);
    };

    const handleRemoveVariable = (index: number) => {
        const newVars = [...variables];
        newVars.splice(index, 1);
        setVariables(newVars);
    };

    const handleChange = (index: number, field: 'key' | 'value' | 'entityId', text: string) => {
        const newVars = [...variables];
        // If changing key/value manually, maybe clear entityId if it conflicts? 
        // For now let's just update.
        (newVars[index] as any)[field] = text;

        // If updating entityId manually (from dropdown logic below), we also update value
        if (field === 'entityId') {
            const entity = files.find(f => f._id === text);
            if (entity) {
                newVars[index].value = entity.title;
            } else if (text === '') {
                // Clear
                newVars[index].entityId = undefined;
                newVars[index].value = '';
            }
        }

        setVariables(newVars);
    };

    // Filter available entities
    const linkableEntities = files.filter(f => ['character', 'location', 'item'].includes(f.type));

    const handleSave = () => {
        // Filter out empty keys
        const validVariables = variables.filter(v => v.key.trim() !== '');
        onUpdate(project._id, { variables: validVariables, settings });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-white/20 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Configuración del Proyecto</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-8">
                    {/* Cover Image Settings */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Estilo Visual</h3>
                        <div className="flex gap-2">
                            {[
                                { name: 'Nebula', class: 'from-purple-900 to-blue-900' },
                                { name: 'Crimson', class: 'from-red-900 to-orange-900' },
                                { name: 'Forest', class: 'from-green-900 to-emerald-900' },
                                { name: 'Midnight', class: 'from-slate-900 to-black' },
                                { name: 'Gold', class: 'from-yellow-900 to-amber-900' },
                            ].map(c => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => onUpdate(project._id, { coverImage: c.class })}
                                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.class} border-2 transition-all ${project.coverImage === c.class ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Narrative Engine Configuration */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Motor Narrativo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Género Literario (Calibración)</label>
                                <select
                                    value={settings.genre}
                                    onChange={(e) => setSettings({ ...settings, genre: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-gray-200 focus:border-blue-500 outline-none"
                                >
                                    <option value="custom">Estándar / Personalizado</option>
                                    <option value="sci_fi">Ciencia Ficción / Space Opera</option>
                                    <option value="thriller">Thriller / Acción Rápida</option>
                                    <option value="eastern_slice">Narrativa Oriental / Slice of Life</option>
                                </select>
                                <p className="text-[10px] text-gray-600 mt-1">Define los pesos de acción vs. emoción para el cálculo del ritmo.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Sensibilidad del Asistente</label>
                                <select
                                    value={settings.sensitivity}
                                    onChange={(e) => setSettings({ ...settings, sensitivity: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-gray-200 focus:border-blue-500 outline-none"
                                >
                                    <option value="relaxed">Relajado (Sugerencias)</option>
                                    <option value="strict">Estricto (Alertas de Ritmo)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex justify-between items-center">
                            <span>Variables (Marcadores)</span>
                            <button
                                onClick={handleAddVariable}
                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                title="Nuevo Marcador"
                            >
                                <Plus size={12} /> Añadir
                            </button>
                        </h3>

                        <div className="space-y-3">
                            {variables.map((variable, index) => (
                                <div key={index} className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
                                    <div className="font-mono text-gray-500 select-none">#</div>
                                    <input
                                        type="text"
                                        value={variable.key}
                                        onChange={(e) => handleChange(index, 'key', e.target.value)}
                                        placeholder="codigo"
                                        className="bg-transparent border-b border-white/20 text-yellow-300 focus:outline-none focus:border-blue-500 w-1/3 px-1"
                                    />
                                    <div className="text-gray-600">→</div>
                                    <input
                                        type="text"
                                        value={variable.value}
                                        onChange={(e) => handleChange(index, 'value', e.target.value)}
                                        placeholder="Valor final (ej. Juan)"
                                        className="bg-transparent border-b border-white/20 text-white focus:outline-none focus:border-blue-500 flex-1 px-1"
                                        disabled={!!variable.entityId} // Disable manual edit if linked
                                    />

                                    {/* Entity Linker */}
                                    <div className="relative group/link">
                                        <button
                                            className={`p-1 rounded hover:bg-white/10 ${variable.entityId ? 'text-blue-400' : 'text-gray-600'}`}
                                            title={variable.entityId ? "Vinculado a Entidad" : "Vincular a Entidad"}
                                        >
                                            <LinkIcon size={14} />
                                        </button>

                                        {/* Dropdown for Linking */}
                                        <select
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            value={variable.entityId || ''}
                                            onChange={(e) => handleChange(index, 'entityId', e.target.value)}
                                        >
                                            <option value="">Sin Vínculo</option>
                                            {linkableEntities.map(entity => (
                                                <option key={entity._id} value={entity._id}>
                                                    {entity.type === 'character' ? '👤' : entity.type === 'location' ? '📍' : '📦'} {entity.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button onClick={() => handleRemoveVariable(index)} className="text-gray-600 hover:text-red-400 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {variables.length === 0 && (
                                <p className="text-sm text-gray-600 italic text-center py-4">
                                    No hay variables definidas. Añade una para usarla como #marcador en tu texto.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Acciones Avanzadas</h3>
                    <button
                        onClick={() => window.open(`/api/projects/${project._id}/export`, '_blank')}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-gray-300 hover:text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm group"
                    >
                        <Download size={16} className="text-blue-400 group-hover:text-blue-300" /> Exportar Copia de Seguridad Completa (.json)
                    </button>
                    <button
                        onClick={() => window.open(`/api/export/${project._id}/epub`, '_blank')}
                        className="w-full mt-3 bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-gray-300 hover:text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm group"
                    >
                        <BookOpen size={16} className="text-orange-400 group-hover:text-orange-300" /> Exportar eBook (ePub / Kindle)
                    </button>

                    <p className="text-xs text-gray-600 mt-2 text-center">Incluye todo el contenido, sinopsis y estructura.</p>
                    <p className="text-[10px] text-gray-500 mt-1 text-center italic">El orden de los capítulos sigue la estructura actual del Binder.</p>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all"
                    >
                        <Save size={18} /> Guardar Cambios
                    </button>
                </div>
            </div>
        </div >
    );
}
