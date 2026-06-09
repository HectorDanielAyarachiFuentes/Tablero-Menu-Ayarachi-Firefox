/**
 * Punto de entrada principal de la aplicación.
 * Optimizada para carga progresiva (Layered Loading)
 */
import { $, storageGet, storageSet, safeGetHostname } from './core/utils.js';
import { STORAGE_KEYS } from './core/config.js';

import { initUI, renderGreeting, updateActiveThemeButton, updateActiveGradientButton, updateDataTabUI, toggleSettings, switchToTab } from './components/ui.js';
import { updateSliderValueSpans, updatePanelRgb } from './settings/settings-panels.js';
import { initTiles, renderTiles, tiles, setTiles, setTrash } from './core/tiles.js';
import { initNotesComponent } from '../../notas/notas.js';
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
import { initPremiumThemes } from './settings/themes-premium.js';
import { initWidgetsSidebar } from './widgets-integration.js';
// BackgroundManager ahora es global

let currentBackgroundValue = '';

async function init() {
  // =====================================================================
  // FASE 0: CARGA MÍNIMA — Solo lo necesario para el primer pintado
  // Cargamos tiles + settings visuales. NO cargamos todo el storage.
  // =====================================================================
  const criticalKeys = [
    'tiles', 'trash', 'socialMigrationDone',
    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
    'greetingFont', 'dateFont', 'activePremiumTheme', 'premiumThemeData',
    'doodle', 'gradient', 'bgData', 'bgUrl', 'bgColor',
    'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds',
    'syncFirefoxTheme'
  ];

  const settings = await storageGet(criticalKeys);

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

  // =====================================================================
  // FASE 1: RENDERIZAR TILES INMEDIATAMENTE — No esperar al fondo
  // El sistema de paginación en tiles.js ya carga de a 100 (PAGE_SIZE)
  // y usa IntersectionObserver para cargar más al hacer scroll.
  // =====================================================================
  renderTiles();

  // =====================================================================
  // FASE 1.5: FONDO EN PARALELO — No bloquea los tiles
  // BackgroundManager.apply() puede tardar (ej. fetch de tema Firefox)
  // así que lo lanzamos sin await para no bloquear nada.
  // =====================================================================
  BackgroundManager.apply(settings);

  // Actualizar caché síncrona para la PRÓXIMA carga (Zero-Flash)
  const zfCacheKeys = [
    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
    'greetingFont', 'dateFont', 'activePremiumTheme', 'premiumThemeData',
    'doodle', 'gradient', 'bgData', 'bgUrl', 'bgColor',
    'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds',
    'syncFirefoxTheme'
  ];
  const zeroFlashCache = {};
  zfCacheKeys.forEach(k => {
    if (settings[k] !== undefined) zeroFlashCache[k] = settings[k];
  });

  // Añadir template del doodle actual para carga instantánea
  const currentDoodle = DOODLES_LIST.find(d => d.id === settings.doodle);
  if (currentDoodle) {
    zeroFlashCache.doodleTemplate = currentDoodle.template;
    const bgMatch = currentDoodle.template.match(/background:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|[a-z]+)/);
    if (bgMatch) zeroFlashCache.doodleColor = bgMatch[1];
  }

  // Cachear resúmenes de tiles para renderizado instantáneo en zero-flash
  cacheTileSummaries(initialTiles, zeroFlashCache);

  // Escuchar cambios de fondo desde la configuración (evita dependencias circulares)
  window.addEventListener('background-changed', async () => {
    const currentSettings = await storageGet(null);
    BackgroundManager.apply(currentSettings, true);
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
   */
  function renderDoodleBackground(doodleId, doodleTemplate) {
    const container = document.getElementById('doodle-background');
    if (!container) return;

    if (!doodleId || doodleId === 'none') {
      container.textContent = '';
      container.classList.remove('ready');
      if (BackgroundManager.lastAppliedBg) {
        BackgroundManager.applyBackground(BackgroundManager.lastAppliedBg);
      }
      return;
    }

    if (!doodleTemplate) {
      const doodleData = DOODLES_LIST.find(d => d.id === doodleId);
      if (!doodleData || !doodleData.template) return;
      doodleTemplate = doodleData.template;
    }

    container.textContent = '';
    const doodle = document.createElement('css-doodle');
    doodle.textContent = `
            ${doodleTemplate}
            @keyframes reveal-stagger { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            &, :after, :before { animation: reveal-stagger 0.6s ease forwards !important; animation-delay: @calc(@i * 0.02)s !important; opacity: 0; }
        `;
    container.appendChild(doodle);
    container.classList.add('ready');
  }

  // =====================================================================
  // FASE 2: LÓGICA DE INTERACCIÓN — Diferida 100ms
  // =====================================================================
  setTimeout(() => {
    initInteractionLogic(settings);
  }, 100);

  // =====================================================================
  // FASE 3: SISTEMAS PESADOS — Diferida 500ms
  // Aquí cargamos el RESTO del storage que no era crítico para el primer
  // pintado (notas, editor, papelera, etc.)
  // =====================================================================
  setTimeout(async () => {
    // Cargar settings adicionales que no eran críticos para el pintado inicial
    const fullSettings = await storageGet(null);
    Object.assign(settings, fullSettings);

    initHeavySystems(settings);
    loadNonCriticalCSS();
    
    // Remover clase de carga para permitir interacciones en UI diferida
    document.body.classList.remove('loading');
  }, 500);

  // =====================================================================
  // FASE 4: SINCRONIZACIÓN — Diferida 2s
  // =====================================================================
  setTimeout(async () => {
    try {
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
  initWidgetsSidebar();
  WeatherManager.init();

  renderEditor();
  initNotesComponent();
  renderTrash();
  renderFavoritesInSelect();

  updateSliderValueSpans();
  $('#panelColor').value = document.documentElement.style.getPropertyValue('--panel-bg').trim();
}



function loadNonCriticalCSS() {
  ['css/panels.css', 'css/notes-doodle.css', 'css/weather.css', 'css/form-controls.css', 'css/context-menu.css', 'css/themes-premium.css', 'css/drag-drop.css', 'css/drag-drop-safe.css'].forEach(file => {
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

/**
 * Cachea resúmenes ligeros de los tiles en localStorage para que
 * zero-flash.js pueda renderizarlos instantáneamente al abrir una nueva pestaña.
 * Solo se guardan datos mínimos para mantener el tamaño del caché bajo.
 */
function cacheTileSummaries(tilesData, zeroFlashCache) {
  try {
    // Filtrar notas (no se muestran en root) y limitar cantidad
    const rootTiles = (tilesData || []).filter(t => t.type !== 'note');
    const maxTiles = Math.min(rootTiles.length, 50); // Limitar para no saturar localStorage
    const summaries = [];

    for (let i = 0; i < maxTiles; i++) {
      const t = rootTiles[i];
      const summary = { name: t.name, type: t.type || 'link' };

      if (t.type === 'folder') {
        summary.childCount = (t.children || []).length;
      } else if (t.url) {
        summary.url = t.url;
        try {
          summary.host = safeGetHostname(t.url);
        } catch (e) {
          summary.host = t.url;
        }
        // Cachear ícono si es personalizado (data URIs pequeños o URLs de favicons)
        if (t.customIcon && t.customIcon.length < 2000) {
          summary.icon = t.customIcon;
        } else if (t.url) {
          try {
            const hostname = safeGetHostname(t.url);
            if (hostname && hostname.includes('.')) {
              summary.icon = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
            }
          } catch (e) { /* ignorar */ }
        }
      }

      summaries.push(summary);
    }

    zeroFlashCache._tileSummaries = summaries;
    localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
  } catch (e) {
    // Si falla (ej. quota), guardar al menos la caché sin tiles
    try {
      localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
    } catch (e2) { /* ignorar */ }
  }
}

init();
