(function() {
  // 1. Obtener toda la configuración de un solo golpe
  let settings = {};
  try {
    const cache = localStorage.getItem('zero_flash_cache');
    if (cache) settings = JSON.parse(cache);
  } catch(e) { return; }

  const root = document.documentElement.style;

  // 2. Aplicar variables de color y fuente (Siempre)
  // 2. Aplicar variables de color y fuente
  const theme = settings.premiumThemeData || {};
  const panel = theme.panel || {};
  const colors = theme.colors || {};

  const panelBg = settings.panelBg || panel.bg || '#000000';
  root.setProperty('--panel-bg', panelBg);
  
  // Calcular RGB para transparencia fluida
  let rgb = [0, 0, 0];
  const hex = panelBg.trim();
  if (hex.startsWith('#')) {
    if (hex.length === 4) {
      rgb = [1, 2, 3].map(i => parseInt(hex[i] + hex[i], 16));
    } else {
      const match = hex.substring(1).match(/.{2}/g);
      if (match) rgb = match.slice(0, 3).map(x => parseInt(x, 16));
    }
  } else if (hex.includes('rgb')) {
    const match = hex.match(/\d+/g);
    if (match) rgb = match.slice(0, 3).map(Number);
  }
  root.setProperty('--panel-bg-rgb', rgb.join(', '));
  root.setProperty('--panel-opacity', settings.panelOpacity ?? panel.opacity ?? 0.1);
  root.setProperty('--panel-blur', (settings.panelBlur ?? panel.blur ?? 10) + 'px');
  root.setProperty('--panel-radius', (settings.panelRadius ?? panel.radius ?? 12) + 'px');
  root.setProperty('--panel-text-color', settings.panelTextColor || colors.text || '#ffffff');
  root.setProperty('--panel-text-secondary-color', settings.panelTextSecondaryColor || colors.textSecondary || 'rgba(255, 255, 255, 0.7)');
  
  // Colores de acento y UI
  root.setProperty('--accent-color', settings.accentColor || colors.accent || '#16a085');
  root.setProperty('--greeting-color', settings.greetingColor || colors.greeting || '#ffffff');
  root.setProperty('--name-color', settings.nameColor || colors.name || '#ffffff');
  root.setProperty('--clock-color', settings.clockColor || colors.clock || '#ffffff');
  root.setProperty('--date-color', settings.dateColor || colors.date || '#ffffff');
  
  // Fuentes
  root.setProperty('--greeting-font', settings.greetingFont || (theme.fonts ? theme.fonts.main : "'Poppins', sans-serif"));
  root.setProperty('--date-font', settings.dateFont || (theme.fonts ? theme.fonts.secondary : "'Poppins', sans-serif"));

  // 3. DETERMINAR FONDO BASE (Jerarquía de prioridad para evitar flash negro)
  let baseBg = '#050505'; 
  let isImage = false;

  if (settings.activePremiumTheme && settings.premiumThemeData) {
    baseBg = settings.premiumThemeData.background.gradient;
  } else if (settings.gradient) {
    baseBg = settings.gradient;
  } else if (settings.bgData || settings.bgUrl) {
    baseBg = 'url(' + (settings.bgData || settings.bgUrl) + ')';
    isImage = true;
  } else if (settings.bgColor) {
    // AÑADIDO: Soporte para color sólido (Verde, Violeta, etc.)
    baseBg = settings.bgColor;
  } else if (settings.doodleColor) {
    baseBg = settings.doodleColor;
  }

  // Aplicar el fondo base al HTML inmediatamente
  root.setProperty('background', baseBg, 'important');
  root.setProperty('background-attachment', 'fixed', 'important');
  root.setProperty('background-size', 'cover', 'important');
  if (isImage) {
    root.setProperty('background-position', 'center', 'important');
  }

  // 3.5. Renderizado instantáneo de textos (Saludo y Reloj)
  window.addEventListener('DOMContentLoaded', () => {
    const greetingEl = document.getElementById('header-greeting');
    const clockEl = document.getElementById('header-clock');
    const dateEl = document.getElementById('date');

    if (greetingEl && settings.userName) {
      const hour = new Date().getHours();
      let greeting = '¡Hola!';
      if (hour >= 5 && hour < 12) greeting = 'Buenos días';
      else if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';
      else greeting = 'Buenas noches';
      greetingEl.textContent = `${greeting}, `;
      const strong = document.createElement('strong');
      strong.textContent = settings.userName;
      greetingEl.appendChild(strong);
    }

    if (clockEl) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}`;
    }

    if (dateEl) {
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      dateEl.textContent = new Intl.DateTimeFormat('es-ES', options).format(new Date());
    }

    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });

  // 4. Renderizado instantáneo del Doodle (Encima del fondo base)
  if (settings.doodle && settings.doodle !== 'none' && settings.doodleTemplate) {
    const injectDoodle = () => {
      const container = document.getElementById('doodle-background');
      if (!container) {
        setTimeout(injectDoodle, 10);
        return;
      }

      // Si la librería no está cargada, la cargamos dinámicamente
      if (!window.customElements || !customElements.get('css-doodle')) {
        if (!document.getElementById('css-doodle-lib')) {
          const script = document.createElement('script');
          script.id = 'css-doodle-lib';
          script.src = 'doodle/css-doodle.min.js';
          script.onload = () => injectDoodle(); // Re-intentar al cargar
          document.head.appendChild(script);
        } else {
          setTimeout(injectDoodle, 20); // Esperar a que cargue el script existente
        }
        return;
      }

      const doodle = document.createElement('css-doodle');
      doodle.textContent = `
          ${settings.doodleTemplate}
          @keyframes reveal-stagger { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          &, :after, :before { animation: reveal-stagger 0.6s ease forwards !important; animation-delay: @calc(@i * 0.02)s !important; opacity: 0; }
      `;
      container.textContent = '';
      container.appendChild(doodle);
      container.classList.add('ready');
    };
    injectDoodle();
  }

  // 5. Bloquear transiciones iniciales
  const style = document.createElement('style');
  style.id = 'zero-flash-no-trans';
  style.textContent = '* { transition: none !important; }';
  document.documentElement.appendChild(style);

  // Intentar limpiar las transiciones lo antes posible
  const cleanTrans = () => {
    const s = document.getElementById('zero-flash-no-trans');
    if (s) s.remove();
  };

  if (document.readyState === 'complete') {
    setTimeout(cleanTrans, 500);
  } else {
    window.addEventListener('load', () => setTimeout(cleanTrans, 500));
  }
})();
