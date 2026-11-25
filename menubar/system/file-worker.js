/**
 * Web Worker para manejar operaciones del sistema de archivos (OPFS) en segundo plano.
 * Responde con el requestId recibido para soportar llamadas concurrentes sin colisiones.
 */

const FILE_NAME = 'tablero-data.json';

self.onmessage = async (event) => {
    const { requestId, action, payload } = event.data;

    try {
        switch (action) {
            case 'loadData': {
                const data = await loadDataFromFile(payload.handle);
                self.postMessage({ requestId, action: 'loadDataResult', success: true, data });
                break;
            }
            case 'saveData': {
                await saveDataToFile(payload.handle, payload.data);
                self.postMessage({ requestId, action: 'saveDataResult', success: true });
                break;
            }
        }
    } catch (error) {
        console.error(`Error en el worker de archivos (${action}):`, error);
        self.postMessage({ requestId, action: `${action}Result`, success: false, error: error.message });
    }
};

async function loadDataFromFile(handle) {
    if (!handle) return null;

    try {
        const fileHandle = await handle.getFileHandle(FILE_NAME, { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();
        return JSON.parse(content);
    } catch (err) {
        if (err.name !== 'NotFoundError') {
            console.error('Error al cargar datos desde el archivo (worker):', err);
        }
        return null;
    }
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetries(asyncFn, maxRetries = 3) {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await asyncFn();
        } catch (error) {
            if (i === maxRetries) throw error;
            await wait(Math.pow(2, i) * 100);
        }
    }
}

async function saveDataToFile(handle, dataToSave) {
    if (!handle) return;

    await withRetries(async () => {
        const fileHandle = await handle.getFileHandle(FILE_NAME, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(dataToSave, null, 2));
        await writable.close();
    });
}
