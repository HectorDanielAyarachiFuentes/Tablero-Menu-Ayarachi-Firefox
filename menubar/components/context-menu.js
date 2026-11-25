/**
 * Gestiona la lógica del menú contextual que aparece al hacer clic en los "tres puntos" de un acceso.
 * Se encarga de mostrar, ocultar y manejar las acciones del menú (editar, eliminar, extraer, etc.).
 */
import { $, clearHTML, isSafeWebUrl } from '../core/utils.js';
import { FolderManager, getDynamicFallbackIcon } from '../core/carpetas.js';
import { tiles, trash, saveAndRender } from '../core/tiles.js';
import { openModal } from './modal.js';

let activeMenuIndex = null;

export function initContextMenu() {
    const contextMenu = $('#contextMenu');
    if (!contextMenu) return;

    document.addEventListener('click', (e) => {
        if (!contextMenu.hidden && !e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });

    contextMenu.addEventListener('click', handleContextMenuClick);
}

export function showContextMenu(button, index) {
    const contextMenu = $('#contextMenu');
    if (!contextMenu) return;

    activeMenuIndex = index;
    const tileData = FolderManager.getTilesForCurrentView(tiles)[index];
    if (!tileData) return;

    const favOption = contextMenu.querySelector('[data-action="favorite"]');
    favOption.querySelector('span').textContent = tileData.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
    favOption.classList.toggle('is-fav', !!tileData.favorite);

    const isFolder = tileData.type === 'folder';
    const isInsideFolder = !FolderManager.isRootView();

    contextMenu.querySelector('[data-action="favorite"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-tab"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-window"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-private"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="use-letter"]').parentElement.hidden = isFolder;

    const moveOutBtn = contextMenu.querySelector('[data-action="move-out"]')?.parentElement;
    if (moveOutBtn) moveOutBtn.hidden = !isInsideFolder;

    const emptyFolderBtn = contextMenu.querySelector('[data-action="empty-folder"]')?.parentElement;
    if (emptyFolderBtn) emptyFolderBtn.hidden = !(isFolder && tileData.children && tileData.children.length > 0);

    const extractSingleMenu = document.getElementById('extract-single-menu');
    const extractSubmenuList = document.getElementById('extract-submenu-list');

    if (extractSingleMenu && extractSubmenuList) {
        if (isFolder && tileData.children && tileData.children.length > 0) {
            extractSingleMenu.hidden = false;
            clearHTML(extractSubmenuList);

            tileData.children.forEach((child, i) => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.dataset.action = 'extract-single';
                btn.dataset.childIndex = i;

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

                const img = document.createElement('img');
                img.src = iconSrc || '';
                img.alt = '';
                img.width = 16;
                img.height = 16;
                img.style.marginRight = '8px';
                img.style.borderRadius = '4px';
                img.style.objectFit = 'contain';
                img.addEventListener('error', () => {
                    img.src = getDynamicFallbackIcon(child.name || child.url);
                }, { once: true });

                const nameSpan = document.createElement('span');
                nameSpan.textContent = child.name;
                btn.appendChild(img);
                btn.appendChild(nameSpan);
                li.appendChild(btn);
                extractSubmenuList.appendChild(li);
            });
        } else {
            extractSingleMenu.hidden = true;
        }
    }

    const rect = button.getBoundingClientRect();
    contextMenu.hidden = false;
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    let left = rect.left;
    let top = rect.bottom + 5;

    if (left + menuWidth > window.innerWidth) {
        left = rect.right - menuWidth;
        if (left < 0) left = window.innerWidth - menuWidth - 10;
    }

    if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 5;
        if (top < 0) top = 10;
    }

    if (left < 0) left = 10;

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
    if (!tile) {
        hideContextMenu();
        return;
    }

    switch (action) {
        case 'favorite':
            tile.favorite = !tile.favorite;
            saveAndRender();
            break;
        case 'open-tab':
            if (isSafeWebUrl(tile.url)) window.open(tile.url, '_blank', 'noopener,noreferrer');
            break;
        case 'open-window':
            if (isSafeWebUrl(tile.url)) window.open(tile.url, '_blank', 'noopener,noreferrer');
            break;
        case 'open-private':
            if (isSafeWebUrl(tile.url)) chrome.windows?.create({ url: tile.url, incognito: true });
            break;
        case 'use-letter': {
            let host = '?';
            try {
                if (tile.url) host = new URL(tile.url).hostname.replace('www.', '');
            } catch (err) {}
            const fallbackText = tile.name || host;
            tile.customIcon = getDynamicFallbackIcon(fallbackText);
            saveAndRender();
            break;
        }
        case 'extract-single': {
            const childIdx = Number(targetButton.dataset.childIndex);
            if (tile.type === 'folder' && tile.children && childIdx >= 0 && childIdx < tile.children.length) {
                const itemToMove = tile.children.splice(childIdx, 1)[0];
                currentTiles.push(itemToMove);
                saveAndRender();
            }
            break;
        }
        case 'move-out':
            if (!FolderManager.isRootView()) {
                const itemToMove = currentTiles.splice(activeMenuIndex, 1)[0];
                const path = FolderManager.getCurrentPath();
                const parentPath = path.slice(0, -1);
                let parentList = tiles;
                for (const idx of parentPath) {
                    parentList = parentList[idx].children;
                }
                parentList.unshift(itemToMove);
                saveAndRender();
            }
            break;
        case 'empty-folder':
            if (tile.type === 'folder' && tile.children && tile.children.length > 0) {
                const itemsToMove = tile.children.splice(0, tile.children.length);
                currentTiles.push(...itemsToMove);
                saveAndRender();
            }
            break;
        case 'edit': {
            const itemPath = [...FolderManager.getCurrentPath(), activeMenuIndex];
            openModal(itemPath);
            break;
        }
        case 'delete': {
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
                $('#tiles')?.querySelector(`.tile[data-idx="${activeMenuIndex}"]`)?.classList.add('pending-delete');
            }
            break;
        }
    }

    if (action !== 'delete') {
        hideContextMenu();
    }
}

export function hideContextMenu() {
    const contextMenu = $('#contextMenu');
    if (!contextMenu) return;
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
