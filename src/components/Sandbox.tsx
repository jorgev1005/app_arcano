'use client';

import { useState, useRef, useEffect } from 'react';
import { FileNode } from '@/types/models';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { FileText, Folder, User, MapPin, Package, GripVertical, ZoomIn, ZoomOut, Focus, Lightbulb, Trash2 } from 'lucide-react';

interface SandboxProps {
    files: FileNode[];
    onUpdateFile: (fileId: string, updates: any) => void;
    onSelectFile: (file: FileNode) => void;
    createFile: (title: string, type: 'idea' | 'file', parentId: string | null) => Promise<FileNode | void>;
    deleteFile: (fileId: string) => Promise<void>;
    projectId?: string;
}

// Helper to get center of a card
const getCardCenter = (file: FileNode, scale: number) => {
    // Dynamic height estimation based on LOD thresholds
    // High Detail (>= 0.8): Header + Synopsis (~150px unscaled)
    // Med Detail (>= 0.4): Header only (~50px unscaled)
    // Low Detail (< 0.4): Icon only (Square-ish or Aspect Ratio?)

    // NOTE: The width is rendered as 200 * scale. 
    // The "unscaled" coordinate system assumes width 200.

    let estimatedHeight = 50;
    if (scale >= 0.8) estimatedHeight = 150;
    else if (scale >= 0.4) estimatedHeight = 50;
    else estimatedHeight = 50; // Low detail is often squarish approx

    return {
        x: (file.position?.x || 0) + 100, // Center of fixed 200 width
        y: (file.position?.y || 0) + (estimatedHeight / 2)
    };
};

const SandboxNode = ({ file, scale, isSelected, isConnecting, isEditing, onConnectStart, onToggleSelect, onUpdate, onDelete, onEditStart, onEditEnd }: {
    file: FileNode;
    scale: number;
    isSelected: boolean;
    isConnecting: boolean;
    isEditing: boolean;
    onConnectStart: () => void;
    onToggleSelect: (ctrl: boolean, shift: boolean) => void;
    onUpdate: (updates: any) => void;
    onDelete: () => void;
    onEditStart: () => void;
    onEditEnd: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file._id,
        disabled: isEditing // Disable drag while editing text
    });

    const [tempTitle, setTempTitle] = useState(file.title);
    const [tempContent, setTempContent] = useState(file.content || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [tempContent, isEditing]);

    // Sync when entering edit mode or file updates externally
    useEffect(() => {
        setTempTitle(file.title);
        setTempContent(file.content || '');
    }, [isEditing, file.title, file.content]);

    const handleSave = () => {
        if (tempTitle !== file.title || tempContent !== (file.content || '')) {
            onUpdate({ title: tempTitle, content: tempContent });
        }
        onEditEnd();
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                // Scaled Container Mode:
                // Parent div has scale(scale).
                left: Math.round(file.position?.x || 0),
                top: Math.round(file.position?.y || 0),
                transform: `translate3d(${(isDragging && transform ? transform.x : 0) / scale}px, ${(isDragging && transform ? transform.y : 0) / scale}px, 0)`,
                position: 'absolute',
                width: 200,
                minHeight: 160,
                zIndex: isDragging ? 100 : (isSelected ? 50 : 1),
                opacity: isDragging ? 0.8 : 1,
                willChange: 'transform, left, top'
            }}
            {...listeners}
            {...attributes}
            className={`flex flex-col p-4 bg-yellow-200 text-black shadow-2xl shadow-black/40 origin-top-left transition-shadow hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                ${isSelected ? 'ring-4 ring-blue-500 rotate-1' : '-rotate-1 hover:rotate-0'}
                ${isConnecting ? 'ring-4 ring-orange-500' : ''}
            `}
            onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(e.ctrlKey || e.metaKey, e.shiftKey);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onEditStart();
            }}
            data-node-drag="true"
        >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-yellow-300/50 blur-sm rounded-full pointer-events-none" />

            {isEditing ? (
                <div className="flex flex-col gap-2 cursor-text" onPointerDown={e => e.stopPropagation()}>
                    <input
                        value={tempTitle}
                        onChange={e => setTempTitle(e.target.value)}
                        onBlur={handleSave}
                        className="font-handwriting font-bold text-lg bg-transparent border-none focus:outline-none rounded px-1 -ml-1 w-full"
                        autoFocus
                    />
                    <textarea
                        ref={textareaRef}
                        value={tempContent}
                        onChange={e => setTempContent(e.target.value)}
                        onBlur={handleSave}
                        className="w-full resize-none bg-transparent border-none focus:outline-none rounded text-sm font-handwriting p-1 -ml-1 overflow-hidden whitespace-pre-wrap"
                        placeholder="Escribe tu idea..."
                        rows={3}
                        style={{ minHeight: '4rem' }}
                    />
                </div>
            ) : (
                <>
                    <h4 className="font-handwriting font-bold text-lg mb-2 leading-tight opacity-90 select-none pointer-events-none break-words">{file.title}</h4>
                    <p className="text-sm opacity-80 flex-1 font-handwriting select-none pointer-events-none whitespace-pre-wrap break-words">{file.content || '...'}</p>

                    <div className="mt-2 flex justify-between opacity-50 hover:opacity-100">
                        <button
                            onPointerDown={(e) => { e.stopPropagation(); onConnectStart(); }}
                            className="cursor-crosshair p-1 hover:bg-black/10 rounded"
                            title="Conectar"
                        >
                            <GripVertical size={14} />
                        </button>
                        <button
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Seguro que quieres eliminar esta idea?')) {
                                    onDelete();
                                }
                            }}
                            className="p-1 hover:bg-red-500/20 hover:text-red-600 rounded text-red-400"
                            title="Eliminar"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default function Sandbox({ files, onUpdateFile, onSelectFile, createFile, deleteFile, projectId }: SandboxProps) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [connectingSource, setConnectingSource] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [synthesisLength, setSynthesisLength] = useState<'short' | 'medium' | 'long'>('medium');
    const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // Filter ONLY Sandbox items (children of Sandbox folder)
    const sandboxFolder = files.find(f => f.isSystem && f.title === 'Sandbox');
    const visibleFiles = files.filter(f => f.parent === sandboxFolder?._id);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldX = (mouseX - offset.x) / scale;
            const worldY = (mouseY - offset.y) / scale;
            const delta = e.deltaY * -0.001;
            const newScale = Math.min(Math.max(scale + delta, 0.2), 3);
            const newOx = mouseX - (worldX * newScale);
            const newOy = mouseY - (worldY * newScale);
            setScale(newScale);
            setOffset({ x: newOx, y: newOy });
        } else {
            e.preventDefault();
            setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleCreateIdea = async () => {
        if (!sandboxFolder) return;

        // Calculate center position
        const rect = canvasRef.current?.getBoundingClientRect();
        const centerX = rect ? (rect.width / 2 - offset.x) / scale : 0;
        const centerY = rect ? (rect.height / 2 - offset.y) / scale : 0;

        await createFile('Nueva Idea', 'idea', sandboxFolder._id);
        // We need to wait for file to exist to move it? 
        // Actually createFile usually returns void or promise. 
        // Ideally we'd update its position immediately, but we don't catch the ID here effortlessly without changing createFile return.
        // For now, let it spawn at 0,0 or handle drag later.
        // Alternatively, we look for the newest file?
    };

    const handleNodeClick = (id: string, ctrlKey: boolean, shiftKey: boolean) => {
        if (connectingSource) {
            // Complete connection logic (same as InfiniteCanvas but simplified?)
            // ... (keep semantic linking if needed, or just visual)
            if (connectingSource !== id) {
                const source = files.find(f => f._id === connectingSource);
                if (source) {
                    const currentLinks = source.links || [];
                    if (currentLinks.includes(id)) {
                        const newLinks = currentLinks.filter(l => l !== id && (typeof l !== 'object' || (l as any)._id !== id));
                        onUpdateFile(connectingSource, { links: newLinks });
                    } else {
                        onUpdateFile(connectingSource, { links: [...currentLinks, id] });
                    }
                }
            }
            setConnectingSource(null);
            return;
        }

        if (ctrlKey || shiftKey) {
            // Add/Remove from selection
            if (selectedIds.includes(id)) {
                setSelectedIds(prev => prev.filter(sid => sid !== id));
            } else {
                setSelectedIds(prev => [...prev, id]);
            }
        } else {
            // Select single
            if (selectedIds.includes(id) && selectedIds.length === 1) {
                // Already selected
            } else {
                setSelectedIds([id]);
                // Removed onSelectFile(files.find(f => f._id === id)!); to prevent opening Editor view
            }
        }
    };

    const handleCenterView = () => {
        if (visibleFiles.length === 0) {
            setOffset({ x: 0, y: 0 });
            setScale(1);
            return;
        }

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        visibleFiles.forEach(f => {
            const x = f.position?.x || 0;
            const y = f.position?.y || 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + 200); // 200 is node width
            maxY = Math.max(maxY, y + 160); // 160 is node height
        });

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 100;

        // Determine usage scale to fit content
        const scaleX = (rect.width - padding * 2) / contentWidth;
        const scaleY = (rect.height - padding * 2) / contentHeight;
        const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.5); // Cap between 0.2 and 1.5

        // Center point in world space
        const centerX = minX + contentWidth / 2;
        const centerY = minY + contentHeight / 2;

        // Screen center
        const screenCX = rect.width / 2;
        const screenCY = rect.height / 2;

        const newOx = screenCX - (centerX * newScale);
        const newOy = screenCY - (centerY * newScale);

        setScale(newScale);
        setOffset({ x: newOx, y: newOy });
    };

    // AI Synthesis Logic
    const handleSynthesize = async () => {
        if (selectedIds.length < 2) return;
        setIsSynthesizing(true);

        try {
            const selectedFiles = files.filter(f => selectedIds.includes(f._id));
            const ideas = selectedFiles.map(f => f.content || f.title); // Use content, fallback to title

            const res = await fetch('/api/ai/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ideas, length: synthesisLength })
            });

            if (!res.ok) throw new Error('Error en síntesis');

            const data = await res.json();
            setSynthesisResult(data.result);
        } catch (error) {
            console.error(error);
            alert('Error al sintetizar ideas.');
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handleCreateSceneFromSynthesis = async () => {
        if (!synthesisResult) return;
        // Create a new scene in the root or a "Drafts" folder? Root for now.
        // We actually need a way to pass content. createFile only takes title usually?
        // Wait, createFile in Dashboard calls POST with default content ''.
        // We might need a separate way to create with content or update immediately.

        const title = "Síntesis: " + new Date().toLocaleTimeString();
        // Since we can't pass content to createFile (props limitation in SandboxProps interface),
        // we will manually implement the fetch here to ensure content is saved.
        // OR we update `createFile` signature in Dashboard? 
        // Let's use the onUpdateFile logic? No, update requires ID.
        // Let's do a direct POST here.

        if (projectId) {
            try {
                // Use the prop createFile to ensure UI updates
                const newFile = await createFile(title, 'file', null); // Create in Root

                if (newFile) {
                    // Update content immediately
                    onUpdateFile(newFile._id, { content: synthesisResult });

                    alert(`✅ Escena creada: "${title}"\n\nLa encontrarás en tu Binder (Carpeta Raíz).`);
                }
            } catch (error) {
                console.error("Error creating scene:", error);
                alert("Hubo un error al crear la escena.");
            }
        }

        setSynthesisResult(null);
        setSelectedIds([]);
    };

    // ... Drag logic ...
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        const id = active.id as string;
        const file = files.find(f => f._id === id);
        if (file) {
            // Round to integer to match the rendering logic and avoid sub-pixel snaps
            const newX = Math.round((file.position?.x || 0) + (delta.x / scale));
            const newY = Math.round((file.position?.y || 0) + (delta.y / scale));
            onUpdateFile(id, { position: { x: newX, y: newY } });
        }
    };

    return (
        <div
            ref={canvasRef}
            className="relative w-full h-full overflow-hidden select-none"
            style={{ backgroundColor: '#1B263B' }} // Deep Blue as requested (e.g. Slate 900ish but bluer)
            onMouseDown={(e) => {
                // Drag canvas if clicking background (target is the div itself or the SVG layer)
                // We check if the closest draggable node is NOT what we clicked
                if (!(e.target as HTMLElement).closest('[data-node-drag]')) {
                    setIsDraggingCanvas(true);
                }
            }}
            onMouseUp={() => setIsDraggingCanvas(false)}
            onMouseMove={(e) => {
                if (isDraggingCanvas) {
                    setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
                }
            }}
            onWheel={handleWheel}
        >
            {/* Dot Pattern */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)',
                    backgroundSize: '20px 20px', // Fixed pattern size in world space? No, usually pattern scales or stays. 
                    // Let's keep pattern screen-space or scaled?
                    // Previous was 20*scale.
                    // If we use transforms on container, background might be tricky.
                    // Let's apply transform to this div too.
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0',
                    backgroundPosition: '0 0' // Offset handled by transform
                }}
            />

            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
            >
                {visibleFiles.map(file => {
                    if (!file.links) return null;
                    const start = getCardCenter(file, scale); // Re-use helper
                    return file.links.map(linkId => {
                        const targetId = typeof linkId === 'object' ? (linkId as any)._id : linkId;
                        const target = files.find(f => f._id === targetId);
                        if (!target) return null;
                        const end = getCardCenter(target, scale);
                        return (
                            <line key={`${file._id}-${targetId}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,5" />
                        );
                    });
                })}
            </svg>

            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-50 flex flex-col gap-2" data-no-drag>
                <div className="flex flex-col gap-1 bg-neutral-900/80 p-1 rounded-lg shadow-xl backdrop-blur-sm">
                    <button
                        onClick={() => {
                            const newScale = Math.min(scale + 0.1, 3);
                            // Proper center zoom would require offset adjust, simplified for button:
                            setScale(newScale);
                        }}
                        className="p-2 hover:bg-white/10 text-white rounded transition-colors"
                        title="Zoom In (+)"
                    >
                        <ZoomIn size={20} />
                    </button>
                    <button
                        onClick={() => {
                            const newScale = Math.max(scale - 0.1, 0.2);
                            setScale(newScale);
                        }}
                        className="p-2 hover:bg-white/10 text-white rounded transition-colors"
                        title="Zoom Out (-)"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <button
                        onClick={handleCenterView}
                        className="p-2 hover:bg-white/10 text-white rounded transition-colors border-t border-white/10 mt-1 pt-2"
                        title="Centrar Vista (Reset)"
                    >
                        <Focus size={20} />
                    </button>
                </div>

                <button
                    onDoubleClick={handleCreateIdea}
                    className="p-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg shadow-lg font-bold flex items-center justify-center transition-transform hover:scale-105 mt-2"
                    title="Nueva Idea (Doble Clic)"
                >
                    <Lightbulb size={24} />
                </button>

                {selectedIds.length > 1 && (
                    <div className="flex flex-col gap-1 mt-2 animate-in fade-in zoom-in">
                        <select
                            value={synthesisLength}
                            onChange={(e) => setSynthesisLength(e.target.value as any)}
                            className="p-1 text-xs bg-neutral-900/80 text-white rounded border border-white/20"
                            title="Longitud de la síntesis"
                        >
                            <option value="short">Corto</option>
                            <option value="medium">Medio</option>
                            <option value="long">Largo</option>
                        </select>
                        <button
                            onClick={handleSynthesize}
                            disabled={isSynthesizing}
                            className={`p-3 ${isSynthesizing ? 'bg-purple-800' : 'bg-purple-600 hover:bg-purple-500'} text-white rounded-lg shadow-lg font-bold flex items-center justify-center transition-colors`}
                            title="Sintetizar con IA"
                        >
                            {isSynthesizing ? <span className="animate-spin">⚡</span> : '⚡'}
                        </button>
                    </div>
                )}
            </div>

            {/* Synthesis Modal */}
            {synthesisResult && (
                <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setSynthesisResult(null)}>
                    <div className="bg-neutral-900 border border-purple-500/50 rounded-xl max-w-2xl w-full shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            ✨ Síntesis Narrativa
                        </h3>
                        <div className="bg-black/30 p-4 rounded-lg text-gray-200 text-lg leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-serif">
                            {synthesisResult}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setSynthesisResult(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(synthesisResult);
                                    alert('Copiado al portapapeles');
                                }}
                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-gray-300"
                            >
                                Copiar
                            </button>
                            <button
                                onClick={handleCreateSceneFromSynthesis}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold shadow-lg shadow-purple-900/20"
                            >
                                Crear Escena
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="absolute inset-0 cursor-default" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
                    {visibleFiles.map(file => (
                        <SandboxNode
                            key={file._id}
                            file={file}
                            scale={scale}
                            isSelected={selectedIds.includes(file._id)}
                            isConnecting={connectingSource === file._id}
                            isEditing={editingId === file._id}
                            onConnectStart={() => setConnectingSource(file._id)}
                            onToggleSelect={(ctrl, shift) => handleNodeClick(file._id, ctrl, shift)}
                            onUpdate={(updates) => onUpdateFile(file._id, updates)}
                            onDelete={() => deleteFile(file._id)}
                            onEditStart={() => setEditingId(file._id)}
                            onEditEnd={() => setEditingId(null)}
                        />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}
