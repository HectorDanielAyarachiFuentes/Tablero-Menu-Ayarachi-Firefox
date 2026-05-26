/**
 * Gestiona las interacciones generales de la interfaz de usuario (UI).
 * Se encarga de abrir/cerrar paneles (configuración, notas), actualizar el reloj y el saludo,
 * y manejar los controles de apariencia de los paneles como color, opacidad y desenfoque.
 */
import { $, $$, saveAndSyncSetting, storageGet } from '../core/utils.js';
import { FolderManager } from '../core/carpetas.js';
import { renderTiles, saveAndRender, tiles, trash, setTiles, setTrash } from '../core/tiles.js';
import { closeModal } from './modal.js'; 
import { PREDEFINED_GREETINGS } from '../../utils/greetings-list.js';
import { FileSystem } from '../system/file-system.js';
import { initPanelSettings } from '../settings/settings-panels.js';
import { ensurePremiumThemesUI } from '../settings/themes-premium.js';
import { initDoodleSettings } from '../settings/doodles.js';

export function initUI() {
    updateClock();

    $('#openSettings').addEventListener('click', () => toggleSettings(true));
    $('#closeSettings').addEventListener('click', () => toggleSettings(false));
    $('#openNotes').addEventListener('click', () => toggleNotesPanel(true));
    $('#closeNotes').addEventListener('click', () => toggleNotesPanel(false));

    document.addEventListener('click', (e) => {
        if (e.target === $('#overlay')) {
            toggleSettings(false);
            closeModal();
            toggleNotesPanel(false);
        }
    });


    $('#backBtn').addEventListener('click', () => {
        if (FolderManager.goBack()) {
            renderTiles();
        }
    });

    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
    });

    $('#userName').addEventListener('input', (e) => {
        const name = e.target.value;
        renderGreeting(name);
        saveAndSyncSetting({ userName: name });
    });

    initPanelSettings();

    $('#manualSaveBtn').addEventListener('click', async () => {
        await FileSystem.saveDataToFile({ tiles, trash });
        showSaveStatus();
    });

    $('#emptyTrashBtn').addEventListener('click', () => {
        if (trash.length === 0) return;
        if (confirm('¿Estás seguro de que quieres vaciar la papelera? Todos los elementos se eliminarán permanentemente.')) {
            trash.length = 0; // Vacía el array
            saveAndRender();
        }
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
        pane.style.display = 'none'; // Ocultar para la animación
    });
    const btnToActivate = $(`.tab-btn[data-tab="${tabId}"]`);
    const paneToActivate = $(`#tab-${tabId}`);
    if (btnToActivate) btnToActivate.classList.add('active');
    if (paneToActivate) paneToActivate.style.display = 'block';
    setTimeout(() => paneToActivate?.classList.add('active'), 10); // Permitir que se aplique display:block
    
    // Si entramos en la pestaña de fondo, asegurar que los temas premium estén renderizados
    if (tabId === 'fondo') {
        ensurePremiumThemesUI();
    }

    // Si entramos en la pestaña de doodle, asegurar que la lista esté cargada
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
        // Es un ID de saludo específico
        const selectedGreeting = PREDEFINED_GREETINGS.find(g => g.id === preference);
        greetingText = selectedGreeting ? selectedGreeting.text : getRandomGreeting(period, PREDEFINED_GREETINGS).text;
    }

    const greetingEl = $('#header-greeting');
    
    // Verificación temprana para evitar saltos en el DOM
    const targetHtml = name ? `${greetingText}<strong>, ${name}</strong>` : greetingText;
    if (greetingEl.innerHTML === targetHtml) return;

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
  // Obtenemos la configuración del reloj desde el storage.
  const { use12HourFormat, showSeconds } = await storageGet(['use12HourFormat', 'showSeconds']);

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const secondsValue = String(now.getSeconds()).padStart(2, '0');
  let ampm = '';

  if (use12HourFormat) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12;
    hours = hours || 12; // La hora 0 debe ser 12
  }

  let timeString = use12HourFormat ? `${hours}:${minutes}` : `${String(hours).padStart(2, '0')}:${minutes}`;
  if (showSeconds) {
    timeString += `:${secondsValue}`;
  }
  timeString += ampm;

  $('#header-clock').textContent = timeString;
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(now);
  $('#date').textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  
  if (clockTimer) clearTimeout(clockTimer);
  // Optimización de rendimiento: Si no se muestran segundos, el reloj solo "despierta" cada minuto.
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
export function toggleSettings(show) {
    const settings = $('#settings');
    const isHidden = show === undefined ? settings.getAttribute('aria-hidden') === 'false' : !show;
    settings.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden && $('#notes-panel').getAttribute('aria-hidden') === 'true');
    document.body.classList.toggle('no-scroll', !isHidden);
    $('#openSettings').classList.toggle('active', !isHidden);
    if (!isHidden) toggleNotesPanel(false); // Close notes if opening settings
    updateMainBlur();
}

export function toggleNotesPanel(show) {
    const notesPanel = $('#notes-panel');
    const isHidden = show === undefined ? notesPanel.getAttribute('aria-hidden') === 'false' : !show;
    notesPanel.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden && $('#settings').getAttribute('aria-hidden') === 'true');
    document.body.classList.toggle('no-scroll', !isHidden);
    $('#openNotes').classList.toggle('active', !isHidden);
    if (!isHidden) toggleSettings(false); // Close settings if opening notes
    updateMainBlur();
}



function updateMainBlur() {
    $('.main').classList.toggle('blurred', !!($('#settings[aria-hidden="false"]') || $('#notes-panel[aria-hidden="false"]')));
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
 * Muestra un mensaje de error temporal en el panel de configuración.
 * @param {string} message El mensaje de error a mostrar.
 */
export function showSettingError(message) {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;

    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    saveStatus.textContent = message;
    saveStatus.classList.add('error');
    saveStatus.classList.add('visible');
    saveStatus.timeout = setTimeout(() => {
        saveStatus.classList.remove('visible');
        // La clase de error se limpia la próxima vez que se muestre un estado normal.
    }, 3000);
}

/**
 * Muestra un mensaje de error persistente relacionado con operaciones de archivo.
 * @param {string} message - El mensaje de error a mostrar.
 * @param {boolean} isPermissionError - Si es true, añade un botón para re-seleccionar el directorio.
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
    closeIcon.onclick = () => {
        saveStatus.style.opacity = '0';
        setTimeout(() => saveStatus.classList.remove('visible', 'error'), 300);
    };
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
