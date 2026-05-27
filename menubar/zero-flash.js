(function () {
  // 1. Obtener toda la configuración de un solo golpe
  let settings = {};
  try {
    const cache = localStorage.getItem('zero_flash_cache');
    if (cache) settings = JSON.parse(cache);
  } catch (e) { return; }

  const root = document.documentElement.style;

  // 2. Aplicar TODO lo visual a través del BackgroundManager tan pronto como el DOM esté listo
  if (window.BackgroundManager) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        BackgroundManager.apply(settings);
      });
    } else {
      BackgroundManager.apply(settings);
    }
  }

  // 3. Forzar que el body mantenga el fondo aplicado por instant-bg.js
  // Esto previene que el CSS externo sobrescriba el fondo durante la carga
  const lastBg = localStorage.getItem('last_bg');
  const lastColor = localStorage.getItem('last_bg_color');
  if (document.body) {
    document.body.style.setProperty('background', 'transparent', 'important');
  }

  // 3.5 Ocultar elementos deshabilitados y asegurar BODY transparente INMEDIATAMENTE vía CSS
  const hideStyles = [
    'body { background: transparent !important; }'
  ];
  if (settings.showSearch === false) hideStyles.push('.search-section { display: none !important; }');
  if (settings.showWeather === false) hideStyles.push('#weather { display: none !important; }');
  if (settings.showDate === false) hideStyles.push('.top-content { display: none !important; }');
  
  if (hideStyles.length > 0) {
    const styleHider = document.createElement('style');
    styleHider.id = 'zero-flash-hider';
    styleHider.textContent = hideStyles.join('\n');
    document.documentElement.appendChild(styleHider);
  }

  // 3. Restauración instantánea de Tiles (HTML Snapshot)
  // Esto hace que los iconos aparezcan antes de que el motor de la extensión se inicie
  const tilesSnapshot = localStorage.getItem('tiles_snapshot');
  if (tilesSnapshot) {
    window.addEventListener('DOMContentLoaded', () => {
      const tilesContainer = document.getElementById('tiles');
      if (tilesContainer && !tilesContainer.hasChildNodes()) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(tilesSnapshot, 'text/html');
        const fragment = document.createDocumentFragment();
        while (doc.body.firstChild) {
          fragment.appendChild(doc.body.firstChild);
        }
        tilesContainer.appendChild(fragment);
      }
    });
  }

  // 4. Renderizado instantáneo de textos (Saludo y Reloj)
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
      greetingEl.textContent = greeting;
      const strong = document.createElement('strong');
      strong.textContent = `, ${settings.userName}`;
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

      if (!window.customElements || !customElements.get('css-doodle')) {
        if (!document.getElementById('css-doodle-lib')) {
          const script = document.createElement('script');
          script.id = 'css-doodle-lib';
          script.src = 'doodle/css-doodle.min.js';
          script.onload = () => injectDoodle();
          document.head.appendChild(script);
        } else {
          setTimeout(injectDoodle, 20);
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

  // 5. Bloquear transiciones iniciales, excepto para la capa de fondo, doodles y efectos del body
  const style = document.createElement('style');
  style.id = 'zero-flash-no-trans';
  style.textContent = `
    *:not(#bg-layer):not(body):not(#doodle-background):not(css-doodle) {
      transition: none !important;
    }
  `;
  document.documentElement.appendChild(style);

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
