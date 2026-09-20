import { offlineDb, SyncMutation } from './offlineDb';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced';

type SyncListener = (state: { status: SyncStatus; pendingCount: number }) => void;

class SyncManager {
  private isOnlineState: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private pendingCount: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnlineState = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.refreshPendingCount();
    }
  }

  get isOnline(): boolean {
    return this.isOnlineState;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({
      status: this.isSyncing ? 'syncing' : this.isOnlineState ? (this.pendingCount > 0 ? 'syncing' : 'synced') : 'offline',
      pendingCount: this.pendingCount
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status: SyncStatus = this.isSyncing
      ? 'syncing'
      : !this.isOnlineState
      ? 'offline'
      : this.pendingCount > 0
      ? 'syncing'
      : 'synced';

    for (const listener of this.listeners) {
      listener({ status, pendingCount: this.pendingCount });
    }
  }

  async refreshPendingCount(): Promise<number> {
    this.pendingCount = await offlineDb.getPendingCount();
    this.notify();
    return this.pendingCount;
  }

  private async handleOnline() {
    console.log('[SyncManager] Conexión a internet restablecida.');
    this.isOnlineState = true;
    this.notify();
    await this.syncPending();
  }

  private handleOffline() {
    console.log('[SyncManager] Dispositivo en modo sin conexión.');
    this.isOnlineState = false;
    this.notify();
  }

  async syncPending(): Promise<void> {
    if (!this.isOnlineState || this.isSyncing) return;

    const mutations = await offlineDb.getPendingMutations();
    if (mutations.length === 0) {
      this.isSyncing = false;
      this.pendingCount = 0;
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.notify();

    console.log(`[SyncManager] Sincronizando ${mutations.length} operaciones pendientes...`);

    for (const mutation of mutations) {
      try {
        let success = false;

        switch (mutation.type) {
          case 'update_file': {
            const res = await fetch(`/api/files/${mutation.entityId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mutation.payload)
            });
            success = res.ok;
            break;
          }

          case 'create_file': {
            const res = await fetch('/api/files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mutation.payload)
            });
            if (res.ok) {
              const data = await res.json();
              // Reemplazar id temporal en IndexedDB
              if (data.file && mutation.entityId.startsWith('temp_')) {
                await offlineDb.deleteSingleFile(mutation.entityId);
                await offlineDb.saveSingleFile(data.file, mutation.projectId);
              }
              success = true;
            }
            break;
          }

          case 'delete_file': {
            const res = await fetch(`/api/files/${mutation.entityId}`, {
              method: 'DELETE'
            });
            // Si da 404 ya no existe en el servidor, considerarlo exitoso
            success = res.ok || res.status === 404;
            break;
          }

          case 'update_project': {
            const res = await fetch(`/api/projects/${mutation.entityId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mutation.payload)
            });
            success = res.ok;
            break;
          }

          case 'create_project': {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mutation.payload)
            });
            success = res.ok;
            break;
          }

          case 'delete_project': {
            const res = await fetch(`/api/projects/${mutation.entityId}`, {
              method: 'DELETE'
            });
            success = res.ok || res.status === 404;
            break;
          }
        }

        if (success && mutation.id !== undefined) {
          await offlineDb.removeMutation(mutation.id);
        }
      } catch (err) {
        console.warn(`[SyncManager] Error al sincronizar mutación ${mutation.type}:`, err);
        // Si hay error de red durante la sincronización, abortar el lote hasta el próximo intento
        break;
      }
    }

    this.pendingCount = await offlineDb.getPendingCount();
    this.isSyncing = false;
    this.notify();
    console.log(`[SyncManager] Sincronización finalizada. Pendientes restantes: ${this.pendingCount}`);
  }
}

export const syncManager = new SyncManager();
