/**
 * Gestiona toda la lógica del panel de configuración.
 * Incluye fondos (IndexedDB, URLs, degradados y modo aleatorio), temas, colores,
 * tipografía, importación/exportación de respaldos y sincronización con tema de Firefox.
 */
import { $, $$, storageGet, storageSet, saveAndSyncSetting, isSafeWebUrl, toHexColor } from '../core/utils.js';
import { get as idbGet, set as idbSet, del as idbDel } from '../lib/idb-keyval.js';
import { showSaveStatus, updateDataTabUI, renderGreeting, updateBgModeUI, showToast } from '../components/ui.js';
import { updateSliderValueSpans } from './settings-panels.js';
import { tiles, setTiles, setTrash, saveAndRender, renderTiles } from '../core/tiles.js';
import { renderNotes } from '../../notas/notas.js';
import { renderTrash } from '../components/trash.js';
import { GRADIENTS } from '../../utils/gradients.js';
import { PREDEFINED_GREETINGS } from '../../utils/greetings-list.js';
import { STORAGE_KEYS } from '../core/config.js';

let appState = {};
let importInput;

/**
 * Extrae el color promedio de una imagen Data URL en un canvas 1x1 para pre-pintado Zero-Flash.
 */
function extractAverageColor(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch (err) {
                resolve('#050505');
            }
        };
        img.onerror = () => resolve('#050505');
        img.src = dataUrl;
    });
}

export function initSettings(initialState) {
    appState = initialState;

    $('#bgFile')?.addEventListener('change', handleBgFileChange);
    $('#bgUrl')?.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && (isSafeWebUrl(val) || val.startsWith('data:image/') || val.startsWith('blob:'))) {
            const bgLayer = $('#bg-layer');
            if (bgLayer) {
                bgLayer.style.setProperty('background', `url("${val}")`, 'important');
                bgLayer.style.opacity = '1';
            }
        }
    });
    $('#bgUrl')?.addEventListener('change', async (e) => {
        const url = e.target.value.trim();
        if (!url) return;
        if (!isSafeWebUrl(url) && !url.startsWith('data:image/')) {
            showToast('Introduce una URL de imagen válida (http/https).', 'error');
            return;
        }
        await idbDel('custom_bg_data').catch(() => {});
        const { bgDisplayMode: currentMode } = await storageGet(['bgDisplayMode']);
        const mode = currentMode || 'cover';
        saveAndSyncSetting({
            bgUrl: url,
            bgData: null,
            hasCustomBgData: false,
            gradient: null,
            doodle: 'none',
            bgDisplayMode: mode,
            activePremiumTheme: null,
            syncFirefoxTheme: false
        }, () => {
            updateBgModeUI(true, mode);
            window.dispatchEvent(new CustomEvent('background-changed'));
            const syncToggle = $('#syncFirefoxThemeToggle');
            if (syncToggle) syncToggle.checked = false;
        });
    });

    $$('#bgModeSelector button').forEach(btn => {
        btn.addEventListener('click', handleBgModeChange);
    });
    updateBgModeUI(initialState.isCustomBg, initialState.bgDisplayMode || 'cover');

    if ($('#randomBgToggle')) {
        $('#randomBgToggle').checked = initialState.randomBg || false;
        $('#randomBgToggle').addEventListener('change', (e) => {
            saveAndSyncSetting({ randomBg: e.target.checked }, () => {
                window.dispatchEvent(new CustomEvent('background-changed'));
            });
        });
    }

    if ($('#syncFirefoxThemeToggle')) {
        $('#syncFirefoxThemeToggle').checked = initialState.syncFirefoxTheme || false;
        $('#syncFirefoxThemeToggle').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const updateObj = { syncFirefoxTheme: isChecked };
            if (isChecked) {
                updateObj.doodle = 'none';
                updateObj.gradient = null;
                updateObj.bgUrl = null;
                updateObj.bgData = null;
                updateObj.hasCustomBgData = false;
                updateObj.activePremiumTheme = null;
                idbDel('custom_bg_data').catch(() => {});
            }
            saveAndSyncSetting(updateObj, () => {
                updateBgModeUI(false, initialState.bgDisplayMode || 'cover');
                window.dispatchEvent(new CustomEvent('background-changed'));
                if (isChecked) {
                    $$('.gradient-btn.active').forEach(el => el.classList.remove('active'));
                    $$('.doodle-item.active').forEach(el => el.classList.remove('active'));

                    const preview = $('#doodle-preview');
                    if (preview) {
                        preview.textContent = '';
                        const span = document.createElement('span');
                        span.className = 'placeholder-text';
                        span.textContent = 'Selecciona un doodle para verlo aquí';
                        preview.appendChild(span);
                    }
                }
            });
        });
    }

    $$('#tab-fondo .sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToBackgroundSubTab(btn.dataset.subtab));
    });

    $$('#tab-general .sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToGeneralSubTab(btn.dataset.subtab));
    });

    $$('#tab-paneles .sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToPanelSubTab(btn.dataset.subtab));
    });

    populateGreetingSelect();
    storageGet(['use12HourFormat', 'showSeconds', 'greetingPreference', 'customGreetings', 'userName', 'weatherCity']).then(settings => {
        if ($('#clockFormatToggle')) $('#clockFormatToggle').checked = settings.use12HourFormat ?? false;
        if ($('#showSecondsToggle')) $('#showSecondsToggle').checked = settings.showSeconds ?? false;
        if ($('#greetingSelect')) $('#greetingSelect').value = settings.greetingPreference || 'random';
        if ($('#customGreetingsInput')) $('#customGreetingsInput').value = settings.customGreetings || '';
        if ($('#customGreetingsContainer')) $('#customGreetingsContainer').hidden = $('#greetingSelect').value !== 'custom';

        if ($('#userName')) $('#userName').value = settings.userName || '';
        if ($('#weatherCity')) $('#weatherCity').value = settings.weatherCity || '';
    });

    $('#clockFormatToggle')?.addEventListener('change', e => {
        saveAndSyncSetting({ use12HourFormat: e.target.checked });
    });

    $('#showSecondsToggle')?.addEventListener('change', e => {
        saveAndSyncSetting({ showSeconds: e.target.checked });
    });

    $('#greetingSelect')?.addEventListener('change', e => {
        const preference = e.target.value;
        $('#customGreetingsContainer').hidden = (preference !== 'custom');
        saveAndSyncSetting({ greetingPreference: preference }, () => {
            renderGreeting($('#userName').value);
        });
    });

    $('#customGreetingsInput')?.addEventListener('input', e => {
        saveAndSyncSetting({ customGreetings: e.target.value }, () => {
            if ($('#greetingSelect').value === 'custom') renderGreeting($('#userName').value);
        });
    });

    const uiToggles = {
        showSearchToggle: { selector: '.search-section', key: 'showSearch' },
        showWeatherToggle: { selector: '#weather', key: 'showWeather' },
        showDateToggle: { selector: '#date', key: 'showDate' }
    };

    Object.entries(uiToggles).forEach(([toggleId, { selector, key }]) => {
        const toggle = $(`#${toggleId}`);
        const element = $(selector);
        if (!toggle || !element) return;
        storageGet([key]).then(settings => { toggle.checked = settings[key] ?? true; });
        toggle.addEventListener('change', (e) => {
            saveAndSyncSetting({ [key]: e.target.checked }, () => { element.hidden = !e.target.checked; });
        });
    });

    const loadAnimToggle = $('#enableLoadAnimationsToggle');
    if (loadAnimToggle) {
        storageGet(['enableLoadAnimations']).then(settings => {
            const enableLoadAnimations = settings.enableLoadAnimations ?? false;
            loadAnimToggle.checked = enableLoadAnimations;
            if (enableLoadAnimations) {
                document.body.classList.add('with-load-animations');
            }
        });

        loadAnimToggle.addEventListener('change', (e) => {
            const enableLoadAnimations = e.target.checked;
            saveAndSyncSetting({ enableLoadAnimations }, () => {
                document.body.classList.toggle('with-load-animations', enableLoadAnimations);
            });
        });
    }

    updateDataTabUI();

    if ($('#autoSyncToggle')) {
        $('#autoSyncToggle').checked = initialState.autoSync || false;
        $('#autoSyncToggle').addEventListener('change', (e) => {
            storageSet({ autoSync: e.target.checked }).then(() => {
                showSaveStatus();
                updateDataTabUI();
            });
        });
    }

    $('#importJsonBtn')?.addEventListener('click', () => importInput.click());
    $('#exportJsonBtn')?.addEventListener('click', exportData);

    if (!importInput) {
        importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json, .html';
        importInput.style.display = 'none';
        importInput.addEventListener('change', handleImport);
        document.body.appendChild(importInput);
    }

    const textColors = {
        greetingColor: { cssVar: '--greeting-color' },
        nameColor: { cssVar: '--name-color' },
        clockColor: { cssVar: '--clock-color' },
        dateColor: { cssVar: '--date-color' }
    };

    storageGet(Object.keys(textColors)).then(settings => {
        Object.entries(textColors).forEach(([key, { cssVar }]) => {
            const color = settings[key] || '#FFFFFF';
            const inputEl = $(`#${key}`);
            if (inputEl) inputEl.value = toHexColor(color, '#ffffff');
            document.documentElement.style.setProperty(cssVar, color);
        });
    });

    Object.entries(textColors).forEach(([key, { cssVar }]) => {
        $(`#${key}`)?.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty(cssVar, color);
            saveAndSyncSetting({ [key]: color });
        });
    });

    $('#applyMasterTextColor')?.addEventListener('click', () => {
        const masterColor = $('#masterTextColor').value;
        const settingsToSave = {};
        Object.entries(textColors).forEach(([key, { cssVar }]) => {
            const inputEl = $(`#${key}`);
            if (inputEl) inputEl.value = masterColor;
            document.documentElement.style.setProperty(cssVar, masterColor);
            settingsToSave[key] = masterColor;
        });
        saveAndSyncSetting(settingsToSave);
    });

    const textFonts = {
        greetingFont: { cssVar: '--greeting-font' },
        dateFont: { cssVar: '--date-font' }
    };

    storageGet(Object.keys(textFonts)).then(settings => {
        Object.entries(textFonts).forEach(([key, { cssVar }]) => {
            const font = settings[key] || '\'Poppins\', sans-serif';
            const selectEl = $(`#${key}`);
            if (selectEl) selectEl.value = font;
            document.documentElement.style.setProperty(cssVar, font);
        });
    });

    Object.entries(textFonts).forEach(([key, { cssVar }]) => {
        $(`#${key}`)?.addEventListener('change', (e) => {
            const font = e.target.value;
            document.documentElement.style.setProperty(cssVar, font);
            saveAndSyncSetting({ [key]: font });
        });
    });
}

function switchToBackgroundSubTab(subTabId) {
    $$('#tab-fondo .sub-tab-pane').forEach(pane => pane.classList.remove('active'));
    $$('#tab-fondo .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    $(`#subtab-${subTabId}`)?.classList.add('active');
    $(`.sub-tab-btn[data-subtab="${subTabId}"]`)?.classList.add('active');
}

function switchToGeneralSubTab(subTabId) {
    $$('#tab-general .sub-tab-pane').forEach(pane => pane.classList.remove('active'));
    $$('#tab-general .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    $(`#subtab-${subTabId}`)?.classList.add('active');
    $(`#tab-general .sub-tab-btn[data-subtab="${subTabId}"]`)?.classList.add('active');
}

function switchToPanelSubTab(subTabId) {
    $$('#tab-paneles .sub-tab-pane').forEach(pane => pane.classList.remove('active'));
    $$('#tab-paneles .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    $(`#tab-paneles #subtab-${subTabId}`)?.classList.add('active');
    $(`#tab-paneles .sub-tab-btn[data-subtab="${subTabId}"]`)?.classList.add('active');
}

function populateGreetingSelect() {
    const select = $('#greetingSelect');
    if (!select) return;
    const optgroupMorning = document.createElement('optgroup');
    optgroupMorning.label = 'Mañana';
    const optgroupAfternoon = document.createElement('optgroup');
    optgroupAfternoon.label = 'Tarde';
    const optgroupNight = document.createElement('optgroup');
    optgroupNight.label = 'Noche';

    PREDEFINED_GREETINGS.forEach(g => {
        const option = new Option(g.text, g.id);
        if (g.period === 'morning') optgroupMorning.appendChild(option);
        else if (g.period === 'afternoon') optgroupAfternoon.appendChild(option);
        else optgroupNight.appendChild(option);
    });
    select.append(optgroupMorning, optgroupAfternoon, optgroupNight);
}

export async function loadGradients(activeGradient) {
    const gradientListEl = $('#gradient-list');
    if (!gradientListEl) return;

    gradientListEl.textContent = '';
    GRADIENTS.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'gradient-btn';
        btn.style.setProperty('--gradient-bg-preview', g.gradient);
        btn.title = g.name.trim();
        btn.dataset.gradientId = g.id;
        btn.dataset.type = 'gradient';
        if (g.id === activeGradient) btn.classList.add('active');
        btn.addEventListener('click', handleBackgroundChange);
        gradientListEl.appendChild(btn);
    });
}

function handleBgFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (appState.currentBackgroundValue && appState.currentBackgroundValue.startsWith('blob:')) {
        URL.revokeObjectURL(appState.currentBackgroundValue);
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const dataUrl = event.target.result;
        const avgColor = await extractAverageColor(dataUrl);
        await idbSet('custom_bg_data', dataUrl);

        const { bgDisplayMode } = await storageGet(['bgDisplayMode']);
        const mode = bgDisplayMode || 'cover';

        saveAndSyncSetting({
            hasCustomBgData: true,
            bgData: null,
            bgUrl: null,
            bgColor: avgColor,
            gradient: null,
            doodle: 'none',
            bgDisplayMode: mode,
            activePremiumTheme: null,
            syncFirefoxTheme: false
        }, () => {
            updateBgModeUI(true, mode);
            window.dispatchEvent(new CustomEvent('background-changed'));
            if ($('#bgUrl')) $('#bgUrl').value = '';
            const syncToggle = $('#syncFirefoxThemeToggle');
            if (syncToggle) syncToggle.checked = false;
        });
    };
    reader.readAsDataURL(file);
}

function handleBgModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    saveAndSyncSetting({ bgDisplayMode: mode }, () => {
        window.dispatchEvent(new CustomEvent('background-changed'));
        updateBgModeUI(true, mode);
    });
}

async function handleBackgroundChange(e) {
    const gradientId = e.currentTarget.dataset.gradientId;
    await idbDel('custom_bg_data').catch(() => {});
    $$('.gradient-btn.active').forEach(el => el.classList.remove('active'));
    e.currentTarget.classList.add('active');

    saveAndSyncSetting({
        gradient: gradientId,
        bgUrl: null,
        bgData: null,
        hasCustomBgData: false,
        doodle: 'none',
        activePremiumTheme: null,
        syncFirefoxTheme: false
    }, () => {
        updateBgModeUI(false, appState.bgDisplayMode || 'cover');
        window.dispatchEvent(new CustomEvent('background-changed'));
        const syncToggle = $('#syncFirefoxThemeToggle');
        if (syncToggle) syncToggle.checked = false;
    });
    appState.currentGradient = gradientId;
    appState.currentBackgroundValue = null;
}

async function exportData() {
    const allData = await storageGet(STORAGE_KEYS);
    if (allData.hasCustomBgData) {
        const customBg = await idbGet('custom_bg_data').catch(() => null);
        if (customBg) allData.bgData = customBg;
    }
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tablero-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = event.target.result;
            let data;

            if (file.name.endsWith('.html') || file.type === 'text/html') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const links = doc.querySelectorAll('a');
                data = [];
                links.forEach(link => {
                    const url = link.getAttribute('href');
                    if (isSafeWebUrl(url)) {
                        data.push({
                            type: 'link',
                            name: link.textContent.trim() || url,
                            url,
                            favorite: false,
                            customIcon: link.getAttribute('icon') || null
                        });
                    }
                });
            } else {
                data = JSON.parse(content);
            }

            if (Array.isArray(data)) {
                setTiles([...data, ...tiles]);
                saveAndRender();
                showToast(`${data.length} marcadores importados al tablero.`);
                return;
            }

            if (data && typeof data === 'object') {
                if (data.bgData) {
                    await idbSet('custom_bg_data', data.bgData);
                    data.hasCustomBgData = true;
                    data.bgData = null;
                }
                await storageSet(data);
                if (Array.isArray(data.tiles)) setTiles(data.tiles);
                if (Array.isArray(data.trash)) setTrash(data.trash);
                renderTiles();
                renderTrash();
                renderNotes();
                if (data.userName !== undefined && $('#userName')) {
                    $('#userName').value = data.userName;
                    renderGreeting(data.userName);
                }
                if (data.panelOpacity !== undefined && $('#panelOpacity')) {
                    $('#panelOpacity').value = data.panelOpacity;
                    document.documentElement.style.setProperty('--panel-opacity', data.panelOpacity);
                    updateSliderValueSpans();
                }
                if (data.panelBlur !== undefined && $('#panelBlur')) {
                    $('#panelBlur').value = data.panelBlur;
                    document.documentElement.style.setProperty('--panel-blur', `${data.panelBlur}px`);
                    updateSliderValueSpans();
                }
                window.dispatchEvent(new CustomEvent('background-changed'));
                showSaveStatus();
                showToast('Datos importados correctamente.');
            }
        } catch (err) {
            showToast('Error al importar el archivo: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
