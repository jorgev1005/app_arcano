'use client';

import { useState } from 'react';

interface BinderProps {
  projects: any[];
  selectProject: (project: any) => void;
  files: any[];
  selectFile: (file: any) => void;
}

export default function Binder({ projects, selectProject, files, selectFile }: BinderProps) {
  return (
    <div className="w-64 bg-gray-200 p-4">
      <h2>Proyectos</h2>
      {projects.map((project) => (
        <div key={project._id} onClick={() => selectProject(project)} className="cursor-pointer">
          {project.title}
        </div>
      ))}
      <h2>Archivos</h2>
      {files.map((file) => (
        <div key={file._id} onClick={() => selectFile(file)} className="cursor-pointer ml-4">
          {file.title}
        </div>
      ))}
    </div>
  );
}