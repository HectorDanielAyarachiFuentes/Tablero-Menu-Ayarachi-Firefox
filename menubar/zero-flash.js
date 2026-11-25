/**
 * @file menubar/zero-flash.js
 * @description Orquestador de arranque instantáneo Zero-Flash.
 * Renderiza síncronamente tiles cacheados (con miniaturas de carpetas), motor de búsqueda,
 * textos de cabecera y estado visual antes del primer pintado completo.
 */
(function () {
  let settings = {};
  try {
    const cache = localStorage.getItem('zero_flash_cache');
    if (cache) settings = JSON.parse(cache);
  } catch (e) {}

  // 1. Aplicar ajustes visuales a través de BackgroundManager sin animación de arranque
  if (window.BackgroundManager) {
    BackgroundManager.apply(settings, false);
  }

  // 2. Asegurar BODY transparente y ocultar secciones deshabilitadas inmediatamente
  const hideStyles = [
    'body { background: transparent !important; }'
  ];
  if (settings.showSearch === false) hideStyles.push('.search-section { display: none !important; }');
  if (settings.showWeather === false) hideStyles.push('#weather { display: none !important; }');
  if (settings.showDate === false) hideStyles.push('.top-content { display: none !important; }');

  const styleHider = document.createElement('style');
  styleHider.id = 'zero-flash-hider';
  styleHider.textContent = hideStyles.join('\n');
  document.documentElement.appendChild(styleHider);

  // 3. Motor de búsqueda cacheado para evitar salto visual a los 100ms
  const enginesMeta = {
    google: { text: 'Google', domain: 'google.com' },
    duck: { text: 'DuckDuckGo', domain: 'duckduckgo.com' },
    startpage: { text: 'Startpage (Privado)', domain: 'startpage.com' },
    brave: { text: 'Brave Search', domain: 'brave.com' },
    bing: { text: 'Bing', domain: 'bing.com' },
    youtube: { text: 'YouTube', domain: 'youtube.com' },
    wiki: { text: 'Wikipedia', domain: 'wikipedia.org' },
    ecosia: { text: 'Ecosia', domain: 'ecosia.org' }
  };
  if (settings.engine && enginesMeta[settings.engine]) {
    const meta = enginesMeta[settings.engine];
    const nameEl = document.getElementById('selectedEngineName');
    const iconEl = document.getElementById('selectedEngineIcon');
    if (nameEl) nameEl.textContent = meta.text;
    if (iconEl) {
      iconEl.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${meta.domain}&size=32`;
    }
  }

  // 4. Renderizado instantáneo de TILES desde caché para evitar re-pintados
  const cachedTileSummaries = settings._tileSummaries;
  if (cachedTileSummaries && cachedTileSummaries.length > 0) {
    const tilesContainer = document.getElementById('tiles');
    const tpl = document.getElementById('tileTpl');

    if (tilesContainer && tilesContainer.children.length === 0) {
      const fragment = document.createDocumentFragment();

      cachedTileSummaries.forEach((summary, i) => {
        if (!tpl) {
          const tileEl = document.createElement('div');
          tileEl.className = 'tile';
          tileEl.style.setProperty('--animation-delay', '0s');
          fragment.appendChild(tileEl);
          return;
        }

        let node;
        if (summary.type === 'link' && summary.url) {
          node = document.createElement('a');
          node.href = summary.url;
          node.rel = 'noopener noreferrer';
          const tplNode = tpl.content.firstElementChild.cloneNode(true);
          for (const attr of tplNode.attributes) {
            if (attr.name === 'style') {
              node.style.cssText = attr.value;
            } else {
              node.setAttribute(attr.name, attr.value);
            }
          }
          while (tplNode.firstChild) node.appendChild(tplNode.firstChild);
        } else {
          node = tpl.content.firstElementChild.cloneNode(true);
          if (summary.type === 'folder') {
            node.classList.add('folder');
            node.setAttribute('role', 'button');
            node.setAttribute('tabindex', '0');
            node.setAttribute('aria-label', `${summary.name || 'Carpeta'}, carpeta`);
          }
        }

        node.dataset.idx = i;
        node.dataset.zfKey = `${summary.type || 'link'}|${summary.name || ''}|${summary.url || ''}|${summary.type === 'folder' ? (summary.childCount || 0) : 0}`;
        node.setAttribute('draggable', 'true');
        node.style.setProperty('--animation-delay', '0s');

        const titleEl = node.querySelector('.title');
        if (titleEl) titleEl.textContent = summary.name || '';

        const urlEl = node.querySelector('.url');
        if (urlEl) {
          if (summary.type === 'folder') {
            urlEl.textContent = `${summary.childCount || 0} elemento(s)`;
          } else if (summary.host) {
            urlEl.textContent = summary.host;
          }
        }

        if (summary.type === 'folder' && Array.isArray(summary.childIcons) && summary.childIcons.length > 0) {
          const imgThumb = node.querySelector('.thumb');
          if (imgThumb) {
            const thumbEl = document.createElement('div');
            thumbEl.className = imgThumb.className;
            imgThumb.parentNode.replaceChild(thumbEl, imgThumb);
            const folderGrid = document.createElement('div');
            folderGrid.className = 'folder-grid';
            summary.childIcons.forEach(src => {
              const miniImg = document.createElement('img');
              miniImg.className = 'mini-icon';
              miniImg.src = src;
              miniImg.alt = '';
              miniImg.loading = 'eager';
              folderGrid.appendChild(miniImg);
            });
            thumbEl.appendChild(folderGrid);
            thumbEl.style.backgroundImage = 'none';
            thumbEl.style.padding = '4px';
          }
        } else {
          const thumbEl = node.querySelector('.thumb');
          if (thumbEl && summary.icon) {
            thumbEl.src = summary.icon;
            thumbEl.loading = 'eager';
          }
        }

        fragment.appendChild(node);
      });

      tilesContainer.dataset.zfRendered = 'true';
      tilesContainer.appendChild(fragment);
    }
  }

  // 5. Renderizado instantáneo de textos (Saludo, Reloj, Fecha, Año)
  const greetingEl = document.getElementById('header-greeting');
  const clockEl = document.getElementById('header-clock');
  const dateEl = document.getElementById('date');

  if (greetingEl) {
    const hour = new Date().getHours();
    let greeting = '¡Hola!';
    if (hour >= 5 && hour < 12) greeting = 'Buenos días';
    else if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';
    else greeting = 'Buenas noches';
    greetingEl.textContent = greeting;
    if (settings.userName) {
      const strong = document.createElement('strong');
      strong.textContent = `, ${settings.userName}`;
      greetingEl.appendChild(strong);
    }
  }

  if (clockEl) {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';
    if (settings.use12HourFormat) {
      ampm = h >= 12 ? ' PM' : ' AM';
      h = (h % 12) || 12;
    }
    let timeStr = settings.use12HourFormat ? `${h}:${m}` : `${String(h).padStart(2, '0')}:${m}`;
    if (settings.showSeconds) timeStr += `:${sec}`;
    clockEl.textContent = `${timeStr}${ampm}`;
  }

  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = new Intl.DateTimeFormat('es-ES', options).format(new Date());
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 6. Doodle instantáneo si está configurado
  if (settings.doodle && settings.doodle !== 'none' && settings.doodleTemplate) {
    const injectDoodle = () => {
      const container = document.getElementById('doodle-background');
      if (!container) return;

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
      doodle.textContent = settings.doodleTemplate;
      container.textContent = '';
      container.appendChild(doodle);
      container.classList.add('ready');
    };
    injectDoodle();
  }

  // 7. Remover bloqueo de transiciones después de que la carga inicial asentó
  const cleanTrans = () => {
    const s = document.getElementById('zero-flash-no-trans');
    if (s) s.remove();
  };

  if (document.readyState === 'complete') {
    setTimeout(cleanTrans, 120);
  } else {
    window.addEventListener('load', () => setTimeout(cleanTrans, 120), { once: true });
  }
})();
