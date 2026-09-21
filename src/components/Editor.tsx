'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Paperclip, X, Moon, Sun, Eye, FileText, Hash, Mic, MicOff, BarChart, SlidersHorizontal } from 'lucide-react';
import { offlineDb } from '@/lib/offlineDb';
import { syncManager } from '@/lib/syncManager';

interface EditorProps {
  file: any;
  onSave?: (file: any) => void;
  variables?: { key: string; value: string }[];
  projectId?: string; // New Prop
  onStatsUpdate?: (newTotal: number) => void;
  onOpenInspector?: () => void;
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

export default function Editor({ file, onSave, variables = [], projectId, onStatsUpdate, onOpenInspector }: EditorProps) {
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
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const lastInsertedRef = useRef<string>('');

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

      // Check for IndexedDB offline draft
      offlineDb.getSingleFile(file._id).then(localFile => {
        if (localFile && localFile.content && localFile.content !== file.content) {
          console.log('[Editor] Restaurando versión más reciente desde IndexedDB');
          setContent(localFile.content);
        }
      }).catch(e => console.warn('Error reading local file:', e));

      // Check for Legacy offline Backup
      const offlineBackup = localStorage.getItem(`offline_bk_${file._id}`);
      if (offlineBackup) {
        try {
          const bk = JSON.parse(offlineBackup);
          if (bk.content && bk.content !== file.content) {
            setContent(bk.content);
          }
        } catch (e) {}
      } else if (!file.content) {
        setContent('');
      } else {
        setContent(file.content);
      }

      setAttachments(file.attachments || []);
      lastFileIdRef.current = file._id;
      setSaveStatus('saved');

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
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      lastInsertedRef.current = '';
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
    recognition.interimResults = false; // Solo resultados finales consolidados para evitar duplicaciones
    recognition.lang = 'es-ES';

    lastInsertedRef.current = '';
    isListeningRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let rawTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          rawTranscript += event.results[i][0].transcript;
        }
      }

      let newTranscript = rawTranscript.trim();
      if (!newTranscript) return;

      // 1. Si la frase es exactamente idéntica a la anterior (bug recurrente de Android Chrome), omitir
      if (newTranscript.toLowerCase() === lastInsertedRef.current.toLowerCase()) {
        return;
      }

      // 2. Si en Android el reconocimiento devuelve texto acumulativo ("Quiero", luego "Quiero saber")
      let textToInsert = newTranscript;
      if (lastInsertedRef.current && newTranscript.toLowerCase().startsWith(lastInsertedRef.current.toLowerCase())) {
        textToInsert = newTranscript.slice(lastInsertedRef.current.length).trim();
      }

      if (!textToInsert) return;

      lastInsertedRef.current = newTranscript;

      const editor = quillRef.current?.getEditor();
      if (editor) {
        const selection = editor.getSelection();
        const cursor = selection ? selection.index : editor.getLength() - 1;

        // Espaciado inteligente: evitar pegar palabras si el cursor no tiene espacio previo
        const currentText = editor.getText();
        const prevChar = cursor > 0 ? currentText.charAt(cursor - 1) : '';
        const needsLeadingSpace = prevChar && !/\s/.test(prevChar);

        const formattedInsert = (needsLeadingSpace ? ' ' : '') + textToInsert + ' ';
        editor.insertText(cursor, formattedInsert, 'user');
        editor.setSelection(cursor + formattedInsert.length, 0);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert("Acceso denegado al micrófono. Verifique los permisos en el navegador.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // Silencio temporal, no cancelar
      } else {
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Si el usuario no presionó detener y el navegador finalizó por pausa o silencio, reanudar
      if (isListeningRef.current) {
        try {
          lastInsertedRef.current = '';
          recognition.start();
        } catch (e) {
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition start error:", e);
    }
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
      const autoLinks = checkAutoLinks(content, variables, file);
      const payload = {
        content,
        attachments,
        wordCount,
        ...autoLinks
      };

      // 1. Guardado local inmediato en IndexedDB (cero latencia)
      await offlineDb.saveSingleFile({
        ...file,
        ...payload
      }, projectId);

      try {
        const res = await fetch(`/api/files/${file._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          setSaveStatus('saved');
          if (onSave) onSave(data.file);

          // GOAL TRACKING: Calculate Delta
          const currentCount = wordCountRef.current;
          const delta = currentCount - lastSavedWordCountRef.current;

          if (delta !== 0 && projectId) {
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
              .catch(err => console.warn('Goal update skipped offline:', err));

            lastSavedWordCountRef.current = currentCount;
          }
        } else {
          throw new Error('Error al responder el servidor');
        }
      } catch (error) {
        console.warn('Modo Offline: Guardado localmente en IndexedDB. Encolando para sincronización.', error);
        await offlineDb.enqueueMutation({
          type: 'update_file',
          entityId: file._id,
          projectId,
          payload
        });
        syncManager.refreshPendingCount();
        setSaveStatus('saved');
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
    <div className={`flex flex-col h-full w-full min-w-0 max-w-full overflow-x-hidden ${darkMode ? 'bg-neutral-900' : 'bg-gray-100'}`}>
      <style>{`
        ${darkMode ? `
          .ql-toolbar.ql-snow {
            background-color: #262626; 
            border-color: #404040 !important;
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
          }
          .ql-container.ql-snow {
            background-color: #171717; 
            border-color: #404040 !important;
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            color: #d4d4d4; 
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .ql-editor {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            font-size: 16px !important;
            line-height: 1.6 !important;
            padding: 12px 14px !important;
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
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
          }
          .ql-container.ql-snow {
            background-color: #ffffff;
            border-color: #e2e8f0 !important;
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .ql-editor {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            font-size: 16px !important;
            line-height: 1.6 !important;
            padding: 12px 14px !important;
          }
        `}
      `}</style>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 min-w-0 w-full max-w-full">
        {/* Toggle & Title Area */}
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-2 gap-2 min-w-0 w-full">
          {/* Word Count & Save status */}
          <div className="flex items-center gap-2 ml-1 shrink-0">
            <div className="text-sm text-gray-400 font-mono">
              {wordCount} palabras
            </div>
            {saveStatus === 'saving' && (
              <span className="text-xs text-blue-400 animate-pulse font-sans">Guardando...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[11px] text-gray-500 font-sans">
                {syncManager.isOnline ? 'Guardado' : 'Guardado localmente'}
              </span>
            )}
            {onOpenInspector && (
              <button
                onClick={onOpenInspector}
                className="lg:hidden ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold shadow-sm transition-all"
                title="Abrir Ficha de Detalles de la Escena"
              >
                <SlidersHorizontal size={13} />
                <span>Detalles</span>
              </button>
            )}
          </div>

          {/* View Mode Toggles */}
          <div className="flex items-center justify-end gap-2 shrink-0 overflow-x-auto no-scrollbar max-w-full">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10 shrink-0">
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

            <div className="w-px bg-white/20 mx-1 shrink-0" />

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors shrink-0 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-200 hover:bg-gray-300 text-purple-600'}`}
              title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-transparent' : 'bg-white'} transition-colors rounded-lg h-[calc(100dvh-220px)] min-h-[350px] mb-2 relative w-full min-w-0 max-w-full flex flex-col`}>
          {viewMode === 'edit' ? (
            <ReactQuill
              key={file?._id}
              ref={quillRef}
              value={content}
              onChange={handleChange}
              modules={modules}
              theme="snow"
              className="h-full w-full min-w-0 max-w-full flex-1 flex flex-col"
              preserveWhitespace
            >
              <div spellCheck={true} className="h-full w-full" />
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
