/**
 * Abstrae la interacción con el sistema de archivos PRIVADO del navegador (OPFS).
 * Gestiona la persistencia de datos en un archivo interno que sobrevive a limpiezas de caché.
 */
import { storageGet, storageSet } from '../core/utils.js';
import { STORAGE_KEYS } from '../core/config.js';
import { showFileError, showSaveStatus, updateDataTabUI } from '../components/ui.js';

const FILE_NAME = 'tablero-data.json';
let internalDirHandle = null;
let fsWorkerInstance = null;

/**
 * Obtiene una instancia única del Web Worker para el sistema de archivos.
 */
function getWorker() {
    if (!fsWorkerInstance) {
        fsWorkerInstance = new Worker('/menubar/system/file-worker.js', { type: 'module' });
    }
    return fsWorkerInstance;
}

export const FileSystem = {
    /**
     * Obtiene el acceso al directorio raíz privado (OPFS).
     * Es automático y no requiere intervención del usuario.
     */
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

    /**
     * Carga los datos desde el archivo interno del navegador.
     */
    async loadDataFromFile() {
        return new Promise(async (resolve) => {
            const handle = await this.getInternalDirectory();
            if (!handle) return resolve(null);
            
            const fsWorker = getWorker();
            fsWorker.onmessage = (event) => {
                if (event.data.action === 'loadDataResult') {
                    if (event.data.success && event.data.data) {
                        storageSet(event.data.data).then(() => resolve(event.data.data));
                    } else {
                        resolve(null);
                    }
                }
            };
            fsWorker.postMessage({ action: 'loadData', payload: { handle } });
        });
    },

    /**
     * Guarda el estado actual en el archivo interno (OPFS).
     */
    async saveDataToFile(dataToSave) {
        const allSettings = await storageGet(null);
        const fullData = { ...allSettings };

        // Limpieza de datos temporales
        delete fullData.weather;
        delete fullData.dirHandle;

        return new Promise(async (resolve, reject) => {
            const handle = await this.getInternalDirectory();

            if (!handle) {
                return reject(new Error('No se pudo acceder al almacenamiento interno del navegador.'));
            }
            
            const fsWorker = getWorker();
            fsWorker.onmessage = (event) => {
                if (event.data.action === 'saveDataResult') { 
                    if (event.data.success) {
                        console.log('[FileSystem] Sincronización interna completada.');
                        resolve();
                    } else {
                        showFileError(`Error de sincronización interna: ${event.data.error}`);
                        reject(new Error(event.data.error));
                    }
                }
            };
            fsWorker.postMessage({ action: 'saveData', payload: { handle, data: fullData } });
        });
    },

    /**
     * Mantiene compatibilidad con la UI vieja pero ahora informa que es automático.
     */
    async getPermissionState() {
        return 'granted';
    },

    /**
     * Selector de directorio ya no es necesario para OPFS.
     */
    async selectDirectory() {
        console.log('OPFS activo: El guardado ya es automático e interno.');
        return await this.getInternalDirectory();
    }
};
