// Sistema de carga ultra-rápida (Zero-Flash 3.5) - Mejorado para prevenir destellos
(function () {
  try {
    // 1. Obtener cache completo para tener todos los datos visuales
    let cache = {};
    try {
      const cacheStr = localStorage.getItem('zero_flash_cache');
      if (cacheStr) cache = JSON.parse(cacheStr);
    } catch (e) { /* ignorar */ }

    const lastBg = localStorage.getItem('last_bg');
    let lastColor = localStorage.getItem('last_bg_color');
    const root = document.documentElement.style;

    // 2. Determinar color de respaldo óptimo
    // Prioridad: last_bg_color > color del tema premium > color por defecto
    if (!lastColor) {
      // Intentar extraer color del tema premium en cache
      if (cache.premiumThemeData && cache.premiumThemeData.panel && cache.premiumThemeData.panel.bg) {
        lastColor = cache.premiumThemeData.panel.bg;
      }
      // Fallback a panelBg del cache
      else if (cache.panelBg) {
        lastColor = cache.panelBg;
      }
      // Último recurso: color por defecto oscuro (no morado)
      else {
        lastColor = '#050505';
      }
    }

    // 3. Aplicar color base oscuro fijo para unificar la transición (Evita el destello de colores disonantes)
    root.setProperty('background-color', '#050505', 'important');
  } catch (e) {
    console.warn('Instant-bg error:', e);
  }
})();
