/**
 * Gestiona el modal para crear y editar accesos y notas.
 * Se encarga de abrir, cerrar, rellenar los datos y guardar los cambios del modal.
 */
import { $, $$, storageSet, storageGet, setHTML } from '../core/utils.js';
import { tiles, saveAndRender } from '../core/tiles.js';
import { FolderManager } from '../core/carpetas.js';
import { DOMPurify } from '../lib/lib.js';

let editingPath = null;
let debounceTimer;
const MAX_NOTE_LENGTH = 10000; // Límite de 10,000 caracteres para el contenido de las notas.

export function initModal() {
    $('#modalSave').addEventListener('click', handleModalSave);
    $('#modalCancel').addEventListener('click', () => closeModal());
    $('#closeModal')?.addEventListener('click', () => closeModal());
    $('#modalIconPreview').addEventListener('click', () => $('#modalIconFile').click());
    $('#addFolder')?.addEventListener('click', () => openModal(null, 'folder'));
    $('#modalIconFile').addEventListener('change', handleModalIconFileChange);
    $('#modalResetIcon').addEventListener('click', handleModalResetIcon);

    document.addEventListener('keydown', handleModalKeydown);

    // Listeners para la barra de herramientas del editor de texto enriquecido
    $$('.rich-editor-toolbar button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand(button.dataset.command, false, null);
        });
    });

    // Añadir listener para obtener el título de la página automáticamente
    const urlInput = $('#modalUrl');
    urlInput.addEventListener('paste', (e) => {
        setTimeout(() => handleUrlMetadata(e), 100);
    });
    urlInput.addEventListener('change', handleUrlMetadata);
    urlInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handleUrlMetadata({ target: urlInput }), 1000);
    });
}

function getTileByPath(pathArr) {
    if (!pathArr || pathArr.length === 0) return null;
    let current = tiles;
    for (let i = 0; i < pathArr.length - 1; i++) {
        current = current[pathArr[i]].children;
    }
    return current[pathArr[pathArr.length - 1]];
}

export function openModal(pathOrIndex = null, forceType = null) {
    if (Array.isArray(pathOrIndex)) {
        editingPath = pathOrIndex;
    } else if (pathOrIndex !== null) {
        editingPath = [pathOrIndex];
    } else {
        editingPath = null;
    }

    const modal = $('#modal');
    modal.dataset.editingIndex = editingPath ? editingPath.join(',') : 'null';

    $('#overlay').setAttribute('aria-hidden', 'false');
    const tile = getTileByPath(editingPath);
    const type = forceType || tile?.type || 'link';

    // Reset state
    $('#modalUrlGroup').hidden = true;
    $('#modalContentGroup').hidden = true;
    $('#modalName').placeholder = '';
    $('#modalUrl').placeholder = ' ';
    $('#modalContent').dataset.placeholder = ' ';
    $('#modalIconContainer').hidden = true;

    // Remove existing classes
    modal.classList.remove('modal-type-link', 'modal-type-folder', 'modal-type-note');
    modal.classList.add(`modal-type-${type}`);

    if (type === 'link') {
        $('#modalTitle').textContent = tile ? 'Editar Enlace' : 'Añadir Enlace';
        $('#modalUrlGroup').hidden = false;
        $('#modalIconContainer').hidden = false;
        if (tile) {
            $('#modalName').value = tile.name;
            $('#modalUrl').value = tile.url;
            updateIconPreview(tile.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`, !!tile.customIcon);
        } else {
            $('#modalName').value = '';
            $('#modalUrl').value = '';
            updateIconPreview('', false);
        }
    } else if (type === 'folder') {
        $('#modalTitle').textContent = tile ? 'Editar Carpeta' : 'Crear Carpeta';
        $('#modalName').value = tile ? tile.name : '';
    } else if (type === 'note') {
        $('#modalTitle').textContent = tile ? 'Editar Nota' : 'Crear Nota';
        $('#modalContentGroup').hidden = false;
        $('#modalName').placeholder = 'Título de la nota (opcional)';
        $('#modalName').value = tile ? tile.name : '';
        setHTML($('#modalContent'), tile ? (tile.content || '') : '');
    }

    setTimeout(() => {
        if (type === 'link' && !tile) $('#modalUrl').focus();
        else $('#modalName').focus();
    }, 50);
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.classList.add('is-open'), 10);
}

export function closeModal() {
    const modal = $('#modal');
    modal.classList.remove('is-open');
    $('#overlay').setAttribute('aria-hidden', 'true');
    editingPath = null;
    $('#modalIconFile').value = '';
    $('#modalPreviewImg').dataset.isCustom = 'false';
    setTimeout(() => { modal.setAttribute('aria-hidden', 'true'); }, 300);
}

function handleModalSave() {
    const name = $('#modalName').value.trim();
    const type = editingPath !== null ? getTileByPath(editingPath).type : 
                 (!$('#modalUrlGroup').hidden ? 'link' : 
                  !$('#modalContentGroup').hidden ? 'note' : 'folder');

    if (editingPath !== null) {
        const tileToEdit = getTileByPath(editingPath);
        if (tileToEdit.type === 'link') {
            const url = $('#modalUrl').value.trim();
            if (!url) { alert('Por favor, introduce una URL.'); return; }
            try { new URL(url); } catch (e) { alert('La URL introducida no es válida.'); return; }
            tileToEdit.name = name;
            tileToEdit.url = url;
            if ($('#modalPreviewImg').src.startsWith('data:image')) {
                tileToEdit.customIcon = $('#modalPreviewImg').src;
            } else if ($('#modalPreviewImg').hidden) {
                tileToEdit.customIcon = null;
            }
        } else if (tileToEdit.type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) { alert(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`); return; }
            tileToEdit.content = DOMPurify.sanitize(content);
            tileToEdit.name = name;
        } else if (tileToEdit.type === 'folder') {
            tileToEdit.name = name;
        }
    } else {
        if (type === 'link') {
            const url = $('#modalUrl').value.trim();
            if (!url) { alert('Por favor, introduce una URL.'); return; }
            try { new URL(url); } catch (e) { alert('La URL introducida no es válida.'); return; }
            const newLink = { type: 'link', name, url, favorite: false, customIcon: null };
            if ($('#modalPreviewImg').src.startsWith('data:image')) {
                newLink.customIcon = $('#modalPreviewImg').src;
            }
            const currentFolder = FolderManager.getTilesForCurrentView(tiles);
            currentFolder.unshift(newLink);
        } else if (type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) { alert(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`); return; }
            tiles.unshift({ type: 'note', name, content: DOMPurify.sanitize(content) });
        } else if (type === 'folder') {
            const newFolder = { type: 'folder', name, children: [] };
            const currentFolder = FolderManager.getTilesForCurrentView(tiles);
            currentFolder.unshift(newFolder);
        }
    }
    saveAndRender();
    closeModal();
}

function handleUrlMetadata(e) {
    const urlInput = e.target;
    const nameInput = $('#modalName');
    const url = urlInput.value.trim();

    if (nameInput.value.trim() !== '') return;

    try {
        const parsedUrl = new URL(url);
        let hostname = parsedUrl.hostname.replace(/^www\./, '');
        const domainParts = hostname.split('.');
        if (domainParts.length > 1) {
            nameInput.value = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
        }
        if (!$('#modalPreviewImg').dataset.isCustom) {
            updateIconPreview(`https://www.google.com/s2/favicons?sz=128&domain=${hostname}`, false);
        }
    } catch (error) { /* Ignorar errores de URL inválida mientras se escribe */ }
}

function handleModalIconFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => updateIconPreview(event.target.result, true);
        reader.readAsDataURL(file);
    }
}

function handleModalResetIcon() {
    const index = $('#modal').dataset.editingIndex;
    const url = $('#modalUrl').value;
    const tile = (index !== null && index !== 'null') ? tiles[index] : null;
    const finalUrl = url || tile?.url;

    if (finalUrl) {
        try {
            const newIconSrc = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(finalUrl).hostname}`;
            updateIconPreview(newIconSrc, false);
        } catch (e) {
            updateIconPreview('', false);
        }
    }
    if (tile) tile.customIcon = null;
}

function updateIconPreview(src, isCustom) {
    const previewImg = $('#modalPreviewImg');
    previewImg.src = src;
    previewImg.hidden = !src;
    previewImg.dataset.isCustom = isCustom;
    $('#modalIconPlaceholder').hidden = !!src;
    $('#modalResetIcon').hidden = !isCustom;
}

function handleModalKeydown(e) {
    if ($('#modal').getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Enter' && e.ctrlKey) { handleModalSave(); }
    else if (e.key === 'Tab') {
        const focusable = $$('#modal button, #modal input').filter(el => !el.hidden && !el.disabled);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}