'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { Project, FileNode } from '@/types/models';
import { Folder, FolderOpen, FileText, User, MapPin, Plus, ChevronRight, ChevronDown, FolderPlus, FilePlus, Pencil, Package, MoreHorizontal, CornerUpLeft, Trash2, Archive, Eye, ListOrdered } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, rectIntersection, pointerWithin } from '@dnd-kit/core';

interface BinderProps {
  projects: Project[];
  selectProject: (project: Project) => void;
  createProject: (title: string) => void;
  files: FileNode[];
  selectFile: (file: FileNode) => void;
  createFile: (title: string, type: string, parentId: string | null) => void;
  updateFile: (fileId: string, updates: any) => void;
  onReorder?: (newFiles: FileNode[]) => void;
  currentProject: Project | null;
  deleteFile: (fileId: string) => void;
  onOpenPreview?: () => void;
  selectedFolder: string | null;
  setSelectedFolder: (id: string | null) => void;
  selectedFileId?: string;
}

interface TreeNode extends FileNode {
  children?: TreeNode[];
}

const FileRowPreview = ({ node, getIcon }: { node: TreeNode, getIcon: (type: string) => ReactNode }) => {
  const isFolder = node.type === 'folder';
  return (
    <div
      className="flex items-center gap-1 p-1 pr-2 rounded bg-neutral-800 border border-white/20 shadow-xl w-64 opacity-90 cursor-grabbing text-gray-300 pointer-events-none"
      style={{ pointerEvents: 'none' }}
    >
      {isFolder && <div className="p-1"><ChevronRight size={12} /></div>}
      {!isFolder && <div className="w-5" />}
      {getIcon(node.type)}
      <span className="truncate text-sm select-none flex-1">{node.title}</span>
    </div>
  );
};

const TreeItem = ({
  node,
  depth = 0,
  expanded,
  toggleExpand,
  selectedFolder,
  setSelectedFolder,
  selectedFileId,
  setExpanded,
  selectFile,
  handleRename,
  getIcon,
  updateFile,
  createFile,
  deleteFile
}: {
  node: TreeNode;
  depth?: number;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  selectedFolder: string | null;
  setSelectedFolder: (id: string | null) => void;
  selectedFileId?: string;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectFile: (file: FileNode) => void;
  handleRename: (file: FileNode) => void;
  getIcon: (type: string) => ReactNode;
  updateFile: (fileId: string, updates: any) => void;
  createFile: (title: string, type: string, parentId: string | null) => void;
  deleteFile: (fileId: string) => void;
}) => {
  const isFolder = node.type === 'folder';
  const isExpanded = expanded[node._id];
  const hasChildren = node.children && node.children.length > 0;

  // Highlight if it's the selected folder OR the selected file
  const isSelected = (isFolder && selectedFolder === node._id) || (!isFolder && selectedFileId === node._id);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: node._id,
    data: node
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: node._id,
    data: node,
    disabled: !isFolder
  });

  // Custom Icon Logic for Folders
  const renderIcon = () => {
    if (isFolder) {
      if (node.isSystem) {
        return <Archive size={14} className="text-purple-400" />;
      }
      if (isExpanded || isSelected) {
        return <FolderOpen size={14} className="text-blue-300" />;
      }
      return <Folder size={14} className="text-blue-500/80" />;
    }
    return getIcon(node.type);
  };

  return (
    <div ref={setDroppableRef}>
      <div
        ref={setNodeRef}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        {...listeners}
        {...attributes}
        className={`
          flex items-center gap-1 p-1 pr-2 rounded cursor-pointer transition-colors group
          ${isSelected ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-white/5 text-gray-300'}
          ${isOver && isFolder ? 'bg-blue-500/40 ring-1 ring-blue-500' : ''}
          ${isDragging ? 'opacity-30' : ''}
        `}
        onClick={() => {
          if (isFolder) {
            setSelectedFolder(isSelected ? null : node._id);
            if (!isSelected) setExpanded(prev => ({ ...prev, [node._id]: true }));
          } else {
            selectFile(node);
          }
        }}
      >
        {isFolder && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); toggleExpand(node._id); }}
            className="p-1 hover:bg-white/10 rounded"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
        )}
        {!isFolder && <div className="w-5" />}

        {renderIcon()}
        <span className="truncate text-sm select-none flex-1" title={node.title}>{node.title}</span>

        {/* Word Count Display */}
        {((node as any).totalWords > 0 || (node.wordCount || 0) > 0) && !node.isSystem && (
          <span className="text-[10px] text-gray-500 font-mono ml-2">
            {((node as any).totalWords || node.wordCount || 0).toLocaleString()}
          </span>
        )}

        {isFolder && (
          <>
            {/* Subfolder Create Button */}
            {!node.isSystem && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  // Auto-suggest name
                  // Count existing sub-folders
                  const subFolderCount = (node.children?.filter(c => c.type === 'folder').length || 0) + 1;
                  const defaultName = `Sección ${subFolderCount}`;

                  const title = prompt('Nombre de la nueva sub-carpeta:', defaultName);
                  if (title) {
                    createFile(title, 'folder', node._id);
                    setExpanded(prev => ({ ...prev, [node._id]: true }));
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-green-300 transition-opacity mr-1"
                title="Nueva Sub-carpeta"
              >
                <FolderPlus size={12} />
              </button>
            )}

            {/* Delete Button (Only if empty and NOT system) */}
            {(!node.children || node.children.length === 0) && !node.isSystem && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Eliminar la carpeta "${node.title}"?`)) {
                    deleteFile(node._id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400 transition-opacity mr-1"
                title="Eliminar carpeta vacía"
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        )}

        {node.parent && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('¿Mover este elemento a la raíz (Binder)?')) {
                updateFile(node._id, { parent: null });
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-blue-300 transition-opacity mr-1"
            title="Mover a la raíz"
          >
            <CornerUpLeft size={12} />
          </button>
        )}

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); handleRename(node); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-opacity"
          title="Renombrar"
        >
          <Pencil size={12} />
        </button>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeItem
              key={child._id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              selectedFileId={selectedFileId}
              setExpanded={setExpanded}
              selectFile={selectFile}
              handleRename={handleRename}
              getIcon={getIcon}
              updateFile={updateFile}
              createFile={createFile}
              deleteFile={deleteFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Binder({ projects, selectProject, createProject, files, selectFile, createFile, updateFile, onReorder, currentProject, deleteFile, onOpenPreview, selectedFolder, setSelectedFolder, selectedFileId }: BinderProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // Lifted to Dashboard
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Build Tree & Calculate Stats
  const tree = useMemo(() => {
    const map: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];

    // 1. Initialize nodes
    files.forEach(f => {
      map[f._id] = { ...f, children: [] };
    });

    // 2. Build Hierarchy
    files.forEach(f => {
      const node = map[f._id];
      if (f.parent && map[f.parent]) {
        map[f.parent].children?.push(node);
      } else {
        roots.push(node);
      }
    });

    // 3. Recursive Word Count Calculation
    const calcStats = (node: TreeNode): number => {
      let sum = node.wordCount || 0;
      if (node.children?.length) {
        node.children.forEach(child => {
          sum += calcStats(child);
        });
      }
      // Mutate the local TreeNode (not the original prop) to store the sum for display
      (node as any).totalWords = sum;
      return sum;
    };

    // 4. Custom Sort Implementation
    const getSortWeight = (node: TreeNode) => {
      // 1. Sandbox (Top Priority)
      if (node.isSystem && node.title === 'Sandbox') return -10;

      // 2. Entities
      if (['character', 'location', 'item'].includes(node.type)) return 0;

      // 3. System Extras (Bottom Priority)
      if (node.isSystem) return 100;

      // 4. Normal Folders (Chapters)
      if (node.type === 'folder') return 10;

      // 5. Normal Files (Scenes in root)
      if (node.type === 'file') return 20;

      return 50;
    };

    roots.sort((a, b) => {
      const weightA = getSortWeight(a);
      const weightB = getSortWeight(b);
      if (weightA !== weightB) return weightA - weightB;

      // Fallback: Order or Title
      return (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title);
    });

    roots.forEach(calcStats);

    return roots;
  }, [files]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateProject = () => {
    const title = prompt('Nombre del nuevo proyecto:');
    if (title) createProject(title);
  };

  const handleRename = (file: FileNode) => {
    const newTitle = prompt('Nuevo nombre:', file.title);
    if (newTitle && newTitle !== file.title) {
      updateFile(file._id, { title: newTitle });
    }
  };

  const getSuggestion = (type: string, parentId: string | null) => {
    // 1. Get Siblings
    const siblings = files.filter(f => f.parent === parentId);

    // 2. Count siblings of same type (for numbering)
    // Note: User asked: 
    // - Root Folders -> "Capítulo #"
    // - Sub Folders -> "Sección #" or "Subcapítulo #"
    // - Text Files -> "Escena #"

    // Specific logic per type/level:
    if (type === 'folder') {
      const folderCount = siblings.filter(f => f.type === 'folder' && !f.isSystem).length + 1;
      if (!parentId) return `Capítulo ${folderCount}`;
      return `Sección ${folderCount}`;
    }

    if (type === 'file') {
      const fileCount = siblings.filter(f => f.type === 'file').length + 1;
      return `Escena ${fileCount}`;
    }

    // Fallbacks
    if (type === 'character') return 'Nuevo Personaje';
    if (type === 'location') return 'Nueva Ubicación';
    if (type === 'item') return 'Nuevo Objeto';
    return 'Sin Título';
  };

  const handleCreateType = (type: string) => {
    let promptText = 'Nombre del archivo:';
    if (type === 'folder') promptText = 'Nombre de la carpeta:';
    if (type === 'character') promptText = 'Nombre del personaje:';
    if (type === 'location') promptText = 'Nombre del lugar:';
    if (type === 'item') promptText = 'Nombre del objeto:';

    const defaultName = getSuggestion(type, selectedFolder);

    const title = prompt(promptText, defaultName);
    if (title) {
      createFile(title, type, selectedFolder);
      setShowCreateMenu(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over) {
      if (active.id !== over.id) {
        if (over.id === 'root-zone' || over.id === 'root-header' || over.id === 'root-projects' || over.id === 'root-bottom') {
          updateFile(active.id as string, { parent: null });
          return;
        }

        const overNode = files.find(f => f._id === over.id);
        if (overNode && overNode.type === 'folder') {
          updateFile(active.id as string, { parent: over.id });
          setExpanded(prev => ({ ...prev, [over.id]: true }));
        }
      }
    }
  };

  // Header Root Drop Zone
  const { setNodeRef: setHeaderRootRef, isOver: isOverHeader } = useDroppable({
    id: 'root-header',
    data: { isRoot: true }
  });

  // Projects Area Drop Zone (alias for Root)
  const { setNodeRef: setProjectsRef, isOver: isOverProjects } = useDroppable({
    id: 'root-projects',
    data: { isRoot: true }
  });

  const handleRootDrop = (event: DragEndEvent) => {
    // We can reuse handleDragEnd logic as we updated it to handle root zones
    handleDragEnd(event);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'character': return <User size={14} className="text-purple-400" />;
      case 'location': return <MapPin size={14} className="text-green-400" />;
      case 'folder': return <Folder size={14} className="text-blue-400" />;
      case 'item': return <Package size={14} className="text-orange-400" />;
      default: return <FileText size={14} className="text-gray-400" />;
    }
  };

  const handleDragOver = (event: DragEndEvent) => {
    const { over } = event;
    if (over) {
      // console.log('Currently over:', over.id);
    }
  };

  const currentFolderNode = useMemo(() =>
    files.find(f => f._id === selectedFolder),
    [files, selectedFolder]
  );

  const activeNode = useMemo(() =>
    files.find(f => f._id === activeId) as TreeNode | undefined,
    [activeId, files]
  );

  return (
    <div className="flex flex-col h-full p-4 text-gray-300">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleRootDrop}
        onDragOver={handleDragOver}
      >
        {/* Projects Section */}
        <div ref={setProjectsRef} className={`mb-6 transition-colors rounded-lg ${isOverProjects ? 'bg-blue-500/10' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Proyectos</h2>
            <button onClick={handleCreateProject} className="p-1 hover:bg-white/10 rounded transition-colors" title="Nuevo Proyecto">
              <Plus size={14} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          <div className="space-y-1">
            {projects.map((project) => {
              const isActive = currentProject?._id === project._id;
              return (
                <div
                  key={project._id}
                  onClick={() => selectProject(project)}
                  className={`cursor-pointer p-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${isActive ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-white/10 text-gray-400'}`}
                >
                  {isActive ? <FolderOpen size={14} className="text-blue-300" /> : <Folder size={14} className="text-blue-500/80" />}
                  {project.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* Binder / Files Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2 sticky top-0 bg-neutral-900/95 z-10 pb-2 border-b border-white/5">
            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500 overflow-hidden">
              <div
                ref={setHeaderRootRef}
                className={`flex items-center rounded-md transition-colors ${isOverHeader ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : ''}`}
              >
                <div
                  onClick={() => setSelectedFolder(null)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${isOverHeader ? 'text-blue-200' : 'hover:text-blue-400 hover:bg-white/5 rounded-md'}`}
                >
                  Binder (Raíz)
                </div>
              </div>

              {selectedFolder && (
                <>
                  <ChevronRight size={12} className="text-gray-600 flex-shrink-0" />
                  <span className="truncate text-gray-300" title={currentFolderNode?.title}>
                    {currentFolderNode?.title || '...'}
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-1 relative shrink-0">
              {onOpenPreview && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenPreview(); }}
                  className="p-1 hover:bg-white/10 rounded transition-colors group"
                  title="Vista Final (Preview del Proyecto)"
                >
                  <Eye size={14} className="text-green-300 group-hover:text-green-200" />
                </button>
              )}
              <div className="w-px h-4 bg-white/10 mx-1 self-center" />
              <button onClick={() => handleCreateType('folder')} className="p-1 hover:bg-white/10 rounded transition-colors" title="Nueva Carpeta">
                <FolderPlus size={14} className="text-blue-300" />
              </button>
              <button onClick={() => setShowCreateMenu(!showCreateMenu)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Nuevo...">
                <FileText size={14} className="text-white" />
              </button>

              {/* Creation Dropdown */}
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-white/20 rounded shadow-xl z-50 w-32 flex flex-col p-1">
                  <button onClick={() => handleCreateType('file')} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded text-left text-sm">
                    <FileText size={14} /> Archivo
                  </button>
                  <button onClick={() => handleCreateType('character')} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded text-left text-sm text-purple-300">
                    <User size={14} /> Personaje
                  </button>
                  <button onClick={() => handleCreateType('location')} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded text-left text-sm text-green-300">
                    <MapPin size={14} /> Lugar
                  </button>
                  <button onClick={() => handleCreateType('item')} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded text-left text-sm text-orange-300">
                    <Package size={14} /> Objeto
                  </button>
                </div>
              )}

              {/* Renumber Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('¿Renumerar automáticamente todos los elementos de esta carpeta? (Ej: Capítulo 1, Escena 1...)\nEsto sobrescribirá los títulos actuales.')) {
                    // 1. Get current context files
                    const contextFiles = files.filter(f => f.parent === selectedFolder).sort((a, b) => (a.order || 0) - (b.order || 0));

                    // 2. Separate by types to sequence independently
                    const folders = contextFiles.filter(f => f.type === 'folder' && !f.isSystem);
                    const scenes = contextFiles.filter(f => f.type === 'file');

                    // 3. Rename
                    const updates: FileNode[] = [];

                    folders.forEach((f, i) => {
                      const newTitle = selectedFolder ? `Sección ${i + 1}` : `Capítulo ${i + 1}`;
                      if (f.title !== newTitle) {
                        updates.push({ ...f, title: newTitle });
                      }
                    });

                    scenes.forEach((f, i) => {
                      const newTitle = `Escena ${i + 1}`;
                      if (f.title !== newTitle) {
                        updates.push({ ...f, title: newTitle });
                      }
                    });

                    // 4. Submit Batch Update
                    // We need to pass ALL context files to onReorder to preserve order, but with updated titles.
                    if (updates.length > 0 && onReorder) {
                      const newBatch = contextFiles.map(f => {
                        const updated = updates.find(u => u._id === f._id);
                        return updated || f;
                      });
                      onReorder(newBatch);
                    }
                  }
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors group ml-1"
                title="Normalizar Nombres (Renumerar)"
              >
                <ListOrdered size={14} className="text-yellow-500/80 group-hover:text-yellow-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tree.map(node => (
              <TreeItem
                key={node._id}
                node={node}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
                setExpanded={setExpanded}
                selectFile={selectFile}
                handleRename={handleRename}
                getIcon={getIcon}
                updateFile={updateFile}
                createFile={createFile}
                deleteFile={deleteFile}
                selectedFileId={selectedFileId}
              />
            ))}
          </div>

        </div>

        <DragOverlay>
          {activeNode ? (
            <FileRowPreview node={activeNode} getIcon={getIcon} />
          ) : null}
        </DragOverlay>
      </DndContext >
    </div >
  );
}