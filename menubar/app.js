/**
 * Punto de entrada principal de la aplicación.
 * Optimizada para carga progresiva (Layered Loading)
 */
import { $, storageGet, storageSet } from './core/utils.js';
import { STORAGE_KEYS } from './core/config.js';

import { initUI, renderGreeting, updateActiveThemeButton, updateActiveGradientButton, updateDataTabUI, toggleSettings, switchToTab } from './components/ui.js';
import { updateSliderValueSpans, updatePanelRgb } from './settings/settings-panels.js';
import { initTiles, renderTiles, tiles, setTiles, setTrash } from './core/tiles.js';
import { renderNotes } from './components/notes.js';
import { renderEditor } from './settings/editor.js';
import { renderTrash } from './components/trash.js';
import { initSearch, renderFavoritesInSelect } from '../utils/search.js';
import { initSettings, loadGradients } from './settings/settings.js';
import { GRADIENTS } from '../utils/gradients.js';
window.GRADIENTS = GRADIENTS;
import { WeatherManager } from '../utils/tiempo.js';
import { loadDoodles, initDoodleSettings, updateDoodleSelectionUI } from './settings/doodles.js';
import { DOODLES_LIST } from './settings/doodles-list.js';
window.DOODLES_LIST = DOODLES_LIST;
import { FileSystem } from './system/file-system.js';
import { widgetsManager } from './widgets/widget-manager.js';
import { initPremiumThemes } from './settings/themes-premium.js';
// BackgroundManager ahora es global

let currentBackgroundValue = '';

async function init() {
  // 1. CARGA CRÍTICA - Obtenemos solo lo visual para el primer pintado
  const criticalKeys = [
    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
    'greetingFont', 'dateFont', 'activePremiumTheme', 'premiumThemeData',
    'doodle', 'gradient', 'bgData', 'bgUrl', 'bgColor',
    'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds',
    'tiles', 'trash', 'socialMigrationDone', 'syncFirefoxTheme'
  ];

  const settings = await storageGet(criticalKeys);

  // Actualizar caché síncrona para la próxima carga (Zero-Flash)
  const zeroFlashCache = {};
  criticalKeys.forEach(k => {
    // Excluimos datos pesados de la caché síncrona de localStorage
    if (k === 'tiles' || k === 'trash') return;
    if (settings[k] !== undefined) zeroFlashCache[k] = settings[k];
  });

  // Añadir template del doodle actual para carga instantánea
  const currentDoodle = DOODLES_LIST.find(d => d.id === settings.doodle);
  if (currentDoodle) {
    zeroFlashCache.doodleTemplate = currentDoodle.template;
    // Extraer color de fondo básico si existe
    const bgMatch = currentDoodle.template.match(/background:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|[a-z]+)/);
    if (bgMatch) zeroFlashCache.doodleColor = bgMatch[1];
  }

  localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));

  await BackgroundManager.apply(settings);

  // REVELADO INSTANTÁNEO: El contenido ya es visible por CSS
  // Proceder con la carga de datos sin esperas visuales

  // Cargar el resto de los datos (tiles, notes, etc.) lo más rápido posible
  const fullSettings = await storageGet(null);
  Object.assign(settings, fullSettings);

  // MIGRACIÓN ÚNICA: Añadir nuevos iconos recomendados si no existen
  let initialTiles = settings.tiles || [];
  if (!settings.socialMigrationDone) {
    const recommended = [
      { type: 'link', name: 'Instagram', url: 'https://www.instagram.com/' },
      { type: 'link', name: 'TikTok', url: 'https://www.tiktok.com/' },
      { type: 'link', name: 'X', url: 'https://x.com/' },
      { type: 'link', name: 'Threads', url: 'https://www.threads.net/' },
      { type: 'link', name: 'Gmail', url: 'https://mail.google.com/' }
    ];
    initialTiles = [...initialTiles, ...recommended.filter(r => !initialTiles.find(t => t.name === r.name))];
    storageSet({ tiles: initialTiles, socialMigrationDone: true });
  }

  setTiles(initialTiles);
  setTrash(settings.trash || []);
  renderGreeting(settings.userName);

  // Una vez tenemos los datos reales, volvemos a aplicar lo visual para mostrar los Tiles reales
  await BackgroundManager.apply(settings);
  renderTiles();
  // Escuchar cambios de fondo desde la configuración (evita dependencias circulares)
  window.addEventListener('background-changed', async () => {
    const currentSettings = await storageGet(null);
    BackgroundManager.apply(currentSettings, true); // forceAsyncFetch = true para respuesta inmediata del usuario
    // Renderizar doodle si es necesario
    renderDoodleBackground(currentSettings.doodle, currentSettings.doodleTemplate);
  });

  // Escuchar mensajes desde el background script (como actualizaciones de tema de Firefox)
  chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'FIREFOX_THEME_UPDATED') {
      console.log('Tablero received FIREFOX_THEME_UPDATED message, updating theme...');
      const currentSettings = await storageGet(null);
      if (currentSettings.syncFirefoxTheme) {
        BackgroundManager.apply(currentSettings);
      }
    }
  });

  /**
   * Renderiza o elimina el doodle en el contenedor #doodle-background
   * @param {string} doodleId - El ID del doodle seleccionado
   * @param {string} doodleTemplate - El template CSS del doodle (opcional, se busca en DOODLES_LIST)
   */
  function renderDoodleBackground(doodleId, doodleTemplate) {
    const container = document.getElementById('doodle-background');
    if (!container) return;

    // Si no hay doodle o es 'none', limpiar contenedor
    if (!doodleId || doodleId === 'none') {
      container.textContent = '';
      container.classList.remove('ready');
      // Restaurar fondo si estaba transparente
      if (BackgroundManager.lastAppliedBg) {
        BackgroundManager.applyBackground(BackgroundManager.lastAppliedBg);
      }
      return;
    }

    // Buscar el template si no se proporcionó
    if (!doodleTemplate) {
      const doodleData = DOODLES_LIST.find(d => d.id === doodleId);
      if (!doodleData || !doodleData.template) return;
      doodleTemplate = doodleData.template;
    }

    // Limpiar contenedor
    container.textContent = '';

    // Crear elemento css-doodle
    const doodle = document.createElement('css-doodle');
    doodle.textContent = `
            ${doodleTemplate}
            @keyframes reveal-stagger { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            &, :after, :before { animation: reveal-stagger 0.6s ease forwards !important; animation-delay: @calc(@i * 0.02)s !important; opacity: 0; }
        `;
    container.appendChild(doodle);
    container.classList.add('ready');
  }

  // Fase 2: Lógica de interacción
  setTimeout(() => {
    initInteractionLogic(settings);
  }, 100);

  // Fase 3: Sistemas Pesados
  setTimeout(() => {
    initHeavySystems(settings);
    loadNonCriticalCSS();
  }, 500);

  // Fase 4: Sincronización (Solo restaurar si el storage local está vacío)
  setTimeout(async () => {
    try {
      // Comprobar si el storage está vacío (falla catastrófica o limpieza de caché)
      const currentSettings = await storageGet(null);
      const isEmpty = !currentSettings.tiles || currentSettings.tiles.length === 0;

      if (isEmpty) {
        const fileSettings = await FileSystem.loadDataFromFile();
        if (fileSettings) {
          await BackgroundManager.apply(fileSettings);
          console.log("Restauración automática desde respaldo interno completada.");
        }
      }
    } catch (e) { console.warn("FS Sync postponed:", e); }
  }, 2000);
}

function initInteractionLogic(settings) {
  initUI();
  initTiles();
  initSearch();
  initScrollToTop();
  initSettings({
    currentGradient: settings.gradient,
    currentBackgroundValue,
    randomBg: settings.randomBg,
    syncFirefoxTheme: settings.syncFirefoxTheme,
    autoSync: settings.autoSync,
    bgDisplayMode: settings.bgDisplayMode,
    isCustomBg: !!(settings.bgData || settings.bgUrl)
  });
  loadGradients(settings.gradient);
}

async function initHeavySystems(settings) {
  await initPremiumThemes();
  widgetsManager.init();
  WeatherManager.init();

  renderEditor();
  renderNotes();
  renderTrash();
  renderFavoritesInSelect();

  updateSliderValueSpans();
  $('#panelColor').value = document.documentElement.style.getPropertyValue('--panel-bg').trim();
}



function loadNonCriticalCSS() {
  ['css/widgets.css', 'css/themes-premium.css', 'css/drag-drop-safe.css'].forEach(file => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = file;
    document.head.appendChild(link);
  });
}

function initScrollToTop() {
  const btn = document.getElementById('scrollToTopBtn');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset || document.documentElement.scrollTop;
    if (scrolled > 300) {
      btn.classList.add('visible');
      document.body.classList.add('scroll-btn-visible');
    } else {
      btn.classList.remove('visible');
      document.body.classList.remove('scroll-btn-visible');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

init();
