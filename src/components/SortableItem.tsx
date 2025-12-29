import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileNode } from '@/types/models';
import { FileText, User, MapPin, Folder } from 'lucide-react';

interface SortableItemProps {
    id: string;
    file: FileNode;
    onClick: () => void;
}

export function SortableItem({ id, file, onClick }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'character': return <User size={14} className="text-purple-400" />;
            case 'location': return <MapPin size={14} className="text-green-400" />;
            case 'folder': return <Folder size={14} className="text-blue-400" />;
            default: return <FileText size={14} className="text-gray-400" />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm group">
            {getIcon(file.type)}
            <span onClick={onClick} className="flex-1 truncate group-hover:text-white transition-colors">{file.title}</span>
        </div>
    );
}
