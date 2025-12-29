
import { useEffect, useState } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Project } from '@/types/models';

interface GoalWidgetProps {
    project: Project;
}

export default function GoalWidget({ project }: GoalWidgetProps) {
    const dailyGoal = project.settings?.dailyGoal || 500;
    const today = new Date().toISOString().split('T')[0];

    // Get progress from stats map (must handle potential raw object vs Map if serialized)
    // When passed from Server to Client component, Map becomes object usually?
    // Let's assume stats.dailyProgress is an object { "2024-12-28": 150 } because of JSON serialization in Props.
    const progressMap = project.stats?.dailyProgress || {};
    // @ts-ignore - Handle map vs object disparity
    const todayCount = (progressMap instanceof Map ? progressMap.get(today) : progressMap[today]) || 0;

    const percentage = Math.min(100, Math.round((todayCount / dailyGoal) * 100));

    // Animation state
    const [animatedPercent, setAnimatedPercent] = useState(0);

    useEffect(() => {
        setAnimatedPercent(percentage);
    }, [percentage]);

    return (
        <div className="flex items-center gap-3 bg-neutral-800/50 rounded-full px-3 py-1.5 border border-white/5 hover:bg-neutral-800 transition-colors cursor-help group relative">
            <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Circular Progress SVG */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="16" cy="16" r="14"
                        stroke="currentColor" strokeWidth="3"
                        fill="transparent"
                        className="text-white/10"
                    />
                    <circle
                        cx="16" cy="16" r="14"
                        stroke="currentColor" strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={88} // 2 * pi * 14
                        strokeDashoffset={88 - (88 * animatedPercent) / 100}
                        className={`${percentage >= 100 ? 'text-green-500' : 'text-blue-500'} transition-all duration-1000 ease-out`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-300">
                    {percentage >= 100 ? '🎉' : `${percentage}%`}
                </div>
            </div>

            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-300 leading-none">
                    {todayCount} <span className="text-gray-500 font-normal">/ {dailyGoal}</span>
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Hoy</span>
            </div>

            {/* Tooltip / Expanded Info */}
            <div className="absolute top-12 right-0 w-48 bg-neutral-900 border border-white/10 rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                    <Target size={12} /> Meta Diaria
                </h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Objetivo:</span>
                        <span className="text-white font-mono">{dailyGoal} plb</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progreso:</span>
                        <span className={`font-mono ${percentage >= 100 ? 'text-green-400' : 'text-blue-400'}`}>{todayCount} plb</span>
                    </div>
                    {percentage >= 100 && (
                        <div className="text-xs text-green-400 mt-1 italic flex items-center gap-1">
                            <TrendingUp size={12} /> ¡Meta cumplida!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
