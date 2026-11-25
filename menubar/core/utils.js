/**
 * Proporciona funciones de utilidad reutilizables en toda la aplicación.
 * Incluye selectores de DOM, sanitización HTML, validación de URLs, helpers de color
 * y abstracción del almacenamiento con caché Zero-Flash.
 */
let _saveToFileHandler = null;
let _showSaveStatusHandler = null;

/**
 * Registra handlers externos para persistencia en archivo y estado de UI
 * eliminando el acoplamiento y las dependencias circulares.
 */
export function registerSaveHandlers(handlers = {}) {
    if (handlers.saveToFile) _saveToFileHandler = handlers.saveToFile;
    if (handlers.showSaveStatus) _showSaveStatusHandler = handlers.showSaveStatus;
}

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
 * Elimina nodos y atributos potencialmente peligrosos de un documento parseado
 * como defensa adicional cuando DOMPurify aún no ha sido cargado en memoria.
 */
function stripDangerousNodes(doc) {
  const blockedTags = 'script, iframe, object, embed, link, meta, base';
  doc.querySelectorAll(blockedTags).forEach(node => node.remove());

  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src' || name === 'xlink:href') &&
                 (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name);
      }
    }
  });
}

/**
 * Inserta HTML sanitizado en un elemento usando DOMPurify (si está disponible)
 * y saneamiento estructural mediante DOMParser.
 */
export const setHTML = (el, html) => {
  if (!el) return;
  clearHTML(el);
  const rawHtml = String(html || '');
  const cleanHtml = (typeof window !== 'undefined' && window.DOMPurify)
    ? window.DOMPurify.sanitize(rawHtml)
    : rawHtml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  stripDangerousNodes(doc);

  const fragment = document.createDocumentFragment();
  while (doc.body.firstChild) {
    fragment.appendChild(doc.body.firstChild);
  }
  el.appendChild(fragment);
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
  const importedNode = document.importNode(svgElement, true);
  el.appendChild(importedNode);
};

/**
 * Verifica si una URL usa un protocolo web seguro (http o https).
 */
export const isSafeWebUrl = (urlStr) => {
  try {
    if (!urlStr) return false;
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Normaliza una cadena URL agregando https:// si carece de esquema,
 * siempre que no use un protocolo prohibido.
 */
export const normalizeWebUrl = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * Convierte un color CSS (#hex o rgb/rgba) a componentes RGB [r, g, b].
 */
export const parseColorToRgb = (color, fallback = [0, 0, 0]) => {
  try {
    if (!color) return fallback;
    const hex = String(color).trim();
    if (hex.startsWith('#')) {
      if (hex.length === 4) {
        return [1, 2, 3].map(i => parseInt(hex[i] + hex[i], 16));
      }
      const match = hex.substring(1).match(/.{2}/g);
      if (match && match.length >= 3) {
        return match.slice(0, 3).map(x => parseInt(x, 16));
      }
    } else if (hex.includes('rgb')) {
      const match = hex.match(/\d+/g);
      if (match && match.length >= 3) {
        return match.slice(0, 3).map(Number);
      }
    }
  } catch (e) { /* usar fallback */ }
  return fallback;
};

/**
 * Convierte cualquier color #hex o rgb/rgba a formato #rrggbb compatible con <input type="color">.
 */
export const toHexColor = (color, fallback = '#000000') => {
  if (!color) return fallback;
  const trimmed = String(color).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  const parsed = parseColorToRgb(trimmed, null);
  if (!Array.isArray(parsed) || parsed.length < 3) return fallback;
  const [r, g, b] = parsed;
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return fallback;
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
};

/**
 * Actualiza las variables CSS --accent-color, --accent-color-rgb y --accent-contrast-color en :root.
 */
export const setAccentColorVars = (color) => {
  if (!color) return;
  const root = document.documentElement.style;
  root.setProperty('--accent-color', color);
  const rgb = parseColorToRgb(color, [52, 211, 153]);
  root.setProperty('--accent-color-rgb', rgb.join(', '));
  const luminance = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  root.setProperty('--accent-contrast-color', luminance > 145 ? '#042319' : '#ffffff');
};

/**
 * Obtiene el hostname de una URL de forma segura sin lanzar errores si la URL es inválida.
 */
export const safeGetHostname = (urlStr) => {
    try {
        if (!urlStr) return '?';
        return new URL(urlStr).hostname.replace('www.', '');
    } catch (e) {
        return '?';
    }
};

let saveDebounceTimer;
let syncBuffer = {};
let syncTimer = null;

/**
 * Limita la frecuencia de ejecución de una función.
 */
export const throttle = (callback, limit) => {
    let waiting = false;
    return function() {
        if (!waiting) {
            callback.apply(this, arguments);
            waiting = true;
            setTimeout(() => {
                waiting = false;
            }, limit);
        }
    };
};

// storage helpers supporting chrome.storage.local or fallback to localStorage
export const storageGet = (keys) => new Promise(resolve => {
  if (window.chrome && chrome.storage?.local) {
    chrome.storage.local.get(keys, resolve);
  } else {
    const out = {};
    const keyList = typeof keys === 'string' ? [keys] : keys;
    if (Array.isArray(keyList)) {
      keyList.forEach(k => {
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { out[k] = localStorage.getItem(k); }
      });
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { out[k] = localStorage.getItem(k); }
      }
    }
    resolve(out);
  }
});

// Escritura en chrome.storage.local + sincronización diferida a sync + caché ligero Zero-Flash
export const storageSet = (obj) => {
  return new Promise(async (resolve) => {
    if (window.chrome && chrome.storage) {
      await new Promise(res => chrome.storage.local.set(obj, res));

      if (chrome.storage.sync) {
        Object.assign(syncBuffer, obj);
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          const syncObj = {};
          for (const key in syncBuffer) {
            const val = syncBuffer[key];
            if (val === undefined) continue;
            const size = JSON.stringify(val).length;
            if (size < 7000) syncObj[key] = val;
          }
          if (Object.keys(syncObj).length > 0) {
            chrome.storage.sync.set(syncObj, () => {
              if (chrome.runtime.lastError) console.warn('Sync quota warning:', chrome.runtime.lastError.message);
              syncBuffer = {};
            });
          } else {
            syncBuffer = {};
          }
          syncTimer = null;
        }, 1000);
      }
    } else {
      Object.keys(obj).forEach(k => localStorage.setItem(k, JSON.stringify(obj[k])));
    }

    // Caché crítica síncrona para Zero-Flash (evitando guardar imágenes base64 pesadas en localStorage)
    const criticalKeys = [
      'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
      'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
      'greetingColor', 'nameColor', 'clockColor', 'dateColor',
      'greetingFont', 'dateFont', 'activePremiumTheme', 'premiumThemeData',
      'doodle', 'gradient', 'bgUrl', 'bgColor', 'bgDisplayMode', 'hasCustomBgData',
      'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds',
      'syncFirefoxTheme'
    ];

    let zeroFlashCache = {};
    try {
      const existing = localStorage.getItem('zero_flash_cache');
      if (existing) zeroFlashCache = JSON.parse(existing);
    } catch (e) {}

    Object.keys(obj).forEach(key => {
      if (criticalKeys.includes(key)) {
        if (obj[key] === null || obj[key] === undefined) {
          delete zeroFlashCache[key];
        } else {
          zeroFlashCache[key] = obj[key];
        }
      } else if (key === 'bgData') {
        if (typeof obj.bgData === 'string' && obj.bgData.length < 150000) {
          zeroFlashCache.bgData = obj.bgData;
        } else {
          delete zeroFlashCache.bgData;
        }
      }
    });

    try {
      localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
    } catch (e) {
      try {
        delete zeroFlashCache.bgData;
        delete zeroFlashCache._tileSummaries;
        localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
      } catch (e2) {}
    }

    resolve();
  });
};

/**
 * Función de guardado en archivo con "debounce".
 * Agrupa múltiples llamadas a guardar en un corto período de tiempo en una sola.
 */
const debouncedSaveToFile = (dataToSave) => {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
        try {
            if (_saveToFileHandler) {
                await _saveToFileHandler(dataToSave || {});
            }
            if (_showSaveStatusHandler) {
                _showSaveStatusHandler();
            }
        } catch (error) {
            console.error('Fallo el guardado automático después de varios intentos.', error);
        }
    }, 300);
};

/**
 * Guarda una configuración, la almacena en el navegador y sincroniza con el archivo si autoSync está activado.
 */
export async function saveAndSyncSetting(setting, applyCallback) {
    await storageSet(setting);
    if (applyCallback) {
        applyCallback(setting);
    }
    const { autoSync } = await storageGet(['autoSync']);
    if (autoSync) {
        debouncedSaveToFile({});
    } else if (_showSaveStatusHandler) {
        _showSaveStatusHandler();
    }
}

let _cssDoodleLoadPromise = null;

/**
 * Carga bajo demanda la librería css-doodle.min.js una sola vez
 * y resuelve cuando el Web Component <css-doodle> queda registrado.
 */
export function ensureCssDoodleLoaded() {
    if (typeof window === 'undefined' || !window.customElements) {
        return Promise.resolve(false);
    }
    if (customElements.get('css-doodle')) {
        return Promise.resolve(true);
    }
    if (_cssDoodleLoadPromise) {
        return _cssDoodleLoadPromise;
    }

    _cssDoodleLoadPromise = new Promise((resolve) => {
        const waitDefined = () => {
            customElements.whenDefined('css-doodle')
                .then(() => resolve(true))
                .catch(() => resolve(false));
        };

        let script = document.getElementById('css-doodle-lib');
        if (script) {
            if (customElements.get('css-doodle')) {
                resolve(true);
            } else {
                script.addEventListener('load', waitDefined, { once: true });
                script.addEventListener('error', () => resolve(false), { once: true });
                waitDefined();
            }
            return;
        }

        script = document.createElement('script');
        script.id = 'css-doodle-lib';
        script.src = 'doodle/css-doodle.min.js';
        script.addEventListener('load', waitDefined, { once: true });
        script.addEventListener('error', () => resolve(false), { once: true });
        document.head.appendChild(script);
    });

    return _cssDoodleLoadPromise;
}
