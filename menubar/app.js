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
import { initSettings, loadGradients, applyGradient, applyBackgroundStyles, applyTextColors, applyTextFonts } from './settings/settings.js';
import { GRADIENTS } from '../utils/gradients.js';
import { WeatherManager } from '../utils/tiempo.js';
import { loadDoodles, initDoodleSettings, updateDoodleSelectionUI } from './settings/doodles.js';
import { DOODLES_LIST } from './settings/doodles-list.js';
import { FileSystem } from './system/file-system.js';
import { widgetsManager } from './widgets/widget-manager.js';
import { initPremiumThemes } from './settings/themes-premium.js';

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
    'tiles', 'trash', 'socialMigrationDone'
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
  
  await applyCriticalVisuals(settings);
  
  // Cargar el resto de los datos (tiles, notes, etc.) lo más rápido posible
  const fullSettings = await storageGet(null);
  Object.assign(settings, fullSettings); 
  
  // Una vez tenemos los datos reales, volvemos a aplicar lo visual para mostrar los Tiles reales
  await applyCriticalVisuals(settings);

  $('.wrap').style.display = 'block';
  document.body.classList.remove('loading');

  // Escuchar cambios de fondo desde la configuración (evita dependencias circulares)
  window.addEventListener('background-changed', () => updateBackground());

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
                await applyCriticalVisuals(fileSettings);
                console.log("Restauración automática desde respaldo interno completada.");
            }
          }
      } catch (e) { console.warn("FS Sync postponed:", e); }
  }, 2000);
}

async function applyCriticalVisuals(settings) {
  let initialTiles = settings.tiles || [];
  
  // MIGRACIÓN ÚNICA: Añadir nuevos iconos recomendados si no existen
  if (!settings.socialMigrationDone) {
      const currentNames = new Set(initialTiles.map(t => t.name.toLowerCase()));
      const recommended = [
        { type: 'link', name: 'Instagram', url: 'https://www.instagram.com/' },
        { type: 'link', name: 'TikTok', url: 'https://www.tiktok.com/' },
        { type: 'link', name: 'X', url: 'https://x.com/' },
        { type: 'link', name: 'Threads', url: 'https://www.threads.net/' },
        { type: 'link', name: 'Gmail', url: 'https://mail.google.com/' },
        { type: 'link', name: 'Hotmail', url: 'https://outlook.live.com/' }
      ];

      let needsUpdate = false;
      recommended.forEach(item => {
          if (!currentNames.has(item.name.toLowerCase())) {
              initialTiles.push(item);
              needsUpdate = true;
          }
      });

      if (needsUpdate || initialTiles.length === 0) {
          if (initialTiles.length === 0) {
              initialTiles = [
                { type: 'link', name: 'YouTube', url: 'https://www.youtube.com/' },
                { type: 'link', name: 'Google', url: 'https://www.google.com/', favorite: true },
                { type: 'link', name: 'Wikipedia', url: 'https://es.wikipedia.org/' },
                { type: 'link', name: 'GitHub', url: 'https://github.com/' },
                ...recommended
              ];
          }
          storageSet({ tiles: initialTiles, socialMigrationDone: true });
      } else {
          storageSet({ socialMigrationDone: true });
      }
  }
  setTiles(initialTiles);
  setTrash(settings.trash || []);

  renderGreeting(settings.userName);
  applyTextColors(settings);
  applyTextFonts(settings);
  
  $('.search-section').hidden = !(settings.showSearch ?? true);
  $('#weather').hidden = !(settings.showWeather ?? true);
  $('#date').hidden = !(settings.showDate ?? true);

  const pt = (settings.activePremiumTheme && settings.premiumThemeData) ? settings.premiumThemeData.panel : null;
  const panelBg = settings.panelBg || (pt ? pt.bg : 'rgba(0, 0, 0, 0.2)');
  const panelOpacity = settings.panelOpacity ?? (pt ? pt.opacity : 0.1);
  const panelBlur = settings.panelBlur ?? (pt ? pt.blur : 10);
  const panelRadius = settings.panelRadius ?? (pt ? pt.radius : 12);

  const root = document.documentElement.style;
  root.setProperty('--panel-bg', panelBg);
  root.setProperty('--panel-opacity', panelOpacity);
  root.setProperty('--panel-blur', `${panelBlur}px`);
  root.setProperty('--panel-radius', `${panelRadius}px`);
  
  const shadowEnabled = settings.panelShadowEnabled || false;
  if (shadowEnabled) {
      const shadowBlur = settings.panelShadowBlur || 10;
      const shadowColor = settings.panelShadowColor || '#000000';
      root.setProperty('--panel-shadow', `0 5px ${shadowBlur}px ${shadowColor}`);
  } else {
      root.setProperty('--panel-shadow', '0 0 0 transparent');
  }
  updatePanelRgb(panelBg);

  renderTiles();
  await updateBackground();
}

function initInteractionLogic(settings) {
    initUI();
    initTiles();
    initSearch();
    initSettings({
      currentGradient: settings.gradient,
      currentBackgroundValue,
      randomBg: settings.randomBg,
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

export async function updateBackground() {
  const settings = await storageGet(['doodle', 'bgData', 'bgUrl', 'gradient', 'bgDisplayMode', 'activePremiumTheme', 'premiumThemeData']);
  const doodleId = settings.doodle || 'none';
  const doodle = DOODLES_LIST.find(d => d.id === doodleId);

  const doodleBgContainer = $('#doodle-background');
  doodleBgContainer.textContent = '';

  if (doodle && doodle.id !== 'none' && doodle.template) {
    $('.wrap').style.backgroundColor = 'transparent';
    document.documentElement.style.setProperty('background', 'transparent', 'important');
    document.body.style.setProperty('background', 'transparent', 'important');
    
    const backgroundDoodle = document.createElement('css-doodle');
    
    // Inyectar animación de revelado por partes (Stagger) directamente en el template
    let template = doodle.template;
    const staggerLogic = `
      @keyframes reveal-stagger { 
        from { opacity: 0; transform: translateY(10px); } 
        to { opacity: 1; transform: translateY(0); } 
      }
      &, :after, :before { 
        animation: reveal-stagger 0.6s ease forwards !important;
        animation-delay: @calc(@i * 0.02)s !important;
        opacity: 0;
      }
    `;
    
    backgroundDoodle.textContent = template + staggerLogic;
    doodleBgContainer.appendChild(backgroundDoodle);
    
    // Activar el contenedor (sin efecto cine, solo visibilidad)
    requestAnimationFrame(() => {
        setTimeout(() => doodleBgContainer.classList.add('ready'), 50);
    });
  } else {
    doodleBgContainer.classList.remove('ready');
    $('.wrap').style.backgroundColor = '';
    document.documentElement.style.removeProperty('background'); // Remove the important override
    document.body.style.removeProperty('background');
    
    // Restauramos el fondo que corresponda (Premium, Imagen o Degradado)
    if (settings.activePremiumTheme && settings.premiumThemeData) {
      document.body.style.background = settings.premiumThemeData.background.gradient;
      document.body.classList.add('theme-background');
    } else if (settings.bgData || settings.bgUrl) {
      document.body.style.background = ''; // Limpiamos la transparencia general
      applyBackgroundStyles(settings.bgDisplayMode);
      document.body.style.backgroundImage = `url('${settings.bgData || settings.bgUrl}')`;
    } else {
      document.body.style.background = ''; // Limpiamos la transparencia general
      applyGradient(settings.gradient || GRADIENTS[0].id);
    }
  }
}

function loadNonCriticalCSS() {
  ['css/widgets.css', 'css/themes-premium.css', 'css/drag-drop-safe.css'].forEach(file => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = file;
    document.head.appendChild(link);
  });
}

init();
