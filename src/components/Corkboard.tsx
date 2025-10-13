'use client';

interface CorkboardProps {
  files: any[];
}

export default function Corkboard({ files }: CorkboardProps) {
  return (
    <div className="flex-1 p-4 grid grid-cols-3 gap-4">
      {files.filter(f => f.type === 'file').map((file) => (
        <div key={file._id} className="bg-yellow-200 p-4 rounded shadow">
          <h3>{file.title}</h3>
          <p>{file.synopsis}</p>
        </div>
      ))}
    </div>
  );
}