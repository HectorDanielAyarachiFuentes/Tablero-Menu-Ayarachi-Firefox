/**
 * Abstrae la interacción con el sistema de archivos PRIVADO del navegador (OPFS).
 * Gestiona la persistencia de datos en un archivo interno mediante requestId correlacionados
 * para evitar condiciones de carrera entre lecturas y escrituras concurrentes.
 */
import { storageGet, storageSet } from '../core/utils.js';

let _fileErrorHandler = (err) => console.error(err);

/**
 * Registra el manejador de errores de la UI para FileSystem sin acoplamiento circular.
 */
export function setFileSystemErrorHandler(handler) {
    if (typeof handler === 'function') _fileErrorHandler = handler;
}

let internalDirHandle = null;
let fsWorkerInstance = null;
let nextRequestId = 1;
const pendingRequests = new Map();

function getWorker() {
    if (!fsWorkerInstance) {
        fsWorkerInstance = new Worker('/menubar/system/file-worker.js', { type: 'module' });
        fsWorkerInstance.addEventListener('message', (event) => {
            const { requestId } = event.data || {};
            if (requestId && pendingRequests.has(requestId)) {
                const resolver = pendingRequests.get(requestId);
                pendingRequests.delete(requestId);
                resolver(event.data);
            }
        });
        fsWorkerInstance.addEventListener('error', (err) => {
            for (const [, resolver] of pendingRequests) {
                resolver({ success: false, error: err.message || 'Worker error' });
            }
            pendingRequests.clear();
        });
    }
    return fsWorkerInstance;
}

function postWorkerRequest(action, payload) {
    return new Promise((resolve) => {
        const requestId = nextRequestId++;
        pendingRequests.set(requestId, resolve);
        getWorker().postMessage({ requestId, action, payload });
    });
}

export const FileSystem = {
    async getInternalDirectory() {
        if (internalDirHandle) return internalDirHandle;
        try {
            internalDirHandle = await navigator.storage.getDirectory();
            return internalDirHandle;
        } catch (err) {
            console.error('Error al acceder al OPFS:', err);
            return null;
        }
    },

    async loadDataFromFile() {
        const handle = await this.getInternalDirectory();
        if (!handle) return null;

        const res = await postWorkerRequest('loadData', { handle });
        if (res && res.success && res.data) {
            await storageSet(res.data);
            return res.data;
        }
        return null;
    },

    async saveDataToFile(dataToSave) {
        const allSettings = await storageGet(null);
        const fullData = { ...allSettings, ...(dataToSave || {}) };

        delete fullData.weather;
        delete fullData.dirHandle;
        delete fullData.bgData;

        const handle = await this.getInternalDirectory();
        if (!handle) {
            throw new Error('No se pudo acceder al almacenamiento interno del navegador.');
        }

        const res = await postWorkerRequest('saveData', { handle, data: fullData });
        if (res && res.success) {
            return;
        }
        const errMsg = res?.error || 'Error desconocido al guardar en OPFS';
        _fileErrorHandler(`Error de sincronización interna: ${errMsg}`);
        throw new Error(errMsg);
    },

    async getPermissionState() {
        return 'granted';
    },

    async selectDirectory() {
        return await this.getInternalDirectory();
    }
};
