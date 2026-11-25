/**
 * Gestiona el panel "Gestionar Accesos" dentro de la configuración.
 * Se encarga de sincronizar marcadores, buscar, editar inline y reordenar accesos raíz mediante drag-and-drop.
 */
import { $, $$, isSafeWebUrl, normalizeWebUrl } from '../core/utils.js';
import { tiles, saveAndRender } from '../core/tiles.js';
import { showToast } from '../components/ui.js';

let dragEditorRowSrcEl = null;

export function initEditor() {
    const editor = $('#editor');
    if (!editor) return;

    editor.addEventListener('dragstart', handleEditorDragStart);
    editor.addEventListener('dragover', handleEditorDragOver);
    editor.addEventListener('drop', handleEditorDrop);
    editor.addEventListener('dragend', handleEditorDragEnd);

    const searchInput = $('#editorSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderEditor());
    }

    const syncBtn = $('#syncBookmarks');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleSyncBookmarks);
    }
}

async function handleSyncBookmarks() {
    if (!window.chrome || !chrome.bookmarks) {
        showToast('La API de marcadores no está disponible en este entorno.', 'error');
        return;
    }

    try {
        const bookmarkTreeNodes = await new Promise(resolve => chrome.bookmarks.getTree(resolve));
        const rootNode = bookmarkTreeNodes[0];
        if (!rootNode || !rootNode.children) {
            showToast('No se encontraron marcadores válidos para sincronizar.', 'error');
            return;
        }

        const rootChildren = rootNode.children;
        const itemsToMerge = [];

        for (const node of rootChildren) {
            const title = (node.title || '').toLowerCase();
            const isBookmarksBar = node.id === '1' ||
                                   title.includes('bar') ||
                                   title.includes('toolbar') ||
                                   title.includes('barra');

            if (isBookmarksBar) {
                if (node.children) {
                    itemsToMerge.push(...mapChromeNodes(node.children));
                }
            } else {
                const mappedFolder = mapChromeNode(node);
                if (mappedFolder) {
                    itemsToMerge.push(mappedFolder);
                }
            }
        }

        if (itemsToMerge.length === 0) {
            showToast('No se encontraron marcadores válidos para sincronizar.');
            return;
        }

        const { addedCount } = mergeTileLists(tiles, itemsToMerge);

        if (addedCount > 0) {
            saveAndRender();
            renderEditor();
            showToast(`Sincronización completada: ${addedCount} nuevos accesos añadidos.`);
        } else {
            showToast('Todos tus marcadores ya están presentes en el tablero.');
        }
    } catch (error) {
        console.error('Error al sincronizar marcadores:', error);
        showToast('Hubo un error al intentar sincronizar los marcadores.', 'error');
    }
}

function mapChromeNode(node) {
    if (node.url) {
        if (isSafeWebUrl(node.url)) {
            return {
                type: 'link',
                name: node.title || 'Sin título',
                url: node.url,
                favorite: false,
                customIcon: null
            };
        }
        return null;
    }
    if (node.children) {
        const mappedChildren = mapChromeNodes(node.children);
        if (mappedChildren.length > 0) {
            return {
                type: 'folder',
                name: node.title || 'Nueva Carpeta',
                children: mappedChildren
            };
        }
    }
    return null;
}

function mapChromeNodes(nodes) {
    const result = [];
    for (const node of nodes) {
        const mapped = mapChromeNode(node);
        if (mapped) result.push(mapped);
    }
    return result;
}

function mergeTileLists(targetList, sourceList) {
    let addedCount = 0;

    for (const sourceItem of sourceList) {
        if (sourceItem.type === 'link') {
            const exists = targetList.some(item => (item.type === 'link' || item.type === 'enlace') && item.url === sourceItem.url);
            if (!exists) {
                targetList.push(sourceItem);
                addedCount++;
            }
        } else if (sourceItem.type === 'folder') {
            const existingFolder = targetList.find(item => item.type === 'folder' && item.name === sourceItem.name);
            if (existingFolder) {
                if (!existingFolder.children) existingFolder.children = [];
                const mergeResult = mergeTileLists(existingFolder.children, sourceItem.children || []);
                addedCount += mergeResult.addedCount;
            } else {
                targetList.push(sourceItem);
                const countLinksInFolder = (folder) => {
                    let count = 0;
                    for (const child of folder.children || []) {
                        if (child.type === 'link') count++;
                        else if (child.type === 'folder') count += countLinksInFolder(child);
                    }
                    return count;
                };
                addedCount += countLinksInFolder(sourceItem);
            }
        }
    }

    return { addedCount };
}

export function renderEditor() {
    const editor = $('#editor');
    if (!editor) return;
    const searchInput = $('#editorSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const findTilesRecursive = (items, parentPath = [], isRoot = true) => {
        let results = [];
        items.forEach((tile, index) => {
            if (tile.type === 'note') return;

            const currentPath = [...parentPath, tile.name];
            const isMatch = !searchTerm ||
                            (tile.name || '').toLowerCase().includes(searchTerm) ||
                            (tile.url && tile.url.toLowerCase().includes(searchTerm));

            if (isMatch) {
                results.push({
                    ...tile,
                    originalItemRef: tile,
                    rootIndex: isRoot ? index : -1,
                    displayPath: parentPath.length > 0 ? parentPath.join(' > ') : ''
                });
            }

            if (tile.type === 'folder' && tile.children) {
                if (!isMatch || searchTerm) {
                    results = results.concat(findTilesRecursive(tile.children, currentPath, false));
                }
            }
        });
        return results;
    };

    const tilesToRender = findTilesRecursive(tiles);
    const canReorder = !searchTerm;

    editor.textContent = '';
    tilesToRender.forEach((t) => {
        const row = document.createElement('div');
        row.className = 'row';
        const isRootDraggable = canReorder && t.rootIndex >= 0;
        row.draggable = isRootDraggable;
        if (isRootDraggable) {
            row.dataset.rootIndex = String(t.rootIndex);
        }

        const pathSpan = document.createElement('span');
        pathSpan.className = 'e-path';
        pathSpan.textContent = t.displayPath;

        const nameInput = document.createElement('input');
        nameInput.className = 'e-name';
        nameInput.value = t.name || '';

        const urlInput = document.createElement('input');
        urlInput.className = 'e-url';
        urlInput.value = t.url || '';
        if (t.type === 'folder') urlInput.disabled = true;

        const saveBtn = document.createElement('button');
        saveBtn.className = 'e-save btn';
        saveBtn.textContent = 'Guardar';
        saveBtn.addEventListener('click', () => handleEditorSave(t.originalItemRef, row));

        row.appendChild(pathSpan);
        row.appendChild(nameInput);
        row.appendChild(urlInput);
        row.appendChild(saveBtn);

        editor.appendChild(row);
    });
}

function handleEditorSave(originalItem, row) {
    const name = row.querySelector('.e-name').value.trim();
    const rawUrl = row.querySelector('.e-url').value.trim();

    if (!name) {
        showToast('El nombre no puede estar vacío.', 'error');
        return;
    }

    if (originalItem.type !== 'folder') {
        const normalizedUrl = normalizeWebUrl(rawUrl);
        if (!isSafeWebUrl(normalizedUrl)) {
            showToast('La URL debe comenzar con http:// o https://', 'error');
            return;
        }
        originalItem.url = normalizedUrl;
    }

    originalItem.name = name;
    saveAndRender();
}

function handleEditorDragStart(e) {
    const row = e.target.closest('.row');
    if (row && row.draggable && row.dataset.rootIndex !== undefined) {
        dragEditorRowSrcEl = row;
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
    } else {
        e.preventDefault();
    }
}

function handleEditorDragOver(e) {
    e.preventDefault();
    const targetRow = e.target.closest('.row');
    if (targetRow && targetRow !== dragEditorRowSrcEl && targetRow.dataset.rootIndex !== undefined) {
        $$('#editor .row').forEach(r => r.classList.remove('drag-over'));
        targetRow.classList.add('drag-over');
    }
}

function handleEditorDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.row');
    if ($('#editorSearchInput')?.value.trim()) return;

    if (dragEditorRowSrcEl && dropTarget && dragEditorRowSrcEl !== dropTarget &&
        dragEditorRowSrcEl.dataset.rootIndex !== undefined && dropTarget.dataset.rootIndex !== undefined) {
        const fromIndex = Number(dragEditorRowSrcEl.dataset.rootIndex);
        const toIndex = Number(dropTarget.dataset.rootIndex);
        if (Number.isInteger(fromIndex) && Number.isInteger(toIndex) && fromIndex !== toIndex) {
            const [item] = tiles.splice(fromIndex, 1);
            if (item) {
                tiles.splice(toIndex, 0, item);
                saveAndRender();
            }
        }
    }
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
}

function handleEditorDragEnd() {
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
    dragEditorRowSrcEl = null;
}
