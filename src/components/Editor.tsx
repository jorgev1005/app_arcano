'use client';

import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface EditorProps {
  file: any;
}

export default function Editor({ file }: EditorProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (file) setContent(file.content);
  }, [file]);

  const saveContent = async () => {
    if (file) {
      await fetch(`/api/files/${file._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    }
  };

  return (
    <div className="flex-1 p-4">
      <ReactQuill value={content} onChange={setContent} />
      <button onClick={saveContent} className="mt-4 bg-blue-500 text-white p-2">Guardar</button>
    </div>
  );
}