// background service worker (minimal)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tablero de Accesos - installed');
});

/**
 * Escucha la creación de nuevos marcadores en el navegador.
 * Cuando un usuario añade un marcador, este se agrega automáticamente
 * como un nuevo acceso en el tablero.
 */
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  // Nos aseguramos de que el marcador tenga una URL (es decir, no es una carpeta)
  if (!bookmark.url) {
    return;
  }

  console.log('Nuevo marcador detectado:', bookmark.title, bookmark.url);

  // Obtenemos los accesos actuales desde el almacenamiento local
  const data = await chrome.storage.local.get('tiles');
  const tiles = data.tiles || [];

  // Creamos el nuevo acceso con el formato de la aplicación
  const newTile = {
    type: 'link',
    name: bookmark.title || new URL(bookmark.url).hostname, // Usar el título o el nombre del sitio
    url: bookmark.url,
    favorite: false, // Por defecto no es favorito en el tablero
    customIcon: null
  };

  // Añadimos el nuevo acceso al principio de la lista y guardamos
  await chrome.storage.local.set({ tiles: [newTile, ...tiles] });

  // Enviamos un mensaje a las pestañas de la extensión para que se actualicen
  chrome.runtime.sendMessage({ type: 'BOOKMARK_ADDED' }, (response) => {
    // El 'catch' evita un error si no hay pestañas de la extensión abiertas para recibir el mensaje.
    if (chrome.runtime.lastError) { /* No hay receptor, no hacer nada. */ }
  });
  console.log('Nuevo acceso guardado y mensaje de actualización enviado.');
});

/**
 * Escucha peticiones de las pestañas de la extensión para acceder a APIs restringidas.
 */
if (typeof browser !== 'undefined' && browser.runtime) {
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'GET_FIREFOX_THEME') {
      if (browser.theme) {
        return browser.theme.getCurrent()
          .then(theme => ({ success: true, theme }))
          .catch(error => ({ success: false, error: error.message }));
      } else {
        return Promise.resolve({ success: false, error: 'browser.theme API no está disponible' });
      }
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
  browser.theme.onUpdated.addListener(async (updateInfo) => {
    console.log('Firefox theme changed, notifying extension pages...');
    chrome.runtime.sendMessage({ type: 'FIREFOX_THEME_UPDATED' }, (response) => {
      // Evitar errores si no hay pestañas abiertas
      if (chrome.runtime.lastError) { /* Silenciar */ }
    });
  });
}