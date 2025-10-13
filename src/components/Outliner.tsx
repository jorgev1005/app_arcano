'use client';

interface OutlinerProps {
  files: any[];
}

export default function Outliner({ files }: OutlinerProps) {
  return (
    <div className="flex-1 p-4">
      <table className="w-full">
        <thead>
          <tr>
            <th>Título</th>
            <th>Estado</th>
            <th>Conteo de Palabras</th>
          </tr>
        </thead>
        <tbody>
          {files.filter(f => f.type === 'file').map((file) => (
            <tr key={file._id}>
              <td>{file.title}</td>
              <td>{file.status}</td>
              <td>{file.content.split(' ').length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}