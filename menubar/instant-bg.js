/**
 * @file menubar/instant-bg.js
 * @description Pre-renderizado ultra-rápido instantáneo (Zero-Flash).
 * Aplica el fondo persistido, color de respaldo y variables CSS visuales críticas
 * directamente en <head> antes del primer pintado del navegador (Frame 0).
 */
(function () {
  try {
    // 1. Obtener caché completo para tener todos los datos visuales
    let cache = {};
    try {
      const cacheStr = localStorage.getItem('zero_flash_cache');
      if (cacheStr) cache = JSON.parse(cacheStr);
    } catch (e) { /* ignorar */ }

    const lastBg = localStorage.getItem('last_bg');
    let lastColor = localStorage.getItem('last_bg_color');
    const root = document.documentElement.style;

    // 2. Determinar color de respaldo óptimo
    if (!lastColor) {
      if (cache.premiumThemeData?.panel?.bg) {
        lastColor = cache.premiumThemeData.panel.bg;
      } else if (cache.panelBg) {
        lastColor = cache.panelBg;
      } else {
        lastColor = '#050505';
      }
    }

    // 3. Aplicar variables CSS críticas cacheadas directamente en :root
    if (cache.panelBg) root.setProperty('--panel-bg', cache.panelBg);
    if (cache.accentColor) root.setProperty('--accent-color', cache.accentColor);
    if (cache.panelTextColor) root.setProperty('--panel-text-color', cache.panelTextColor);
    if (cache.panelTextSecondaryColor) root.setProperty('--panel-text-secondary-color', cache.panelTextSecondaryColor);
    if (cache.greetingColor) root.setProperty('--greeting-color', cache.greetingColor);
    if (cache.nameColor) root.setProperty('--name-color', cache.nameColor);
    if (cache.clockColor) root.setProperty('--clock-color', cache.clockColor);
    if (cache.dateColor) root.setProperty('--date-color', cache.dateColor);
    if (cache.greetingFont) root.setProperty('--greeting-font', cache.greetingFont);
    if (cache.dateFont) root.setProperty('--date-font', cache.dateFont);
    if (cache.panelOpacity !== undefined) root.setProperty('--panel-opacity', cache.panelOpacity);
    if (cache.panelBlur !== undefined) root.setProperty('--panel-blur', `${cache.panelBlur}px`);
    if (cache.panelRadius !== undefined) root.setProperty('--panel-radius', `${cache.panelRadius}px`);

    // 4. Determinar si hay doodle activo
    const isDoodle = cache.doodle && cache.doodle !== 'none';
    const bgToApply = isDoodle ? 'transparent' : (lastBg || lastColor || '#050505');
    const bgColor = isDoodle ? (cache.doodleColor || lastColor || '#050505') : (lastColor || '#050505');

    // 5. Inyectar estilo para pintar el fondo en el Frame 0 exacto sin destello negro
    const styleEl = document.createElement('style');
    styleEl.id = 'instant-bg-style';
    styleEl.textContent = `
      html {
        background-color: ${bgColor} !important;
        color-scheme: dark !important;
      }
      #bg-layer {
        background: ${bgToApply} !important;
        background-size: cover !important;
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
