/**
 * Módulo central para la gestión de los "tiles" (accesos y carpetas).
 * Se encarga del estado principal (tiles, trash), la renderización de la cuadrícula,
 * y la lógica de arrastrar y soltar (drag and drop) en la vista principal.
 */
import { $, $$, storageSet, storageGet } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderFavoritesInSelect } from '../../utils/search.js';
import { showSaveStatus } from '../components/ui.js';
import { FileSystem } from '../system/file-system.js';
import { initContextMenu, showContextMenu } from '../components/context-menu.js';
import { renderTrash } from '../components/trash.js';
import { initModal, openModal } from '../components/modal.js';
import { initEditor, renderEditor } from '../settings/editor.js';
import { initNotes, renderNotes } from '../components/notes.js';

export let tiles = [];
export let trash = [];
let dragTileSrcEl = null;

// Configuración de scroll infinito
const PAGE_SIZE = 100;
let loadedCount = 0;
let intersectionObserver = null;
let isLoading = false;

export function setTiles(newTiles) {
    tiles = newTiles;
}

export function setTrash(newTrash) {
    trash = newTrash;
}

export function initTiles() {
    const tilesEl = $('#tiles');

    tilesEl.addEventListener('click', handleTileClick);
    tilesEl.addEventListener('dragstart', handleTileDragStart);
    tilesEl.addEventListener('dragover', handleTileDragOver);
    tilesEl.addEventListener('dragleave', handleTileDragLeave);
    tilesEl.addEventListener('drop', handleTileDrop);
    tilesEl.addEventListener('dragend', handleTileDragEnd);

    $('#addTile').addEventListener('click', () => openModal());

    initContextMenu();
    initModal();
    initEditor();
    initNotes();

    // Inicializar observador para scroll infinito
    initInfiniteScroll();

    // Fallback: Listener de scroll tradicional (por si falla el observador)
    window.addEventListener('scroll', () => {
        if (loadedCount > 0 && !isLoading) {
            const scrollPos = window.innerHeight + window.scrollY;
            const threshold = document.documentElement.scrollHeight - 600;
            if (scrollPos > threshold) {
                loadMoreTiles();
            }
        }
    }, { passive: true });
}

function initInfiniteScroll() {
    if (intersectionObserver) intersectionObserver.disconnect();

    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadMoreTiles();
            }
        });
    }, { rootMargin: '400px' });
}

export function saveAndRender() {
    const dataToSave = { tiles, trash };
    storageSet(dataToSave).then(async () => {
        const { autoSync } = await storageGet(['autoSync']);
        if (autoSync) {
            await FileSystem.saveDataToFile(dataToSave);
        }
        showSaveStatus();
    });

    renderFavoritesInSelect();
    renderTiles();
    
    const searchInput = $('#editorSearchInput');
    if (searchInput) searchInput.value = '';
    renderEditor();
    renderNotes();
    renderTrash();
}

export function renderTiles() {
    const tilesEl = $('#tiles');
    const tpl = $('#tileTpl');
    if (!tpl) return;

    // Resetear contador de carga
    loadedCount = 0;
    isLoading = false;
    tilesEl.textContent = '';
    
    // Desconectar observador previo
    if (intersectionObserver) intersectionObserver.disconnect();

    loadMoreTiles();

    $('#backBtn').hidden = FolderManager.isRootView();
}

function loadMoreTiles() {
    if (isLoading) return;
    
    const tilesEl = $('#tiles');
    const tpl = $('#tileTpl');
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const displayableTiles = currentTiles.filter(t => t.type !== 'note');
    
    if (loadedCount >= displayableTiles.length) {
        // Ya se cargó todo, asegurar que aparezca el botón "+"
        ensureAddButton(tilesEl, displayableTiles.length);
        return;
    }

    isLoading = true;

    // Asegurar que el observador esté inicializado antes de usarlo
    if (!intersectionObserver) initInfiniteScroll();

    const nextBatch = displayableTiles.slice(loadedCount, loadedCount + PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    nextBatch.forEach((t, i) => {
        const realIndex = loadedCount + i;
        const node = FolderManager.renderTile(t, realIndex, tpl, tiles);
        node.style.setProperty('--animation-delay', `${(realIndex % PAGE_SIZE) * 15}ms`);
        fragment.appendChild(node);
    });

    // Eliminar botón de añadir y centinela anteriores
    $('.tile-add')?.remove();
    const oldSentinel = $('#scroll-sentinel');
    if (oldSentinel) {
        intersectionObserver.unobserve(oldSentinel);
        oldSentinel.remove();
    }

    tilesEl.appendChild(fragment);
    loadedCount += nextBatch.length;
    isLoading = false;

    // Si aún quedan más por cargar, añadir un centinela más robusto
    if (loadedCount < displayableTiles.length) {
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.height = '100px';
        sentinel.style.width = '100%';
        sentinel.style.visibility = 'hidden';
        sentinel.style.pointerEvents = 'none';
        tilesEl.appendChild(sentinel);
        
        intersectionObserver.observe(sentinel);

        // Verificación inmediata
        requestAnimationFrame(() => {
            const rect = sentinel.getBoundingClientRect();
            if (rect.top < window.innerHeight + 400) {
                loadMoreTiles();
            }
        });
    } else {
        ensureAddButton(tilesEl, loadedCount);
    }
}

function ensureAddButton(container, count) {
    if ($('.tile-add')) return;
    const addNode = document.createElement('div');
    addNode.className = 'tile tile-add';
    addNode.style.gridColumn = 'auto'; 
    
    const span = document.createElement('span');
    span.textContent = '+';
    const textDiv = document.createElement('div');
    textDiv.textContent = 'Añadir';
    
    addNode.appendChild(span);
    addNode.appendChild(textDiv);
    
    addNode.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    container.appendChild(addNode);
}

function handleTileClick(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;

    const idx = Number(tile.dataset.idx);

    if (e.target.closest('.more-btn')) {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.target, idx);
    } else {
        const tileData = FolderManager.getTilesForCurrentView(tiles)[idx];
        if (tileData?.type === 'folder') {
            e.preventDefault(); // Prevent navigation for folders
        }
    }
}

function handleTileDragStart(e) {
    const tile = e.target.closest('.tile:not(.tile-add)');
    if (tile) {
        dragTileSrcEl = tile;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tile.dataset.idx);
        setTimeout(() => tile.classList.add('dragging'), 0);
    }
}

function handleTileDragOver(e) {
    e.preventDefault();
    const targetTile = e.target.closest('.tile:not(.tile-add)');
    if (!targetTile || targetTile === dragTileSrcEl) return;

    // Limpiar clases de otros tiles
    $$('.tile.drag-over, .tile.drag-over-folder').forEach(t => {
        if (t !== targetTile) {
            t.classList.remove('drag-over', 'drag-over-folder');
        }
    });

    const toIndex = Number(targetTile.dataset.idx);
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const targetTileData = currentTiles[toIndex];

    if (targetTileData.type === 'folder') {
        targetTile.classList.add('drag-over-folder');
    } else {
        targetTile.classList.add('drag-over');
    }
}

function handleTileDragLeave(e) {
    e.target.closest('.tile')?.classList.remove('drag-over', 'drag-over-folder');
}

function handleTileDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.tile:not(.tile-add)');
    if (!dragTileSrcEl || !dropTarget) return;

    const fromIndex = Number(dragTileSrcEl.dataset.idx);
    const toIndex = Number(dropTarget.dataset.idx);
    const currentTileList = FolderManager.getTilesForCurrentView(tiles);
    const targetTileData = currentTileList[toIndex];

    // Si soltamos sobre una carpeta
    if (targetTileData.type === 'folder' && dragTileSrcEl !== dropTarget) {
        const itemToMove = currentTileList.splice(fromIndex, 1)[0];
        // Asegurarse de que la carpeta tiene un array de hijos
        if (!targetTileData.children) {
            targetTileData.children = [];
        }
        targetTileData.children.unshift(itemToMove); // Añadir al principio de la carpeta
        saveAndRender();
    }
    // Si soltamos sobre otro acceso (para reordenar)
    else if (dragTileSrcEl !== dropTarget) {
        const fromIndex = Number(dragTileSrcEl.dataset.idx);
        const toIndex = Number(dropTarget.dataset.idx);
        const currentTiles = FolderManager.getTilesForCurrentView(tiles);
        const item = currentTiles.splice(fromIndex, 1)[0];
        currentTiles.splice(toIndex, 0, item);
        saveAndRender();
    }
}

function handleTileDragEnd() {
    $$('.tile').forEach(t => t.classList.remove('dragging', 'drag-over', 'drag-over-folder'));
    dragTileSrcEl = null;
}