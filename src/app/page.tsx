'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Binder from '@/components/Binder';
import Corkboard from '@/components/Corkboard';
import Outliner from '@/components/Outliner';
import Inspector from '@/components/Inspector';

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [view, setView] = useState('editor'); // editor, corkboard, outliner

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Error al cargar proyectos');
      const data = await res.json();
      setProjects(data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Puedes mostrar un mensaje al usuario aquí
    }
  };

  const selectProject = async (project) => {
    setCurrentProject(project);
    const res = await fetch(`/api/files?projectId=${project._id}`);
    const data = await res.json();
    setFiles(data.files);
  };

  const selectFile = (file) => {
    setCurrentFile(file);
  };

  return (
    <div className="flex h-screen">
      <Binder projects={projects} selectProject={selectProject} files={files} selectFile={selectFile} />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between p-2 bg-gray-100">
          <button onClick={() => setView('editor')}>Editor</button>
          <button onClick={() => setView('corkboard')}>Corcho</button>
          <button onClick={() => setView('outliner')}>Esquema</button>
        </div>
        {view === 'editor' && <Editor file={currentFile} />}
        {view === 'corkboard' && <Corkboard files={files} />}
        {view === 'outliner' && <Outliner files={files} />}
      </div>
      <Inspector file={currentFile} />
    </div>
  );
}