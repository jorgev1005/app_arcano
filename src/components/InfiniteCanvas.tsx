'use client';

import { useState, useRef, useEffect } from 'react';
import { FileNode } from '@/types/models';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { FileText, Folder, User, MapPin, Package, GripVertical, ZoomIn, ZoomOut, Focus } from 'lucide-react';

interface InfiniteCanvasProps {
    files: FileNode[];
    onUpdateFile: (fileId: string, updates: any) => void;
    onSelectFile: (file: FileNode) => void;
    initialScale?: number;
    initialOffset?: { x: number, y: number };
    onSaveCanvasState?: (state: { scale: number, offset: { x: number, y: number } }) => void;
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

const CanvasItem = ({ file, scale, isConnecting, onConnectStart, onConnectEnd }: {
    file: FileNode;
    scale: number;
    isConnecting?: boolean;
    onConnectStart?: (id: string) => void;
    onConnectEnd?: (id: string) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file._id,
        data: { ...file }
    });

    // We only apply the transform during dragging (CSS.Translate breaks position during rendering if applied permanently)
    const style = {
        transform: CSS.Translate.toString(transform),
        left: (file.position?.x || 0) * scale,
        top: (file.position?.y || 0) * scale,
        position: 'absolute' as 'absolute',
        width: 200 * scale,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'character': return <User size={16} className="text-purple-400" />;
            case 'location': return <MapPin size={16} className="text-green-400" />;
            case 'folder': return <Folder size={16} className="text-blue-400" />;
            case 'item': return <Package size={16} className="text-orange-400" />;
            default: return <FileText size={16} className="text-gray-400" />;
        }
    };

    // Semantic Zoom Logic (Level of Detail)
    const showSynopsis = scale >= 0.8;
    const showTitle = scale >= 0.4;

    // Calculate dynamic styles based on scale to preserve relative visuals without microscopic text
    // Instead of shrinking text linearly, we switch modes or fix sizes relative to the card

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            // Dynamic border and shadow thickness could be added here if needed
            className={`
                bg-neutral-800 border rounded-lg shadow-xl overflow-hidden group 
                hover:border-purple-500/50 hover:shadow-2xl transition-colors cursor-grab active:cursor-grabbing
                ${!showTitle ? 'flex items-center justify-center bg-neutral-700' : ''}
                ${isConnecting ? 'ring-2 ring-yellow-400 border-yellow-400' : 'border-white/10'}
            `}
            data-no-drag="true"
            onClick={(e) => {
                if (e.shiftKey) {
                    e.stopPropagation();
                    if (onConnectStart) onConnectStart(file._id);
                    if (onConnectEnd) onConnectEnd(file._id);
                }
            }}
        >
            {showTitle ? (
                <>
                    <div className="bg-neutral-900/50 p-2 flex items-center justify-between border-b border-white/5 handle"
                        style={{ padding: `${8 * scale}px` }} // Scale padding slightly
                    >
                        <div className="flex items-center gap-2 font-medium text-gray-300" style={{ fontSize: `${Math.max(12 * scale, 10)}px` }}>
                            {getIcon(file.type)}
                            <span className="truncate">{file.title}</span>
                        </div>
                        {scale > 0.6 && <GripVertical size={14 * scale} className="text-gray-600" />}
                    </div>

                    {showSynopsis && (
                        <div
                            className="p-3 text-gray-400 h-24 overflow-hidden leading-relaxed"
                            style={{
                                padding: `${12 * scale}px`,
                                fontSize: `${Math.max(10 * scale, 8)}px` // Clamp min font size
                            }}
                        >
                            {file.synopsis || file.content?.substring(0, 100) || <span className="italic opacity-50">Sin contenido...</span>}
                        </div>
                    )}
                </>
            ) : (
                // Low LOD View (Bird's Eye) - Just Icon/Color
                <div className="w-full h-full flex items-center justify-center p-1" title={file.title}>
                    {getIcon(file.type)}
                </div>
            )}
        </div>
    );
};

export default function InfiniteCanvas({ files, onUpdateFile, onSelectFile, initialScale = 1, initialOffset = { x: 0, y: 0 }, onSaveCanvasState }: InfiniteCanvasProps) {
    const [offset, setOffset] = useState(initialOffset);
    const [scale, setScale] = useState(initialScale);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [connectingSource, setConnectingSource] = useState<string | null>(null); // ID of source card
    const canvasRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // Initial load: If all positions are 0,0, scatter them a bit or layout grid?
    // For now, let's just render them. 0,0 is top-left.

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();

            // Calculate cursor position relative to canvas
            // We need the rect to get precise offset
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate world point under cursor before zoom
            const worldX = (mouseX - offset.x) / scale;
            const worldY = (mouseY - offset.y) / scale;

            const delta = e.deltaY * -0.001;
            const newScale = Math.min(Math.max(scale + delta, 0.1), 3);

            // Calculate new offset to keep world point under cursor
            const newOx = mouseX - (worldX * newScale);
            const newOy = mouseY - (worldY * newScale);

            setScale(newScale);
            setOffset({ x: newOx, y: newOy });

            if (onSaveCanvasState) {
                // Debounce this ideally, but simpliest way for now
                onSaveCanvasState({ scale: newScale, offset: { x: newOx, y: newOy } });
            }
        } else {
            e.preventDefault(); // Prevent native browser scrolling
            // Pan
            const newOffset = {
                x: offset.x - e.deltaX,
                y: offset.y - e.deltaY
            };
            setOffset(newOffset);

            if (onSaveCanvasState) {
                onSaveCanvasState({ scale, offset: newOffset });
            }
        }
    };

    const visibleFiles = files.filter(f => !f.isSystem && f.type !== 'trash' && f.type !== 'folder');

    const fitContent = () => {
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
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });

        // Add card dimensions (approx 200x150)
        maxX += 200;
        maxY += 150;

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;

        // Viewport dimensions
        const rect = canvasRef.current?.parentElement?.getBoundingClientRect();
        if (!rect) return;

        const padding = 100;
        const availableW = rect.width - padding;
        const availableH = rect.height - padding;

        const scaleX = availableW / width;
        const scaleY = availableH / height;
        const newScale = Math.min(Math.min(scaleX, scaleY), 1); // Don't zoom in too much

        const newOffset = {
            x: (rect.width / 2) - (centerX * newScale),
            y: (rect.height / 2) - (centerY * newScale)
        };

        setScale(newScale);
        setOffset(newOffset);
        if (onSaveCanvasState) onSaveCanvasState({ scale: newScale, offset: newOffset });
    };

    const handleNodeClick = (id: string) => {
        if (!connectingSource) {
            // Start connection
            setConnectingSource(id);
        } else {
            // Complete connection
            if (connectingSource !== id) {
                // Find source file
                const source = files.find(f => f._id === connectingSource);
                if (source) {
                    const currentLinks = source.links || [];
                    const targetFile = files.find(f => f._id === id);

                    if (currentLinks.includes(id)) {
                        // Toggle OFF (Delete Link)
                        const newLinks = currentLinks.filter(l => l !== id && (typeof l !== 'object' || (l as any)._id !== id));
                        onUpdateFile(connectingSource, { links: newLinks });

                        // Also remove semantic relationship if it exists
                        // logic: if one is char and other is scene, remove char from scene list
                        if (targetFile) {
                            const isSourceChar = source.type === 'character';
                            const isTargetChar = targetFile.type === 'character';
                            const isSourceScene = source.type === 'file' || source.type === 'text';
                            const isTargetScene = targetFile.type === 'file' || targetFile.type === 'text';

                            // Case 1: Source=Char, Target=Scene
                            if (isSourceChar && isTargetScene) {
                                const currentChars = targetFile.sceneData?.characters || [];
                                if (currentChars.includes(source._id)) {
                                    onUpdateFile(targetFile._id, { sceneData: { ...targetFile.sceneData, characters: currentChars.filter(c => c !== source._id) } });
                                }
                            }
                            // Case 2: Source=Scene, Target=Char
                            if (isSourceScene && isTargetChar) {
                                const currentChars = source.sceneData?.characters || [];
                                if (currentChars.includes(targetFile._id)) {
                                    onUpdateFile(source._id, { sceneData: { ...source.sceneData, characters: currentChars.filter(c => c !== targetFile._id) } });
                                }
                            }
                        }

                    } else {
                        // Toggle ON (Add Link)
                        onUpdateFile(connectingSource, { links: [...currentLinks, id] });

                        // Add Semantic Relationship
                        if (targetFile) {
                            const isSourceChar = source.type === 'character';
                            const isTargetChar = targetFile.type === 'character';
                            const isSourceScene = source.type === 'file' || source.type === 'text';
                            const isTargetScene = targetFile.type === 'file' || targetFile.type === 'text';

                            // Case 1: Source=Char, Target=Scene
                            if (isSourceChar && isTargetScene) {
                                const currentChars = targetFile.sceneData?.characters || [];
                                if (!currentChars.includes(source._id)) {
                                    // Update Scene to include Character
                                    onUpdateFile(targetFile._id, { sceneData: { ...targetFile.sceneData, characters: [...currentChars, source._id] } });
                                }
                            }
                            // Case 2: Source=Scene, Target=Char
                            if (isSourceScene && isTargetChar) {
                                const currentChars = source.sceneData?.characters || [];
                                if (!currentChars.includes(targetFile._id)) {
                                    // Update Scene to include Character
                                    onUpdateFile(source._id, { sceneData: { ...source.sceneData, characters: [...currentChars, targetFile._id] } });
                                }
                            }
                        }
                    }
                }
            }
            setConnectingSource(null);
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // If clicking background and connecting, cancel connection
        if (connectingSource && !(e.target as HTMLElement).closest('[data-no-drag]')) {
            setConnectingSource(null);
            return;
        }

        // middleware to ensure we are clicking on background
        if ((e.target as HTMLElement).closest('[data-no-drag]')) return;

        setIsDraggingCanvas(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    // Use effect to handle global mouse move/up when dragging canvas
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!isDraggingCanvas) return;
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        };

        const handleWindowMouseUp = () => {
            if (isDraggingCanvas) {
                setIsDraggingCanvas(false);
                if (onSaveCanvasState) {
                    onSaveCanvasState({ scale, offset });
                }
            }
        };

        if (isDraggingCanvas) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isDraggingCanvas, offset, scale, onSaveCanvasState]); // dependencies needed for closure state


    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        const id = active.id as string;
        const file = files.find(f => f._id === id);

        if (file) {
            // Calculate new position relative to canvas origin (0,0 is offset x,y)
            const newX = (file.position?.x || 0) + (delta.x / scale);
            const newY = (file.position?.y || 0) + (delta.y / scale);

            onUpdateFile(id, { position: { x: newX, y: newY } });
        }
    };



    return (
        <div
            ref={canvasRef}
            className="relative w-full h-full overflow-hidden bg-neutral-900 select-none"
            onMouseDown={handleCanvasMouseDown}
            onWheel={handleWheel}
        >
            {/* Background Grid */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #444 1px, transparent 1px)',
                    backgroundSize: `${30 * scale}px ${30 * scale}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`
                }}
            />

            {/* Connections Layer (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: '0 0'
                }}
            >
                {visibleFiles.map(file => {
                    if (!file.links || file.links.length === 0) return null;

                    const start = getCardCenter(file, scale);

                    return file.links.map(linkId => {
                        // linkId might be an object if populated, handle both
                        const targetId = typeof linkId === 'object' ? (linkId as any)._id : linkId;
                        const target = files.find(f => f._id === targetId);
                        if (!target) return null;

                        const end = getCardCenter(target, scale);

                        return (
                            <line
                                key={`${file._id}-${targetId}`}
                                x1={start.x} y1={start.y}
                                x2={end.x} y2={end.y}
                                stroke="#666"
                                strokeWidth="2"
                                strokeOpacity="0.6"
                            />
                        );
                    });
                })}

                {/* Pending Connection Line (could be added here tracking mouse pos) */}
            </svg>

            {/* Controls */}
            <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 bg-neutral-800 rounded-lg border border-white/10 p-1 shadow-lg" data-no-drag>
                <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                    <ZoomIn size={18} />
                </button>
                <div className="text-xs text-center font-mono text-gray-500">{Math.round(scale * 100)}%</div>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                    <ZoomOut size={18} />
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button onClick={fitContent} className="p-2 hover:bg-white/10 rounded text-purple-400 hover:text-white" title="Centrar Contenido">
                    <Focus size={18} />
                </button>
            </div>

            {/* Canvas Area */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div
                    className="absolute inset-0 cursor-default"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                        transformOrigin: '0 0',
                    }}
                // onMouseMove and onMouseUp handled globally by useEffect
                >
                    {visibleFiles.map(file => (
                        <CanvasItem
                            key={file._id}
                            file={file}
                            scale={scale}
                            isConnecting={connectingSource === file._id}
                            onConnectStart={() => handleNodeClick(file._id)}
                        // We use same handler, logic inside differentiates start/end based on state
                        />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}
