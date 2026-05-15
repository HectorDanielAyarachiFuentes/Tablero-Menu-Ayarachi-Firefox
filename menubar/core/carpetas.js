/**
 * Gestiona la lógica de navegación y renderizado de carpetas.
 * Mantiene el estado de la ruta actual y proporciona métodos para navegar dentro y fuera de las carpetas.
 */
import { renderTiles, saveAndRender } from './tiles.js';

let viewPath = []; // Private state for folder path

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
            node.setAttribute('aria-label', `${tile.name}, carpeta`);
            node.removeAttribute('target');
            node.removeAttribute('rel');
            node.addEventListener('click', (e) => {
                e.preventDefault();
                viewPath.push(index);
                renderTiles(); // Assumes renderTiles is a global function
            });
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

            const FALLBACK_ICON = 'images/Dulce-flamenco.png';
            try {
                const url = new URL(tile.url);
                node.querySelector('.url').textContent = url.hostname.replace('www.', '');
                const thumbEl = node.querySelector('.thumb');
                thumbEl.addEventListener('error', () => { thumbEl.src = FALLBACK_ICON; }, { once: true });
                if (url.hostname && url.hostname.includes('.') && url.protocol.startsWith('http')) {
                    thumbEl.src = `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
                    thumbEl.onload = function () {
                        // Google returns a 16×16 generic globe for unknown domains — show Dulce instead
                        if (this.naturalWidth <= 16 && this.naturalHeight <= 16) {
                            this.onload = null;
                            this.src = FALLBACK_ICON;
                        }
                    };
                } else {
                    thumbEl.src = FALLBACK_ICON;
                }
            } catch (e) {
                node.querySelector('.url').textContent = tile.url;
                const thumbEl = node.querySelector('.thumb');
                thumbEl.addEventListener('error', () => { thumbEl.src = FALLBACK_ICON; }, { once: true });
                thumbEl.src = FALLBACK_ICON;
            }

            // Use custom icon if it exists, overwriting the default favicon
            if (tile.customIcon) {
                node.querySelector('.thumb').src = tile.customIcon;
            }
        }

        // Drag/drop listeners
        node.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', index));
        node.addEventListener('dragover', ev => {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            // Add visual feedback
            if (tile.type === 'folder') {
                ev.currentTarget.classList.add('drag-over-folder');
            } else {
                ev.currentTarget.classList.add('drag-over');
            }
        });
        node.addEventListener('dragenter', () => {
            if (tile.type === 'folder') node.classList.add('drag-over-folder');
        });
        node.addEventListener('dragleave', () => node.classList.remove('drag-over-folder', 'drag-over'));
        node.addEventListener('drop', ev => {
            ev.preventDefault();
            ev.stopPropagation(); // ¡CLAVE! Evita que el evento se propague al contenedor #tiles
            ev.currentTarget.classList.remove('drag-over-folder', 'drag-over');
            const fromIndex = Number(ev.dataTransfer.getData('text/plain'));
            const toIndex = index;
            const currentLevel = FolderManager.getTilesForCurrentView(rootTiles);

            if (fromIndex === toIndex) return; // No hacer nada si es el mismo índice

            const item = currentLevel.splice(fromIndex, 1)[0];

            if (tile.type === 'folder' && item !== tile) {
                // Soltar sobre una carpeta: mover dentro de la carpeta
                tile.children.unshift(item);
            } else if (item !== tile) {
                // Soltar sobre otro tile: reordenar
                // Ajustar el índice de destino si el origen está antes
                const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
                currentLevel.splice(adjustedToIndex, 0, item);
            } else {
                // Se soltó sobre sí mismo, reinsertar en posición original
                currentLevel.splice(fromIndex, 0, item);
            }
            saveAndRender();
        });

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