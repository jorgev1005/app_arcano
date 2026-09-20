import { Project, FileNode } from '@/types/models';

const DB_NAME = 'arcano_offline_db';
const DB_VERSION = 1;

export interface SyncMutation {
  id?: number;
  type: 'create_file' | 'update_file' | 'delete_file' | 'create_project' | 'update_project' | 'delete_project';
  entityId: string;
  projectId?: string;
  payload: any;
  timestamp: number;
}

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('IndexedDB no está disponible en este entorno'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store: Proyectos
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: '_id' });
        }

        // Store: Archivos / Escenas (con índice por proyecto)
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: '_id' });
          fileStore.createIndex('project', 'project', { unique: false });
        }

        // Store: Cola de Sincronización
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store: Metadatos de la aplicación
        if (!db.objectStoreNames.contains('appMeta')) {
          db.createObjectStore('appMeta', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- PROYECTOS ---
  async saveProjects(projects: Project[]): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    for (const project of projects) {
      store.put(project);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveSingleProject(project: Project): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put(project);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getProjects(): Promise<Project[]> {
    if (!this.isAvailable()) return [];
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const request = tx.objectStore('projects').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction(['projects', 'files'], 'readwrite');
    tx.objectStore('projects').delete(projectId);
    
    // Eliminar también archivos asociados localmente
    const fileStore = tx.objectStore('files');
    const index = fileStore.index('project');
    const request = index.getAllKeys(projectId);
    request.onsuccess = () => {
      for (const key of request.result) {
        fileStore.delete(key);
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- ARCHIVOS / ESCENAS ---
  async saveFiles(files: FileNode[], projectId: string): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    for (const file of files) {
      // Asegurar que el campo project esté asignado para el índice
      const doc = { ...file, project: (file as any).project || projectId };
      store.put(doc);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveSingleFile(file: FileNode, projectId?: string): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction('files', 'readwrite');
    const doc = { ...file, project: (file as any).project || projectId };
    tx.objectStore('files').put(doc);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getFilesByProject(projectId: string): Promise<FileNode[]> {
    if (!this.isAvailable()) return [];
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const index = tx.objectStore('files').index('project');
      const request = index.getAll(projectId);
      request.onsuccess = () => {
        const results: FileNode[] = request.result || [];
        results.sort((a, b) => (a.order || 0) - (b.order || 0));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSingleFile(fileId: string): Promise<FileNode | null> {
    if (!this.isAvailable()) return null;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const request = tx.objectStore('files').get(fileId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSingleFile(fileId: string): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').delete(fileId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- COLA DE SINCRONIZACIÓN (OUTBOX) ---
  async enqueueMutation(mutation: Omit<SyncMutation, 'id' | 'timestamp'>): Promise<number> {
    if (!this.isAvailable()) return 0;
    const db = await this.getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const item: SyncMutation = {
      ...mutation,
      timestamp: Date.now()
    };
    const request = store.add(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(request.result as number);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingMutations(): Promise<SyncMutation[]> {
    if (!this.isAvailable()) return [];
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const request = tx.objectStore('syncQueue').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeMutation(id: number): Promise<void> {
    if (!this.isAvailable()) return;
    const db = await this.getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    tx.objectStore('syncQueue').delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingCount(): Promise<number> {
    if (!this.isAvailable()) return 0;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const request = tx.objectStore('syncQueue').count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDb = new OfflineDatabase();
