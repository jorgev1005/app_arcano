import { useState, useRef, useMemo } from 'react';
import { FileNode, Project } from '@/types/models';
import { X, Printer, Filter, Network, FileText } from 'lucide-react';

interface ProjectPreviewProps {
    files: FileNode[];
    project: Project;
    onClose: () => void;
}

export default function ProjectPreview({ files, project, onClose }: ProjectPreviewProps) {
    const [filter, setFilter] = useState<'all' | 'final' | 'final_revised'>('all');
    const [viewMode, setViewMode] = useState<'structure' | 'graph'>('structure'); // 'structure' or 'graph'
    const contentRef = useRef<HTMLDivElement>(null);

    /* 
       MODE 1: STRUCTURE (Original)
       Recursively flatten the file tree to get a linear reading order.
    */
    const getStructureContent = (nodes: FileNode[]): FileNode[] => {
        let result: FileNode[] = [];
        const buildTree = (flatFiles: FileNode[]) => {
            const rootNodes: FileNode[] = [];
            const map = new Map<string, FileNode>();
            flatFiles.forEach(f => map.set(f._id, { ...f, children: [] }));
            flatFiles.forEach(f => {
                const node = map.get(f._id)!;
                if (f.parent && map.has(f.parent)) {
                    map.get(f.parent)!.children!.push(node);
                } else {
                    rootNodes.push(node);
                }
            });
            return rootNodes;
        };
        const traverseTree = (treeNodes: FileNode[]) => {
            treeNodes.sort((a, b) => (a.order || 0) - (b.order || 0));
            for (const node of treeNodes) {
                if (node.isSystem) continue;
                if (node.type !== 'folder') {
                    const status = node.status || 'draft';
                    let include = true;
                    if (filter === 'final' && status !== 'final') include = false;
                    if (filter === 'final_revised' && status === 'draft') include = false;
                    if (include && node.content) result.push(node);
                }
                if (node.children && node.children.length > 0) traverseTree(node.children);
            }
        }
        traverseTree(buildTree(nodes));
        return result;
    };

    /*
       MODE 2: GRAPH FLOW
       Traverse from 'node-start' to 'node-end' using persisted edges.
       Only include files that are part of this path.
    */
    const getGraphContent = (): FileNode[] => {
        const edges = project.graphData?.edges || [];
        const result: FileNode[] = [];
        const fileMap = new Map(files.map(f => [f._id, f]));

        // Build Adjacency List for traversal
        const adjacency = new Map<string, string[]>();
        edges.forEach(e => {
            // Filter out hierarchy edges if they snuck in, though we only want flow edges
            if (e.id.startsWith('e-hierarchy-')) return;
            if (!adjacency.has(e.source)) adjacency.set(e.source, []);
            adjacency.get(e.source)!.push(e.target);
        });

        // Traverse - using BFS to capture level order, or simple DFS? 
        // Requirement: "connected between themselves and connected from start to end"
        // This implies a PATH. If there are branches, BFS is good for "layers". 
        // DFS is good for "Plot Thread A, then B".
        // Let's use a simple traversal that follows the arrows.
        // We need to keep track of visited to avoid cycles.

        const visited = new Set<string>();
        const queue: string[] = ['node-start'];
        const flowOrder: string[] = [];

        while (queue.length > 0) {
            const currentId = queue.shift()!;

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Don't add START/END virtual nodes to the text output list
            if (currentId !== 'node-start' && currentId !== 'node-end') {
                flowOrder.push(currentId);
            }

            // Stop at END node? If we want everything REACHABLE from Start, we continue.
            // If END node signifies "Stop", we might handle it. 
            // Currently treated just as another node that happens to be last.

            const neighbors = adjacency.get(currentId) || [];
            // Sort neighbors? By Y position maybe? For now insertion order.

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        // Map IDs to Files
        flowOrder.forEach(id => {
            const file = fileMap.get(id);
            if (file && file.type !== 'folder') { // Usually we don't print folders content
                // Apply Status Filter? The user said "Preview", implies the same filters might apply, 
                // OR maybe Graph View overrides filters? 
                // "only texts connected" -> Let's apply standard filters too for safety.
                const status = file.status || 'draft';
                let include = true;
                if (filter === 'final' && status !== 'final') include = false;
                if (filter === 'final_revised' && status === 'draft') include = false;

                if (include && file.content) result.push(file);
            }
        });

        return result;
    };

    const contentFiles = useMemo(() => {
        if (viewMode === 'graph') return getGraphContent();
        return getStructureContent(files);
    }, [files, viewMode, filter, project.graphData]); // Re-calc when graph changes

    const processContent = (text: string) => {
        let processed = text;
        (project.variables || []).forEach(v => {
            const regex = new RegExp(`#${v.key}`, 'g');
            // Wrap in span to override any inherited highlighting colors (e.g. from Editor)
            // ProjectPreview is always black-on-white paper style, so we force black/gray-900.
            processed = processed.replace(regex, `<span class="text-gray-900 print:text-black" style="color: black; text-decoration: none;">${v.value}</span>`);
        });
        return processed;
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-neutral-900 z-50 flex flex-col h-screen w-screen overflow-hidden">
            {/* Toolbar - Hidden in Print */}
            <div className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 print:hidden">
                <h2 className="text-xl font-bold text-white flex gap-2 items-center">
                    <span>{project.title}</span>
                    <span className="text-sm bg-blue-600 px-2 py-0.5 rounded text-white font-normal">Vista Previa</span>
                </h2>

                <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('structure')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'structure' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <FileText size={16} /> Estructura
                        </button>
                        <button
                            onClick={() => setViewMode('graph')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'graph' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Network size={16} /> Flujo Narrativo
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
                        <Filter size={16} className="text-gray-400 ml-2" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="bg-transparent text-sm text-white focus:outline-none p-1"
                        >
                            <option value="all">Todo (Borradores incl.)</option>
                            <option value="final_revised">Revisado + Final</option>
                            <option value="final">Solo Final</option>
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-200"
                    >
                        <Printer size={18} /> Imprimir / Exportar
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-neutral-800 p-8 print:p-0 print:bg-white print:overflow-visible">
                <div
                    ref={contentRef}
                    className="max-w-3xl mx-auto bg-white min-h-screen shadow-2xl p-12 text-gray-900 print:shadow-none print:max-w-none print:w-full"
                >
                    <div className="text-center mb-16 print:mb-24 mt-8">
                        <h1 className="text-4xl font-serif font-bold mb-4">{project.title}</h1>
                        <p className="text-gray-500 italic">
                            {contentFiles.length} documentos incluidos
                            {viewMode === 'graph' && ' (Orden Narrativo)'}
                        </p>
                    </div>

                    <div className="space-y-12">
                        {contentFiles.length === 0 ? (
                            <div className="text-center text-gray-400 italic">
                                <p>No hay contenido disponible.</p>
                                {viewMode === 'graph' && <p className="text-sm mt-2">Asegúrate de conectar "INICIO" con tus documentos en la Vista Gráfica.</p>}
                            </div>
                        ) : (
                            contentFiles.map(file => (
                                <article key={file._id} className="prose prose-lg max-w-none mb-12">
                                    <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">{file.title}</h2>
                                    <div dangerouslySetInnerHTML={{ __html: processContent(file.content || '') }} />
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
