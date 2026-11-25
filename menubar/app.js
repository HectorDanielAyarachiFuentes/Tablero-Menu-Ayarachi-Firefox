/**
 * Punto de entrada principal de la aplicación.
 * Optimizada para carga progresiva (Layered Loading) y sincronización Zero-Flash.
 */
import { $, storageGet, storageSet, safeGetHostname, toHexColor, ensureCssDoodleLoaded } from './core/utils.js';
import { set as idbSet } from './lib/idb-keyval.js';
import { registerSaveHandlers } from './core/utils.js';
import {
  initUI, renderGreeting, updateDataTabUI, showSaveStatus, showFileError,
  registerNotesLoader
} from './components/ui.js';
import { updateSliderValueSpans } from './settings/settings-panels.js';
import { initTiles, renderTiles, tiles, setTiles, setTrash, registerTilesHandlers, onTilesChange } from './core/tiles.js';
import { initContextMenu, showContextMenu } from './components/context-menu.js';
import { initModal, openModal } from './components/modal.js';
import { initNotesComponent } from '../../notas/notas.js';
import { initEditor, renderEditor } from './settings/editor.js';
import { renderTrash } from './components/trash.js';
import { initSearch, renderFavoritesInSelect } from '../utils/search.js';
import { initSettings, loadGradients } from './settings/settings.js';
import { GRADIENTS } from '../utils/gradients.js';
window.GRADIENTS = GRADIENTS;
import { WeatherManager } from '../utils/tiempo.js';
import { initDoodleSettings } from './settings/doodles.js';
import { DOODLES_LIST } from './settings/doodles-list.js';
window.DOODLES_LIST = DOODLES_LIST;
import { FileSystem, setFileSystemErrorHandler } from './system/file-system.js';
import { initPremiumThemes, DEFAULT_PREMIUM_THEME_ID, getPremiumThemeById } from './settings/themes-premium.js';
import { initWidgetsSidebar } from './widgets-integration.js';

setFileSystemErrorHandler(showFileError);

registerNotesLoader(() => initNotesComponent());

registerSaveHandlers({
  saveToFile: (data) => FileSystem.saveDataToFile(data),
  showSaveStatus
});

registerTilesHandlers({
  saveToFile: (data) => FileSystem.saveDataToFile(data),
  showSaveStatus,
  showContextMenu,
  openModal
});

onTilesChange(() => {
  if (typeof showSaveStatus === 'function') showSaveStatus();
  if (typeof renderFavoritesInSelect === 'function') renderFavoritesInSelect();
  const searchInput = $('#editorSearchInput');
  if (searchInput) searchInput.value = '';
  if (typeof renderEditor === 'function') renderEditor();
  if (typeof renderTrash === 'function') renderTrash();
  updateZeroFlashTileSummaries(tiles);
  window.dispatchEvent(new CustomEvent('tablero:tiles-changed'));
});

let currentBackgroundValue = '';

async function init() {
  // Inyectar animaciones justo en el primer frame sin bloquear el pintado inicial
  requestAnimationFrame(() => {
    loadStylesheets(['css/animations.css']);
  });

  // =====================================================================
  // FASE 0: CARGA MÍNIMA — Solo claves críticas para el primer pintado
  // =====================================================================
  const criticalKeys = [
    'tiles', 'trash', 'socialMigrationDone', 'defaultThemeApplied', 'defaultStyleVersion',
    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
    'greetingFont', 'dateFont', 'activePanelTheme', 'activePremiumTheme', 'premiumThemeData',
    'doodle', 'gradient', 'bgData', 'hasCustomBgData', 'bgUrl', 'bgColor', 'bgDisplayMode', 'randomBg',
    'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds',
    'syncFirefoxTheme', 'engine'
  ];

  const settings = await storageGet(criticalKeys);

  // Estilo inicial por defecto: Bosque Esmeralda adaptado al lienzo nativo #2b2a33 de Firefox
  const hasCustomVisualChoice = Boolean(
    settings.defaultThemeApplied ||
    settings.activePremiumTheme ||
    settings.activePanelTheme ||
    settings.gradient ||
    settings.bgUrl ||
    settings.bgData ||
    settings.hasCustomBgData ||
    settings.syncFirefoxTheme ||
    (settings.doodle && settings.doodle !== 'none')
  );
  const shouldApplyWelcomeDefault = !hasCustomVisualChoice || (
    settings.defaultStyleVersion !== 3 &&
    settings.activePremiumTheme === DEFAULT_PREMIUM_THEME_ID &&
    (!settings.doodle || settings.doodle === 'none') &&
    !settings.hasCustomBgData &&
    !settings.bgUrl &&
    !settings.syncFirefoxTheme
  );
  if (shouldApplyWelcomeDefault) {
    const defaultTheme = getPremiumThemeById(DEFAULT_PREMIUM_THEME_ID);
    if (defaultTheme) {
      const defaultPayload = {
        defaultThemeApplied: true,
        defaultStyleVersion: 3,
        activePremiumTheme: defaultTheme.id,
        premiumThemeData: defaultTheme,
        gradient: defaultTheme.background.gradient,
        bgType: 'premium',
        doodle: 'none',
        panelBg: defaultTheme.panel.bg,
        panelOpacity: defaultTheme.panel.opacity,
        panelBlur: defaultTheme.panel.blur,
        panelRadius: defaultTheme.panel.radius,
        panelTextColor: defaultTheme.colors.text,
        panelTextSecondaryColor: defaultTheme.colors.textSecondary,
        accentColor: defaultTheme.colors.accent,
        greetingColor: defaultTheme.colors.greeting,
        nameColor: defaultTheme.colors.name,
        clockColor: defaultTheme.colors.clock,
        dateColor: defaultTheme.colors.date,
        greetingFont: defaultTheme.fonts?.main,
        dateFont: defaultTheme.fonts?.secondary
      };
      Object.assign(settings, defaultPayload);
      storageSet(defaultPayload);
    }
  }

  // Migración única de fondos pesados desde chrome.storage.local hacia IndexedDB
  if (settings.bgData && !settings.hasCustomBgData) {
    try {
      await idbSet('custom_bg_data', settings.bgData);
      settings.hasCustomBgData = true;
      storageSet({ hasCustomBgData: true, bgData: null });
    } catch (err) {
      console.warn('No se pudo migrar bgData a IndexedDB:', err);
    }
  }

  // Migración única: añadir accesos recomendados si nunca se corrió
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
  // =====================================================================
  renderTiles();
  document.body.classList.remove('loading');

  // =====================================================================
  // FASE 1.5: FONDO EN PARALELO — No bloquea los tiles
  // =====================================================================
  BackgroundManager.apply(settings);
  if (settings.doodle && settings.doodle !== 'none') {
    const doodleContainer = document.getElementById('doodle-background');
    if (doodleContainer && doodleContainer.childElementCount === 0) {
      renderDoodleBackground(settings.doodle, settings.doodleTemplate);
    }
  }

  // Actualizar caché síncrona para la próxima carga (Zero-Flash)
  const zfCacheKeys = [
    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
    'greetingFont', 'dateFont', 'activePremiumTheme', 'premiumThemeData',
    'doodle', 'gradient', 'bgUrl', 'bgColor', 'bgDisplayMode', 'hasCustomBgData', 'randomBg',
    'userName', 'showSearch', 'showWeather', 'showDate', 'use12HourFormat', 'showSeconds',
    'syncFirefoxTheme', 'engine'
  ];
  const zeroFlashCache = {};
  zfCacheKeys.forEach(k => {
    if (settings[k] !== undefined && settings[k] !== null) zeroFlashCache[k] = settings[k];
  });

  const currentDoodle = DOODLES_LIST.find(d => d.id === settings.doodle);
  if (currentDoodle && currentDoodle.id !== 'none' && currentDoodle.template) {
    zeroFlashCache.doodleTemplate = currentDoodle.template;
    const bgMatch = currentDoodle.template.match(/background:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|[a-z]+)/);
    if (bgMatch) zeroFlashCache.doodleColor = bgMatch[1];
  }

  cacheTileSummaries(initialTiles, zeroFlashCache);

  // Escuchar cambios de fondo desde la configuración
  window.addEventListener('background-changed', async () => {
    const currentSettings = await storageGet(null);
    BackgroundManager.apply(currentSettings, true);
    await renderDoodleBackground(currentSettings.doodle, currentSettings.doodleTemplate);
  });

  // Escuchar mensajes desde el background script (ej. tema de Firefox o nuevo marcador)
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'FIREFOX_THEME_UPDATED') {
        const currentSettings = await storageGet(null);
        if (currentSettings.syncFirefoxTheme) {
          BackgroundManager.apply(currentSettings, true);
        }
      } else if (message.type === 'BOOKMARK_ADDED') {
        const { tiles: updatedTiles } = await storageGet(['tiles']);
        if (Array.isArray(updatedTiles)) {
          setTiles(updatedTiles);
          renderTiles();
          updateZeroFlashTileSummaries(updatedTiles);
        }
      }
    });
  }

  let doodleRenderToken = 0;

  async function renderDoodleBackground(doodleId, doodleTemplate) {
    const container = document.getElementById('doodle-background');
    if (!container) return;

    const currentToken = ++doodleRenderToken;

    if (!doodleId || doodleId === 'none') {
      container.textContent = '';
      container.classList.remove('ready');
      if (BackgroundManager.lastAppliedBg) {
        BackgroundManager.applyBackground(BackgroundManager.lastAppliedBg, false, BackgroundManager.lastDisplayMode);
      }
      return;
    }

    if (!doodleTemplate) {
      const doodleData = DOODLES_LIST.find(d => d.id === doodleId);
      if (!doodleData || !doodleData.template) return;
      doodleTemplate = doodleData.template;
    }

    const loaded = await ensureCssDoodleLoaded();
    if (!loaded || currentToken !== doodleRenderToken) return;

    container.textContent = '';
    const doodle = document.createElement('css-doodle');
    doodle.textContent = doodleTemplate;
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
  // =====================================================================
  setTimeout(async () => {
    const fullSettings = await storageGet(null);
    Object.assign(settings, fullSettings);

    await initHeavySystems(settings);
    loadNonCriticalCSS();
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
          if (Array.isArray(fileSettings.tiles)) setTiles(fileSettings.tiles);
          if (Array.isArray(fileSettings.trash)) setTrash(fileSettings.trash);
          renderTiles();
          await BackgroundManager.apply(fileSettings);
        }
      }
    } catch (e) { console.warn('FS Sync postponed:', e); }
  }, 2000);
}

function initInteractionLogic(settings) {
  initUI();
  initTiles();
  initContextMenu();
  initModal();
  initEditor();
  initSearch();
  initScrollToTop();
  initSettings({
    currentGradient: settings.gradient,
    currentBackgroundValue,
    randomBg: settings.randomBg,
    syncFirefoxTheme: settings.syncFirefoxTheme,
    autoSync: settings.autoSync,
    bgDisplayMode: settings.bgDisplayMode,
    isCustomBg: !!(settings.hasCustomBgData || settings.bgData || settings.bgUrl)
  });
  loadGradients(settings.gradient);
}

async function initHeavySystems(settings) {
  await initPremiumThemes();
  initWidgetsSidebar();
  WeatherManager.init();

  renderEditor();
  await initNotesComponent();
  renderTrash();
  renderFavoritesInSelect();

  updateSliderValueSpans();
  const panelColorInput = $('#panelColor');
  if (panelColorInput) {
    panelColorInput.value = toHexColor(document.documentElement.style.getPropertyValue('--panel-bg').trim(), '#000000');
  }
}

function loadStylesheets(files) {
  files.forEach(file => {
    if (document.head.querySelector(`link[href="${file}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = file;
    document.head.appendChild(link);
  });
}

function loadNonCriticalCSS() {
  loadStylesheets(['css/panels.css', 'css/notes-doodle.css', 'css/weather.css', 'css/form-controls.css', 'css/context-menu.css', 'css/themes-premium.css', 'css/drag-drop.css', 'css/drag-drop-safe.css']);
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

function buildTileSummaries(tilesData) {
  const rootTiles = (tilesData || []).filter(t => t.type !== 'note');
  const maxTiles = Math.min(rootTiles.length, 50);
  const summaries = [];

  for (let i = 0; i < maxTiles; i++) {
    const t = rootTiles[i];
    const summary = { name: t.name, type: t.type || 'link' };

    if (t.type === 'folder') {
      const children = Array.isArray(t.children) ? t.children : [];
      summary.childCount = children.length;
      summary.childIcons = children.slice(0, 4).map(child => {
        if (child.customIcon && child.customIcon.length < 4000) return child.customIcon;
        if (child.url) {
          const host = safeGetHostname(child.url);
          if (host && host !== '?' && host.includes('.')) {
            return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
          }
        }
        return null;
      }).filter(Boolean);
    } else if (t.url) {
      summary.url = t.url;
      summary.host = safeGetHostname(t.url);
      if (t.customIcon && t.customIcon.length < 4000) {
        summary.icon = t.customIcon;
      } else {
        try {
          const hostname = safeGetHostname(t.url);
          if (hostname && hostname !== '?' && hostname.includes('.')) {
            summary.icon = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
          }
        } catch (e) {}
      }
    }

    summaries.push(summary);
  }
  return summaries;
}

function updateZeroFlashTileSummaries(tilesData) {
  try {
    const existingStr = localStorage.getItem('zero_flash_cache');
    const cache = existingStr ? JSON.parse(existingStr) : {};
    cache._tileSummaries = buildTileSummaries(tilesData);
    localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
  } catch (e) {}
}

function cacheTileSummaries(tilesData, zeroFlashCache) {
  try {
    zeroFlashCache._tileSummaries = buildTileSummaries(tilesData);
    localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
  } catch (e) {
    try {
      delete zeroFlashCache._tileSummaries;
      localStorage.setItem('zero_flash_cache', JSON.stringify(zeroFlashCache));
    } catch (e2) {}
  }
}

init();
