// Sistema de carga ultra-rápida (Zero-Flash 3.5)
(function() {
  try {
    const lastBg = localStorage.getItem('last_bg');
    const lastColor = localStorage.getItem('last_bg_color') || '#050505';
    const root = document.documentElement.style;

    // 1. Aplicar color sólido de respaldo inmediatamente (Elimina el destello de carga)
    root.setProperty('background-color', lastColor, 'important');
    
    // 2. Aplicar el fondo completo (Imagen o Degradado)
    if (lastBg) {
      root.setProperty('background', lastBg, 'important');
      root.setProperty('background-size', 'cover', 'important');
      root.setProperty('background-attachment', 'fixed', 'important');
      root.setProperty('background-position', 'center', 'important');
    }
  } catch(e) {
    console.warn('Instant-bg error:', e);
  }
})();
