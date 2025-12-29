
import { useMemo, useState } from 'react';
import { FileNode } from '@/types/models';
import { calculateSmartPace } from '@/lib/narrative-engine';
import { HelpCircle } from 'lucide-react';
import NarrativeHelpModal from './NarrativeHelpModal';

interface PacingGraphProps {
    files: FileNode[];
    projectGenre?: string;
}

export default function PacingGraph({ files, projectGenre = 'custom' }: PacingGraphProps) {
    const [showHelp, setShowHelp] = useState(false);

    // 1. Prepare Linear Order of Scenes
    // We need to flatten the hierarchy to getting a reading order.
    // For MVP, if we can't perfectly resolve specific user order across folders, 
    // let's exact all 'file' nodes and sort by something stable or just use filtered list.
    // Better: Sort by recursion if possible.

    const scenes = useMemo(() => {
        // Build tree
        const rootFiles = files.filter(f => !f.parent);
        const childrenMap = new Map<string, FileNode[]>();
        files.forEach(f => {
            if (f.parent) {
                if (!childrenMap.has(f.parent)) childrenMap.set(f.parent, []);
                childrenMap.get(f.parent)!.push(f);
            }
        });

        // Helper to traverse
        const results: FileNode[] = [];
        const traverse = (nodes: FileNode[]) => {
            // Sort by order
            const sorted = [...nodes].sort((a, b) => (a.order || 0) - (b.order || 0));
            for (const node of sorted) {
                if (node.type === 'file') {
                    results.push(node);
                } else if (node.type === 'folder') {
                    const children = childrenMap.get(node._id) || [];
                    traverse(children);
                }
            }
        };

        traverse(rootFiles.sort((a, b) => (a.order || 0) - (b.order || 0)));
        return results;
    }, [files]);

    // 2. Calculate Pacing Points
    const points = useMemo(() => {
        return scenes.map((scene, index) => {
            // Use live metrics if available, or defaults
            const metrics = scene.metrics || { focus: 5, dissonance: 1, polarity: 0 };
            const wordCount = scene.wordCount || 0;
            const { score, label } = calculateSmartPace({ ...metrics, wordCount }, projectGenre);
            return { index, score, title: scene.title, label };
        });
    }, [scenes, projectGenre]);

    if (points.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                No hay escenas para analizar.
            </div>
        );
    }

    // 3. Render SVG
    // Dimensions
    const width = 800;
    const height = 300;
    const padding = 40;
    const graphW = width - (padding * 2);
    const graphH = height - (padding * 2);

    // Scales
    const maxX = Math.max(points.length - 1, 1);
    const scaleX = graphW / maxX;
    const scaleY = graphH / 100; // Score is 0-100

    // Points string for polyline
    const polylinePoints = points.map((p, i) => {
        const x = padding + (i * scaleX);
        const y = height - padding - (p.score * scaleY);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-full bg-neutral-900 border border-white/10 rounded-xl p-4 overflow-hidden flex flex-col relative">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-lg">Curva Narrativa</h3>
                    <button
                        onClick={() => setShowHelp(true)}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="Ver Metodología"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">{projectGenre}</span>
            </div>

            {showHelp && <NarrativeHelpModal onClose={() => setShowHelp(false)} />}

            <div className="flex-1 relative w-full h-full min-h-[300px]">
                {/* SVG Container */}
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin meet" className="w-full h-full overflow-visible preserve-3d">

                    {/* Zones (Background) */}
                    <rect x={padding} y={padding} width={graphW} height={graphH * 0.2} fill="red" fillOpacity="0.05" />
                    <rect x={padding} y={padding + graphH * 0.8} width={graphH} height={graphH * 0.2} fill="blue" fillOpacity="0.05" />

                    {/* Grid Lines Y */}
                    {[0, 25, 50, 75, 100].map(val => (
                        <g key={val}>
                            <line
                                x1={padding}
                                y1={height - padding - (val * scaleY)}
                                x2={width - padding}
                                y2={height - padding - (val * scaleY)}
                                stroke="white"
                                strokeOpacity="0.1"
                                strokeDasharray={val === 50 ? "" : "4 4"}
                            />
                            <text
                                x={padding - 10}
                                y={height - padding - (val * scaleY) + 4}
                                fill="gray"
                                textAnchor="end"
                                fontSize="10"
                            >
                                {val}
                            </text>
                        </g>
                    ))}

                    {/* The Line */}
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-lg"
                    />

                    {/* Points */}
                    {points.map((p, i) => (
                        <g key={i} className="group cursor-pointer">
                            <circle
                                cx={padding + (i * scaleX)}
                                cy={height - padding - (p.score * scaleY)}
                                r="4"
                                fill="#fff"
                                stroke="#a855f7"
                                strokeWidth="2"
                                className="transition-all group-hover:r-6"
                            />
                            {/* Tooltip (Simple SVG Text) */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <rect
                                    x={padding + (i * scaleX) - 50}
                                    y={height - padding - (p.score * scaleY) - 35}
                                    width="100" height="25" rx="4"
                                    fill="#000" fillOpacity="0.8"
                                />
                                <text
                                    x={padding + (i * scaleX)}
                                    y={height - padding - (p.score * scaleY) - 18}
                                    fill="white"
                                    fontSize="10"
                                    textAnchor="middle"
                                >
                                    {p.title.length > 15 ? p.title.substring(0, 12) + '...' : p.title} ({p.score})
                                </text>
                            </g>

                            {/* Labels X Axis (Every Nth) */}
                            {(points.length < 20 || i % Math.ceil(points.length / 10) === 0) && (
                                <text
                                    x={padding + (i * scaleX)}
                                    y={height - padding + 15}
                                    fill="gray"
                                    fontSize="10"
                                    textAnchor="middle"
                                    className="select-none"
                                >
                                    {i + 1}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            </div>
            <div className="mt-4 flex gap-4 justify-center text-xs text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500/20 rounded"></div> Intenso/Rápido</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500/20 rounded"></div> Lento/Reflexivo</div>
            </div>
        </div>
    );
}
