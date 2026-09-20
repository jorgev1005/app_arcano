'use client';

import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '@/lib/syncManager';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function OfflineIndicator() {
  const [state, setState] = useState<{ status: SyncStatus; pendingCount: number }>({
    status: 'online',
    pendingCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setState);
    return () => unsubscribe();
  }, []);

  if (state.status === 'offline') {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse"
        title="Estás trabajando sin conexión. Todos tus cambios se guardan localmente en tu dispositivo y se sincronizarán al reconectarte."
      >
        <CloudOff size={14} className="text-amber-400 shrink-0" />
        <span>Modo Offline</span>
        {state.pendingCount > 0 && (
          <span className="bg-amber-500/20 px-1.5 py-0.2 rounded-full text-[10px]">
            {state.pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (state.status === 'syncing') {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium"
        title="Sincronizando cambios pendientes con el servidor..."
      >
        <RefreshCw size={13} className="text-blue-400 animate-spin shrink-0" />
        <span>Sincronizando...</span>
        {state.pendingCount > 0 && (
          <span className="bg-blue-500/20 px-1.5 py-0.2 rounded-full text-[10px]">
            {state.pendingCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium"
      title="Conectado a la nube. Manuscrito sincronizado."
    >
      <CheckCircle2 size={12} className="text-emerald-400" />
      <span>Sincronizado</span>
    </div>
  );
}
