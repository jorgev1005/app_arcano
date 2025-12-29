'use client';

import { FileNode } from '@/types/models';

interface OutlinerProps {
  files: FileNode[];
  onSelect: (file: FileNode) => void;
}

export default function Outliner({ files, onSelect }: OutlinerProps) {
  return (
    <div className="flex-1 p-4 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400">
            <th className="p-2">Título</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Conteo de Palabras</th>
          </tr>
        </thead>
        <tbody>
          {files.filter(f => f.type === 'file').map((file) => (
            <tr
              key={file._id}
              onClick={() => onSelect(file)}
              className="border-b border-white/5 hover:bg-white/5 cursor-pointer text-gray-300 hover:text-white transition-colors"
            >
              <td className="p-2">{file.title}</td>
              <td className="p-2">
                <span className="bg-white/10 px-2 py-1 rounded text-xs">{file.status || 'draft'}</span>
              </td>
              <td className="p-2 font-mono text-sm">{file.content ? file.content.split(' ').length : 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}