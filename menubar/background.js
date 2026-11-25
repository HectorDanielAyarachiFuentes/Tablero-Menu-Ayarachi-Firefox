/**
 * Script de fondo de la extensión (Manifest V3).
 * Sincroniza la creación de marcadores nuevos hacia el tablero y responde
 * consultas/eventos de temas nativos de Firefox (browser.theme).
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tablero de Accesos - installed');
});

/**
 * Escucha la creación de nuevos marcadores en el navegador.
 * Cuando un usuario añade un marcador web seguro (http/https), lo agrega al tablero.
 */
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (!bookmark.url) return;

  try {
    const parsed = new URL(bookmark.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;

    const data = await chrome.storage.local.get('tiles');
    const tiles = data.tiles || [];

    const newTile = {
      type: 'link',
      name: bookmark.title || parsed.hostname.replace(/^www\./, ''),
      url: bookmark.url,
      favorite: false,
      customIcon: null
    };

    await chrome.storage.local.set({ tiles: [newTile, ...tiles] });

    chrome.runtime.sendMessage({ type: 'BOOKMARK_ADDED' }, () => {
      if (chrome.runtime.lastError) { /* Sin pestañas activas */ }
    });
  } catch (err) {
    /* URL de marcador inválida */
  }
});

/**
 * Escucha peticiones de las pestañas de la extensión para acceder a APIs restringidas.
 */
if (typeof browser !== 'undefined' && browser.runtime) {
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'GET_FIREFOX_THEME') {
      if (browser.theme) {
        return browser.theme.getCurrent()
          .then(theme => ({ success: true, theme }))
          .catch(error => ({ success: false, error: error.message }));
      }
      return Promise.resolve({ success: false, error: 'browser.theme API no está disponible' });
    }
  });
} else {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_FIREFOX_THEME') {
      sendResponse({ success: false, error: 'browser.theme API no está disponible en este navegador' });
    }
  });
}

// Escuchar actualizaciones en el tema del navegador Firefox
if (typeof browser !== 'undefined' && browser.theme) {
  browser.theme.onUpdated.addListener(() => {
    chrome.runtime.sendMessage({ type: 'FIREFOX_THEME_UPDATED' }, () => {
      if (chrome.runtime.lastError) { /* Silenciar */ }
    });
  });
}
