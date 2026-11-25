/**
 * Gestiona las interacciones generales de la interfaz de usuario (UI).
 * Se encarga de abrir/cerrar paneles (configuración, notas), actualizar el reloj y el saludo,
 * mostrar toasts/diálogos no bloqueantes y manejar atajos de teclado globales.
 */
import { $, $$, saveAndSyncSetting, storageGet } from '../core/utils.js';
import { FolderManager } from '../core/carpetas.js';
import { renderTiles, saveAndRender, tiles, trash } from '../core/tiles.js';
import { closeModal } from './modal.js';
import { hideContextMenu } from './context-menu.js';
import { PREDEFINED_GREETINGS } from '../../utils/greetings-list.js';
import { FileSystem } from '../system/file-system.js';
import { initPanelSettings } from '../settings/settings-panels.js';
import { ensurePremiumThemesUI } from '../settings/themes-premium.js';
import { initDoodleSettings } from '../settings/doodles.js';

let _ensureNotesLoaded = null;

/**
 * Registra un cargador diferido para inicializar Notas bajo demanda
 * si el usuario pulsa el botón antes de que termine la Fase 3.
 */
export function registerNotesLoader(loaderFn) {
    if (typeof loaderFn === 'function') _ensureNotesLoaded = loaderFn;
}

function isPanelOpen(selector) {
    const el = $(selector);
    return !!el && el.getAttribute('aria-hidden') === 'false';
}

export function initUI() {
    updateClock();

    $('#openSettings')?.addEventListener('click', () => toggleSettings(true));
    $('#closeSettings')?.addEventListener('click', () => toggleSettings(false));
    $('#openNotes')?.addEventListener('click', () => toggleNotesPanel(true));

    document.addEventListener('click', (e) => {
        if (e.target === $('#overlay')) {
            toggleSettings(false);
            closeModal();
            toggleNotesPanel(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const confirmOverlay = $('.tablero-confirm-overlay');
        if (confirmOverlay) {
            confirmOverlay.querySelector('.tablero-confirm-cancel')?.click();
            return;
        }
        if (isPanelOpen('#modal')) {
            closeModal();
            return;
        }
        const ctxMenu = $('#contextMenu');
        if (ctxMenu && !ctxMenu.hidden) {
            hideContextMenu();
            return;
        }
        if (isPanelOpen('#settings')) {
            toggleSettings(false);
            return;
        }
        if (isPanelOpen('#notes-panel')) {
            toggleNotesPanel(false);
        }
    });

    $('#backBtn')?.addEventListener('click', () => {
        if (FolderManager.goBack()) {
            renderTiles();
        }
    });

    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
    });

    $('#userName')?.addEventListener('input', (e) => {
        const name = e.target.value;
        renderGreeting(name);
        saveAndSyncSetting({ userName: name });
    });

    initPanelSettings();

    $('#manualSaveBtn')?.addEventListener('click', async () => {
        await FileSystem.saveDataToFile({ tiles, trash });
        showSaveStatus();
    });

    $('#emptyTrashBtn')?.addEventListener('click', async () => {
        if (trash.length === 0) return;
        const confirmed = await showConfirmDialog('¿Estás seguro de que quieres vaciar la papelera? Todos los elementos se eliminarán permanentemente.');
        if (confirmed) {
            trash.length = 0;
            saveAndRender();
        }
    });
}

/**
 * Muestra una notificación flotante no bloqueante (toast).
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('tablero-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'tablero-toast-container';
        container.className = 'tablero-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `tablero-toast tablero-toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

/**
 * Muestra un diálogo de confirmación integrado que reemplaza window.confirm().
 */
export function showConfirmDialog(message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar') {
    return new Promise((resolve) => {
        const existing = document.querySelector('.tablero-confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'tablero-confirm-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const card = document.createElement('div');
        card.className = 'tablero-confirm-card';

        const msgP = document.createElement('p');
        msgP.className = 'tablero-confirm-message';
        msgP.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'tablero-confirm-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn tablero-confirm-cancel';
        cancelBtn.textContent = cancelLabel;

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn primary tablero-confirm-ok';
        confirmBtn.textContent = confirmLabel;

        const finish = (result) => {
            overlay.classList.remove('is-open');
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        cancelBtn.addEventListener('click', () => finish(false));
        confirmBtn.addEventListener('click', () => finish(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) finish(false);
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        card.appendChild(msgP);
        card.appendChild(actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            confirmBtn.focus();
        });
    });
}

/**
 * Cambia a una pestaña específica en el panel de configuración.
 * @param {string} tabId - El ID de la pestaña a activar (ej. 'datos', 'general').
 */
export async function switchToTab(tabId) {
    const tabButtons = $$('.tab-btn');
    const tabPanes = $$('.tab-pane');
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
    });
    const btnToActivate = $(`.tab-btn[data-tab="${tabId}"]`);
    const paneToActivate = $(`#tab-${tabId}`);
    if (btnToActivate) btnToActivate.classList.add('active');
    if (paneToActivate) paneToActivate.style.display = 'block';
    setTimeout(() => paneToActivate?.classList.add('active'), 10);

    if (tabId === 'fondo') {
        ensurePremiumThemesUI();
    }

    if (tabId === 'doodle') {
        const { doodle } = await storageGet(['doodle']);
        initDoodleSettings(doodle || 'none');
    }
}

function getRandomGreeting(period, greetingsList) {
    const options = greetingsList.filter(g => g.period === period);
    return options[Math.floor(Math.random() * options.length)];
}

export async function renderGreeting(name) {
    const hour = new Date().getHours();
    let period;
    if (hour >= 5 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 20) period = 'afternoon';
    else period = 'night';

    const { greetingPreference, customGreetings } = await storageGet(['greetingPreference', 'customGreetings']);
    let greetingText;
    const preference = greetingPreference || 'random';

    if (preference === 'custom' && customGreetings && customGreetings.trim().length > 0) {
        const customList = customGreetings.split('\n').filter(line => line.trim() !== '');
        greetingText = customList[Math.floor(Math.random() * customList.length)];
    } else if (preference === 'random') {
        const randomGreeting = getRandomGreeting(period, PREDEFINED_GREETINGS);
        greetingText = randomGreeting.text;
    } else {
        const selectedGreeting = PREDEFINED_GREETINGS.find(g => g.id === preference);
        greetingText = selectedGreeting ? selectedGreeting.text : getRandomGreeting(period, PREDEFINED_GREETINGS).text;
    }

    const greetingEl = $('#header-greeting');
    if (!greetingEl) return;

    const currentText = greetingEl.textContent;
    const expectedText = name ? `${greetingText}, ${name}` : greetingText;
    if (currentText === expectedText) return;

    greetingEl.textContent = greetingText;
    if (name) {
        const strong = document.createElement('strong');
        strong.textContent = `, ${name}`;
        greetingEl.appendChild(strong);
    }
}

let clockTimer = null;
export async function updateClock() {
  const now = new Date();
  const { use12HourFormat, showSeconds } = await storageGet(['use12HourFormat', 'showSeconds']);

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const secondsValue = String(now.getSeconds()).padStart(2, '0');
  let ampm = '';

  if (use12HourFormat) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12;
    hours = hours || 12;
  }

  let timeString = use12HourFormat ? `${hours}:${minutes}` : `${String(hours).padStart(2, '0')}:${minutes}`;
  if (showSeconds) {
    timeString += `:${secondsValue}`;
  }
  timeString += ampm;

  const clockEl = $('#header-clock');
  if (clockEl) clockEl.textContent = timeString;

  const dateEl = $('#date');
  if (dateEl) {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(now);
    dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  if (clockTimer) clearTimeout(clockTimer);
  const delay = showSeconds ? 1000 : (60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
  clockTimer = setTimeout(updateClock, delay);
}

export function updateActiveThemeButton(theme) {
    $$('.theme').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

export function updateActiveGradientButton(gradient) {
    $$('.gradient-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gradientId === gradient);
    });
}

export function updateBgModeUI(isCustomBg, activeMode) {
    const displayModeContainer = $('#bgDisplayMode');
    if (displayModeContainer) {
        displayModeContainer.hidden = !isCustomBg;
    }
    $$('#bgModeSelector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === activeMode);
    });
}

function updateOverlayAndScrollState() {
    const anyPanelOpen = isPanelOpen('#settings') || isPanelOpen('#notes-panel') || isPanelOpen('#modal');
    $('#overlay')?.setAttribute('aria-hidden', String(!anyPanelOpen));
    document.body.classList.toggle('no-scroll', anyPanelOpen);
    updateMainBlur();
}

export function toggleSettings(show) {
    const settings = $('#settings');
    if (!settings) return;
    const isHidden = show === undefined ? settings.getAttribute('aria-hidden') === 'false' : !show;
    settings.setAttribute('aria-hidden', String(isHidden));
    $('#openSettings')?.classList.toggle('active', !isHidden);
    if (!isHidden && isPanelOpen('#notes-panel')) {
        toggleNotesPanel(false);
    }
    updateOverlayAndScrollState();
}

export async function toggleNotesPanel(show) {
    let notesPanel = $('#notes-panel');
    if (!notesPanel && show !== false && _ensureNotesLoaded) {
        await _ensureNotesLoaded();
        notesPanel = $('#notes-panel');
    }
    if (!notesPanel) {
        updateOverlayAndScrollState();
        return;
    }

    const isHidden = show === undefined ? notesPanel.getAttribute('aria-hidden') === 'false' : !show;
    notesPanel.setAttribute('aria-hidden', String(isHidden));
    $('#openNotes')?.classList.toggle('active', !isHidden);
    if (!isHidden && isPanelOpen('#settings')) {
        toggleSettings(false);
    }
    updateOverlayAndScrollState();
}

function updateMainBlur() {
    $('.main')?.classList.toggle('blurred', isPanelOpen('#settings') || isPanelOpen('#notes-panel'));
}

export function showSaveStatus() {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;

    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    saveStatus.textContent = 'Guardado!';
    saveStatus.classList.remove('error');
    saveStatus.classList.add('visible');
    saveStatus.timeout = setTimeout(() => {
        saveStatus.classList.remove('visible');
    }, 2000);
}

/**
 * Muestra un mensaje de error temporal en el panel de configuración y en toast si está cerrado.
 */
export function showSettingError(message) {
    const saveStatus = $('#saveStatus');
    if (saveStatus && isPanelOpen('#settings')) {
        if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
        saveStatus.textContent = message;
        saveStatus.classList.add('error');
        saveStatus.classList.add('visible');
        saveStatus.timeout = setTimeout(() => {
            saveStatus.classList.remove('visible');
        }, 3000);
    } else {
        showToast(message, 'error');
    }
}

/**
 * Muestra un mensaje de error persistente relacionado con operaciones de archivo.
 */
export function showFileError(message, isPermissionError = false) {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;

    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);

    saveStatus.textContent = '';
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    saveStatus.appendChild(msgSpan);

    if (isPermissionError) {
        const reselectBtn = document.createElement('button');
        reselectBtn.id = 'reselectDirFromError';
        reselectBtn.className = 'btn-link';
        reselectBtn.style.cssText = 'text-decoration: underline; background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: inherit; margin-left: 5px;';
        reselectBtn.textContent = 'Re-seleccionar carpeta';
        saveStatus.appendChild(reselectBtn);
    }

    const closeIcon = document.createElement('img');
    closeIcon.src = 'images/cerrar.svg';
    closeIcon.alt = 'Ícono de cerrar';
    closeIcon.style.cssText = 'width: 16px; height: 16px; cursor: pointer; vertical-align: middle; margin-left: 8px;';
    closeIcon.addEventListener('click', () => {
        saveStatus.style.opacity = '0';
        setTimeout(() => saveStatus.classList.remove('visible', 'error'), 300);
    });
    saveStatus.appendChild(closeIcon);

    saveStatus.classList.add('error');
    saveStatus.style.opacity = '1';
    saveStatus.classList.add('visible');
}

export async function updateDataTabUI() {
    const { autoSync } = await storageGet(['autoSync']);
    const dirPathEl = $('#dirPath');

    if (dirPathEl) {
        dirPathEl.textContent = 'Estado: ';
        const b = document.createElement('b');
        b.textContent = 'Sincronización Activa';
        dirPathEl.appendChild(b);
    }

    const autoSyncToggle = $('#autoSyncToggle');
    if (autoSyncToggle) {
        autoSyncToggle.disabled = false;
        autoSyncToggle.checked = autoSync || false;
    }

    const manualSaveBtn = $('#manualSaveBtn');
    if (manualSaveBtn) {
        manualSaveBtn.hidden = autoSync || false;
    }
}
