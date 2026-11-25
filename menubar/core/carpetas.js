/**
 * Gestiona la lógica de navegación y renderizado de carpetas y accesos individuales.
 * Mantiene el estado de la ruta actual y proporciona métodos para navegar dentro y fuera de las carpetas.
 */
import { isSafeWebUrl, safeGetHostname } from './utils.js';

let _renderTiles = () => {};
let _saveTilesQuietly = () => Promise.resolve();

/**
 * Registra callbacks de tiles para la navegación y guardado de carpetas
 * eliminando la dependencia circular entre tiles.js y carpetas.js.
 */
export function setFolderTilesCallbacks(callbacks = {}) {
    if (callbacks.renderTiles) _renderTiles = callbacks.renderTiles;
    if (callbacks.saveTilesQuietly) _saveTilesQuietly = callbacks.saveTilesQuietly;
}

let viewPath = []; // Estado privado de la ruta de carpeta activa

/**
 * Genera un ícono local (SVG del abecedario o Canvas redondeado) para un título dado.
 */
export function getDynamicFallbackIcon(text) {
    const letter = (text || '?').charAt(0).toUpperCase();

    if (/^[A-Z]$/.test(letter)) {
        return typeof chrome !== 'undefined' && chrome.runtime?.getURL
            ? chrome.runtime.getURL(`abecedario/${letter.toLowerCase()}.svg`)
            : `abecedario/${letter.toLowerCase()}.svg`;
    }

    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#1ABC9C', '#F1C40F',
        '#E67E22', '#E74C3C', '#2ECC71', '#F39C12', '#8E44AD'
    ];
    const charCode = letter.charCodeAt(0) || 0;
    const bgColor = colors[charCode % colors.length];

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, 64, 64, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 32, 34);

    return canvas.toDataURL('image/png');
}

export const FolderManager = {
    getTilesForCurrentView(rootTiles) {
        let currentLevel = rootTiles;
        for (const index of viewPath) {
            if (currentLevel[index] && currentLevel[index].type === 'folder') {
                currentLevel = currentLevel[index].children || [];
            } else {
                viewPath = [];
                return rootTiles;
            }
        }
        return currentLevel;
    },

    navigateToFolder(index) {
        viewPath.push(index);
        _renderTiles();
    },

    renderTile(tile, index, tpl, rootTiles) {
        let node = tpl.content.firstElementChild.cloneNode(true);
        node.dataset.idx = index;
        node.setAttribute('draggable', 'true');
        node.querySelector('.title').textContent = tile.name || '';
        const animEnabled = document.body.classList.contains('with-load-animations');
        node.style.setProperty('--animation-delay', animEnabled ? `${index * 50}ms` : '0s');

        if (tile.type === 'folder') {
            node.classList.add('folder');
            const children = Array.isArray(tile.children) ? tile.children : [];
            node.querySelector('.url').textContent = `${children.length} elemento(s)`;

            const imgThumb = node.querySelector('.thumb');
            const thumbEl = document.createElement('div');
            thumbEl.className = imgThumb.className;
            imgThumb.parentNode.replaceChild(thumbEl, imgThumb);

            if (children.length > 0) {
                const maxIcons = Math.min(children.length, 4);
                const folderGrid = document.createElement('div');
                folderGrid.className = 'folder-grid';

                for (let i = 0; i < maxIcons; i++) {
                    const child = children[i];
                    let iconSrc = child.customIcon;
                    if (!iconSrc) {
                        if (child.type === 'link' || child.type === 'enlace') {
                            if (isSafeWebUrl(child.url)) {
                                iconSrc = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(child.url).hostname}`;
                            } else {
                                iconSrc = getDynamicFallbackIcon(child.name || child.url);
                            }
                        } else if (child.type === 'folder') {
                            iconSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"%3E%3C/path%3E%3C/svg%3E';
                        } else {
                            iconSrc = getDynamicFallbackIcon(child.name || 'Nota');
                        }
                    }
                    if (iconSrc) {
                        const miniImg = document.createElement('img');
                        miniImg.className = 'mini-icon';
                        miniImg.src = iconSrc;
                        miniImg.alt = '';
                        miniImg.loading = 'lazy';
                        miniImg.addEventListener('error', () => {
                            miniImg.src = getDynamicFallbackIcon(child.name || child.url);
                        }, { once: true });
                        folderGrid.appendChild(miniImg);
                    }
                }
                thumbEl.appendChild(folderGrid);
                thumbEl.style.backgroundImage = 'none';
                thumbEl.style.padding = '4px';
            }

            node.setAttribute('role', 'button');
            node.setAttribute('tabindex', '0');
            node.setAttribute('aria-label', `${tile.name}, carpeta`);
            node.removeAttribute('target');
            node.removeAttribute('rel');
        } else if (tile.type === 'note') {
            node.classList.add('is-note');
            const thumbEl = node.querySelector('.thumb');
            thumbEl.src = getDynamicFallbackIcon(tile.name || 'Nota');
            node.querySelector('.url').textContent = 'Nota';
            node.setAttribute('role', 'button');
            node.setAttribute('tabindex', '0');
            node.setAttribute('aria-label', `${tile.name || 'Nota'}, abrir nota`);
        } else {
            const linkNode = document.createElement('a');
            linkNode.href = isSafeWebUrl(tile.url) ? tile.url : '#';
            linkNode.rel = 'noopener noreferrer';
            for (const attr of node.attributes) {
                if (attr.name === 'style') {
                    linkNode.style.cssText = attr.value;
                } else {
                    linkNode.setAttribute(attr.name, attr.value);
                }
            }
            while (node.firstChild) {
                linkNode.appendChild(node.firstChild);
            }
            node = linkNode;

            const urlHostname = safeGetHostname(tile.url);
            const fallbackText = tile.name || urlHostname;
            const FALLBACK_ICON = getDynamicFallbackIcon(fallbackText);
            const thumbEl = node.querySelector('.thumb');

            node.querySelector('.url').textContent = tile.url ? urlHostname : '';

            // Respaldo visual temporal sin sobreescribir tile.customIcon en disco
            thumbEl.onerror = function() {
                if (!this.dataset.fallbackLoaded) {
                    this.dataset.fallbackLoaded = 'true';
                    this.src = FALLBACK_ICON;
                }
            };

            if (tile.customIcon) {
                thumbEl.src = tile.customIcon;
            } else if (isSafeWebUrl(tile.url)) {
                try {
                    const url = new URL(tile.url);
                    if (url.hostname && url.hostname.includes('.')) {
                        const targetSrc = `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
                        thumbEl.src = targetSrc;

                        const imgLoader = new Image();
                        thumbEl._imgLoader = imgLoader;

                        imgLoader.onload = function() {
                            if (imgLoader.naturalWidth <= 16 && imgLoader.naturalHeight <= 16) {
                                thumbEl.dataset.fallbackLoaded = 'true';
                                thumbEl.src = FALLBACK_ICON;
                            }
                        };
                        imgLoader.onerror = function() {
                            thumbEl.dataset.fallbackLoaded = 'true';
                            thumbEl.src = FALLBACK_ICON;
                        };
                        imgLoader.src = targetSrc;
                    } else {
                        thumbEl.dataset.fallbackLoaded = 'true';
                        thumbEl.src = FALLBACK_ICON;
                    }
                } catch (e) {
                    thumbEl.dataset.fallbackLoaded = 'true';
                    thumbEl.src = FALLBACK_ICON;
                }
            } else {
                thumbEl.dataset.fallbackLoaded = 'true';
                thumbEl.src = FALLBACK_ICON;
            }
        }

        return node;
    },

    goBack() {
        if (viewPath.length > 0) {
            viewPath.pop();
            return true;
        }
        return false;
    },

    isRootView() {
        return viewPath.length === 0;
    },

    getCurrentPath() {
        return viewPath;
    }
};
