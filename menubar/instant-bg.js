/**
 * @file menubar/instant-bg.js
 * @description Pre-renderizado ultra-rápido instantáneo (Zero-Flash).
 * Se ejecuta síncronamente al inicio de <head> antes del primer pintado,
 * fijando el fondo directamente en <html> y #bg-layer y bloqueando transiciones iniciales.
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

  function isLegacyPurple(val) {
    if (!val) return false;
    const norm = String(val).trim().toLowerCase();
    return norm === '#a855f7' || norm === '#8a2be2';
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

    const DEFAULT_BG_GRADIENT = 'radial-gradient(ellipse 58% 36% at 50% 28%, rgba(52, 211, 153, 0.08) 0%, transparent 72%), radial-gradient(circle at 88% 14%, rgba(16, 185, 129, 0.16) 0%, transparent 48%), radial-gradient(circle at 86% 88%, rgba(109, 40, 217, 0.14) 0%, transparent 50%), linear-gradient(135deg, #2b2a33 0%, #272830 55%, #2b2a33 100%)';
    const DEFAULT_BG_COLOR = '#2b2a33';
    const isDoodle = Boolean(cache.doodle && cache.doodle !== 'none');

    // Limpiar restos del antiguo color morado o fondo verde sólido detrás de un doodle/gradiente oscuro
    if (isLegacyPurple(lastColor)) lastColor = null;
    if (isDoodle && lastColor === '#064e3b') lastColor = null;

    const extractDoodleColor = () => {
      if (cache.doodleColor) return cache.doodleColor;
      if (cache.doodleTemplate) {
        const match = cache.doodleTemplate.match(/background:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))/);
        if (match) return match[1];
      }
      return DEFAULT_BG_COLOR;
    };

    const extractGradientColor = (grad) => {
      if (!grad) return DEFAULT_BG_COLOR;
      const linearIdx = grad.indexOf('linear-gradient');
      const slice = linearIdx >= 0 ? grad.slice(linearIdx) : grad;
      const match = slice.match(/#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)/);
      return match ? match[0] : DEFAULT_BG_COLOR;
    };

    if (!lastColor) {
      if (isDoodle) {
        lastColor = extractDoodleColor();
      } else if (cache.bgColor) {
        lastColor = cache.bgColor;
      } else if (cache.premiumThemeData?.background?.gradient) {
        lastColor = extractGradientColor(cache.premiumThemeData.background.gradient);
      } else {
        lastColor = DEFAULT_BG_COLOR;
      }
    }

    const panelBg = cache.panelBg || '#064e3b';
    const accentColor = (!isLegacyPurple(cache.accentColor) && cache.accentColor) ? cache.accentColor : '#34d399';
    const accentRgb = parseRgb(accentColor, [52, 211, 153]);
    root.setProperty('--panel-bg', panelBg);
    root.setProperty('--panel-bg-rgb', parseRgb(panelBg, [6, 78, 59]).join(', '));
    root.setProperty('--accent-color', accentColor);
    root.setProperty('--accent-color-rgb', accentRgb.join(', '));
    root.setProperty('--accent-contrast-color', (accentRgb[0] * 299 + accentRgb[1] * 587 + accentRgb[2] * 114) / 1000 > 145 ? '#042319' : '#ffffff');

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
    root.setProperty('--panel-shadow-color', cache.panelShadowColor || '#000000');
    root.setProperty('--panel-shadow-blur', `${cache.panelShadowBlur ?? 10}px`);
    root.setProperty('--panel-shadow', cache.panelShadowEnabled
      ? '0 5px var(--panel-shadow-blur, 10px) var(--panel-shadow-color, #000000)'
      : '0 0 0 transparent');

    const fallbackBg = cache.hasCustomBgData ? lastColor : (lastBg || DEFAULT_BG_GRADIENT);
    const bgToApply = isDoodle ? 'transparent' : fallbackBg;
    const bgColor = isDoodle ? extractDoodleColor() : (lastColor || DEFAULT_BG_COLOR);
    const bgSize = getSizeCss(cache.bgDisplayMode);

    // Mantener <html> con el color sólido base (#2b2a33 por defecto) para que #bg-layer aparezca con transición suave
    root.setProperty('background', 'none', 'important');
    root.setProperty('background-color', bgColor, 'important');

    const styleEl = document.createElement('style');
    styleEl.id = 'instant-bg-style';
    styleEl.textContent = `
      html {
        background: none !important;
        background-color: ${bgColor} !important;
        color-scheme: dark !important;
      }
      #bg-layer {
        background: ${bgToApply} !important;
        background-size: ${bgSize} !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        background-position: center !important;
        ${isDoodle ? 'opacity: 0; animation: none;' : ''}
      }
    `;
    document.head.appendChild(styleEl);

    // Bloquear transiciones espurias en UI secundaria sin frenar la entrada leve del fondo ni de .wrap
    const noTrans = document.createElement('style');
    noTrans.id = 'zero-flash-no-trans';
    noTrans.textContent = `
      *:not(#bg-layer):not(body):not(.wrap):not(#doodle-background):not(css-doodle) {
        transition: none !important;
      }
    `;
    document.head.appendChild(noTrans);
  } catch (e) {
    console.warn('Instant-bg error:', e);
  }
})();
