import { GRADIENTS } from '../utils/gradients.js';

/**
 * Fast Loader - Combines Background and Pre-loader logic.
 * Optimizes startup by doing a single storage fetch for all critical visual elements.
 */
(async () => {
  try {
    const keys = [
      'userName', 'use12HourFormat', 'showSeconds', 'greetingPreference', 'customGreetings',
      'greetingColor', 'nameColor', 'clockColor', 'dateColor',
      'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
      'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
      'activePremiumTheme', 'premiumThemeData',
      'doodle', 'bgData', 'bgUrl', 'gradient', 'bgDisplayMode',
      'showSearch', 'showWeather', 'showDate', 'syncFirefoxTheme'
    ];
    
    const settings = await new Promise(resolve => chrome.storage.local.get(keys, resolve));

    if (!settings) return;

    const rootStyle = document.documentElement.style;
    const bodyStyle = document.body.style;

    // 1. APLICAR TEMA (Fondo y Paneles)
    if (window.BackgroundManager) {
        await window.BackgroundManager.apply(settings);
    }

    // 2. RENDERIZAR SALUDO, RELOJ Y FECHA
    const now = new Date();
    const hour = now.getHours();
    
    // Saludo
    const greetingEl = document.getElementById('header-greeting');
    if (greetingEl) {
      let greetingText = '¡Hola!';
      if (hour >= 5 && hour < 12) greetingText = 'Buenos días';
      else if (hour >= 12 && hour < 20) greetingText = 'Buenas tardes';
      else greetingText = 'Buenas noches';
      
      const targetHtml = settings.userName ? `${greetingText}<strong>, ${settings.userName}</strong>` : greetingText;
      if (greetingEl.innerHTML !== targetHtml) {
        greetingEl.textContent = greetingText;
        if (settings.userName) {
          const strong = document.createElement('strong');
          strong.textContent = `, ${settings.userName}`;
          greetingEl.appendChild(strong);
        }
      }
    }

    // Reloj
    const clockEl = document.getElementById('header-clock');
    if (clockEl) {
      let hh = now.getHours();
      const mm = String(now.getMinutes()).padStart(2, '0');
      let ampm = '';
      if (settings.use12HourFormat) {
        ampm = hh >= 12 ? ' PM' : ' AM';
        hh = hh % 12 || 12;
      }
      let timeStr = settings.use12HourFormat ? `${hh}:${mm}` : `${String(hh).padStart(2, '0')}:${mm}`;
      if (settings.showSeconds) timeStr += `:${String(now.getSeconds()).padStart(2, '0')}`;
      clockEl.textContent = timeStr + ampm;
    }

    // Fecha
    const dateEl = document.getElementById('date');
    if (dateEl) {
      const formattedDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now);
      dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    // 3. VISIBILIDAD DE SECCIONES
    if (settings.showSearch === false) document.querySelector('.search-section')?.setAttribute('hidden', '');
    if (settings.showWeather === false) document.getElementById('weather')?.setAttribute('hidden', '');
    if (settings.showDate === false) document.getElementById('date')?.setAttribute('hidden', '');

  } catch (e) {
    console.error('Fast-loader error:', e);
  }
})();
