'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Binder from '@/components/Binder';
import Corkboard from '@/components/Corkboard';
import Outliner from '@/components/Outliner';
import Inspector from '@/components/Inspector';
import ProjectSettings from '@/components/ProjectSettings';
import ProjectPreview from '@/components/ProjectPreview'; // New Import
import FeedbackModal from '@/components/FeedbackModal'; // New Import
import TimelineView from '@/components/TimelineView'; // New Import
import GoalWidget from '@/components/GoalWidget'; // New Import
import InfiniteCanvas from '@/components/InfiniteCanvas'; // New Import
import Sandbox from '@/components/Sandbox';
import WelcomeScreen from '@/components/WelcomeScreen';
import GraphView from '@/components/GraphView';
import PacingGraph from '@/components/PacingGraph';
import { Project, FileNode } from '@/types/models';
import {
    Layout, Grid, FileText, Menu, Settings, X, Search, Plus,
    Share2, Folder, ChevronRight, ChevronDown, MoreVertical,
    Trash2, Save, Moon, Sun, Home, Activity, Lock, Maximize,
    Clock, Calendar, Minimize2, Box, List, Network, BarChart3,
    CalendarClock, HelpCircle, Maximize2, LogOut
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

export default function Dashboard() {
    const { data: session } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [files, setFiles] = useState<FileNode[]>([]);
    const [currentFile, setCurrentFile] = useState<FileNode | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // Lifted state
    const [view, setView] = useState<'editor' | 'corkboard' | 'outliner' | 'graph' | 'analytics' | 'timeline' | 'canvas' | 'sandbox'>('editor');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPreview, setShowPreview] = useState(false); // New State
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false); // New State
    const [isZenMode, setIsZenMode] = useState(false); // Zen Mode State

    useEffect(() => {
        fetchProjects();

        // Auto-open sidebar on mobile/tablet for better accessibility
        const isMobile = window.innerWidth < 1024;
        if (isMobile) {
            setIsSidebarOpen(true);
        }

        // 1. Auto-Zen on Phone
        if (window.innerWidth < 768) {
            setIsZenMode(true);
        }

        // 2. Restore Project Session (Delay slightly to ensure auth loaded if needed, but here is fine)
        const lastProjectId = localStorage.getItem('arcano_last_project');
        if (lastProjectId) {
            // Logic handled in fetchProjects or separate effect dependent on projects
        }
    }, []);

    // Restore Project once projects are loaded
    useEffect(() => {
        if (projects.length > 0 && !currentProject) {
            const lastProjectId = localStorage.getItem('arcano_last_project');
            const targetProject = projects.find(p => p._id === lastProjectId);
            if (targetProject) {
                selectProject(targetProject);
            }
        }
    }, [projects]); // Run when projects load

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('Error al cargar proyectos');
            const data: { projects: Project[] } = await res.json();
            setProjects(data.projects);
            // Don't auto-select. Let user choose from Welcome Screen.
            // if (data.projects.length > 0 && !currentProject) {
            //     selectProject(data.projects[0]);
            // }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const createProject = async (title: string, description?: string, settings?: any, coverImage?: string) => {
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: description || '', settings, coverImage }),
            });

            if (!res.ok) throw new Error('Error al crear proyecto');

            const data = await res.json();
            setProjects([...projects, data.project]);
            selectProject(data.project);
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    const updateProject = async (projectId: string, updates: any) => {
        // Optimistic Update
        if (currentProject?._id === projectId) {
            setCurrentProject(prev => prev ? { ...prev, ...updates } : null);
        }
        setProjects(prev => prev.map(p => p._id === projectId ? { ...p, ...updates } : p));

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Server Error Details:", errorData);
                throw new Error(errorData.details || 'Error al actualizar proyecto');
            }

            const data = await res.json();
            setCurrentProject(data.project); // Update current project fully
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleStatsUpdate = (newTotal: number) => {
        if (!currentProject) return;

        const today = new Date().toISOString().split('T')[0];

        // Update local state for immediate UI feedback
        setProjects(prev => prev.map(p => {
            if (p._id === currentProject._id) {
                const newStats = { ...(p.stats || {}) };
                // Ensure dailyProgress is treated correctly as Record<string, number> in frontend JSON
                const newDaily = { ...(newStats.dailyProgress || {}), [today]: newTotal };

                return { ...p, stats: { ...newStats, dailyProgress: newDaily } };
            }
            return p;
        }));

        // Also update currentProject state
        setCurrentProject(prev => {
            if (!prev) return null;
            const newStats = { ...(prev.stats || {}) };
            const newDaily = { ...(newStats.dailyProgress || {}), [today]: newTotal };
            return { ...prev, stats: { ...newStats, dailyProgress: newDaily } };
        });
    };



    const deleteProject = async (projectId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Error al eliminar proyecto');

            setProjects(prev => prev.filter(p => p._id !== projectId));
            if (currentProject?._id === projectId) {
                setCurrentProject(null);
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error al eliminar el proyecto');
        }
    };

    const selectProject = async (project: Project) => {
        setCurrentProject(project);
        localStorage.setItem('arcano_last_project', project._id); // Save Session

        const res = await fetch(`/api/files?projectId=${project._id}`);
        if (!res.ok) {
            console.error('Error al cargar archivos del proyecto');
            return;
        }
        const data: { files: FileNode[] } = await res.json();

        // Restore Last File for this project
        const lastFileId = localStorage.getItem(`arcano_last_file_${project._id}`);
        let storedFile = null;
        if (lastFileId) {
            storedFile = data.files.find(f => f._id === lastFileId);
        }

        // Check/Create "Extras" folder (System Folder)
        const extrasFolder = data.files.find(f => f.isSystem);
        if (!extrasFolder) {
            // Auto-create
            try {
                const createRes = await fetch('/api/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Extras',
                        projectId: project._id,
                        type: 'folder',
                        parent: null,
                        isSystem: true // Protected
                    }),
                });
                if (createRes.ok) {
                    const newData = await createRes.json();
                    data.files.push(newData.file);
                }
            } catch (e) { console.error("Error creating Extras folder", e); }
        }

        // Check/Create "Sandbox" folder (System Folder)
        const sandboxFolder = data.files.find(f => f.isSystem && f.title === 'Sandbox');
        if (!sandboxFolder) {
            try {
                const createRes = await fetch('/api/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Sandbox',
                        projectId: project._id,
                        type: 'folder',
                        parent: null,
                        isSystem: true // Protected
                    }),
                });
                if (createRes.ok) {
                    const newData = await createRes.json();
                    data.files.push(newData.file);
                }
            } catch (e) { console.error("Error creating Sandbox folder", e); }
        }

        setFiles(data.files);

        // If we restored a file, select it now (after setting files)
        if (storedFile) {
            setCurrentFile(storedFile);
            setView('editor');
        }
    };



    const createFile = async (title: string, type: string = 'file', parentId: string | null = null) => {
        if (!currentProject) {
            alert('Primero selecciona un proyecto de la lista.');
            return;
        }
        try {
            const res = await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    projectId: currentProject._id,
                    type,
                    parent: parentId
                }),
            });

            if (!res.ok) throw new Error('Error al crear archivo');

            const data = await res.json();
            const newFiles = [...files, data.file];
            setFiles(newFiles);

            // Only select if it's a file, not a folder
            if (type === 'file') {
                setCurrentFile(data.file);
                setView('editor');
            }
            // Return the created file to caller
            return data.file;
        } catch (error) {
            console.error('Error creating file:', error);
            alert('Error al crear el elemento');
            throw error;
        }
    };

    const updateFile = async (fileId: string, updates: any) => {
        // Optimistic Update
        const previousFiles = files;
        const previousCurrentFile = currentFile;

        setFiles(prevFiles => prevFiles.map(f => f._id === fileId ? { ...f, ...updates } : f));
        if (currentFile?._id === fileId) {
            setCurrentFile(prev => prev ? { ...prev, ...updates } : null);
        }

        try {
            const res = await fetch(`/api/files/${fileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error('Error al actualizar archivo');

            // Optional: Confirm with server data if needed, but usually optimistic is fine.
            // const data = await res.json(); 
            // setFiles(...) // Only if we expect server transformations
        } catch (error) {
            console.error('Error updating file:', error);
            // Revert on error
            setFiles(previousFiles);
            setCurrentFile(previousCurrentFile);
            alert('Error al actualizar: cambios revertidos');
        }
    };

    const selectFile = (file: FileNode) => {
        setCurrentFile(file);
        if (currentProject) {
            localStorage.setItem(`arcano_last_file_${currentProject._id}`, file._id); // Save File Session per project
        }
        setView('editor');
    };

    const onReorder = async (newFiles: FileNode[]) => {
        setFiles(newFiles);
        try {
            await fetch('/api/files', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFiles),
            });
        } catch (error) {
            console.error('Error saving order:', error);
        }
    };

    const deleteFile = async (fileId: string) => {
        try {
            const res = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Error al eliminar');

            setFiles(prev => prev.filter(f => f._id !== fileId));
            if (currentFile?._id === fileId) {
                setCurrentFile(null);
                setView('editor');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error al eliminar archivo');
        }
    };

    const handleFileSave = (updatedFile: FileNode) => {
        setFiles(prevFiles => prevFiles.map(f => f._id === updatedFile._id ? updatedFile : f));
        if (currentFile?._id === updatedFile._id) {
            setCurrentFile(updatedFile);
        }
    };

    if (!currentProject && projects.length === 0) {
        return (
            <WelcomeScreen
                projects={projects}
                onSelectProject={selectProject}
                onCreateProject={createProject}
                onDeleteProject={deleteProject}
            />
        );
    }

    // Also show welcome if projects exist but none selected? 
    // Usually fetchProjects selects default. If explicit close, maybe show welcome?
    // For now, if no currentProject, show welcome (it handles list).
    if (!currentProject) {
        return (
            <WelcomeScreen
                projects={projects}
                onSelectProject={selectProject}
                onCreateProject={createProject}
                onDeleteProject={deleteProject}
                onUpdateProject={updateProject}
                user={session?.user}
            />
        );
    }

    return (
        <div className="flex bg-neutral-900 min-h-screen">
            {/* Sidebar Toggle for Mobile */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-neutral-800 rounded text-white"
            >
                {isSidebarOpen ? <X /> : <Menu />}
            </button>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && !isZenMode && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            {!isZenMode && (
                <div className={`
                    fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out
                    w-72 border-r border-white/10 z-40 bg-neutral-900 shadow-2xl
                `}>
                    {/* Binder Panel */}
                    <Binder
                        projects={projects}
                        selectProject={(p) => { selectProject(p); setIsSidebarOpen(false); }}
                        createProject={createProject}
                        files={files}
                        selectFile={(f) => { selectFile(f); setIsSidebarOpen(false); }}
                        createFile={createFile}
                        updateFile={updateFile}
                        onReorder={(reorderedSubset) => {
                            // Merge subset updates (e.g. from Renumbering) into main file list
                            const updatedSubset = reorderedSubset.map((f, idx) => ({ ...f, order: idx }));
                            const newFiles = files.map(f => {
                                const updated = updatedSubset.find(u => u._id === f._id);
                                return updated || f;
                            });
                            onReorder(newFiles);
                        }}
                        currentProject={currentProject}
                        deleteFile={deleteFile}
                        onOpenPreview={() => setShowPreview(true)}
                        selectedFolder={selectedFolder}
                        setSelectedFolder={setSelectedFolder}
                        selectedFileId={currentFile?._id}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative z-0">
                {/* ... Header ... */}
                {!isZenMode && (
                    <div className="h-14 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
                        {/* ... (Header content unchanged) ... */}
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-2 mr-2 md:hidden hover:bg-white/10 rounded-md text-gray-400"
                            >
                                <Menu size={20} />
                            </button>
                            <button
                                onClick={() => setCurrentProject(null)}
                                className="p-2 -ml-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                                title="Volver al Inicio (Cerrar Proyecto)"
                            >
                                <Home size={20} />
                            </button>
                        </div>

                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                            <button
                                onClick={() => setView('editor')}
                                className={`p-2 rounded-md transition-all ${view === 'editor' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Layout size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setView('corkboard');
                                    // If no folder selected, maybe default to root? Yes.
                                }}
                                className={`p-2 rounded-md transition-all ${view === 'corkboard' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setView('outliner')}
                                className={`p-2 rounded-md transition-all ${view === 'outliner' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Esquema"
                            >
                                <List size={18} />
                            </button>

                            <button
                                onClick={() => setView('analytics')}
                                className={`p-2 rounded-md transition-all ${view === 'analytics' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Análisis Narrativo"
                            >
                                <BarChart3 size={18} />
                            </button>
                            <button
                                onClick={() => setView('timeline')}
                                className={`p-2 rounded-md transition-all ${view === 'timeline' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Línea de Tiempo"
                            >
                                <CalendarClock size={18} />
                            </button>
                            <button
                                onClick={() => setView('canvas')}
                                className={`p-2 rounded-md transition-all ${view === 'canvas' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Corcho Libre (Canvas)"
                            >
                                <Maximize size={18} />
                            </button>
                            <button
                                onClick={() => setView('sandbox')}
                                className={`p-2 rounded-md transition-all ${view === 'sandbox' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Caja de Arena (Sandbox)"
                            >
                                <Box size={18} />
                            </button>
                            <button
                                onClick={() => setView('graph')}
                                className={`p-2 rounded-md transition-all ${view === 'graph' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Grafo de Relaciones"
                            >
                                <Network size={18} />
                            </button>
                        </div>
                        {/* ... Right side header ... */}
                        <div className="flex items-center gap-4">
                            {/* Add Goal Widget Here if project exists */}
                            {currentProject && <GoalWidget project={currentProject} />}

                            <div className="text-xs font-mono text-gray-500 bg-black/20 px-2 py-1 rounded border border-white/5" title="Total del Proyecto">
                                {files.reduce((acc, f) => acc + (f.wordCount || 0), 0).toLocaleString()} palabras
                            </div>
                            <div className="text-sm font-medium text-gray-400">
                                {currentProject?.title} / {currentFile?.title || (selectedFolder ? files.find(f => f._id === selectedFolder)?.title : 'Raíz')}
                            </div>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Configuración del Proyecto (Variables #)"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                onClick={() => setIsFeedbackOpen(true)}
                                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Enviar Comentarios / Reportar Error"
                            >
                                <HelpCircle size={18} />
                            </button>
                            <div className="h-6 w-px bg-white/10 mx-2" />
                            <button
                                onClick={() => setIsZenMode(true)}
                                className="p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                                title="Modo Zen (Pantalla Completa)"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="p-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                title="Cerrar Sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Workspace */}
                <div className="flex-1 overflow-hidden relative">
                    {/* Zen Mode Exit Button */}
                    {isZenMode && (
                        <button
                            onClick={() => setIsZenMode(false)}
                            className="absolute top-4 right-4 z-50 p-2 bg-neutral-800/80 backdrop-blur text-gray-400 hover:text-white rounded-full hover:bg-neutral-700 transition-all shadow-lg border border-white/5 group"
                            title="Salir del Modo Zen"
                        >
                            <Minimize2 size={20} />
                            <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out whitespace-nowrap text-sm">Salir Modo Zen</span>
                        </button>
                    )}
                    {view === 'editor' && (
                        currentFile ? (
                            <Editor
                                file={currentFile}
                                onSave={handleFileSave}
                                variables={currentProject?.variables}
                                projectId={currentProject?._id}
                                onStatsUpdate={handleStatsUpdate}
                            />
                        ) : (
                            <div className="flex bg-neutral-900 flex-col items-center justify-center h-full text-gray-400">
                                <p className="mb-4 text-lg">Selecciona un archivo para empezar a escribir</p>
                                <p className="text-sm opacity-60">Usa el botón + del Binder para crear uno nuevo</p>
                            </div>
                        )
                    )}
                    {view === 'corkboard' && (
                        <Corkboard
                            files={files.filter(f => f.parent === selectedFolder).sort((a, b) => (a.order || 0) - (b.order || 0))}
                            currentFolder={selectedFolder ? files.find(f => f._id === selectedFolder) || null : null}
                            onBack={() => {
                                if (selectedFolder) {
                                    const current = files.find(f => f._id === selectedFolder);
                                    setSelectedFolder(current?.parent || null);
                                }
                            }}
                            onSelect={(file: FileNode) => {
                                if (file.type === 'folder') {
                                    setSelectedFolder(file._id);
                                } else {
                                    selectFile(file);
                                }
                            }}
                            onReorder={(reorderedSubset) => {
                                // We need to merge the reordered subset back into the main files list
                                // The new subset has updated 'order' fields? No, onReorder usually returns the array in new order.
                                // We need to map their index to 'order' property.
                                const updatedSubset = reorderedSubset.map((f, idx) => ({ ...f, order: idx }));
                                const newFiles = files.map(f => {
                                    const updated = updatedSubset.find(u => u._id === f._id);
                                    return updated || f;
                                });
                                onReorder(newFiles);
                            }}
                        />
                    )}
                    {view === 'outliner' && <Outliner files={files} onSelect={selectFile} />}
                    {view === 'graph' && (
                        <GraphView
                            files={files}
                            onSelect={selectFile}
                            project={currentProject}
                            onSaveGraph={(data) => {
                                if (currentProject) updateProject(currentProject._id, { graphData: data });
                            }}
                        />
                    )}
                    {view === 'analytics' && (
                        <div className="h-full p-6">
                            <PacingGraph
                                files={files}
                                projectGenre={currentProject?.settings?.genre}
                            />
                        </div>
                    )}
                    {view === 'timeline' && (
                        <TimelineView
                            files={files}
                            onSelect={selectFile}
                        />
                    )}
                    {view === 'canvas' && (
                        <InfiniteCanvas
                            files={files}
                            onUpdateFile={updateFile}
                            onSelectFile={selectFile}
                            initialScale={currentProject?.canvasState?.scale}
                            initialOffset={currentProject?.canvasState?.offset}
                            onSaveCanvasState={(state) => {
                                if (currentProject) {
                                    updateProject(currentProject._id, { canvasState: state });
                                }
                            }}
                        />
                    )}
                    {view === 'sandbox' && (
                        <Sandbox
                            files={files}
                            onUpdateFile={updateFile}
                            onSelectFile={selectFile}
                            createFile={createFile}
                            deleteFile={deleteFile}
                            projectId={currentProject?._id}
                        />
                    )}
                </div>
            </div>

            {/* Inspector */}
            {!isZenMode && (
                <div className="hidden lg:block w-72 bg-white/5 backdrop-blur-xl border-l border-white/10">
                    <Inspector
                        file={currentFile}
                        onSave={handleFileSave}
                        allFiles={files}
                        projectSettings={currentProject?.settings}
                    />
                </div>
            )}

            {showSettings && currentProject && (
                <ProjectSettings
                    project={currentProject}
                    onClose={() => setShowSettings(false)}
                    onUpdate={updateProject}
                    files={files}
                />
            )}

            {showPreview && currentProject && (
                <ProjectPreview
                    files={files}
                    project={currentProject}
                    onClose={() => setShowPreview(false)}
                />
            )}

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />
        </div>
    );
}
