import { Project } from '@/types/models';
import { Plus, BookOpen, Clock, Settings, FileText, Sparkles, HelpCircle, Trash2, LogOut, UploadCloud, Archive, RefreshCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import NarrativeHelpModal from './NarrativeHelpModal';
import { signOut } from 'next-auth/react';

interface WelcomeScreenProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onCreateProject: (title: string, description?: string, settings?: any, coverImage?: string) => void;
    onDeleteProject: (projectId: string) => void;
    onUpdateProject?: (projectId: string, updates: any) => void;
    user?: {
        name?: string | null;
        lastName?: string | null;
    };
}

export default function WelcomeScreen({ projects, onSelectProject, onCreateProject, onDeleteProject, onUpdateProject, user }: WelcomeScreenProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

    // ... (State for new project form kept clean)
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newGenre, setNewGenre] = useState('custom');
    const [newStructure, setNewStructure] = useState('western');
    const [newCover, setNewCover] = useState('from-purple-900 to-blue-900');
    const [showHelp, setShowHelp] = useState(false);
    const [greeting, setGreeting] = useState('Buenas noches');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting('Buenos días');
        else if (hour >= 12 && hour < 20) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, []);

    const covers = [
        { name: 'Nebula', class: 'from-purple-900 to-blue-900' },
        { name: 'Crimson', class: 'from-red-900 to-orange-900' },
        { name: 'Forest', class: 'from-green-900 to-emerald-900' },
        { name: 'Midnight', class: 'from-slate-900 to-black' },
        { name: 'Gold', class: 'from-yellow-900 to-amber-900' },
    ];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim()) {
            onCreateProject(newTitle, newDesc, { genre: newGenre, structure: newStructure }, newCover);
            setIsCreating(false);
            setNewTitle('');
            setNewDesc('');
            setNewGenre('custom');
            setNewStructure('western');
            setNewCover('from-purple-900 to-blue-900');
        }
    };

    const displayName = user?.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Escritor';

    // Filter projects
    const visibleProjects = projects.filter(p => viewMode === 'active' ? !p.isArchived : p.isArchived);

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col relative overflow-hidden selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <header className="px-8 py-6 flex justify-between items-center z-10 border-b border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50">
                        <span className="font-bold text-lg">A</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Arcano</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        v1.0.0 Alpha
                    </div>
                    <div className="w-px h-4 bg-white/10" />

                    {/* Import Button */}
                    <label className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 cursor-pointer" title="Importar Backup">
                        <UploadCloud size={18} />
                        <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                    try {
                                        const json = JSON.parse(event.target?.result as string);
                                        const res = await fetch('/api/import', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(json)
                                        });

                                        if (res.ok) {
                                            alert('Proyecto importado correctamente.');
                                            window.location.reload(); // Simple reload to refresh list
                                        } else {
                                            alert('Error al importar el proyecto.');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Archivo inválido.');
                                    }
                                };
                                reader.readAsText(file);
                            }}
                        />
                    </label>

                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-6 py-12 z-10 max-w-6xl">
                <div className="mb-12 text-center md:text-left flex justify-between items-end">
                    <div>
                        <h2 className="text-4xl font-extrabold mb-3 flex items-center justify-center md:justify-start gap-3">
                            {greeting}, {displayName} <Sparkles size={24} className="text-yellow-400" />
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl">
                            Tu universo narrativo te espera. Selecciona un proyecto para continuar o comienza una nueva aventura.
                        </p>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('active')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'active' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-gray-400 hover:text-white'}`}
                        >
                            Activos
                        </button>
                        <button
                            onClick={() => setViewMode('archived')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'archived' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Archivados
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card (Only in Active View) */}
                    {!isCreating && viewMode === 'active' ? (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="group relative h-64 bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/10 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-900/20 transition-all cursor-pointer overflow-hidden border-dashed"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                                <Plus size={32} className="text-purple-300" />
                            </div>
                            <span className="font-semibold text-lg text-gray-300 group-hover:text-white">Nuevo Proyecto</span>
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ) : isCreating && viewMode === 'active' ? (
                        <form onSubmit={handleCreate} className="h-auto bg-neutral-900 border border-purple-500/50 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl relative overflow-hidden ring-1 ring-purple-500 row-span-2">
                            {/* ... Form Content (No changes internal logic, just re-rendering) ... */}
                            <h3 className="text-lg font-bold text-white mb-1">Crear Proyecto</h3>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Título del Proyecto"
                                className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 text-white placeholder-gray-600"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                            />
                            <textarea
                                placeholder="Descripción (Opcional)"
                                className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 text-sm text-gray-300 placeholder-gray-600 resize-none h-20"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                            />

                            <div className="space-y-2">
                                <label className="block text-[10px] text-gray-400 uppercase font-bold">Portada / Estilo</label>
                                <div className="flex gap-2">
                                    {covers.map(c => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => setNewCover(c.class)}
                                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.class} border-2 transition-all ${newCover === c.class ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-white/10 relative">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                                    Configuración Narrativa
                                    <button type="button" onClick={() => setShowHelp(true)} className="text-gray-500 hover:text-purple-400 transition-colors" title="Ayuda"><HelpCircle size={12} /></button>
                                </label>
                                {showHelp && <NarrativeHelpModal onClose={() => setShowHelp(false)} />}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Género</label>
                                        <select
                                            value={newGenre}
                                            onChange={(e) => setNewGenre(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-xs text-gray-300 focus:border-purple-500 outline-none"
                                        >
                                            <option value="custom">Estándar</option>
                                            <option value="sci_fi">Ciencia Ficción</option>
                                            <option value="thriller">Thriller</option>
                                            <option value="eastern_slice">Oriental / Slice</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Estructura</label>
                                        <select
                                            value={newStructure}
                                            onChange={(e) => setNewStructure(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-xs text-gray-300 focus:border-purple-500 outline-none"
                                        >
                                            <option value="western">Occidental</option>
                                            <option value="eastern">Kishōtenketsu</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-4">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                <button disabled={!newTitle.trim()} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    Crear Ahora
                                </button>
                            </div>
                        </form>
                    ) : null}

                    {visibleProjects.length === 0 && viewMode === 'archived' && (
                        <div className="col-span-full text-center text-gray-500 py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <Archive className="mx-auto mb-4 opacity-50" size={48} />
                            <p>No tienes proyectos archivados.</p>
                        </div>
                    )}

                    {/* Project Cards */}
                    {visibleProjects.map((project) => (
                        <div
                            key={project._id}
                            onClick={() => onSelectProject(project)}
                            className="group relative h-64 bg-neutral-900 border border-white/10 rounded-2xl p-6 flex flex-col hover:border-white/30 hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                        >
                            {/* Cover Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${project.coverImage || 'from-neutral-900 to-neutral-950'} opacity-30 group-hover:opacity-50 transition-opacity`} />

                            {/* Card Actions (Hover) */}
                            <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                {project.isArchived ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onUpdateProject) onUpdateProject(project._id, { isArchived: false });
                                        }}
                                        className="p-2 rounded-full bg-black/40 text-green-400 hover:bg-green-500 hover:text-white backdrop-blur border border-white/10 transition-colors shadow-lg"
                                        title="Restaurar Proyecto"
                                    >
                                        <RefreshCcw size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onUpdateProject) onUpdateProject(project._id, { isArchived: true });
                                        }}
                                        className="p-2 rounded-full bg-black/40 text-gray-400 hover:bg-orange-500 hover:text-white backdrop-blur border border-white/10 transition-colors shadow-lg"
                                        title="Archivar Proyecto"
                                    >
                                        <Archive size={16} />
                                    </button>
                                )}
                            </div>


                            <div className="relative z-10 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
                                        <BookOpen size={20} className="text-white/70" />
                                    </div>
                                    {project.createdAt && (
                                        <span className="text-xs font-mono text-white/50 bg-black/20 px-2 py-1 rounded">
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </span>
                                    )}
                                    {/* Delete Button for Empty Projects */}
                                    {(!project.files || project.files.length === 0) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('¿Eliminar este proyecto vacío permanentemente?')) {
                                                    onDeleteProject(project._id);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors ml-2 opacity-0 group-hover:opacity-100"
                                            title="Eliminar Proyecto Vacío"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 drop-shadow-md">{project.title}</h3>
                                <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed drop-shadow-sm">
                                    {project.description || "Sin descripción."}
                                </p>
                            </div>

                            <div className="relative z-10 mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-xs text-white/60 font-medium group-hover:text-white transition-colors">
                                    {project.settings?.genre !== 'custom' ? project.settings?.genre?.toUpperCase() : 'ABRIR PROYECTO'} →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="mt-20 text-center text-xs text-gray-600 pb-6 border-t border-white/5 pt-8">
                    <p>&copy; {new Date().getFullYear()} Arcano Creative Suite. Diseñado para escritores.</p>
                </footer>
            </main>
        </div>
    );
}
