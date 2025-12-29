'use client';

import { FileNode } from '@/types/models';
import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface TimelineViewProps {
    files: FileNode[];
    onSelect: (file: FileNode) => void;
}

export default function TimelineView({ files, onSelect }: TimelineViewProps) {
    // Filter scenes (files) and those that might have time data
    // Assuming 'time' metadata is stored in 'data' or top level if we migrated it.
    // Based on previous chats, we added scene time. Let's assume it's in `time` prop or `data.time`.
    // Let's look for files that have time data.

    const timelineEvents = useMemo(() => {
        return files
            .filter(f => f.type === 'file' && (f.timeData || f.data?.time || f.content?.includes('TIME_'))) // Fallback check
            .map(f => {
                // Parse time. Ideally we have a structured time object { day, hour, minute }
                const timeData = f.timeData || f.data?.time || {};
                const day = parseInt(timeData.startDay || timeData.day) || 1;
                const hour = parseInt(timeData.startHour || timeData.hour) || 0;
                const minute = parseInt(timeData.startMinute || timeData.minute) || 0;

                // Calculate absolute minutes for sorting
                const absoluteTime = (day * 24 * 60) + (hour * 60) + minute;

                return {
                    id: f._id,
                    title: f.title,
                    day,
                    hour,
                    minute,
                    absoluteTime,
                    file: f
                };
            })
            .sort((a, b) => a.absoluteTime - b.absoluteTime);
    }, [files]);

    if (timelineEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Calendar size={32} />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Línea de Tiempo Vacía</h3>
                <p className="max-w-md">
                    No hay escenas con datos de tiempo configurados.
                    Abre el Inspector de una escena y configura su "Tiempo" (Día, Hora) para verla aquí.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-8 bg-neutral-900">
            <div className="max-w-4xl mx-auto relative">
                {/* Central Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent -translate-x-1/2" />

                <div className="space-y-12 py-12">
                    {timelineEvents.map((event, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <div key={event.id} className={`flex items-center justify-between ${isEven ? '' : 'flex-row-reverse'}`}>
                                {/* Content Card */}
                                <div className={`w-[45%] ${isEven ? 'text-right' : 'text-left'}`}>
                                    <div
                                        onClick={() => onSelect(event.file)}
                                        className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all cursor-pointer group hover:border-purple-500/30"
                                    >
                                        <h4 className="text-white font-medium group-hover:text-purple-300 transition-colors">{event.title}</h4>
                                        <div className="text-xs text-purple-400 font-mono mt-1">
                                            Día {event.day} • {event.hour.toString().padStart(2, '0')}:{event.minute.toString().padStart(2, '0')}
                                        </div>
                                        {/* Optional: Show snippet? */}
                                    </div>
                                </div>

                                {/* Node Details (Dot) */}
                                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)] z-10 border-2 border-neutral-900" />

                                {/* Empty Spacer for the other side */}
                                <div className="w-[45%]" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
