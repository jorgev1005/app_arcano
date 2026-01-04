import { useMemo, useCallback, useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, Position, useNodesState, useEdgesState, addEdge, Connection, BackgroundVariant, MarkerType, Handle } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Project, FileNode } from '@/types/models';
import { Folder, FileText, User, MapPin, Package, Archive, Play, Flag, Layers, Filter, Heart, Swords, Handshake, Users as UsersIcon } from 'lucide-react';

interface GraphViewProps {
    files: FileNode[];
    onSelect: (file: FileNode) => void;
    project: Project | null;
    onSaveGraph: (data: any) => void;
}

// Custom Node Component
// Custom Node Component - Now owns the styling box
const CustomNode = ({ data, isConnectable }: any) => {
    // Style comes from data.style now
    const { background, borderColor, color, width, justifyContent, padding = '10px' } = data.style || {};

    const containerStyle = {
        background,
        border: `1px solid ${borderColor}`,
        color: color || '#fff',
        padding,
        borderRadius: '8px',
        fontSize: '12px',
        width: width || 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: justifyContent || 'flex-start',
        gap: '8px',
        position: 'relative' as const,
        minHeight: '40px'
    };

    return (
        <div style={containerStyle}>
            {/* INPUTS (Target) - Top and Left (Reading order: Enter from Top or Left) */}
            <Handle type="target" position={Position.Top} id="t-top" isConnectable={isConnectable} style={{ background: '#22c55e', width: 10, height: 10, top: -6, border: '1px solid #000' }} />
            <Handle type="target" position={Position.Left} id="t-left" isConnectable={isConnectable} style={{ background: '#22c55e', width: 10, height: 10, left: -6, border: '1px solid #000' }} />

            {/* The Node Content */}
            {data.label}

            {/* OUTPUTS (Source) - Bottom and Right (Reading order: Exit to Bottom or Right) */}
            <Handle type="source" position={Position.Bottom} id="s-bottom" isConnectable={isConnectable} style={{ background: '#a78bfa', width: 10, height: 10, bottom: -6, border: '1px solid #000' }} />
            <Handle type="source" position={Position.Right} id="s-right" isConnectable={isConnectable} style={{ background: '#a78bfa', width: 10, height: 10, right: -6, border: '1px solid #000' }} />
        </div>
    );
};

// Node Types Registry
const nodeTypes = {
    customFile: CustomNode,
};

// Custom Node Style Helper - Returns DATA object, not react-flow style
const getNodeStyleData = (type: string) => {
    // Basic defaults
    const base = { color: '#fff' };
    switch (type) {
        case 'folder': return { ...base, background: '#333', borderColor: '#555' };
        case 'start': return { ...base, background: '#14532d', borderColor: '#22c55e', width: 100, justifyContent: 'center' };
        case 'end': return { ...base, background: '#450a0a', borderColor: '#ef4444', width: 100, justifyContent: 'center' };
        case 'character': return { ...base, background: '#2e1065', borderColor: '#7c3aed' };
        case 'location': return { ...base, background: '#450a0a', borderColor: '#dc2626' };
        case 'item': return { ...base, background: '#431407', borderColor: '#d97706' };
        default: return { ...base, background: '#172554', borderColor: '#2563eb' };
    }
};

const getIcon = (type: string, isSystem: boolean) => {
    if (isSystem) return <Archive size={16} color="#c084fc" />;
    switch (type) {
        case 'folder': return <Folder size={16} color="#fbbf24" />;
        case 'start': return <Play size={16} color="#4ade80" />;
        case 'end': return <Flag size={16} color="#f87171" />;
        case 'character': return <User size={16} color="#a78bfa" />;
        case 'location': return <MapPin size={16} color="#f87171" />;
        case 'item': return <Package size={16} color="#fb923c" />;
        default: return <FileText size={16} color="#60a5fa" />;
    }
}


const getEdgeStyle = (type?: string) => {
    switch (type) {
        case 'romance': return { stroke: '#ec4899', strokeWidth: 3, label: '❤️' };
        case 'enemy': return { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '5,5', label: '⚔️' };
        case 'family': return { stroke: '#3b82f6', strokeWidth: 3, label: '🩸' };
        case 'alliance': return { stroke: '#22c55e', strokeWidth: 3, label: '🤝' };
        default: return { stroke: '#a78bfa', strokeWidth: 2 };
    }
};

export default function GraphView({ files, onSelect, project, onSaveGraph }: GraphViewProps) {
    const [foldersOnly, setFoldersOnly] = useState(false);
    const [relationshipMode, setRelationshipMode] = useState(false);
    const [showRelationModal, setShowRelationModal] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

    // Initial State Setup - Merging Auto-layout with Saved Data
    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const savedPositions = project?.graphData?.positions || {};
        const savedEdges = project?.graphData?.edges || [];

        // 1. Add Files/Folders
        const roots: FileNode[] = [];
        const childrenMap: Record<string, FileNode[]> = {};

        files.forEach(f => {
            // Filter out 'Extras' folder (System folder)
            if (f.title === 'Extras' && f.isSystem) return;

            if (!f.parent) roots.push(f);
            else {
                if (!childrenMap[f.parent]) childrenMap[f.parent] = [];
                childrenMap[f.parent].push(f);
            }
        });

        // Basic Auto-Layout fallback
        let globalY = 0;
        const traverse = (node: FileNode, depth: number) => {
            // Apply filter
            if (foldersOnly && node.type !== 'folder') return;

            const isSaved = savedPositions[node._id];
            const x = isSaved ? savedPositions[node._id].x : depth * 250;
            const y = isSaved ? savedPositions[node._id].y : globalY * 60;
            if (!isSaved) globalY++;

            nodes.push({
                id: node._id,
                position: { x, y },
                data: {
                    label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getIcon(node.type, !!node.isSystem)}
                            <span className="truncate">{node.title}</span>
                        </div>
                    ),
                    style: getNodeStyleData(node.type) // Pass style info in data
                },
                // Removed top-level style prop to let CustomNode handle sizing
                type: 'customFile',
            });

            // Add Parent-Child Edges (Visual hierarchy)
            if (childrenMap[node._id]) {
                childrenMap[node._id].forEach(child => {
                    if (foldersOnly && child.type !== 'folder') return;

                    edges.push({
                        id: `e-hierarchy-${node._id}-${child._id}`,
                        source: node._id,
                        target: child._id,
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#444', strokeDasharray: '5,5' },
                        selectable: false
                    });
                    traverse(child, depth + 1);
                });
            }
        };

        roots.forEach(root => traverse(root, 0));

        // 3. Add Virtual Start/End Nodes
        ['START', 'END'].forEach(type => {
            const id = type === 'START' ? 'node-start' : 'node-end';
            const label = type === 'START' ? 'INICIO' : 'FINAL';
            const isSaved = savedPositions[id];
            nodes.push({
                id: id,
                position: isSaved ? { x: isSaved.x, y: isSaved.y } : { x: type === 'START' ? -200 : 200, y: 0 },
                data: {
                    label: <div className="font-bold">{label}</div>,
                    style: getNodeStyleData(type.toLowerCase())
                },
                type: 'customFile',
                draggable: type !== 'START',
            });
        });

        // 2. Add Saved Custom Edges
        savedEdges.forEach((e: any) => {
            // Check if source/target exist in filtered view
            const sourceExists = nodes.find(n => n.id === e.source);
            const targetExists = nodes.find(n => n.id === e.target);

            if (sourceExists && targetExists) {
                edges.push({
                    ...e,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#a78bfa', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
                    zIndex: 1000
                });
            }
        });

        return { initialNodes: nodes, initialEdges: edges };
        return { initialNodes: nodes, initialEdges: edges };
    }, [files, project, foldersOnly]); // Keep initial deps clean, filtering happens on Render

    const filteredNodes = useMemo(() => {
        // Apply "Relationship Mode" filter dynamicallly
        if (!relationshipMode) return initialNodes;

        // In Relationship Mode, show only Entities
        return initialNodes.filter(n => {
            // Keep System nodes if needed? No, usually not.
            if (n.id === 'node-start' || n.id === 'node-end') return false;

            // Check file type
            const file = files.find(f => f._id === n.id);
            if (!file) return false;
            return ['character', 'location', 'item'].includes(file.type);
        });
    }, [initialNodes, relationshipMode, files]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    // Sync filtered view effect
    useEffect(() => {
        if (relationshipMode) {
            setNodes(filteredNodes);
        } else {
            // Restore full view (careful not to overwrite positions if we were editing?)
            // Actually, when switching modes, we might want to reload initial structure but keep positions?
            // For now, let's just use filteredNodes as the source of truth for display if we can.
            // But ReactFlow needs `nodes` state.
            setNodes(filteredNodes.length < initialNodes.length ? initialNodes : filteredNodes);
            // Wait, this logic is tricky. 
            // Better approach: `nodes` state always has everything, we just apply `hidden: true`?
            // Or we just update the state entirely.
            setNodes(initialNodes); // Reset to full on disable
        }
    }, [relationshipMode, initialNodes, filteredNodes, setNodes]);


    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync when props change - STRUCTURE ONLY
    // We only update nodes if files are added/removed.
    // We ignore position updates from props because local state is the source of truth while editing.
    useEffect(() => {
        setNodes((currentNodes) => {
            const currentIds = new Set(currentNodes.map(n => n.id));
            const initialIds = new Set(initialNodes.map(n => n.id));

            // Check if structure changed
            const hasAdded = initialNodes.some(n => !currentIds.has(n.id));
            const hasRemoved = currentNodes.some(n => !initialIds.has(n.id));

            // If structure is same, DO NOT TOUCH nodes. This prevents position resets/merges.
            if (!hasAdded && !hasRemoved) return currentNodes;

            // If structure changed, merge:
            // 1. Keep existing nodes (with local positions)
            // 2. Add new nodes (with initial positions)
            // 3. Filter out removed nodes

            const currentMap = new Map(currentNodes.map(n => [n.id, n]));

            return initialNodes.map(inode => {
                if (currentMap.has(inode.id)) {
                    // Keep local node state (position, selection, etc)
                    return currentMap.get(inode.id)!;
                }
                return inode; // New node
            });
        });

        setEdges((currentEdges) => {
            const currentUserEdgeIds = new Set(currentEdges.map(e => e.id));

            // Check if Props have any edge that we DON'T have locally.
            const remoteHasNew = initialEdges.some(e => !currentUserEdgeIds.has(e.id));

            if (remoteHasNew) {
                const initialMap = new Set(initialEdges.map(e => e.id));
                const merged = [...initialEdges];

                currentEdges.forEach(e => {
                    // If local edge is NOT in initial, keep it
                    if (!initialMap.has(e.id)) {
                        merged.push(e);
                    }
                });
                return merged;
            }
            return currentEdges;
        });

    }, [initialNodes, initialEdges, setNodes, setEdges]);

    // Handle Edge Deletion
    const onEdgesDelete = useCallback((deleted: Edge[]) => {
        // We need to calculate what remains AFTER deletion
        const deletedIds = new Set(deleted.map(d => d.id));
        const remainingEdges = edges.filter(e => !deletedIds.has(e.id));

        // Filter out hierarchy edges (we don't save those)
        const customEdgesToSave = remainingEdges
            .filter(e => !e.id.startsWith('e-hierarchy-'))
            .map(e => ({
                id: e.id, source: e.source, target: e.target, type: e.type || 'smoothstep', zIndex: 1000
            }));

        // Current Positions
        const currentPositions = nodes.reduce((acc, node) => ({
            ...acc, [node.id]: node.position
        }), {});

        onSaveGraph({ edges: customEdgesToSave, positions: currentPositions });
    }, [edges, nodes, onSaveGraph]);



    const handleStandardConnect = useCallback((params: Connection) => {
        const newEdge: Edge = {
            ...params,
            id: `e-${params.source}-${params.target}-${Date.now()}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#a78bfa', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
            zIndex: 1000,
            data: {}
        };
        setEdges((eds) => addEdge(newEdge, eds));

        // Save connection
        const currentCustomEdges = edges.filter(e => !e.id.startsWith('e-hierarchy-'));
        const updatedEdges = [...currentCustomEdges, newEdge].map(e => ({
            id: e.id, source: e.source, target: e.target, type: e.type || 'smoothstep', zIndex: 1000
        }));

        const currentPositions = nodes.reduce((acc, node) => ({
            ...acc, [node.id]: node.position
        }), {});

        onSaveGraph({ edges: updatedEdges, positions: currentPositions });
    }, [edges, nodes, onSaveGraph, setEdges]);

    const onConnectStart = useCallback((params: Connection) => {
        if (relationshipMode) {
            setPendingConnection(params);
            setShowRelationModal(true);
        } else {
            // Standard connection
            handleStandardConnect(params);
        }
    }, [relationshipMode, handleStandardConnect]);

    const confirmRelationship = (type: string) => {
        if (!pendingConnection) return;

        const styleData = getEdgeStyle(type);

        const newEdge: Edge = {
            ...pendingConnection,
            id: `e-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}`,
            type: 'smoothstep',
            animated: type === 'enemy', // Dashed lines maybe animated?
            style: { stroke: styleData.stroke, strokeWidth: styleData.strokeWidth, strokeDasharray: styleData.strokeDasharray },
            label: styleData.label,
            labelStyle: { fill: 'white', fontSize: 20, fontWeight: 700 },
            labelBgStyle: { fill: '#171717', fillOpacity: 0.7 },
            markerEnd: { type: MarkerType.ArrowClosed, color: styleData.stroke },
            zIndex: 1000,
            data: { relationType: type }
        };

        setEdges((eds) => addEdge(newEdge, eds));

        // Save
        const currentCustomEdges = edges.filter(e => !e.id.startsWith('e-hierarchy-'));
        const updatedEdges = [...currentCustomEdges, newEdge].map(e => ({
            ...e,
            // Ensure data is saved
            data: e.data, style: e.style, label: e.label, labelStyle: e.labelStyle, labelBgStyle: e.labelBgStyle
        }));

        const currentPositions = nodes.reduce((acc, node) => ({
            ...acc, [node.id]: node.position
        }), {});

        onSaveGraph({ edges: updatedEdges, positions: currentPositions });

        setShowRelationModal(false);
        setPendingConnection(null);
    };

    const onNodeDragStop = useCallback((_: any, node: Node) => {
        // Update single node position in save data
        const currentPositions = nodes.reduce((acc, n) => ({
            ...acc, [n.id]: n.id === node.id ? node.position : n.position
        }), {});

        const currentCustomEdges = edges.filter(e => !e.id.startsWith('e-hierarchy-')).map(e => ({
            id: e.id, source: e.source, target: e.target, type: e.type || 'smoothstep', zIndex: 1000
        }));

        onSaveGraph({ edges: currentCustomEdges, positions: currentPositions });
    }, [nodes, edges, onSaveGraph]);

    const onNodeDoubleClick = (_: any, node: Node) => {
        if (node.id === 'node-start' || node.id === 'node-end') return;
        const file = files.find(f => f._id === node.id);
        if (file) onSelect(file);
    };

    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleResetLayout = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        onSaveGraph({ edges: [], positions: {} });
        setNodes([]); // Force reset to auto-layout
        setShowResetConfirm(false);
    };

    return (
        <div className="h-full w-full bg-neutral-900 relative">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button
                    onClick={() => setFoldersOnly(!foldersOnly)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${foldersOnly ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:bg-neutral-700'}`}
                >
                    <Filter size={16} />
                    {foldersOnly ? 'Solo Carpetas' : 'Todo'}
                </button>
                <button
                    onClick={handleResetLayout}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-red-900/50 font-medium transition-colors bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-200"
                    title="Borrar posiciones y conexiones personalizadas"
                >
                    <Layers size={16} />
                    Restaurar Diseño
                </button>
                <button
                    onClick={() => setRelationshipMode(!relationshipMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${relationshipMode ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:bg-neutral-700'}`}
                >
                    <UsersIcon size={16} />
                    {relationshipMode ? 'Relaciones' : 'Estructura'}
                </button>
            </div>




            {/* Relationship Selection Modal */}
            {showRelationModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-white mb-4 text-center">Tipo de Relación</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => confirmRelationship('romance')} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-pink-900/20 border border-pink-500/30 hover:bg-pink-900/40 hover:border-pink-500 transition-all text-pink-300">
                                <Heart size={24} />
                                <span className="font-bold">Romance</span>
                            </button>
                            <button onClick={() => confirmRelationship('enemy')} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-red-900/20 border border-red-500/30 hover:bg-red-900/40 hover:border-red-500 transition-all text-red-300">
                                <Swords size={24} />
                                <span className="font-bold">Enemigos</span>
                            </button>
                            <button onClick={() => confirmRelationship('family')} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 hover:bg-blue-900/40 hover:border-blue-500 transition-all text-blue-300">
                                <UsersIcon size={24} />
                                <span className="font-bold">Familia</span>
                            </button>
                            <button onClick={() => confirmRelationship('alliance')} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-900/20 border border-green-500/30 hover:bg-green-900/40 hover:border-green-500 transition-all text-green-300">
                                <Handshake size={24} />
                                <span className="font-bold">Alianza</span>
                            </button>
                        </div>
                        <button onClick={() => { setShowRelationModal(false); setPendingConnection(null); }} className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-white">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {showResetConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <div className="p-2 bg-red-950/50 rounded-lg">
                                <Layers size={24} />
                            </div>
                            <h3 className="text-lg font-bold">¿Restaurar Diseño?</h3>
                        </div>

                        <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                            Esta acción <strong>eliminará todas las posiciones personalizadas y las conexiones manuales</strong> que hayas creado.
                            El gráfico volverá a su distribución automática original.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="px-4 py-2 rounded-lg text-gray-400 hover:bg-neutral-700 hover:text-white transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmReset}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all text-sm font-bold"
                            >
                                Sí, Restaurar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnectStart}
                onNodeDragStop={onNodeDragStop}
                onNodeDoubleClick={onNodeDoubleClick}
                onEdgesDelete={onEdgesDelete}
                deleteKeyCode={['Backspace', 'Delete']}
                fitView
            >
                <Background color="#444" gap={16} variant={BackgroundVariant.Dots} />
                <Controls className="bg-white/10 border border-white/20 text-white" />
                <style>{`
                    .react-flow__edges { z-index: 20 !important; pointer-events: none; }
                    .react-flow__nodes { z-index: 10 !important; }
                    
                    /* Re-enable pointer events for the edge paths so they can be clicked/selected */
                    .react-flow__edge { pointer-events: all; cursor: pointer; }
                    .react-flow__edge-path { stroke-width: 3px; }
                    
                    /* Highlight selected edge */
                    .react-flow__edge.selected .react-flow__edge-path { stroke: #c084fc; filter: drop-shadow(0 0 4px #a78bfa); }
                `}</style>
            </ReactFlow>
        </div>
    );
}
