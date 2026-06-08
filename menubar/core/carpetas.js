/**
 * Gestiona la lógica de navegación y renderizado de carpetas.
 * Mantiene el estado de la ruta actual y proporciona métodos para navegar dentro y fuera de las carpetas.
 */
import { renderTiles, saveAndRender, saveTilesQuietly } from './tiles.js';
import { openModal } from '../components/modal.js';

let viewPath = []; // Private state for folder path

// Helper para generar un icono con la letra inicial o cargar el SVG
function getDynamicFallbackIcon(text) {
    const letter = (text || '?').charAt(0).toUpperCase();

    // Si la letra es del abecedario A-Z, cargamos tu SVG desde la carpeta abecedario
    if (/^[A-Z]$/.test(letter)) {
        return chrome.runtime.getURL(`abecedario/${letter.toLowerCase()}.svg`);
    }

    // Para números o símbolos, seguimos usando el Canvas como respaldo
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#1ABC9C', '#F1C40F',
        '#E67E22', '#E74C3C', '#2ECC71', '#F39C12', '#8E44AD'
    ];
    const charCode = letter.charCodeAt(0) || 0;
    const colorIndex = charCode % colors.length;
    const bgColor = colors[colorIndex];
    
    // Creamos un Canvas en lugar de un SVG para evitar errores de seguridad en extensiones Firefox
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Fondo redondeado
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, 64, 64, 12);
    ctx.fill();
    
    // Texto
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 32, 32 + 2); // +2 para alinear visualmente mejor
    
    return canvas.toDataURL('image/png');
}

export const FolderManager = {

    // Gets the array of tiles for the current folder view
    getTilesForCurrentView(rootTiles) {
        let currentLevel = rootTiles;
        for (const index of viewPath) {
            // Ensure we are traversing into a valid folder
            if (currentLevel[index] && currentLevel[index].type === 'folder') {
                currentLevel = currentLevel[index].children;
            } else {
                viewPath = []; // Reset path if invalid
                return rootTiles;
            }
        }
        return currentLevel;
    },

    navigateToFolder(index) {
        viewPath.push(index);
        renderTiles();
    },

    // Renders a single tile (link or folder)
    renderTile(tile, index, tpl, rootTiles) {
        let node = tpl.content.firstElementChild.cloneNode(true);
        node.dataset.idx = index;
        node.setAttribute('draggable', 'true'); // Enable drag and drop
        node.querySelector('.title').textContent = tile.name;
        node.style.setProperty('--animation-delay', `${index * 50}ms`);

        if (tile.type === 'folder') {
            node.classList.add('folder');
            node.querySelector('.url').textContent = `${tile.children.length} elemento(s)`;
            
            // Render 2x2 mini icons grid (reemplazar img por div porque img no soporta innerHTML)
            const imgThumb = node.querySelector('.thumb');
            const thumbEl = document.createElement('div');
            thumbEl.className = imgThumb.className;
            imgThumb.parentNode.replaceChild(thumbEl, imgThumb);
            if (tile.children && tile.children.length > 0) {
                const maxIcons = Math.min(tile.children.length, 4);
                let iconsHTML = '';
                for (let i = 0; i < maxIcons; i++) {
                    const child = tile.children[i];
                    let iconSrc = child.customIcon;
                    if (!iconSrc) {
                        if (child.type === 'link') {
                            try {
                                const urlObj = new URL(child.url);
                                iconSrc = `https://www.google.com/s2/favicons?sz=64&domain=${urlObj.hostname}`;
                            } catch (e) {
                                iconSrc = getDynamicFallbackIcon(child.name || child.url);
                            }
                        } else if (child.type === 'folder') {
                            // Si hay una carpeta anidada, usamos un ícono genérico
                            iconSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"%3E%3C/path%3E%3C/svg%3E';
                        }
                    }
                    if (iconSrc) {
                        iconsHTML += `<img class="mini-icon" src="${iconSrc}" alt="" loading="lazy" />`;
                    }
                }
                thumbEl.innerHTML = `<div class="folder-grid">${iconsHTML}</div>`;
                thumbEl.style.backgroundImage = 'none'; // Disable the default SVG folder background
                thumbEl.style.padding = '4px'; // Remove the large padding used for the SVG so the grid fits
            }

            node.setAttribute('aria-label', `${tile.name}, carpeta`);
            node.removeAttribute('target');
            node.removeAttribute('rel');
        } else if (tile.type === 'note') {
            node.classList.add('is-note');
            const thumbEl = node.querySelector('.thumb');
            
            // Generate a simple text icon for the note
            const fallbackText = tile.name || 'Nota';
            const FALLBACK_ICON = getDynamicFallbackIcon(fallbackText);
            thumbEl.src = FALLBACK_ICON;
            
            node.querySelector('.url').textContent = 'Nota';
        } else { // link (default)
            // For links, we wrap the div from the template in an <a> tag
            const linkNode = document.createElement('a');
            linkNode.href = tile.url;
            linkNode.rel = 'noopener noreferrer';
            // Copy all attributes and classes from the div to the new <a>
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

            const fallbackText = tile.name || (tile.url ? new URL(tile.url).hostname.replace('www.', '') : '?');
            const FALLBACK_ICON = getDynamicFallbackIcon(fallbackText);
            const thumbEl = node.querySelector('.thumb');

            // Establecer el texto de la URL
            try {
                const url = new URL(tile.url);
                node.querySelector('.url').textContent = url.hostname.replace('www.', '');
            } catch (e) {
                node.querySelector('.url').textContent = tile.url;
            }

            // Listener de error
            thumbEl.onerror = function() {
                if (!this.dataset.fallbackLoaded) {
                    this.dataset.fallbackLoaded = 'true';
                    this.src = FALLBACK_ICON;
                    tile.customIcon = FALLBACK_ICON;
                    saveTilesQuietly();
                }
            };

            // Lógica de carga de imagen
            if (tile.customIcon) {
                thumbEl.src = tile.customIcon;
            } else {
                try {
                    const url = new URL(tile.url);
                    if (url.hostname && url.hostname.includes('.') && url.protocol.startsWith('http')) {
                        const targetSrc = `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
                        
                        // Mostramos el favicon temporalmente
                        thumbEl.src = targetSrc;
                        
                        // Usamos un cargador de imagen en segundo plano para revisar el tamaño real de forma segura
                        const imgLoader = new Image();
                        // Prevenimos que Firefox recolecte la variable imgLoader antes de que termine
                        thumbEl._imgLoader = imgLoader;
                        
                        imgLoader.onload = function() {
                            if (imgLoader.naturalWidth <= 16 && imgLoader.naturalHeight <= 16) {
                                thumbEl.dataset.fallbackLoaded = 'true';
                                thumbEl.src = FALLBACK_ICON;
                                tile.customIcon = FALLBACK_ICON;
                                saveTilesQuietly();
                            }
                        };
                        imgLoader.onerror = function() {
                            thumbEl.dataset.fallbackLoaded = 'true';
                            thumbEl.src = FALLBACK_ICON;
                            tile.customIcon = FALLBACK_ICON;
                            saveTilesQuietly();
                        };
                        imgLoader.src = targetSrc;
                        
                    } else {
                        thumbEl.dataset.fallbackLoaded = 'true';
                        thumbEl.src = FALLBACK_ICON;
                        tile.customIcon = FALLBACK_ICON;
                        saveTilesQuietly();
                    }
                } catch (e) {
                    thumbEl.dataset.fallbackLoaded = 'true';
                    thumbEl.src = FALLBACK_ICON;
                    tile.customIcon = FALLBACK_ICON;
                    saveTilesQuietly();
                }
            }
        }

        // Drag: solo setear datos, la lógica centralizada está en tiles.js
        node.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', index));


        return node;
    },

    goBack() {
        if (viewPath.length > 0) {
            viewPath.pop();
            return true; // Indicate that the view changed
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