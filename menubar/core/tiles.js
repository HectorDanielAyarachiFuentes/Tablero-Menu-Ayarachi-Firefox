/**
 * Módulo central para la gestión de los "tiles" (accesos y carpetas).
 * Se encarga del estado principal (tiles, trash), la renderización de la cuadrícula,
 * y la lógica de arrastrar y soltar (drag and drop) en la vista principal.
 */
import { $, $$, storageSet, storageGet, throttle } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderFavoritesInSelect } from '../../utils/search.js';
import { showSaveStatus } from '../components/ui.js';
import { FileSystem } from '../system/file-system.js';
import { initContextMenu, showContextMenu } from '../components/context-menu.js';
import { renderTrash } from '../components/trash.js';
import { initModal, openModal } from '../components/modal.js';
import { initEditor, renderEditor } from '../settings/editor.js';
import { renderNotes } from '../../notas/notas.js';

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

    // Retraer el clima al pasar el mouse por encima de cualquier acceso directo que choque con él
    // Se usa 'throttle' para limitar los cálculos de colisión (reflows por getBoundingClientRect)
    tilesEl.addEventListener('mouseover', throttle((e) => {
        const tile = e.target.closest('.tile');
        if (tile) {
            const weatherEl = $('#weather');
            if (weatherEl && (weatherEl.classList.contains('open') || weatherEl.matches(':hover'))) {
                const tileRect = tile.getBoundingClientRect();
                const weatherRect = weatherEl.getBoundingClientRect();
                
                // Comprobar colisión geométrica real entre la tarjeta del clima y el acceso
                const collides = !(tileRect.right < weatherRect.left || 
                                   tileRect.left > weatherRect.right || 
                                   tileRect.bottom < weatherRect.top || 
                                   tileRect.top > weatherRect.bottom);
                                   
                if (collides) {
                    weatherEl.classList.remove('open');
                    // Desactivar puntero temporalmente para romper el estado CSS :hover del clima
                    weatherEl.style.pointerEvents = 'none';
                    setTimeout(() => {
                        weatherEl.style.pointerEvents = '';
                    }, 800);
                }
            }
        }
    }, 100));

    $('#addTile').addEventListener('click', () => openModal());

    initContextMenu();
    initModal();
    initEditor();

    // Inicializar observador para scroll infinito
    initInfiniteScroll();

    // Fallback: Listener de scroll tradicional (por si falla el observador), optimizado
    window.addEventListener('scroll', throttle(() => {
        if (loadedCount > 0 && !isLoading) {
            const scrollPos = window.innerHeight + window.scrollY;
            const threshold = document.documentElement.scrollHeight - 600;
            if (scrollPos > threshold) {
                loadMoreTiles();
            }
        }
    }, 150), { passive: true });
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
    saveTilesQuietly().then(() => showSaveStatus());

    renderFavoritesInSelect();
    renderTiles();
    
    const searchInput = $('#editorSearchInput');
    if (searchInput) searchInput.value = '';
    renderEditor();
    renderNotes();
    renderTrash();
}

export function saveTilesQuietly() {
    const dataToSave = { tiles, trash };
    return storageSet(dataToSave).then(async () => {
        const { autoSync } = await storageGet(['autoSync']);
        if (autoSync) {
            await FileSystem.saveDataToFile(dataToSave);
        }
    });
}



export function renderTiles() {
    const tilesEl = $('#tiles');
    const tpl = $('#tileTpl');
    if (!tpl) return;

    // Resetear contador de carga
    loadedCount = 0;
    isLoading = false;
    // Ya no limpiamos aquí para evitar parpadeo (lo hace loadMoreTiles de forma atómica)
    // tilesEl.textContent = '';
    
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
        
        // Si es la primera carga (intercambio con snapshot), desactivamos la animación
        // para que no haya parpadeo al aparecer sobre la "foto" previa.
        if (loadedCount === 0) {
            node.style.animation = 'none';
            node.style.opacity = '1';
        } else {
            node.style.setProperty('--animation-delay', `${(realIndex % PAGE_SIZE) * 15}ms`);
        }
        
        fragment.appendChild(node);
    });

    // Eliminar botón de añadir y centinela anteriores
    $('.tile-add')?.remove();
    const oldSentinel = $('#scroll-sentinel');
    if (oldSentinel) {
        intersectionObserver.unobserve(oldSentinel);
        oldSentinel.remove();
    }

    // INTERCAMBIO INTELIGENTE: Para evitar el parpadeo de "recarga", si es la primera carga y
    // el snapshot es igual a los datos reales, no destruimos el DOM.
    if (loadedCount === 0) {
        const currentTileNodes = Array.from(tilesEl.children).filter(n => n.classList.contains('tile') && !n.classList.contains('tile-add'));
        let isIdentical = false;
        
        if (currentTileNodes.length === nextBatch.length) {
            isIdentical = currentTileNodes.every((node, i) => {
                const titleEl = node.querySelector('.title');
                return titleEl && titleEl.textContent === nextBatch[i].name;
            });
        }
        
        if (isIdentical) {
            // Actualizar índices por seguridad pero no reemplazar los elementos del DOM
            currentTileNodes.forEach((node, i) => {
                node.dataset.idx = loadedCount + i;
            });
        } else {
            tilesEl.replaceChildren(fragment);
        }
    } else {
        tilesEl.appendChild(fragment);
    }
    
    // GUARDAR SNAPSHOT: Capturar el estado actual tras añadir nuevos tiles
    if (FolderManager.isRootView()) {
        localStorage.setItem('tiles_snapshot', tilesEl.innerHTML);
    }

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
    
    // GUARDAR SNAPSHOT: Capturar el estado actual para carga instantánea
    if (FolderManager.isRootView()) {
        localStorage.setItem('tiles_snapshot', container.innerHTML);
    }
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

// =========================================================
// DRAG & DROP ESTILO OPERA - Sistema con placeholder gap
// =========================================================

let dragGhost = null;           // Clon flotante que sigue al cursor
let dragPlaceholder = null;     // Espacio vacío en el grid
let dragOffsetX = 0;            // Offset del cursor dentro del tile
let dragOffsetY = 0;
let dragFromIndex = -1;         // Índice original del tile arrastrado
let currentPlaceholderIndex = -1; // Posición actual del placeholder en el DOM
let folderDropTarget = null;    // Referencia al tile carpeta sobre el que estamos
let isDragging = false;

// Función throttle local para limitar cálculos de posición
function dragThrottle(fn, ms) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= ms) {
            lastCall = now;
            fn.apply(this, args);
        }
    };
}

function handleTileDragStart(e) {
    const tile = e.target.closest('.tile:not(.tile-add):not(.drag-placeholder)');
    if (!tile) return;

    isDragging = true;
    dragTileSrcEl = tile;
    dragFromIndex = Number(tile.dataset.idx);

    // Usar una imagen de drag transparente (1x1px) para ocultar el fantasma nativo
    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tile.dataset.idx);

    // Calcular offset del cursor dentro del tile
    const rect = tile.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    // Crear el clon fantasma flotante
    createDragGhost(tile, e.clientX, e.clientY);

    // Crear el placeholder del mismo tamaño
    createPlaceholder(tile);

    // Marcar el tile como arrastrado y activar modo drag en el contenedor
    requestAnimationFrame(() => {
        tile.classList.add('dragging');
        $('#tiles').classList.add('dragging-active');
    });

    currentPlaceholderIndex = dragFromIndex;
}

function createDragGhost(tile, x, y) {
    // Remover ghost anterior si existe
    dragGhost?.remove();

    dragGhost = tile.cloneNode(true);
    dragGhost.className = 'tile drag-ghost';
    // Copiar estilos computados relevantes
    const computedStyle = getComputedStyle(tile);
    dragGhost.style.width = computedStyle.width;
    dragGhost.style.height = computedStyle.height;
    dragGhost.style.left = (x - dragOffsetX) + 'px';
    dragGhost.style.top = (y - dragOffsetY) + 'px';
    dragGhost.style.background = computedStyle.background || 'var(--glass-bg)';

    document.body.appendChild(dragGhost);
}

function createPlaceholder(tile) {
    dragPlaceholder?.remove();

    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'drag-placeholder';
    // Mismo tamaño que el tile
    const computedStyle = getComputedStyle(tile);
    dragPlaceholder.style.minHeight = computedStyle.height;

    // Insertar justo después del tile arrastrado
    tile.parentNode.insertBefore(dragPlaceholder, tile.nextSibling);
}

// Handler optimizado con throttle para evitar cálculos excesivos
const throttledDragMove = dragThrottle(function(e) {
    if (!isDragging || !dragGhost || !dragPlaceholder) return;

    // Mover el ghost con el cursor
    dragGhost.style.left = (e.clientX - dragOffsetX) + 'px';
    dragGhost.style.top = (e.clientY - dragOffsetY) + 'px';

    // Buscar sobre qué tile estamos
    const tilesContainer = $('#tiles');
    const allTiles = Array.from(tilesContainer.querySelectorAll('.tile:not(.dragging):not(.tile-add):not(.drag-placeholder)'));
    
    // Limpiar estado de carpeta si ya no estamos sobre ella
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const tileBelow = elementBelow?.closest?.('.tile:not(.dragging):not(.tile-add):not(.drag-placeholder)');
    
    if (folderDropTarget && folderDropTarget !== tileBelow) {
        folderDropTarget.classList.remove('drag-over-folder');
        folderDropTarget = null;
    }
    
    // Verificar si estamos sobre una carpeta
    if (tileBelow) {
        const tileIdx = Number(tileBelow.dataset.idx);
        const currentTiles = FolderManager.getTilesForCurrentView(tiles);
        const tileData = currentTiles[tileIdx];
        
        if (tileData && tileData.type === 'folder') {
            folderDropTarget = tileBelow;
            tileBelow.classList.add('drag-over-folder');
            return; // No mover el placeholder si estamos sobre una carpeta
        }
    }

    // Calcular la mejor posición para el placeholder
    let closestTile = null;
    let closestDist = Infinity;
    let insertBefore = true;

    for (const t of allTiles) {
        const rect = t.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

        if (dist < closestDist) {
            closestDist = dist;
            closestTile = t;
            // Determinar si insertar antes o después
            insertBefore = e.clientX < centerX || (e.clientX >= centerX && e.clientY < centerY);
        }
    }

    if (closestTile) {
        const targetRef = insertBefore ? closestTile : closestTile.nextSibling;
        // Solo mover si la posición realmente cambió
        if (dragPlaceholder.nextSibling !== targetRef || dragPlaceholder.previousSibling !== (insertBefore ? null : closestTile)) {
            tilesContainer.insertBefore(dragPlaceholder, targetRef);
        }
    }
}, 50); // 50ms throttle = ~20fps para cálculos de posición

function handleTileDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    throttledDragMove(e);
}

function handleTileDragLeave(e) {
    // Limpiar estado de folder si salimos del tile
    const tile = e.target.closest('.tile');
    if (tile && tile === folderDropTarget) {
        // Solo limpiar si realmente salimos (no si entramos a un hijo)
        const related = e.relatedTarget?.closest?.('.tile');
        if (related !== tile) {
            tile.classList.remove('drag-over-folder');
            folderDropTarget = null;
        }
    }
}

function handleTileDrop(e) {
    e.preventDefault();
    if (!isDragging || !dragTileSrcEl) return;

    const tilesContainer = $('#tiles');
    const currentTileList = FolderManager.getTilesForCurrentView(tiles);
    const fromIndex = dragFromIndex;

    // Caso 1: Soltar sobre una carpeta
    if (folderDropTarget) {
        const folderIdx = Number(folderDropTarget.dataset.idx);
        const folderData = currentTileList[folderIdx];
        
        if (folderData && folderData.type === 'folder') {
            const item = currentTileList.splice(fromIndex, 1)[0];
            if (!folderData.children) folderData.children = [];
            folderData.children.unshift(item);
            cleanupDrag();
            saveAndRender();
            return;
        }
    }

    // Caso 2: Reordenar según la posición del placeholder
    if (dragPlaceholder) {
        // Calcular el nuevo índice basándose en la posición del placeholder
        const allVisible = Array.from(tilesContainer.querySelectorAll('.tile:not(.tile-add):not(.drag-placeholder), .drag-placeholder'));
        const newIndex = allVisible.indexOf(dragPlaceholder);
        
        // Extraer el item del array
        const item = currentTileList.splice(fromIndex, 1)[0];
        
        // Calcular el índice correcto de inserción
        // El placeholder ya no cuenta como tile, así que ajustamos
        let insertAt = newIndex;
        // Si el tile arrastrado estaba antes del placeholder, no necesitamos ajustar
        // Si estaba después, el splice ya redujo los índices
        if (fromIndex < newIndex) {
            insertAt = newIndex - 1; // -1 porque ya removimos el item
        }
        
        // Clamp al rango válido
        insertAt = Math.max(0, Math.min(insertAt, currentTileList.length));
        
        currentTileList.splice(insertAt, 0, item);
    }

    cleanupDrag();
    saveAndRender();

    // Animar el tile recién posicionado
    requestAnimationFrame(() => {
        const landedTile = tilesContainer.querySelector(`[data-idx="${currentTileList.indexOf(currentTileList.find(t => t === currentTileList[dragFromIndex]))}"]`);
        // Aplicar animación de aterrizaje a todos los tiles brevemente
        const allTiles = tilesContainer.querySelectorAll('.tile:not(.tile-add)');
        allTiles.forEach(t => {
            t.classList.add('drop-landing');
            t.addEventListener('animationend', () => t.classList.remove('drop-landing'), { once: true });
        });
    });
}

function handleTileDragEnd() {
    cleanupDrag();
}

function cleanupDrag() {
    // Remover ghost
    if (dragGhost) {
        dragGhost.classList.add('dropping');
        setTimeout(() => {
            dragGhost?.remove();
            dragGhost = null;
        }, 200);
    }

    // Remover placeholder
    dragPlaceholder?.remove();
    dragPlaceholder = null;

    // Limpiar clases
    if (dragTileSrcEl) {
        dragTileSrcEl.classList.remove('dragging');
    }
    $$('.tile').forEach(t => t.classList.remove('drag-over', 'drag-over-folder'));
    $('#tiles')?.classList.remove('dragging-active');

    // Limpiar estado de carpeta
    if (folderDropTarget) {
        folderDropTarget.classList.remove('drag-over-folder');
        folderDropTarget = null;
    }

    // Reset variables
    dragTileSrcEl = null;
    isDragging = false;
    dragFromIndex = -1;
    currentPlaceholderIndex = -1;
}