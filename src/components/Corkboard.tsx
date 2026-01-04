'use client';

import { useState } from 'react';
import { FileNode } from '@/types/models';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface CorkboardProps {
  files: FileNode[];
  onSelect: (file: FileNode) => void;
  onReorder: (newFiles: FileNode[]) => void;
  currentFolder?: FileNode | null;
  onBack?: () => void;
}

const SortableCard = ({ file, onSelect, isOverlay }: { file: FileNode, onSelect?: (file: FileNode) => void, isOverlay?: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file._id, data: file });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl h-56 flex flex-col relative group shadow-xl shadow-black/20 ${isOverlay ? 'scale-105 border-blue-500/50 cursor-grabbing bg-neutral-800' : 'hover:bg-white/10 hover:scale-[1.02] transition-all'}`}
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="absolute top-3 right-3 p-1 text-gray-600 hover:text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <GripVertical size={16} />
      </div>

      <div className="flex justify-between items-start mb-3" onClick={() => onSelect && onSelect(file)}>
        <h3 className="font-bold text-lg truncate text-white group-hover:text-blue-400 transition-colors cursor-pointer w-full pr-8" title={file.title}>{file.title}</h3>
      </div>
      <div onClick={() => onSelect && onSelect(file)} className="flex-1 flex flex-col cursor-pointer">
        <span className={`self-start text-[10px] uppercase font-bold px-2 py-1 rounded-full mb-2 ${file.status === 'final' ? 'bg-green-500/20 text-green-400' :
          file.status === 'revised' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
          {file.status || 'draft'}
        </span>
        <p className="text-sm text-gray-400 overflow-hidden flex-1 leading-relaxed line-clamp-4">
          {file.synopsis || <span className="italic text-gray-600">Sin sinopsis...</span>}
        </p>
        <div className="mt-4 flex justify-between items-center text-xs text-gray-600 uppercase tracking-wider font-bold">
          <span>{file.type}</span>
          {file.wordCount ? <span>{file.wordCount.toLocaleString()} pal</span> : null}
        </div>
      </div>
    </div>
  );
};

export default function Corkboard({ files, onSelect, onReorder, currentFolder, onBack }: CorkboardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f._id === active.id);
      const newIndex = files.findIndex((f) => f._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(files, oldIndex, newIndex);
        onReorder(newOrder);
      }
    }

    setActiveId(null);
  };

  const activeFile = files.find(f => f._id === activeId);

  return (
    <div className="flex-1 p-8 overflow-y-auto h-full">
      {/* Navigation Header */}
      {currentFolder && (
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all text-sm font-medium"
          >
            <span className="text-lg">⬅</span>
            <span>Subir de Nivel</span>
          </button>
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-blue-400">📂</span>
            {currentFolder.title}
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-white/5 rounded-2xl bg-black/20 border-dashed">
          <p>Carpeta vacía.</p>
          <button onClick={() => { }} className="text-xs mt-2 text-blue-400 hover:text-blue-300 underline">Crear nuevo archivo aquí (Use el menú +)</button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={files.map(f => f._id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
              {files.filter(f => {
                // Find Sandbox folder ID
                const sandboxStart = files.find(sf => sf.title === 'Sandbox' && sf.isSystem);
                const isSandboxContent = f.type === 'idea' || (sandboxStart && f.parent === sandboxStart._id) || (f.isSystem && f.title === 'Sandbox');
                return !isSandboxContent;
              }).map((file) => (
                <SortableCard key={file._id} file={file} onSelect={onSelect} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeFile ? <SortableCard file={activeFile} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}