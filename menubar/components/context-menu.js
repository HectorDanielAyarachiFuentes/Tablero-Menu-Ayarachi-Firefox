/**
 * Gestiona la lógica del menú contextual que aparece al hacer clic en los "tres puntos" de un acceso.
 * Se encarga de mostrar, ocultar y manejar las acciones del menú (editar, eliminar, etc.).
 */
import { $, $$ } from '../core/utils.js';
import { FolderManager } from '../core/carpetas.js';
import { tiles, trash, saveAndRender } from '../core/tiles.js';
import { openModal } from './modal.js';

let activeMenuIndex = null;

export function initContextMenu() {
    const contextMenu = $('#contextMenu');
    document.addEventListener('click', (e) => {
        if (!contextMenu.hidden && !e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });

    contextMenu.addEventListener('click', handleContextMenuClick);
}

export function showContextMenu(button, index) {
    const contextMenu = $('#contextMenu');
    activeMenuIndex = index;
    const tileData = FolderManager.getTilesForCurrentView(tiles)[index];
    if (!tileData) return;

    const favOption = contextMenu.querySelector('[data-action="favorite"]');
    favOption.querySelector('span').textContent = tileData.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
    favOption.classList.toggle('is-fav', !!tileData.favorite);

    const isFolder = tileData.type === 'folder';
    contextMenu.querySelector('[data-action="favorite"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-tab"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-window"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-private"]').parentElement.hidden = isFolder;

    const rect = button.getBoundingClientRect();
    
    // Primero, hacer visible el menú para obtener sus dimensiones
    contextMenu.hidden = false;
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    
    // Calcular la posición inicial
    let left = rect.left;
    let top = rect.bottom + 5;
    
    // Verificar si el menú se sale por el borde derecho
    if (left + menuWidth > window.innerWidth) {
        // Alinear el menú al borde derecho del botón
        left = rect.right - menuWidth;
        // Si aún se sale, alinearlo al borde derecho de la ventana con un margen
        if (left < 0) {
            left = window.innerWidth - menuWidth - 10;
        }
    }
    
    // Verificar si el menú se sale por el borde inferior
    if (top + menuHeight > window.innerHeight) {
        // Mostrar el menú arriba del botón en lugar de abajo
        top = rect.top - menuHeight - 5;
        // Si aún se sale por arriba, alinearlo al borde superior con margen
        if (top < 0) {
            top = 10;
        }
    }
    
    // Asegurar que no se salga por el borde izquierdo
    if (left < 0) {
        left = 10;
    }
    
    contextMenu.style.setProperty('--menu-left', `${left}px`);
    contextMenu.style.setProperty('--menu-top', `${top}px`);
    setTimeout(() => contextMenu.classList.add('is-open'), 10);
}

function handleContextMenuClick(e) {
    e.stopPropagation();
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    const action = targetButton.dataset.action;
    if (!action || activeMenuIndex === null) return;

    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const tile = currentTiles[activeMenuIndex];

    switch (action) {
        case 'favorite':
            tile.favorite = !tile.favorite;
            saveAndRender();
            break;
        case 'open-tab': window.open(tile.url); break;
        case 'open-window': window.open(tile.url, '_blank', 'noopener,noreferrer'); break;
        case 'open-private': chrome.windows?.create({ url: tile.url, incognito: true }); break;
        case 'edit':
            // Para carpetas, necesitamos el índice global, no el de la vista actual.
            const globalIndex = tiles.findIndex(t => t === tile);
            openModal(globalIndex);
            break;
        case 'delete':
            const deleteOption = targetButton;
            if (deleteOption.classList.contains('confirm-delete')) {
                const itemToTrash = currentTiles.splice(activeMenuIndex, 1)[0];
                itemToTrash.deletedAt = new Date().toISOString();
                trash.unshift(itemToTrash);
                saveAndRender();
                resetDeleteConfirmation();
                hideContextMenu();
            } else {
                resetDeleteConfirmation();
                deleteOption.classList.add('confirm-delete');
                deleteOption.querySelector('span').textContent = '¿Confirmar envío?';
                $('#tiles').querySelector(`.tile[data-idx="${activeMenuIndex}"]`)?.classList.add('pending-delete');
            }
            break;
    }
    if (action !== 'delete') {
        hideContextMenu();
    }
}

function hideContextMenu() {
    const contextMenu = $('#contextMenu');
    contextMenu.classList.remove('is-open');
    resetDeleteConfirmation();
    setTimeout(() => { contextMenu.hidden = true; }, 200);
}

function resetDeleteConfirmation() {
    const confirmItem = $('#contextMenu .confirm-delete');
    if (confirmItem) {
        confirmItem.classList.remove('confirm-delete');
        confirmItem.querySelector('span').textContent = 'Enviar a la papelera';
    }
    $('#tiles .pending-delete')?.classList.remove('pending-delete');
}