// --- START OF FILE utils.js ---

/**
 * Proporciona funciones de utilidad reutilizables en toda la aplicación.
 * Incluye selectores de DOM, helpers para el almacenamiento y una función de guardado con debounce.
 */
import { FileSystem } from '../system/file-system.js';
import { showSaveStatus } from '../components/ui.js';

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

/**
 * Limpia el contenido de un elemento de forma segura.
 */
export const clearHTML = (el) => {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
};

/**
 * Asigna HTML de forma segura (usando insertAdjacentHTML tras limpiar).
 * Nota: El contenido ya debería estar sanitizado con DOMPurify antes de llamar a esta función.
 */
export const setHTML = (el, html) => {
  if (!el) return;
  clearHTML(el);
  el.insertAdjacentHTML('afterbegin', html);
};

/**
 * Crea un elemento SVG a partir de una cadena y lo inserta en el contenedor.
 * Evita el uso directo de innerHTML en elementos del DOM activos.
 */
export const setSVG = (el, svgString) => {
  if (!el) return;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;
  
  clearHTML(el);
  // Importar el nodo al documento actual
  const importedNode = document.importNode(svgElement, true);
  el.appendChild(importedNode);
};

let saveDebounceTimer;
let syncBuffer = {};
let syncTimer = null;

// storage helpers supporting chrome.storage.sync or fallback to localStorage
export const storageGet = (keys, useCache = false) => new Promise(resolve => {
  if (window.chrome && chrome.storage?.local) {
    // Siempre leemos de local, que es nuestra "fuente de verdad" en el navegador para la carga inicial.
    chrome.storage.local.get(keys, resolve);
  } else { // Fallback para cuando no es una extensión
    const out = {};
    if (keys) {
      keys.forEach(k => { 
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { out[k] = localStorage.getItem(k); }
      });
    } else {
      for(let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i);
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { out[k] = localStorage.getItem(k); }
      }
    }
    resolve(out);
  }
});

// CAMBIO: La función de guardado ahora escribe en `local` (para velocidad) y `sync` (para sincronización)
// Se añade un filtro de tamaño para evitar el error "kQuotaBytesPerItem quota exceeded"
export const storageSet = (obj) => {
  return new Promise(async (resolve) => {
    // 1. Guardamos en chrome.storage (Async)
    if (window.chrome && chrome.storage) {
      // Guardamos SIEMPRE en local para acceso rápido e inmediato en el hilo async.
      await new Promise(res => chrome.storage.local.set(obj, res));

      // 2. Sincronización con Sync (Debounced)
      if (chrome.storage.sync) {
        Object.assign(syncBuffer, obj);
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          const syncObj = {};
          for (const key in syncBuffer) {
            const size = JSON.stringify(syncBuffer[key]).length;
            if (size < 7000) syncObj[key] = syncBuffer[key];
          }
          if (Object.keys(syncObj).length > 0) {
            chrome.storage.sync.set(syncObj, () => {
              if (chrome.runtime.lastError) console.warn("Sync quota warning:", chrome.runtime.lastError.message);
              syncBuffer = {};
            });
          }
          syncTimer = null;
        }, 1000); 
      }
    } else {
      // Fallback local storage normal
      Object.keys(obj).forEach(k => localStorage.setItem(k, JSON.stringify(obj[k])));
    }

    // 3. CACHE CRÍTICA (Sync) - Para eliminar el destello (Zero-Flash)
    const criticalKeys = [
      'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
      'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
      'greetingColor', 'nameColor', 'clockColor', 'dateColor',
      'greetingFont', 'dateFont', 'activePremiumTheme', 'premiumThemeData',
      'doodle', 'gradient', 'bgData', 'bgUrl', 'bgColor',
      'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds'
    ];

    // Obtenemos la caché actual o creamos una nueva
    let zeroFlashCache = {};
    try {
      const existing = localStorage.getItem('zero_flash_cache');
      if (existing) zeroFlashCache = JSON.parse(existing);
    } catch(e) {}

    // Actualizamos solo lo que ha cambiado
    Object.keys(obj).forEach(key => {
      if (criticalKeys.includes(key)) {
        zeroFlashCache[key] = obj[key];
      }
    });

    try {
      localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
    } catch (e) {}

    resolve();
  });
};


/**
 * Función de guardado en archivo con "debounce".
 * Agrupa múltiples llamadas a guardar en un corto período de tiempo en una sola.
 * @param {object} dataToSave - Datos a fusionar y guardar.
 * @param {boolean} forceAll - Si es true, fuerza a guardar todos los datos, no solo los del parámetro.
 */
const debouncedSaveToFile = (dataToSave, forceAll = false) => {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
        // Pasamos el objeto de configuración directamente para que se guarde en el archivo.
        // No es necesario pasar `dataToSave` aquí, ya que `saveDataToFile` obtiene el estado más reciente del storage.
        try {
            // Al pasar un objeto vacío, forzamos a saveDataToFile a recolectar todos los datos.
            await FileSystem.saveDataToFile({}); 
            showSaveStatus();
        } catch (error) {
            // El error ya se muestra en la UI desde file-system.js, aquí solo lo capturamos.
            console.error("Fallo el guardado automático después de varios intentos.", error);
        }
    }, 300); // Espera 300ms antes de guardar
};

/**
 * Guarda una configuración, la almacena en el navegador y sincroniza con el archivo si autoSync está activado.
 * @param {object} setting - Un objeto con la clave y valor a guardar. Ej: { userName: 'Test' }
 * @param {function(object):void} [applyCallback] - Una función opcional para aplicar los cambios en la UI.
 */
export async function saveAndSyncSetting(setting, applyCallback) {
    // 1. Guardar el cambio específico en el almacenamiento del navegador.
    await storageSet(setting);
    // 2. Aplicar el cambio en la UI si se proporciona un callback.
    if (applyCallback) {
        applyCallback(setting);
    }
    // 3. Comprobar si la sincronización con archivo está activa.
    const { autoSync } = await storageGet(['autoSync']);
    if (autoSync) {
        // 4. Disparar el guardado en archivo. Pasamos un objeto vacío para forzar
        //    a que se guarde el estado COMPLETO, no solo este cambio.
        debouncedSaveToFile({});
    } else {
        showSaveStatus();
    }
}