/**
 * @file menubar/instant-bg.js
 * @description Pre-renderizado ultra-rápido instantáneo (Zero-Flash).
 * Aplica el fondo persistido, color de respaldo y variables CSS visuales críticas
 * directamente en <head> antes del primer pintado del navegador (Frame 0).
 */
(function () {
  function parseRgb(color, fallback) {
    try {
      if (!color) return fallback;
      const hex = String(color).trim();
      if (hex.startsWith('#')) {
        if (hex.length === 4) {
          return [1, 2, 3].map(i => parseInt(hex[i] + hex[i], 16));
        }
        const match = hex.substring(1).match(/.{2}/g);
        if (match && match.length >= 3) return match.slice(0, 3).map(x => parseInt(x, 16));
      } else if (hex.includes('rgb')) {
        const match = hex.match(/\d+/g);
        if (match && match.length >= 3) return match.slice(0, 3).map(Number);
      }
    } catch (e) {}
    return fallback;
  }

  function getSizeCss(mode) {
    switch (mode) {
      case 'contain': return 'contain';
      case 'stretch': return '100% 100%';
      case 'center': return 'auto';
      default: return 'cover';
    }
  }

  try {
    let cache = {};
    try {
      const cacheStr = localStorage.getItem('zero_flash_cache');
      if (cacheStr) cache = JSON.parse(cacheStr);
    } catch (e) {}

    const lastBg = localStorage.getItem('last_bg');
    let lastColor = localStorage.getItem('last_bg_color');
    const root = document.documentElement.style;

    // Bosque Esmeralda como estilo inicial por defecto si aún no hay caché guardada
    const DEFAULT_BG_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)';
    const DEFAULT_BG_COLOR = '#064e3b';

    if (!lastColor) {
      if (cache.bgColor) {
        lastColor = cache.bgColor;
      } else if (cache.premiumThemeData?.panel?.bg) {
        lastColor = cache.premiumThemeData.panel.bg;
      } else if (cache.panelBg) {
        lastColor = cache.panelBg;
      } else {
        lastColor = DEFAULT_BG_COLOR;
      }
    }

    const panelBg = cache.panelBg || '#064e3b';
    const accentColor = cache.accentColor || '#34d399';
    root.setProperty('--panel-bg', panelBg);
    root.setProperty('--panel-bg-rgb', parseRgb(panelBg, [6, 78, 59]).join(', '));
    root.setProperty('--accent-color', accentColor);
    root.setProperty('--accent-color-rgb', parseRgb(accentColor, [52, 211, 153]).join(', '));

    root.setProperty('--panel-text-color', cache.panelTextColor || '#ecfdf5');
    root.setProperty('--panel-text-secondary-color', cache.panelTextSecondaryColor || '#6ee7b7');
    root.setProperty('--greeting-color', cache.greetingColor || '#ecfdf5');
    root.setProperty('--name-color', cache.nameColor || '#34d399');
    root.setProperty('--clock-color', cache.clockColor || '#ffffff');
    root.setProperty('--date-color', cache.dateColor || '#6ee7b7');
    root.setProperty('--greeting-font', cache.greetingFont || "'Playfair Display', serif");
    root.setProperty('--date-font', cache.dateFont || "'Lato', sans-serif");
    root.setProperty('--panel-opacity', cache.panelOpacity ?? 0.2);
    root.setProperty('--panel-blur', `${cache.panelBlur ?? 25}px`);
    root.setProperty('--panel-radius', `${cache.panelRadius ?? 18}px`);

    const isDoodle = cache.doodle && cache.doodle !== 'none';
    const fallbackBg = cache.hasCustomBgData ? lastColor : (lastBg || DEFAULT_BG_GRADIENT);
    const bgToApply = isDoodle ? 'transparent' : fallbackBg;
    const bgColor = isDoodle ? (cache.doodleColor || lastColor || DEFAULT_BG_COLOR) : (lastColor || DEFAULT_BG_COLOR);
    const bgSize = getSizeCss(cache.bgDisplayMode);

    const styleEl = document.createElement('style');
    styleEl.id = 'instant-bg-style';
    styleEl.textContent = `
      html {
        background-color: ${bgColor} !important;
        color-scheme: dark !important;
      }
      #bg-layer {
        background: ${bgToApply} !important;
        background-size: ${bgSize} !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        background-position: center !important;
        opacity: ${isDoodle ? '0' : '1'} !important;
        filter: none !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  } catch (e) {
    console.warn('Instant-bg error:', e);
  }
})();
