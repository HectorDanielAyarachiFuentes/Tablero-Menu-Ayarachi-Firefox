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
    const isRoot = FolderManager.isRootView();
    const displayableTiles = currentTiles.filter(t => isRoot ? t.type !== 'note' : true);
    
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
        const visualIndex = loadedCount + i;
        const trueIndex = currentTiles.indexOf(t);
        const node = FolderManager.renderTile(t, trueIndex, tpl, tiles);
        
        // Si es la primera carga (intercambio con snapshot), desactivamos la animación
        // para que no haya parpadeo al aparecer sobre la "foto" previa.
        if (loadedCount === 0) {
            node.style.animation = 'none';
            node.style.opacity = '1';
        } else {
            node.style.setProperty('--animation-delay', `${(visualIndex % PAGE_SIZE) * 15}ms`);
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
            FolderManager.navigateToFolder(idx);
        } else if (tileData?.type === 'note') {
            e.preventDefault();
            const itemPath = [...FolderManager.getCurrentPath(), idx];
            openModal(itemPath);
        }
    }
}

// =========================================================
// DRAG & DROP ESTILO OPERA - Sistema con placeholder gap
// Optimizado para rendimiento: GPU compositor + rAF
// =========================================================

let dragGhost = null;           // Clon flotante que sigue al cursor
let dragPlaceholder = null;     // Espacio vacío en el grid
let dragOffsetX = 0;            // Offset del cursor dentro del tile
let dragOffsetY = 0;
let dragFromIndex = -1;         // Índice original del tile arrastrado
let folderDropTarget = null;    // Referencia al tile carpeta sobre el que estamos
let backBtnDropTarget = null;   // Referencia al botón Atrás si estamos sobre él
let isDragging = false;
let cachedTilesContainer = null; // Cache del contenedor
let cachedTileRects = [];       // Posiciones cacheadas de los tiles
let rafId = 0;                  // ID del requestAnimationFrame activo
let lastMouseX = 0;             // Última posición conocida del mouse
let lastMouseY = 0;

function handleTileDragStart(e) {
    const tile = e.target.closest('.tile:not(.tile-add):not(.drag-placeholder)');
    if (!tile) return;

    isDragging = true;
    dragTileSrcEl = tile;
    dragFromIndex = Number(tile.dataset.idx);
    cachedTilesContainer = $('#tiles');

    // Imagen de drag transparente (1x1px) para ocultar el fantasma nativo
    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tile.dataset.idx);

    // Calcular offset del cursor dentro del tile
    const rect = tile.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    // Crear el clon fantasma flotante (GPU-optimizado)
    createDragGhost(tile, e.clientX, e.clientY);

    // Crear el placeholder del mismo tamaño
    createPlaceholder(tile);

    // Marcar el tile como arrastrado
    tile.classList.add('dragging');
    cachedTilesContainer.classList.add('dragging-active');

    // Cachear posiciones de tiles DESPUÉS de que el dragging tile se oculte
    requestAnimationFrame(() => {
        cacheTilePositions();
    });
}

function createDragGhost(tile, x, y) {
    dragGhost?.remove();

    dragGhost = tile.cloneNode(true);
    dragGhost.className = 'tile drag-ghost';

    const computedStyle = getComputedStyle(tile);
    dragGhost.style.cssText = `
        position: fixed;
        left: 0; top: 0;
        width: ${computedStyle.width};
        height: ${computedStyle.height};
        background: ${computedStyle.background || 'var(--glass-bg)'};
        pointer-events: none;
        z-index: 9999;
        will-change: transform;
        transform: translate3d(${x - dragOffsetX}px, ${y - dragOffsetY}px, 0) rotate(2deg) scale(1.04);
    `;

    document.body.appendChild(dragGhost);
}

function createPlaceholder(tile) {
    dragPlaceholder?.remove();

    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'drag-placeholder';
    const computedStyle = getComputedStyle(tile);
    dragPlaceholder.style.minHeight = computedStyle.height;

    // Insertar justo después del tile arrastrado
    tile.parentNode.insertBefore(dragPlaceholder, tile.nextSibling);
}

// Cachear posiciones de todos los tiles una vez (evita reflow en cada frame)
function cacheTilePositions() {
    if (!cachedTilesContainer) return;
    const allTiles = cachedTilesContainer.querySelectorAll('.tile:not(.dragging):not(.tile-add):not(.drag-placeholder)');
    cachedTileRects = [];
    for (const t of allTiles) {
        const rect = t.getBoundingClientRect();
        cachedTileRects.push({
            el: t,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom
        });
    }
}

// Loop de animación con rAF - sincronizado con el monitor
function dragAnimationLoop() {
    if (!isDragging || !dragGhost || !dragPlaceholder) return;

    // 1. Mover ghost con transform3d (solo compositor, sin layout)
    const gx = lastMouseX - dragOffsetX;
    const gy = lastMouseY - dragOffsetY;
    dragGhost.style.transform = `translate3d(${gx}px, ${gy}px, 0) rotate(2deg) scale(1.04)`;

    // 2. Detectar drop targets bajo el cursor (botón Atrás y carpetas)
    const elementBelow = document.elementFromPoint(lastMouseX, lastMouseY);
    
    // --- Botón Atrás ---
    const backBtnBelow = elementBelow?.closest?.('#backBtn');
    if (backBtnDropTarget && backBtnDropTarget !== backBtnBelow) {
        backBtnDropTarget.classList.remove('drag-over-back');
        backBtnDropTarget = null;
        dragPlaceholder.style.display = ''; // Restaurar placeholder
    }
    if (backBtnBelow && !FolderManager.isRootView()) {
        backBtnDropTarget = backBtnBelow;
        backBtnBelow.classList.add('drag-over-back');
        dragPlaceholder.style.display = 'none'; // Ocultar placeholder
        rafId = requestAnimationFrame(dragAnimationLoop);
        return;
    }

    // --- Carpetas y Links ---
    const tileBelow = elementBelow?.closest?.('.tile:not(.dragging):not(.tile-add):not(.drag-placeholder)');

    if (folderDropTarget && folderDropTarget !== tileBelow) {
        folderDropTarget.classList.remove('drag-over-folder');
        folderDropTarget = null;
        dragPlaceholder.style.display = ''; // Restaurar placeholder
    }

    if (tileBelow) {
        const tileIdx = Number(tileBelow.dataset.idx);
        const currentTiles = FolderManager.getTilesForCurrentView(tiles);
        const tileData = currentTiles[tileIdx];

        if (tileData) {
            let isDropTarget = false;
            
            if (tileData.type === 'folder') {
                isDropTarget = true; // Carpetas siempre aceptan drops
            } else if (tileData.type === 'link' || tileData.type === 'note') {
                // Para crear carpeta sobre un link/nota, debemos estar cerca del centro
                const rect = tileBelow.getBoundingClientRect();
                const rx = Math.abs(lastMouseX - (rect.left + rect.width / 2)) / (rect.width / 2);
                const ry = Math.abs(lastMouseY - (rect.top + rect.height / 2)) / (rect.height / 2);
                
                // Zona central ampliada: 65% del tile (evita tener que apuntar perfecto)
                if (rx < 0.65 && ry < 0.65) {
                    isDropTarget = true;
                }
            }

            if (isDropTarget) {
                folderDropTarget = tileBelow;
                tileBelow.classList.add('drag-over-folder');
                // Importante: No ocultar el dragPlaceholder aquí. Ocultarlo causaba que el
                // layout se reacomodara (reflow), moviendo la carpeta debajo del cursor 
                // y provocando un parpadeo infinito que impedía soltar la pestaña.
                rafId = requestAnimationFrame(dragAnimationLoop);
                return;
            }
        }
    }

    // Asegurar que el placeholder sea visible si no estamos sobre un target
    dragPlaceholder.style.display = '';

    // 3. Reordenamiento basado en el elemento bajo el cursor (evita parpadeo)
    const hoverTile = elementBelow?.closest('.tile:not(.dragging):not(.tile-add):not(.drag-placeholder)');
    
    if (hoverTile) {
        const rect = hoverTile.getBoundingClientRect();
        
        // Hysteresis: evitar parpadeo requiriendo que el cursor entre un poco en el elemento
        const padX = rect.width * 0.15;
        const padY = rect.height * 0.15;
        
        if (lastMouseX > rect.left + padX && lastMouseX < rect.right - padX &&
            lastMouseY > rect.top + padY && lastMouseY < rect.bottom - padY) {
            
            const isPlaceholderAfter = hoverTile.compareDocumentPosition(dragPlaceholder) & Node.DOCUMENT_POSITION_FOLLOWING;
            
            if (isPlaceholderAfter) {
                if (dragPlaceholder.nextSibling !== hoverTile) {
                    cachedTilesContainer.insertBefore(dragPlaceholder, hoverTile);
                }
            } else {
                if (dragPlaceholder.nextSibling !== hoverTile.nextSibling) {
                    cachedTilesContainer.insertBefore(dragPlaceholder, hoverTile.nextSibling);
                }
            }
        }
    }

    rafId = requestAnimationFrame(dragAnimationLoop);
}

function handleTileDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Solo guardar coordenadas - el rAF loop se encarga del resto
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    // Iniciar loop de animación si no está corriendo
    if (!rafId) {
        rafId = requestAnimationFrame(dragAnimationLoop);
    }
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

    const tilesContainer = cachedTilesContainer || $('#tiles');
    const currentTileList = FolderManager.getTilesForCurrentView(tiles);
    const fromIndex = dragFromIndex;

    // Caso 1: Soltar sobre el botón Atrás (mover elemento al padre)
    if (backBtnDropTarget && !FolderManager.isRootView()) {
        const item = currentTileList.splice(fromIndex, 1)[0];
        
        // Obtener la ruta de la carpeta padre
        const path = FolderManager.getCurrentPath();
        const parentPath = path.slice(0, -1);
        
        // Navegar desde la raíz para obtener la lista de tiles del padre
        let parentList = tiles;
        for (const idx of parentPath) {
            parentList = parentList[idx].children;
        }
        
        // Añadir el item a la carpeta padre
        parentList.unshift(item);
        
        cleanupDrag();
        saveAndRender();
        return;
    }

    // Caso 2: Soltar sobre una carpeta o link (para crear carpeta)
    if (folderDropTarget) {
        const targetIdx = Number(folderDropTarget.dataset.idx);
        const targetData = currentTileList[targetIdx];
        
        if (targetData) {
            // Extraer el tile arrastrado
            const item = currentTileList.splice(fromIndex, 1)[0];
            
            // Recalcular índice del objetivo porque hicimos splice() antes
            const newTargetIdx = fromIndex < targetIdx ? targetIdx - 1 : targetIdx;
            
            if (targetData.type === 'folder') {
                // Añadir a carpeta existente
                const folderRef = currentTileList[newTargetIdx];
                if (!folderRef.children) folderRef.children = [];
                folderRef.children.unshift(item);
            } else if (targetData.type === 'link' || targetData.type === 'note') {
                // Crear nueva carpeta combinando ambos
                const linkRef = currentTileList[newTargetIdx];
                currentTileList[newTargetIdx] = {
                    type: 'folder',
                    name: 'Nueva Carpeta',
                    children: [item, linkRef]
                };
            }
            
            cleanupDrag();
            saveAndRender(); // Necesita re-render completo
            return;
        }
    }

    // Caso 2: Reordenar según la posición del placeholder
    if (dragPlaceholder) {
        const allVisible = Array.from(tilesContainer.querySelectorAll('.tile:not(.tile-add):not(.drag-placeholder), .drag-placeholder'));
        const newIndex = allVisible.indexOf(dragPlaceholder);
        
        // Reordenar el array de datos
        const item = currentTileList.splice(fromIndex, 1)[0];
        let insertAt = newIndex;
        if (fromIndex < newIndex) {
            insertAt = newIndex - 1;
        }
        insertAt = Math.max(0, Math.min(insertAt, currentTileList.length));
        currentTileList.splice(insertAt, 0, item);

        // Reordenar el DOM directamente SIN destruir/recrear nodos (evita parpadeo)
        const draggedTile = dragTileSrcEl;
        
        // Limpiar antes de manipular DOM
        cleanupDrag();

        // Restaurar visibilidad del tile arrastrado
        draggedTile.classList.remove('dragging');
        draggedTile.style.position = '';
        draggedTile.style.visibility = '';
        draggedTile.style.width = '';
        draggedTile.style.height = '';
        draggedTile.style.overflow = '';
        draggedTile.style.padding = '';
        draggedTile.style.margin = '';
        draggedTile.style.border = '';

        // Mover el nodo DOM a la posición correcta
        const allTilesAfter = Array.from(tilesContainer.querySelectorAll('.tile:not(.tile-add)'));
        if (insertAt >= allTilesAfter.length) {
            // Insertar antes del botón "+"
            const addBtn = tilesContainer.querySelector('.tile-add');
            tilesContainer.insertBefore(draggedTile, addBtn);
        } else {
            // Insertar antes del tile en la posición destino
            const refTile = allTilesAfter[insertAt];
            if (refTile && refTile !== draggedTile) {
                tilesContainer.insertBefore(draggedTile, refTile);
            }
        }

        // Actualizar data-idx de todos los tiles
        tilesContainer.querySelectorAll('.tile:not(.tile-add)').forEach((t, i) => {
            t.dataset.idx = i;
        });

        // Guardar sin re-renderizar (ya movimos el DOM)
        saveTilesQuietly().then(() => showSaveStatus());

        // Actualizar snapshot
        if (FolderManager.isRootView()) {
            localStorage.setItem('tiles_snapshot', tilesContainer.innerHTML);
        }

        return;
    }

    cleanupDrag();
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

    // Cancelar loop de animación
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
    }

    // Reset variables
    dragTileSrcEl = null;
    isDragging = false;
    dragFromIndex = -1;
    cachedTilesContainer = null;
    cachedTileRects = [];
    lastMouseX = 0;
    lastMouseY = 0;
}