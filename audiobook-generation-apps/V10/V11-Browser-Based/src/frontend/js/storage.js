const DB_NAME = 'AudiobookStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_CHUNKS = 'chunks';

export class StorageService {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => reject('Database error: ' + event.target.error);

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
                    db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
                    db.createObjectStore(STORE_CHUNKS, { keyPath: 'id' });
                }
            };
        });
    }

    async saveProject(project) {
        return this._performTransaction(STORE_PROJECTS, 'readwrite', (store) => {
            const p = { ...project, updatedAt: new Date().toISOString() };
            const req = store.put(p);
            return new Promise((res, rej) => {
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
        });
    }

    async getProjects() {
        return this._performTransaction(STORE_PROJECTS, 'readonly', (store) => {
             const req = store.getAll();
             return new Promise((res, rej) => {
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
        });
    }

    async getProject(id) {
        return this._performTransaction(STORE_PROJECTS, 'readonly', (store) => {
            const req = store.get(id);
             return new Promise((res, rej) => {
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
        });
    }

    async deleteProject(id) {
        return this._performTransaction(STORE_PROJECTS, 'readwrite', (store) => {
            const req = store.delete(id);
             return new Promise((res, rej) => {
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });
        });
    }

    async renameProject(id, newTitle) {
        const project = await this.getProject(id);
        if (!project) throw new Error('Project not found');
        project.title = newTitle;
        await this.saveProject(project);
    }

    // --- Audio Chunk Management ---

    async saveChunk(id, blob, metadata = {}) {
        return this._performTransaction(STORE_CHUNKS, 'readwrite', (store) => {
             const req = store.put({ id, blob, ...metadata });
             return new Promise((res, rej) => {
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
        });
    }

    async getChunk(id) {
        return this._performTransaction(STORE_CHUNKS, 'readonly', (store) => {
            const req = store.get(id);
             return new Promise((res, rej) => {
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
        });
    }
    
    async checkChunksExistence(ids) {
        return new Promise(async (resolve, reject) => {
             try {
                 const transaction = this.db.transaction([STORE_CHUNKS], 'readonly');
                 const store = transaction.objectStore(STORE_CHUNKS);
                 const results = [];
                 
                 for(const id of ids) {
                     await new Promise(r => {
                         const req = store.count(id);
                         req.onsuccess = () => {
                             results.push({ id, exists: req.result > 0 });
                             r();
                         };
                         req.onerror = () => {
                             results.push({ id, exists: false });
                             r();
                         };
                     });
                 }
                 resolve(results);
             } catch(e) { reject(e); }
        });
    }

    // --- Helpers ---

    _performTransaction(storeName, mode, action) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            try {
                resolve(action(store));
            } catch(e) {
                reject(e);
            }
        });
    }
}
