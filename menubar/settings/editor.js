/**
 * Gestiona el panel "Gestionar Accesos" dentro de la configuración.
 * Se encarga de renderizar la lista de accesos y manejar su reordenamiento mediante drag-and-drop.
 */
import { $, $$ } from '../core/utils.js';
import { tiles, saveAndRender } from '../core/tiles.js';

let dragEditorRowSrcEl = null;

export function initEditor() {
    const editor = $('#editor');
    editor.addEventListener('click', handleEditorClick);
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
        alert('La API de marcadores no está disponible en este entorno.');
        return;
    }

    try {
        const bookmarkTreeNodes = await new Promise(resolve => chrome.bookmarks.getTree(resolve));
        const rootNode = bookmarkTreeNodes[0];
        if (!rootNode || !rootNode.children) {
            alert('No se encontraron marcadores válidos para sincronizar.');
            return;
        }

        const rootChildren = rootNode.children;
        const itemsToMerge = [];
        
        for (const node of rootChildren) {
            // Identificar la barra de marcadores (normalmente id: "1" o por texto alternativo)
            const isBookmarksBar = node.id === '1' || 
                                   node.title.toLowerCase().includes('bar') || 
                                   node.title.toLowerCase().includes('toolbar') ||
                                   node.title.toLowerCase().includes('barra');
            
            if (isBookmarksBar) {
                // Los hijos de la barra de marcadores se importan directamente en la raíz para acceso inmediato
                if (node.children) {
                    const mappedChildren = mapChromeNodes(node.children);
                    itemsToMerge.push(...mappedChildren);
                }
            } else {
                // Otras carpetas raíz se importan como carpetas normales en la raíz
                const mappedFolder = mapChromeNode(node);
                if (mappedFolder) {
                    itemsToMerge.push(mappedFolder);
                }
            }
        }

        if (itemsToMerge.length === 0) {
            alert('No se encontraron marcadores válidos para sincronizar.');
            return;
        }

        // Fusión profunda de marcadores en el array actual
        const { addedCount } = mergeTileLists(tiles, itemsToMerge);

        if (addedCount > 0) {
            saveAndRender();
            renderEditor();
            alert(`¡Sincronización completada! Se añadieron ${addedCount} nuevos accesos de tus marcadores manteniendo la estructura de carpetas.`);
        } else {
            alert('Todos tus marcadores ya están presentes en el tablero.');
        }
    } catch (error) {
        console.error('Error al sincronizar marcadores:', error);
        alert('Hubo un error al intentar sincronizar los marcadores.');
    }
}

// Mapea un nodo de marcadores del navegador a nuestra estructura de tiles
function mapChromeNode(node) {
    if (node.url) {
        // Ignorar URLs internas del navegador
        if (!node.url.startsWith('chrome://') && !node.url.startsWith('about:')) {
            return {
                type: 'link',
                name: node.title || 'Sin título',
                url: node.url,
                icon: ''
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

// Mapea una lista de nodos de marcadores
function mapChromeNodes(nodes) {
    const result = [];
    for (const node of nodes) {
        const mapped = mapChromeNode(node);
        if (mapped) {
            result.push(mapped);
        }
    }
    return result;
}

// Realiza una fusión profunda de tiles (enlaces y carpetas) evitando duplicados
function mergeTileLists(targetList, sourceList) {
    let addedCount = 0;
    
    for (const sourceItem of sourceList) {
        if (sourceItem.type === 'link') {
            // Comprobar si la URL ya existe en el nivel actual del targetList
            const exists = targetList.some(item => item.type === 'link' && item.url === sourceItem.url);
            if (!exists) {
                targetList.push(sourceItem);
                addedCount++;
            }
        } else if (sourceItem.type === 'folder') {
            // Comprobar si una carpeta con el mismo nombre ya existe en el nivel actual
            const existingFolder = targetList.find(item => item.type === 'folder' && item.name === sourceItem.name);
            if (existingFolder) {
                // Fusionar los hijos recursivamente
                if (!existingFolder.children) existingFolder.children = [];
                const mergeResult = mergeTileLists(existingFolder.children, sourceItem.children || []);
                addedCount += mergeResult.addedCount;
            } else {
                // La carpeta no existe en este nivel, se añade completa
                targetList.push(sourceItem);
                
                // Contar todos los enlaces contenidos en esta nueva carpeta
                function countLinksInFolder(folder) {
                    let count = 0;
                    for (const child of folder.children || []) {
                        if (child.type === 'link') {
                            count++;
                        } else if (child.type === 'folder') {
                            count += countLinksInFolder(child);
                        }
                    }
                    return count;
                }
                addedCount += countLinksInFolder(sourceItem);
            }
        }
    }
    
    return { addedCount };
}

export function renderEditor() {
    const editor = $('#editor');
    const searchInput = $('#editorSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Función recursiva para aplanar y buscar en todos los niveles
    const findTilesRecursive = (items, parentPath = []) => {
        let results = [];
        items.forEach((tile, index) => {
            const currentPath = [...parentPath, tile.name];
            const isMatch = !searchTerm || 
                            tile.name.toLowerCase().includes(searchTerm) || 
                            (tile.url && tile.url.toLowerCase().includes(searchTerm));

            if (isMatch) {
                results.push({
                    ...tile,
                    originalItemRef: tile, // Referencia directa al objeto original para poder guardarlo
                    displayPath: parentPath.length > 0 ? `${parentPath.join(' > ')}` : ''
                });
            }

            if (tile.type === 'folder' && tile.children) {
                // Si la carpeta misma no coincidió, aún buscamos dentro
                if (!isMatch) {
                    results = results.concat(findTilesRecursive(tile.children, currentPath));
                }
            }
        });
        return results;
    };

    const tilesToRender = findTilesRecursive(tiles);

    editor.textContent = ''; // Limpiar la lista actual
    tilesToRender.forEach((t) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.draggable = false; // Deshabilitamos el drag-and-drop en los resultados de búsqueda para evitar complejidad
        
        const pathSpan = document.createElement('span');
        pathSpan.className = 'e-path';
        pathSpan.textContent = t.displayPath;
        
        const nameInput = document.createElement('input');
        nameInput.className = 'e-name';
        nameInput.value = t.name;
        
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
    const url = row.querySelector('.e-url').value.trim();

    if (name) {
        originalItem.name = name;
        if (originalItem.type === 'link' && url) {
            originalItem.url = url;
        }
        saveAndRender();
    }
}

function handleEditorClick(e) {
    // La lógica de guardado ahora se maneja por el listener individual de cada botón.
}

function handleEditorDragStart(e) {
    if (e.target.classList.contains('row')) {
        dragEditorRowSrcEl = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }
}

function handleEditorDragOver(e) {
    e.preventDefault();
    const targetRow = e.target.closest('.row');
    if (targetRow && targetRow !== dragEditorRowSrcEl) {
        $$('#editor .row').forEach(r => r.classList.remove('drag-over'));
        targetRow.classList.add('drag-over');
    }
}

function handleEditorDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.row');
    // Solo permitir reordenar si no hay una búsqueda activa
    if ($('#editorSearchInput').value.trim()) return;

    if (dragEditorRowSrcEl && dropTarget && dragEditorRowSrcEl !== dropTarget) {
        // La lógica de reordenación necesita el índice real, que ahora no tenemos directamente en el elemento
        // Para simplificar, la reordenación solo funcionará cuando no se esté buscando.
        const fromIndex = Array.from(dragEditorRowSrcEl.parentNode.children).indexOf(dragEditorRowSrcEl);
        const toIndex = Array.from(dropTarget.parentNode.children).indexOf(dropTarget);
        const item = tiles.splice(fromIndex, 1)[0];
        tiles.splice(toIndex, 0, item);
        saveAndRender();
    }
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
}

function handleEditorDragEnd() {
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
    dragEditorRowSrcEl = null;
}