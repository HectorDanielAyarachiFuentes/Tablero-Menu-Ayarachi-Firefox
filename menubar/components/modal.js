/**
 * Gestiona el modal para crear y editar accesos, carpetas y notas.
 * Se encarga de abrir, cerrar, validar URLs, rellenar los datos y guardar cambios.
 */
import { $, $$, setHTML, isSafeWebUrl, normalizeWebUrl } from '../core/utils.js';
import { tiles, saveAndRender } from '../core/tiles.js';
import { FolderManager } from '../core/carpetas.js';
import { DOMPurify } from '../lib/lib.js';
import { showToast } from './ui.js';

let editingPath = null;
let debounceTimer;
const MAX_NOTE_LENGTH = 10000;

export function initModal() {
    $('#modalSave')?.addEventListener('click', handleModalSave);
    $('#modalCancel')?.addEventListener('click', () => closeModal());
    $('#closeModal')?.addEventListener('click', () => closeModal());
    $('#modalIconPreview')?.addEventListener('click', () => $('#modalIconFile')?.click());
    $('#modalIconPreview')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            $('#modalIconFile')?.click();
        }
    });
    $('#addFolder')?.addEventListener('click', () => openModal(null, 'folder'));
    $('#modalIconFile')?.addEventListener('change', handleModalIconFileChange);
    $('#modalResetIcon')?.addEventListener('click', handleModalResetIcon);

    document.addEventListener('keydown', handleModalKeydown);

    $$('.rich-editor-toolbar button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand(button.dataset.command, false, null);
        });
    });

    const urlInput = $('#modalUrl');
    if (urlInput) {
        urlInput.addEventListener('paste', (e) => {
            setTimeout(() => handleUrlMetadata(e), 100);
        });
        urlInput.addEventListener('change', handleUrlMetadata);
        urlInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => handleUrlMetadata({ target: urlInput }), 1000);
        });
    }
}

function getTileByPath(pathArr) {
    if (!pathArr || pathArr.length === 0) return null;
    let current = tiles;
    for (let i = 0; i < pathArr.length - 1; i++) {
        current = current[pathArr[i]]?.children;
        if (!current) return null;
    }
    return current[pathArr[pathArr.length - 1]] || null;
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
    if (!modal) return;
    modal.dataset.editingIndex = editingPath ? editingPath.join(',') : 'null';

    $('#overlay')?.setAttribute('aria-hidden', 'false');
    const tile = getTileByPath(editingPath);
    const type = forceType || (tile?.type === 'enlace' ? 'link' : tile?.type) || 'link';

    $('#modalUrlGroup').hidden = true;
    $('#modalContentGroup').hidden = true;
    $('#modalName').placeholder = '';
    $('#modalUrl').placeholder = ' ';
    $('#modalContent').dataset.placeholder = ' ';
    $('#modalIconContainer').hidden = true;

    modal.classList.remove('modal-type-link', 'modal-type-folder', 'modal-type-note');
    modal.classList.add(`modal-type-${type}`);

    if (type === 'link') {
        $('#modalTitle').textContent = tile ? 'Editar Enlace' : 'Añadir Enlace';
        $('#modalUrlGroup').hidden = false;
        $('#modalIconContainer').hidden = false;
        if (tile) {
            $('#modalName').value = tile.name || '';
            $('#modalUrl').value = tile.url || '';
            let faviconSrc = '';
            if (tile.customIcon) {
                faviconSrc = tile.customIcon;
            } else if (isSafeWebUrl(tile.url)) {
                faviconSrc = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`;
            }
            updateIconPreview(faviconSrc, !!tile.customIcon);
        } else {
            $('#modalName').value = '';
            $('#modalUrl').value = '';
            updateIconPreview('', false);
        }
    } else if (type === 'folder') {
        $('#modalTitle').textContent = tile ? 'Editar Carpeta' : 'Crear Carpeta';
        $('#modalName').value = tile ? (tile.name || '') : '';
    } else if (type === 'note') {
        $('#modalTitle').textContent = tile ? 'Editar Nota' : 'Crear Nota';
        $('#modalContentGroup').hidden = false;
        $('#modalName').placeholder = 'Título de la nota (opcional)';
        $('#modalName').value = tile ? (tile.name || '') : '';
        setHTML($('#modalContent'), tile ? DOMPurify.sanitize(tile.content || '') : '');
    }

    setTimeout(() => {
        if (type === 'link' && !tile) $('#modalUrl')?.focus();
        else $('#modalName')?.focus();
    }, 50);
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.classList.add('is-open'), 10);
}

export function closeModal() {
    const modal = $('#modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    const settingsOpen = $('#settings')?.getAttribute('aria-hidden') === 'false';
    const notesOpen = $('#notes-panel')?.getAttribute('aria-hidden') === 'false';
    if (!settingsOpen && !notesOpen) {
        $('#overlay')?.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
    }
    editingPath = null;
    const iconFile = $('#modalIconFile');
    if (iconFile) iconFile.value = '';
    const previewImg = $('#modalPreviewImg');
    if (previewImg) previewImg.dataset.isCustom = 'false';
    setTimeout(() => { modal.setAttribute('aria-hidden', 'true'); }, 300);
}

function handleModalSave() {
    const name = $('#modalName').value.trim();
    const existingTile = editingPath !== null ? getTileByPath(editingPath) : null;
    const type = existingTile
        ? (existingTile.type === 'enlace' ? 'link' : existingTile.type)
        : (!$('#modalUrlGroup').hidden ? 'link' : !$('#modalContentGroup').hidden ? 'note' : 'folder');

    if (existingTile) {
        if (type === 'link') {
            const url = normalizeWebUrl($('#modalUrl').value);
            if (!url) { showToast('Por favor, introduce una URL.', 'error'); return; }
            if (!isSafeWebUrl(url)) { showToast('La URL debe comenzar con http:// o https://', 'error'); return; }
            existingTile.type = 'link';
            existingTile.name = name || new URL(url).hostname.replace(/^www\./, '');
            existingTile.url = url;
            const previewImg = $('#modalPreviewImg');
            if (previewImg.dataset.isCustom === 'true' && previewImg.src.startsWith('data:image')) {
                existingTile.customIcon = previewImg.src;
            } else if (previewImg.dataset.isCustom === 'false') {
                existingTile.customIcon = null;
            }
        } else if (type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) {
                showToast(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`, 'error');
                return;
            }
            existingTile.content = DOMPurify.sanitize(content);
            existingTile.name = name;
        } else if (type === 'folder') {
            existingTile.name = name || 'Carpeta';
        }
    } else {
        if (type === 'link') {
            const url = normalizeWebUrl($('#modalUrl').value);
            if (!url) { showToast('Por favor, introduce una URL.', 'error'); return; }
            if (!isSafeWebUrl(url)) { showToast('La URL debe comenzar con http:// o https://', 'error'); return; }
            const newLink = {
                type: 'link',
                name: name || new URL(url).hostname.replace(/^www\./, ''),
                url,
                favorite: false,
                customIcon: null
            };
            const previewImg = $('#modalPreviewImg');
            if (previewImg.dataset.isCustom === 'true' && previewImg.src.startsWith('data:image')) {
                newLink.customIcon = previewImg.src;
            }
            const currentFolder = FolderManager.getTilesForCurrentView(tiles);
            currentFolder.unshift(newLink);
        } else if (type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) {
                showToast(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`, 'error');
                return;
            }
            tiles.unshift({ type: 'note', name, content: DOMPurify.sanitize(content) });
        } else if (type === 'folder') {
            const newFolder = { type: 'folder', name: name || 'Nueva Carpeta', children: [] };
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
    const url = normalizeWebUrl(urlInput.value);

    if (!isSafeWebUrl(url)) return;

    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.replace(/^www\./, '');
        if (nameInput.value.trim() === '') {
            const domainParts = hostname.split('.');
            if (domainParts.length > 0 && domainParts[0]) {
                nameInput.value = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
            }
        }
        if ($('#modalPreviewImg').dataset.isCustom !== 'true') {
            updateIconPreview(`https://www.google.com/s2/favicons?sz=128&domain=${parsedUrl.hostname}`, false);
        }
    } catch (error) { /* Ignorar URLs incompletas mientras escribe */ }
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
    const tile = getTileByPath(editingPath);
    const rawUrl = $('#modalUrl').value || tile?.url;
    const finalUrl = normalizeWebUrl(rawUrl);

    if (isSafeWebUrl(finalUrl)) {
        try {
            const newIconSrc = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(finalUrl).hostname}`;
            updateIconPreview(newIconSrc, false);
        } catch (e) {
            updateIconPreview('', false);
        }
    } else {
        updateIconPreview('', false);
    }
    if (tile) tile.customIcon = null;
}

function updateIconPreview(src, isCustom) {
    const previewImg = $('#modalPreviewImg');
    if (!previewImg) return;
    previewImg.src = src;
    previewImg.hidden = !src;
    previewImg.dataset.isCustom = String(!!isCustom);
    $('#modalIconPlaceholder').hidden = !!src;
    $('#modalResetIcon').hidden = !isCustom;
}

function handleModalKeydown(e) {
    if ($('#modal')?.getAttribute('aria-hidden') !== 'false') return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
    }
    if (e.key === 'Enter' && e.ctrlKey) {
        handleModalSave();
        return;
    }
    if (e.key === 'Tab') {
        const focusable = $$('#modal button, #modal input, #modal select, #modal textarea, #modal [contenteditable="true"]')
            .filter(el => !el.hidden && !el.disabled && el.offsetParent !== null);
        if (focusable.length === 0) return;
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
