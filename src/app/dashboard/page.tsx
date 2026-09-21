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
import { offlineDb } from '@/lib/offlineDb';
import { syncManager } from '@/lib/syncManager';
import OfflineIndicator from '@/components/OfflineIndicator';
import {
    Layout, Grid, FileText, Menu, Settings, X, Search, Plus,
    Share2, Folder, ChevronRight, ChevronDown, MoreVertical,
    Trash2, Save, Moon, Sun, Home, Activity, Lock, Maximize,
    Clock, Calendar, Minimize2, Box, List, Network, BarChart3,
    CalendarClock, HelpCircle, Maximize2, LogOut, SlidersHorizontal
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
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
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
            // Respaldar en IndexedDB para disponibilidad sin conexión
            await offlineDb.saveProjects(data.projects);
        } catch (error) {
            console.warn('Conexión con servidor fallida, cargando proyectos desde IndexedDB:', error);
            const cached = await offlineDb.getProjects();
            if (cached && cached.length > 0) {
                setProjects(cached);
            }
        }
    };

    const createProject = async (title: string, description?: string, settings?: any, coverImage?: string) => {
        const tempId = 'temp_proj_' + Date.now();
        const newProj: Project = {
            _id: tempId,
            title,
            description: description || '',
            settings,
            coverImage,
            createdAt: new Date().toISOString()
        };

        // Guardado optimista en estado y en IndexedDB
        setProjects(prev => [...prev, newProj]);
        selectProject(newProj);
        await offlineDb.saveSingleProject(newProj);

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: description || '', settings, coverImage }),
            });

            if (!res.ok) throw new Error('Error al crear proyecto');

            const data = await res.json();
            setProjects(prev => prev.map(p => p._id === tempId ? data.project : p));
            if (currentProject?._id === tempId) {
                setCurrentProject(data.project);
            }
            await offlineDb.deleteProject(tempId);
            await offlineDb.saveSingleProject(data.project);
        } catch (error) {
            console.warn('Modo Offline: Encolando creación de proyecto', error);
            await offlineDb.enqueueMutation({
                type: 'create_project',
                entityId: tempId,
                payload: { title, description: description || '', settings, coverImage }
            });
            syncManager.refreshPendingCount();
        }
    };

    const updateProject = async (projectId: string, updates: any) => {
        // Optimistic Update
        if (currentProject?._id === projectId) {
            setCurrentProject(prev => prev ? { ...prev, ...updates } : null);
        }
        setProjects(prev => prev.map(p => p._id === projectId ? { ...p, ...updates } : p));

        // Guardar localmente de inmediato
        const target = projects.find(p => p._id === projectId);
        if (target) {
            await offlineDb.saveSingleProject({ ...target, ...updates });
        }

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
            setCurrentProject(data.project);
            await offlineDb.saveSingleProject(data.project);
        } catch (error) {
            console.warn('Modo Offline: Encolando actualización de proyecto', error);
            await offlineDb.enqueueMutation({
                type: 'update_project',
                entityId: projectId,
                payload: updates
            });
            syncManager.refreshPendingCount();
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
        setProjects(prev => prev.filter(p => p._id !== projectId));
        if (currentProject?._id === projectId) {
            setCurrentProject(null);
        }
        await offlineDb.deleteProject(projectId);

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Error al eliminar proyecto en servidor');
        } catch (error) {
            console.warn('Modo Offline: Encolando eliminación de proyecto', error);
            await offlineDb.enqueueMutation({
                type: 'delete_project',
                entityId: projectId,
                payload: {}
            });
            syncManager.refreshPendingCount();
        }
    };

    const selectProject = async (project: Project) => {
        setCurrentProject(project);
        localStorage.setItem('arcano_last_project', project._id); // Save Session

        let filesList: FileNode[] = [];
        try {
            const res = await fetch(`/api/files?projectId=${project._id}`);
            if (res.ok) {
                const data: { files: FileNode[] } = await res.json();
                filesList = data.files;
                // Guardar en IndexedDB para disponibilidad offline
                await offlineDb.saveFiles(filesList, project._id);
            } else {
                throw new Error('Respuesta fallida del servidor');
            }
        } catch (e) {
            console.warn('Modo Offline: Cargando archivos desde IndexedDB local', e);
            filesList = await offlineDb.getFilesByProject(project._id);
        }

        // Restore Last File for this project
        const lastFileId = localStorage.getItem(`arcano_last_file_${project._id}`);
        let storedFile = null;
        if (lastFileId) {
            storedFile = filesList.find(f => f._id === lastFileId);
        }

        // Check/Create "Extras" folder if connected
        const extrasFolder = filesList.find(f => f.isSystem && f.title === 'Extras');
        if (!extrasFolder && syncManager.isOnline) {
            try {
                const createRes = await fetch('/api/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Extras',
                        projectId: project._id,
                        type: 'folder',
                        parent: null,
                        isSystem: true
                    }),
                });
                if (createRes.ok) {
                    const newData = await createRes.json();
                    filesList.push(newData.file);
                    await offlineDb.saveSingleFile(newData.file, project._id);
                }
            } catch (e) { console.error("Error creating Extras folder", e); }
        }

        // Check/Create "Sandbox" folder if connected
        const sandboxFolder = filesList.find(f => f.isSystem && f.title === 'Sandbox');
        if (!sandboxFolder && syncManager.isOnline) {
            try {
                const createRes = await fetch('/api/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Sandbox',
                        projectId: project._id,
                        type: 'folder',
                        parent: null,
                        isSystem: true
                    }),
                });
                if (createRes.ok) {
                    const newData = await createRes.json();
                    filesList.push(newData.file);
                    await offlineDb.saveSingleFile(newData.file, project._id);
                }
            } catch (e) { console.error("Error creating Sandbox folder", e); }
        }

        setFiles(filesList);

        // If we restored a file, select it now (after setting files)
        if (storedFile) {
            setCurrentFile(storedFile);
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            }
        } else {
            setCurrentFile(null);
            // En móvil, si no hay archivo abierto, abrir el Binder para que el usuario elija
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(true);
            }
        }
        setView('editor');
    };

    const createFile = async (title: string, type: string = 'file', parentId: string | null = null) => {
        if (!currentProject) {
            alert('Primero selecciona un proyecto de la lista.');
            return;
        }

        const tempId = 'temp_file_' + Date.now();
        const newFileDoc: FileNode = {
            _id: tempId,
            title,
            type: type as any,
            parent: parentId,
            content: '',
            order: files.length,
            status: 'draft',
            wordCount: 0
        };

        const newFiles = [...files, newFileDoc];
        setFiles(newFiles);
        await offlineDb.saveSingleFile(newFileDoc, currentProject._id);

        // Only select if it's a file, not a folder
        if (type === 'file') {
            setCurrentFile(newFileDoc);
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            }
            setView('editor');
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
            setFiles(prev => prev.map(f => f._id === tempId ? data.file : f));
            if (currentFile?._id === tempId) {
                setCurrentFile(data.file);
            }
            await offlineDb.deleteSingleFile(tempId);
            await offlineDb.saveSingleFile(data.file, currentProject._id);
            return data.file;
        } catch (error) {
            console.warn('Modo Offline: Creación de archivo encolada', error);
            await offlineDb.enqueueMutation({
                type: 'create_file',
                entityId: tempId,
                projectId: currentProject._id,
                payload: {
                    title,
                    projectId: currentProject._id,
                    type,
                    parent: parentId
                }
            });
            syncManager.refreshPendingCount();
            return newFileDoc;
        }
    };

    const updateFile = async (fileId: string, updates: any) => {
        const previousFiles = files;
        const previousCurrentFile = currentFile;

        const updatedFiles = files.map(f => f._id === fileId ? { ...f, ...updates } : f);
        setFiles(updatedFiles);
        if (currentFile?._id === fileId) {
            setCurrentFile(prev => prev ? { ...prev, ...updates } : null);
        }

        // Guardado local inmediato en IndexedDB (cero latencia)
        const target = updatedFiles.find(f => f._id === fileId);
        if (target && currentProject) {
            await offlineDb.saveSingleFile(target, currentProject._id);
        }

        try {
            const res = await fetch(`/api/files/${fileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error('Error al actualizar archivo en servidor');
        } catch (error) {
            console.warn('Modo Offline: Actualización de archivo encolada', error);
            await offlineDb.enqueueMutation({
                type: 'update_file',
                entityId: fileId,
                projectId: currentProject?._id,
                payload: updates
            });
            syncManager.refreshPendingCount();
        }
    };

    const selectFile = (file: FileNode) => {
        setCurrentFile(file);
        if (currentProject) {
            localStorage.setItem(`arcano_last_file_${currentProject._id}`, file._id); // Save File Session per project
        }
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
        setView('editor');
    };

    const onReorder = async (newFiles: FileNode[]) => {
        setFiles(newFiles);
        if (currentProject) {
            await offlineDb.saveFiles(newFiles, currentProject._id);
        }
        try {
            await fetch('/api/files', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFiles),
            });
        } catch (error) {
            console.warn('Modo Offline: Orden de archivos guardado localmente');
        }
    };

    const deleteFile = async (fileId: string) => {
        setFiles(prev => prev.filter(f => f._id !== fileId));
        if (currentFile?._id === fileId) {
            setCurrentFile(null);
            setView('editor');
        }
        await offlineDb.deleteSingleFile(fileId);

        try {
            const res = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Error al eliminar archivo');
        } catch (error) {
            console.warn('Modo Offline: Eliminación de archivo encolada', error);
            await offlineDb.enqueueMutation({
                type: 'delete_file',
                entityId: fileId,
                payload: {}
            });
            syncManager.refreshPendingCount();
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
        <div className="flex bg-neutral-900 min-h-[100dvh] w-full max-w-full overflow-x-hidden">
            {/* Sidebar Toggle for Mobile */}
            {!isZenMode && (
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden fixed top-3.5 left-3.5 z-50 p-2.5 bg-neutral-800/90 backdrop-blur border border-white/10 rounded-xl text-white shadow-xl active:scale-95 transition-all"
                    aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir explorador'}
                >
                    {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            )}

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
            <div className="flex-1 min-w-0 w-full max-w-full flex flex-col relative z-0 overflow-x-hidden">
                {/* ... Header ... */}
                {!isZenMode && (
                    <div className="h-14 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-2 sm:px-4 min-w-0 w-full max-w-full gap-1 sm:gap-2">
                        {/* Left Controls */}
                        <div className="flex gap-1 sm:gap-2 items-center shrink-0">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-1 sm:-ml-2 mr-1 sm:mr-2 md:hidden hover:bg-white/10 rounded-md text-gray-400"
                            >
                                <Menu size={20} />
                            </button>
                            <button
                                onClick={() => setCurrentProject(null)}
                                className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                                title="Volver al Inicio (Cerrar Proyecto)"
                            >
                                <Home size={20} />
                            </button>
                        </div>

                        {/* View Modes Switcher: scrollable horizontally without pushing container */}
                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg overflow-x-auto no-scrollbar shrink min-w-0 max-w-[42vw] sm:max-w-none">
                            <button
                                onClick={() => setView('editor')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'editor' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Layout size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setView('corkboard');
                                }}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'corkboard' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setView('outliner')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'outliner' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Esquema"
                            >
                                <List size={18} />
                            </button>

                            <button
                                onClick={() => setView('analytics')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'analytics' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Análisis Narrativo"
                            >
                                <BarChart3 size={18} />
                            </button>
                            <button
                                onClick={() => setView('timeline')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'timeline' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Línea de Tiempo"
                            >
                                <CalendarClock size={18} />
                            </button>
                            <button
                                onClick={() => setView('canvas')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'canvas' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Corcho Libre (Canvas)"
                            >
                                <Maximize size={18} />
                            </button>
                            <button
                                onClick={() => setView('sandbox')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'sandbox' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Caja de Arena (Sandbox)"
                            >
                                <Box size={18} />
                            </button>
                            <button
                                onClick={() => setView('graph')}
                                className={`p-2 rounded-md transition-all shrink-0 ${view === 'graph' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Grafo de Relaciones"
                            >
                                <Network size={18} />
                            </button>
                        </div>

                        {/* Right side header: responsive items */}
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            <OfflineIndicator />
                            {currentProject && (
                                <div className="hidden lg:block">
                                    <GoalWidget project={currentProject} />
                                </div>
                            )}

                            <div className="hidden md:block text-xs font-mono text-gray-500 bg-black/20 px-2 py-1 rounded border border-white/5" title="Total del Proyecto">
                                {files.reduce((acc, f) => acc + (f.wordCount || 0), 0).toLocaleString()} palabras
                            </div>
                            <div className="hidden xl:block text-sm font-medium text-gray-400 max-w-[160px] truncate">
                                {currentProject?.title} / {currentFile?.title || (selectedFolder ? files.find(f => f._id === selectedFolder)?.title : 'Raíz')}
                            </div>
                            {/* Inspector mobile toggle button */}
                            <button
                                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                                className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isInspectorOpen ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'}`}
                                title="Inspector de Escena (Detalles, Tiempo, Análisis)"
                            >
                                <SlidersHorizontal size={14} />
                                <span>Detalles</span>
                            </button>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Configuración del Proyecto (Variables #)"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                onClick={() => setIsFeedbackOpen(true)}
                                className="hidden sm:block p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Enviar Comentarios / Reportar Error"
                            >
                                <HelpCircle size={18} />
                            </button>
                            <div className="hidden sm:block h-6 w-px bg-white/10 mx-1" />
                            <button
                                onClick={() => setIsZenMode(true)}
                                className="hidden sm:block p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                                title="Modo Zen (Pantalla Completa)"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="hidden sm:block p-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                title="Cerrar Sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Workspace */}
                <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden relative flex flex-col">
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
                                onOpenInspector={() => setIsInspectorOpen(true)}
                            />
                        ) : (
                            <div className="flex bg-neutral-900 flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 max-w-sm w-full shadow-2xl backdrop-blur-sm">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                                        <FileText size={24} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Comienza a escribir</h3>
                                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                        Selecciona una escena existente en tu manuscrito o crea una nueva para redactar.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => setIsSidebarOpen(true)}
                                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-98"
                                        >
                                            <Folder size={16} /> Abrir Binder / Explorador
                                        </button>
                                        <button
                                            onClick={() => createFile('Nueva Escena', 'file')}
                                            className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-98"
                                        >
                                            <Plus size={16} /> + Crear Nueva Escena
                                        </button>
                                    </div>
                                </div>
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

            {/* Floating Inspector FAB on Mobile */}
            {currentFile && !isInspectorOpen && !isZenMode && (
                <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="lg:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-sm rounded-full shadow-2xl shadow-blue-600/60 border border-white/20 transition-all cursor-pointer"
                    title="Ver Ficha y Detalles de la Escena"
                >
                    <SlidersHorizontal size={16} />
                    <span>Ficha de Escena</span>
                </button>
            )}

            {/* Mobile Inspector Backdrop Overlay */}
            {isInspectorOpen && !isZenMode && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsInspectorOpen(false)}
                />
            )}

            {/* Inspector: Docked on Desktop, Drawer on Mobile */}
            {!isZenMode && (
                <div className={`
                    fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-neutral-900 border-l border-white/10 shadow-2xl transition-transform duration-200 ease-in-out
                    ${isInspectorOpen ? 'translate-x-0' : 'translate-x-full'}
                    lg:relative lg:translate-x-0 lg:w-72 lg:z-auto lg:bg-white/5 lg:backdrop-blur-xl lg:shadow-none
                    flex flex-col h-full
                `}>
                    <Inspector
                        file={currentFile}
                        onSave={handleFileSave}
                        allFiles={files}
                        projectSettings={currentProject?.settings}
                        onClose={() => setIsInspectorOpen(false)}
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
