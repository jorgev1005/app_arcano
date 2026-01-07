'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Paperclip, X, Moon, Sun, Eye, FileText, Hash, Mic, MicOff, BarChart } from 'lucide-react';

interface EditorProps {
  file: any;
  onSave?: (file: any) => void;
  variables?: { key: string; value: string }[];
  projectId?: string; // New Prop
  onStatsUpdate?: (newTotal: number) => void;
}

// Helper to check and auto-link entities
const checkAutoLinks = (content: string, variables: { key: string; entityId?: string }[], currentFile: any): any => {
  let updates: any = {};
  let newLinks = [...(currentFile.links || [])];
  let newSceneData = { ...currentFile.sceneData };
  let hasChanges = false;

  variables.forEach(v => {
    // Check with and without hash, case insensitive
    const lowerContent = content.toLowerCase();
    const key = v.key.toLowerCase();
    const marker = `#${key}`;
    const bareKey = key; // In case user types just the word? No, marker implies #.

    if (v.entityId && (lowerContent.includes(marker) || lowerContent.includes(key))) { // Relaxed check
      // Check Visual Link
      // Ensure we deal with string IDs
      const existingLink = newLinks.find(l => (typeof l === 'object' ? l._id : l) === v.entityId);

      if (!existingLink) {
        newLinks.push(v.entityId);
        hasChanges = true;
      }

      // Check Semantic Link (Character List)
      // Assuming we can fetch entity type easily? We might strictly assume char for sceneData.characters for now
      // or we just blindly add to links which handles visual.
      // But user specifically asked for "automatic relation".

      const currentChars = newSceneData.characters || [];
      if (!currentChars.includes(v.entityId)) {
        newSceneData.characters = [...currentChars, v.entityId];
        // We mark changes but we only assign to updates if truly valid
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    updates.links = newLinks;
    updates.sceneData = newSceneData;
    return updates;
  }
  return null;
};

export default function Editor({ file, onSave, variables = [], projectId, onStatsUpdate }: EditorProps) {
  const [content, setContent] = useState(file?.content || '');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'inspect' | 'stats'>('edit');
  const quillRef = useRef<ReactQuill>(null);

  // Consolidated State & Refs for Auto-Save Logic
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [wordCount, setWordCount] = useState(0);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFileIdRef = useRef<string | null>(null);
  const contentRef = useRef(content);
  const attachmentsRef = useRef(attachments);
  const wordCountRef = useRef(wordCount);
  const saveStatusRef = useRef<any>(saveStatus); // Relax type for offline
  const lastSavedWordCountRef = useRef(0); // Track for Delta

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Sync refs with state
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);
  useEffect(() => { wordCountRef.current = wordCount; }, [wordCount]);
  useEffect(() => { saveStatusRef.current = saveStatus; }, [saveStatus]);

  // Helper to calc words
  const countWords = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    return text.length > 0 ? text.split(/\s+/).length : 0;
  };

  // Force Save & File Switch Logic
  useEffect(() => {
    if (file && file._id !== lastFileIdRef.current) {

      // 1. Force Save previous file if unsaved
      if (lastFileIdRef.current && (saveStatusRef.current === 'unsaved' || saveStatusRef.current === 'saving')) {
        // ...
      }

      // Check for OFFline Backup
      const offlineBackup = localStorage.getItem(`offline_bk_${file._id}`);
      if (offlineBackup) {
        try {
          const bk = JSON.parse(offlineBackup);
          // Simple conflict resolution: Check timestamp or just ask/overwrite. 
          // For now, if local exists, we assume it's newer/unsynced and use it, alerting user.
          // Ideally we check dates. Here we just set it.
          setContent(bk.content || '');
          if (bk.content !== file.content) {
            // Alert user subtly or just mark as unsaved
            console.log("Restored offline backup");
            setSaveStatus('unsaved'); // Mark unsaved to trigger sync attempt eventually
          }
          setAttachments(file.attachments || []); // Attachments logic usually server side, keep server
        } catch (e) {
          setContent(file.content || '');
        }
      } else {
        setContent(file.content || '');
      }

      setAttachments(file.attachments || []);
      lastFileIdRef.current = file._id;
      if (!offlineBackup) setSaveStatus('saved');

      // Initialize Delta Tracking
      const initialCount = countWords(file.content || '');
      lastSavedWordCountRef.current = initialCount;
      setWordCount(initialCount); // Sync state immediately
    }
  }, [file]);

  // Word Count Logic (Keep existing effect for UI updates)
  useEffect(() => {
    setWordCount(countWords(content));
  }, [content]);

  // ... (Image Handler & Modules omitted - same as before) ...
  const imageHandler = () => { /* ... */ };
  const modules = useMemo(() => ({ /* ... */ }), []);
  const handleFileUpload = async (e: any) => { /* ... */ };
  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const toggleSpeech = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Tu navegador no soporta el reconocimiento de voz. Prueba con Chrome o Edge.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        const editor = quillRef.current?.getEditor();
        const cursor = editor?.getSelection()?.index || editor?.getLength() || 0;
        editor?.insertText(cursor, finalTranscript + ' ');
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert("Acceso denegado al micrófono. Verifique los permisos o use una conexión segura (HTTPS). En móviles, el acceso suele bloquearse en HTTP.");
      } else {
        alert("Error en el reconocimiento de voz: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) setIsListening(false);
    };

    recognition.start();
  };

  // Auto-save logic
  const triggerAutoSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSaveStatus('unsaved');
    saveTimeoutRef.current = setTimeout(() => {
      saveContent();
    }, 2000); // 2 seconds debounce
  };

  const saveContent = async () => {
    if (file) {
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/files/${file._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            attachments,
            wordCount,
            ...checkAutoLinks(content, variables, file) // Merge links/sceneData updates
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSaveStatus('saved');
          if (onSave) onSave(data.file);

          // GOAL TRACKING: Calculate Delta
          const currentCount = wordCountRef.current;
          const delta = currentCount - lastSavedWordCountRef.current;

          if (delta !== 0 && projectId) {
            console.log('Sending goal delta:', delta);
            fetch(`/api/projects/${projectId}/goals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addWords: delta })
            })
              .then(res => res.json())
              .then(data => {
                if (data.success && onStatsUpdate) {
                  onStatsUpdate(data.newTotal);
                }
              })
              .catch(err => console.error('Error updating goals:', err));

            lastSavedWordCountRef.current = currentCount;
          }

        } else {
          setSaveStatus('unsaved');
          alert('Error al guardar automáticamente');
        }
      } catch (error) {
        console.error('Error saving:', error);
        // OFFLINE FALLBACK
        try {
          localStorage.setItem(`offline_bk_${file._id}`, JSON.stringify({
            content,
            timestamp: Date.now()
          }));
          setSaveStatus('unsaved'); // Technically 'saved locally' but 'unsaved' to server.
          // visual hint could be improved
        } catch (e) { console.error("Local storage full", e) }
      }
    }
  };

  // Preview Substitution Logic
  const getPreviewContent = () => {
    let processed = content;

    variables.forEach(v => {
      const regex = new RegExp(`#${v.key}`, 'g');

      let replacement = '';
      if (viewMode === 'preview') {
        // Final View: Show Value, Tooltip Key, Force Text Color to override highlighting
        replacement = `<span class="bg-transparent border-b border-dashed border-gray-500/30 cursor-help text-gray-800 dark:text-gray-300" style="color: inherit;" title="#${v.key}">${v.value}</span>`;
      } else if (viewMode === 'inspect') {
        // Inspect View: Show Key (colored), Tooltip Value
        replacement = `<span class="bg-blue-500/20 text-blue-300 px-1 rounded cursor-help border border-blue-500/30 font-mono text-sm" title="${v.value}">#${v.key}</span>`;
      }

      processed = processed.replace(regex, replacement);
    });

    return processed;
  };

  // Highlight hashtags handling
  const handleChange = (content: string, delta: any, source: string, editor: any) => {
    // Smart Text: Auto-replace -- with —
    if (source === 'user' && content.includes('--')) {
      // 1. Capture current cursor
      const currentSelection = editor.getSelection();
      const cursorIndex = currentSelection ? currentSelection.index : 0;

      // 2. Perform replacement
      const newContent = content.replace(/--/g, '—');

      if (newContent !== content) {
        // 3. Update Content
        setContent(newContent);

        // 4. Restore Cursor (Corrected for length difference)
        // We replaced 2 chars (--) with 1 char (—), so we lose 1 char per replacement *before* the cursor.
        // However, calculating exactly how many were before cursor is complex in one go.
        // Simplified approach: If we just typed it, cursor is likely at the end of the "--".
        // Let's rely on Quill's next tick setSelection.

        // Count how many replacements occurred BEFORE the cursor
        const textBeforeCursor = content.substring(0, cursorIndex);
        const matchCount = (textBeforeCursor.match(/--/g) || []).length;
        const newCursorIndex = cursorIndex - matchCount;

        // Use requestAnimationFrame to ensure React render cycle completes
        requestAnimationFrame(() => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            quill.setSelection(newCursorIndex, 0);
          }
        });
      } else {
        setContent(content);
      }
    } else {
      setContent(content);
    }

    // Auto-highlight on user input & Trigger Auto-save
    if (source === 'user') {
      triggerAutoSave();

      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const text = quill.getText();
      const regex = /#[\w\u00C0-\u00FF]+/g;
      let match;

      // Remove existing colors (Simple approach: Reset all)
      quill.formatText(0, quill.getLength(), 'color', false);

      // Apply color to matches
      while ((match = regex.exec(text)) !== null) {
        quill.formatText(match.index, match[0].length, 'color', '#a78bfa'); // purple-400
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-neutral-900' : 'bg-gray-100'}`}>
      <style>{`
        ${darkMode ? `
          /* ... styles kept same ... */
          .ql-toolbar.ql-snow {
            background-color: #262626; 
            border-color: #404040 !important;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
          }
          .ql-container.ql-snow {
            background-color: #171717; 
            border-color: #404040 !important;
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            color: #d4d4d4; 
          }
          .ql-editor.ql-blank::before {
            color: #737373; 
            font-style: italic;
          }
          .ql-snow .ql-stroke { stroke: #a3a3a3; }
          .ql-snow .ql-fill { fill: #a3a3a3; }
          .ql-snow .ql-picker { color: #a3a3a3; }
          
          .ql-snow .ql-picker-options {
            background-color: #262626;
            border-color: #404040;
          }
        ` : `
          .ql-toolbar.ql-snow {
            background-color: #f8fafc;
            border-color: #e2e8f0 !important;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
          }
          .ql-container.ql-snow {
            background-color: #ffffff;
            border-color: #e2e8f0 !important;
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
          }
        `}
      `}</style>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Toggle & Title Area */}
        <div className="flex justify-between items-center mb-1 gap-2">
          {/* Word Count (Now on the left) */}
          <div className="text-sm text-gray-400 font-mono ml-1">
            {wordCount} palabras
          </div>

          {/* View Mode Toggles */}
          <div className="flex justify-end gap-2">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
              {/* Speech to Text Button */}
              <button
                onClick={toggleSpeech}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-600 text-white animate-pulse shadow' : 'text-gray-400 hover:text-white'}`}
                title={isListening ? "Detener Grabación" : "Dictar (Voz a Texto)"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <div className="w-px bg-white/20 mx-1" />

              <button
                onClick={() => setViewMode('edit')}
                className={`p-2 rounded-full transition-colors ${viewMode === 'edit' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Editar"
              >
                <FileText size={16} />
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`p-2 rounded-full transition-colors ${viewMode === 'stats' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Estadísticas de Palabras"
              >
                <BarChart size={16} />
              </button>
              <button
                onClick={() => setViewMode('inspect')}
                className={`p-2 rounded-full transition-colors ${viewMode === 'inspect' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Inspeccionar Variables (Ver Códigos)"
              >
                <Hash size={16} />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-2 rounded-full transition-colors ${viewMode === 'preview' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Vista Final (Ver Valores)"
              >
                <Eye size={16} />
              </button>
            </div>

            <div className="w-px bg-white/20 mx-1" />

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-200 hover:bg-gray-300 text-purple-600'}`}
              title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-transparent' : 'bg-white'} transition-colors rounded-lg h-[calc(100dvh-220px)] min-h-[400px] mb-2 relative`}>
          {viewMode === 'edit' ? (
            <ReactQuill
              key={file?._id}
              ref={quillRef}
              value={content}
              onChange={handleChange}
              modules={modules}
              theme="snow"
              className="h-full"
              preserveWhitespace
            >
              <div spellCheck={true} className="h-full" />
            </ReactQuill>
          ) : viewMode === 'stats' ? (
            <div className={`h-full p-4 overflow-y-auto border rounded-lg ${darkMode ? 'border-neutral-700 bg-neutral-900 text-gray-300' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart size={20} className="text-orange-500" /> Frecuencia de Palabras
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(() => {
                  const text = content.replace(/<[^>]*>/g, ' ').toLowerCase();
                  const words = text.match(/\b[\w\u00C0-\u00FF]+\b/g) || [];
                  const totalWords = words.filter((w: string) => w.length > 2).length;
                  const frequency: Record<string, number> = {};

                  words.forEach((w: string) => {
                    if (w.length > 2) frequency[w] = (frequency[w] || 0) + 1;
                  });
                  const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 50);

                  if (sorted.length === 0) return <p className="text-gray-500 italic col-span-full">No hay suficientes palabras para analizar.</p>;

                  return sorted.map(([word, count]) => {
                    const percentage = totalWords > 0 ? ((count / totalWords) * 100).toFixed(1) : 0;
                    return (
                      <div key={word} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                        <span className="truncate mr-2 font-medium max-w-[50%]">{word}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{percentage}%</span>
                          <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
                        </div>
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
          ) : (
            <div
              className={`h-full p-4 overflow-y-auto border rounded-lg prose max-w-none ${darkMode ? 'border-neutral-700 bg-neutral-900 text-gray-300 prose-invert' : 'border-gray-200 bg-white text-gray-800'}`}
              dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
            />
          )}
        </div>

        {/* Status Bar (Moved Below Editor) */}
        <div className="flex justify-end items-center gap-4 mb-6 px-1">
          {viewMode === 'edit' && (
            <div className="flex items-center gap-4 flex-1 justify-end">
              <span className={`text-xs uppercase font-bold tracking-wider ${saveStatus === 'saving' ? 'text-blue-400 animate-pulse' :
                saveStatus === 'unsaved' ? 'text-orange-500' : // Changed to orange for visibility
                  'text-green-500'
                }`}>
                {saveStatus === 'saving' ? 'Guardando...' :
                  saveStatus === 'unsaved' ? 'Offline / Sin Guardar' :
                    'Guardado'}
              </span>
              {saveStatus !== 'saved' && (
                <button onClick={() => saveContent()} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded font-bold transition-colors text-sm">
                  Guardar Ahora
                </button>
              )}
            </div>
          )}
        </div>

        {/* Attachments Section (Moved Below Status Bar) */}
        <div className="mb-4 pt-4 border-t border-white/10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase">Adjuntos</h3>
            <label className="cursor-pointer bg-white/10 hover:bg-white/20 p-1 rounded transition-colors">
              <Paperclip size={16} className="text-gray-300" />
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="space-y-2">
            {attachments.map((att, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/10">
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm truncate flex-1">
                  {att.name}
                </a>
                <button onClick={() => removeAttachment(index)} className="ml-2 text-gray-500 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
            {attachments.length === 0 && <p className="text-xs text-gray-600 italic">No hay archivos adjuntos.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
