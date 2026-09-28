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
      status: this.isSyncing
        ? 'syncing'
        : !this.isOnlineState
        ? 'offline'
        : this.pendingCount > 0
        ? 'syncing'
        : 'synced',
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
    console.log('[SyncManager] Conexión a internet restablecida. Iniciando sincronización...');
    this.isOnlineState = true;
    this.notify();
    await this.syncPending();
  }

  private handleOffline() {
    console.log('[SyncManager] Dispositivo en modo sin conexión.');
    this.isOnlineState = false;
    this.notify();
  }

  async triggerSync(): Promise<void> {
    if (typeof window !== 'undefined') {
      this.isOnlineState = navigator.onLine;
    }
    await this.syncPending();
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

    console.log(`[SyncManager] Sincronizando ${mutations.length} operaciones pendientes con el servidor...`);

    let didMakeChanges = false;

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
            // 200/OK o 404 (si ya no existe en el servidor se descarta la mutación)
            success = res.ok || res.status === 404;
            if (res.ok) didMakeChanges = true;
            break;
          }

          case 'create_file': {
            const res = await fetch('/api/files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                _id: mutation.entityId,
                ...mutation.payload
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.file) {
                // Si el servidor asignó un ID distinto al temporal
                if (data.file._id !== mutation.entityId) {
                  await offlineDb.deleteSingleFile(mutation.entityId);
                  await offlineDb.saveSingleFile(data.file, mutation.projectId);
                  await offlineDb.updateMutationEntityId(mutation.entityId, data.file._id);
                } else {
                  await offlineDb.saveSingleFile(data.file, mutation.projectId);
                }
              }
              success = true;
              didMakeChanges = true;
            }
            break;
          }

          case 'delete_file': {
            const res = await fetch(`/api/files/${mutation.entityId}`, {
              method: 'DELETE'
            });
            success = res.ok || res.status === 404;
            if (success) didMakeChanges = true;
            break;
          }

          case 'update_project': {
            const res = await fetch(`/api/projects/${mutation.entityId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mutation.payload)
            });
            success = res.ok || res.status === 404;
            if (res.ok) didMakeChanges = true;
            break;
          }

          case 'create_project': {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                _id: mutation.entityId,
                ...mutation.payload
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.project) {
                if (data.project._id !== mutation.entityId) {
                  await offlineDb.deleteProject(mutation.entityId);
                  await offlineDb.saveSingleProject(data.project);
                  await offlineDb.updateMutationEntityId(mutation.entityId, data.project._id);
                } else {
                  await offlineDb.saveSingleProject(data.project);
                }
              }
              success = true;
              didMakeChanges = true;
            }
            break;
          }

          case 'delete_project': {
            const res = await fetch(`/api/projects/${mutation.entityId}`, {
              method: 'DELETE'
            });
            success = res.ok || res.status === 404;
            if (success) didMakeChanges = true;
            break;
          }
        }

        if (success && mutation.id !== undefined) {
          await offlineDb.removeMutation(mutation.id);
        }
      } catch (err) {
        console.warn(`[SyncManager] Error de red al sincronizar ${mutation.type}:`, err);
        // Interrumpir el lote si falló la red para reanudar luego
        break;
      }
    }

    this.pendingCount = await offlineDb.getPendingCount();
    this.isSyncing = false;
    this.notify();

    if (didMakeChanges && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('arcano_synced'));
    }

    console.log(`[SyncManager] Sincronización finalizada. Pendientes restantes: ${this.pendingCount}`);
  }
}

export const syncManager = new SyncManager();
