/**
 * Sistema de Temas Premium
 * Gestiona temas completos que incluyen fondo, paneles y colores de texto
 * Incluye modo automático día/noche basado en la hora del sistema
 */
import { $, $$, saveAndSyncSetting, storageGet, setSVG } from '../core/utils.js';
import { updatePanelRgb } from './settings-panels.js';
// BackgroundManager ahora es global

let premiumThemes = [
    {
        "id": "cyberpunk",
        "name": "Cyberpunk 2077",
        "description": "Neones vibrantes sobre un abismo digital",
        "background": {
            "gradient": "linear-gradient(135deg, #050110 0%, #1a0033 50%, #050110 100%)"
        },
        "panel": {
            "bg": "#0e0a24",
            "bgRgb": "14, 10, 36",
            "opacity": 0.3,
            "blur": 25,
            "radius": 16,
            "shadowEnabled": false,
            "shadowColor": "rgba(255, 0, 110, 0.4)",
            "shadowBlur": 40
        },
        "colors": {
            "text": "#00f2fe",
            "textSecondary": "#ff006e",
            "accent": "#ff006e",
            "greeting": "#00f2fe",
            "name": "#ff006e",
            "clock": "#ffffff",
            "date": "#8338ec"
        },
        "fonts": {
            "main": "'Oswald', sans-serif",
            "secondary": "'Source Code Pro', monospace"
        }
    },
    {
        "id": "luxury-gold",
        "name": "Oro de 24 Kilates",
        "description": "El epítome del lujo y la exclusividad",
        "background": {
            "gradient": "radial-gradient(circle at center, #1c1c1c 0%, #000000 100%)"
        },
        "panel": {
            "bg": "#bf953f",
            "bgRgb": "191, 149, 63",
            "opacity": 0.1,
            "blur": 20,
            "radius": 12,
            "shadowEnabled": false,
            "shadowColor": "rgba(191, 149, 63, 0.3)",
            "shadowBlur": 35
        },
        "colors": {
            "text": "#fcf6ba",
            "textSecondary": "#b38728",
            "accent": "#bf953f",
            "greeting": "#ffffff",
            "name": "#bf953f",
            "clock": "#fcf6ba",
            "date": "#aa771c"
        },
        "fonts": {
            "main": "'Playfair Display', serif",
            "secondary": "'Lato', sans-serif"
        }
    },
    {
        "id": "tokyo-night",
        "name": "Tokio Nocturno",
        "description": "La energía eléctrica de Shinjuku",
        "background": {
            "gradient": "linear-gradient(165deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
        },
        "panel": {
            "bg": "#1e1e2f",
            "bgRgb": "30, 30, 47",
            "opacity": 0.4,
            "blur": 30,
            "radius": 20,
            "shadowEnabled": false,
            "shadowColor": "rgba(0, 245, 255, 0.2)",
            "shadowBlur": 40
        },
        "colors": {
            "text": "#00f5ff",
            "textSecondary": "#ff00ff",
            "accent": "#ff00ff",
            "greeting": "#00f5ff",
            "name": "#ff00ff",
            "clock": "#ffffff",
            "date": "#302b63"
        },
        "fonts": {
            "main": "'Oswald', sans-serif",
            "secondary": "'Source Code Pro', monospace"
        }
    },
    {
        "id": "neon-inferno",
        "name": "Infierno de Neón",
        "description": "Intensidad volcánica y calor digital",
        "background": {
            "gradient": "linear-gradient(135deg, #120000 0%, #450000 50%, #120000 100%)"
        },
        "panel": {
            "bg": "#ff0000",
            "bgRgb": "255, 0, 0",
            "opacity": 0.08,
            "blur": 20,
            "radius": 15,
            "shadowEnabled": false,
            "shadowColor": "rgba(255, 69, 0, 0.4)",
            "shadowBlur": 45
        },
        "colors": {
            "text": "#ff4500",
            "textSecondary": "#ffd700",
            "accent": "#ff0000",
            "greeting": "#ffffff",
            "name": "#ff0000",
            "clock": "#ff4500",
            "date": "#450000"
        },
        "fonts": {
            "main": "'Montserrat', sans-serif",
            "secondary": "'Roboto', sans-serif"
        }
    },
    {
        "id": "cloud-sea",
        "name": "Mar de Nubes",
        "description": "Paz etérea sobre el horizonte",
        "background": {
            "gradient": "linear-gradient(to top, #accbee 0%, #e7f0fd 100%)"
        },
        "panel": {
            "bg": "#ffffff",
            "bgRgb": "255, 255, 255",
            "opacity": 0.2,
            "blur": 40,
            "radius": 40,
            "shadowEnabled": false,
            "shadowColor": "rgba(0, 0, 0, 0.03)",
            "shadowBlur": 30
        },
        "colors": {
            "text": "#2c3e50",
            "textSecondary": "#34495e",
            "accent": "#3498db",
            "greeting": "#2c3e50",
            "name": "#3498db",
            "clock": "#2c3e50",
            "date": "#7f8c8d"
        },
        "fonts": {
            "main": "'Raleway', sans-serif",
            "secondary": "'Lato', sans-serif"
        }
    },
    {
        "id": "minimalist-light",
        "name": "Cuarzo Blanco",
        "description": "Elegancia pura con transparencias cristalinas",
        "background": {
            "gradient": "linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #dbe7ff 100%)"
        },
        "panel": {
            "bg": "#ffffff",
            "bgRgb": "255, 255, 255",
            "opacity": 0.6,
            "blur": 20,
            "radius": 20,
            "shadowEnabled": false,
            "shadowColor": "rgba(0, 0, 0, 0.05)",
            "shadowBlur": 20
        },
        "colors": {
            "text": "#1a1a1a",
            "textSecondary": "#555555",
            "accent": "#4facfe",
            "greeting": "#1a1a1a",
            "name": "#4facfe",
            "clock": "#1a1a1a",
            "date": "#666666"
        },
        "fonts": {
            "main": "'Playfair Display', serif",
            "secondary": "'Montserrat', sans-serif"
        }
    },
    {
        "id": "deep-space",
        "name": "Abismo Estelar",
        "description": "Negros profundos con aura galáctica",
        "background": {
            "gradient": "radial-gradient(circle at center, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
        },
        "panel": {
            "bg": "#000000",
            "bgRgb": "0, 0, 0",
            "opacity": 0.4,
            "blur": 30,
            "radius": 12,
            "shadowEnabled": false,
            "shadowColor": "rgba(131, 56, 236, 0.3)",
            "shadowBlur": 50
        },
        "colors": {
            "text": "#e0e0e0",
            "textSecondary": "#8338ec",
            "accent": "#3a86ff",
            "greeting": "#ffffff",
            "name": "#3a86ff",
            "clock": "#ffffff",
            "date": "#8338ec"
        },
        "fonts": {
            "main": "'Poppins', sans-serif",
            "secondary": "'Raleway', sans-serif"
        }
    },
    {
        "id": "silk-dawn",
        "name": "Amanecer de Seda",
        "description": "Suavidad pastel y calma visual",
        "background": {
            "gradient": "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)"
        },
        "panel": {
            "bg": "#ffffff",
            "bgRgb": "255, 255, 255",
            "opacity": 0.25,
            "blur": 15,
            "radius": 30,
            "shadowEnabled": false,
            "shadowColor": "rgba(251, 194, 235, 0.4)",
            "shadowBlur": 30
        },
        "colors": {
            "text": "#4a4e69",
            "textSecondary": "#9a8c98",
            "accent": "#fbc2eb",
            "greeting": "#4a4e69",
            "name": "#fbc2eb",
            "clock": "#4a4e69",
            "date": "#9a8c98"
        },
        "fonts": {
            "main": "'Montserrat', sans-serif",
            "secondary": "'Poppins', sans-serif"
        }
    },
    {
        "id": "emerald-forest",
        "name": "Bosque Esmeralda",
        "description": "Lujo orgánico y tonos naturales profundos",
        "background": {
            "gradient": "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)"
        },
        "panel": {
            "bg": "#064e3b",
            "bgRgb": "6, 78, 59",
            "opacity": 0.2,
            "blur": 25,
            "radius": 18,
            "shadowEnabled": false,
            "shadowColor": "rgba(52, 211, 153, 0.2)",
            "shadowBlur": 35
        },
        "colors": {
            "text": "#ecfdf5",
            "textSecondary": "#6ee7b7",
            "accent": "#34d399",
            "greeting": "#ecfdf5",
            "name": "#34d399",
            "clock": "#ffffff",
            "date": "#6ee7b7"
        },
        "fonts": {
            "main": "'Playfair Display', serif",
            "secondary": "'Lato', sans-serif"
        }
    },
    {
        "id": "esmeralda-v2",
        "name": "Esmeralda Premium v2",
        "description": "Un oasis de elegancia y calma en verde esmeralda profundo",
        "background": {
            "gradient": "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)"
        },
        "panel": {
            "bg": "#064e3b",
            "bgRgb": "6, 78, 59",
            "opacity": 0.4,
            "blur": 15,
            "radius": 24,
            "shadowEnabled": false,
            "shadowColor": "rgba(5, 150, 105, 0.3)",
            "shadowBlur": 30
        },
        "colors": {
            "text": "#ecfdf5",
            "textSecondary": "rgba(236, 253, 245, 0.7)",
            "accent": "#10b981",
            "greeting": "#d1fae5",
            "name": "#ffffff",
            "clock": "#ffffff",
            "date": "#10b981"
        }
    },
    {
        "id": "arctic",
        "name": "Ártico Cristal",
        "description": "Minimalismo puro en blanco y azul glacial",
        "background": {
            "gradient": "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)"
        },
        "panel": {
            "bg": "#ffffff",
            "bgRgb": "255, 255, 255",
            "opacity": 0.6,
            "blur": 30,
            "radius": 32,
            "shadowEnabled": false,
            "shadowColor": "rgba(148, 163, 184, 0.2)",
            "shadowBlur": 25
        },
        "colors": {
            "text": "#1e293b",
            "textSecondary": "#64748b",
            "accent": "#3b82f6",
            "greeting": "#334155",
            "name": "#0f172a",
            "clock": "#0f172a",
            "date": "#3b82f6"
        }
    },
    {
        "id": "sunset",
        "name": "Atardecer Vibrante",
        "description": "Energía pura con degradados cálidos y púrpuras",
        "background": {
            "gradient": "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #f43f5e 100%)"
        },
        "panel": {
            "bg": "#2e1065",
            "bgRgb": "46, 16, 101",
            "opacity": 0.4,
            "blur": 15,
            "radius": 18,
            "shadowEnabled": false,
            "shadowColor": "rgba(244, 63, 94, 0.3)",
            "shadowBlur": 35
        },
        "colors": {
            "text": "#fff1f2",
            "textSecondary": "rgba(255, 241, 242, 0.7)",
            "accent": "#fb7185",
            "greeting": "#ffe4e6",
            "name": "#ffffff",
            "clock": "#ffffff",
            "date": "#fb7185"
        }
    },
    {
        "id": "forest",
        "name": "Bosque de Niebla",
        "description": "Elegancia mate en tonos musgo y grises piedra",
        "background": {
            "gradient": "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)"
        },
        "panel": {
            "bg": "#1c1917",
            "bgRgb": "28, 25, 23",
            "opacity": 0.7,
            "blur": 10,
            "radius": 12,
            "shadowEnabled": false,
            "shadowColor": "rgba(168, 162, 158, 0.1)",
            "shadowBlur": 20
        },
        "colors": {
            "text": "#f5f5f4",
            "textSecondary": "#a8a29e",
            "accent": "#78716c",
            "greeting": "#d6d3d1",
            "name": "#fafaf9",
            "clock": "#ffffff",
            "date": "#a8a29e"
        }
    }
];

let autoModeEnabled = false;
let autoModeInterval = null;
let themesRendered = false;

export async function initPremiumThemes() {
    // Configurar modo automático (lógica pura)
    await loadPremiumThemeSettings();
}

export function ensurePremiumThemesUI() {
    if (themesRendered) return;
    renderPremiumThemes();
    setupAutoModeControls();
    syncUIWithSettings();
    themesRendered = true;
}

async function syncUIWithSettings() {
    const settings = await storageGet(['activePremiumTheme', 'autoThemeMode', 'dayThemeId', 'nightThemeId']);
    if (settings.autoThemeMode) {
        const autoToggle = $('#autoThemeToggle');
        const autoSettings = $('#autoThemeSettings');
        if (autoToggle) autoToggle.checked = true;
        if (autoSettings) autoSettings.hidden = false;
    }
    if (settings.dayThemeId) $('#dayThemeSelect').value = settings.dayThemeId;
    if (settings.nightThemeId) $('#nightThemeSelect').value = settings.nightThemeId;
    if (settings.activePremiumTheme) updateActivePremiumTheme(settings.activePremiumTheme);
}

function renderPremiumThemes() {
    const container = document.createElement('div');
    container.className = 'premium-themes-section';
    
    const fieldHeader = document.createElement('div');
    fieldHeader.className = 'field';
    const labelHeader = document.createElement('label');
    labelHeader.textContent = 'Temas Premium';
    const pHeader = document.createElement('p');
    pHeader.className = 'field-description';
    pHeader.textContent = 'Temas completos que transforman toda la interfaz';
    fieldHeader.appendChild(labelHeader);
    fieldHeader.appendChild(pHeader);
    container.appendChild(fieldHeader);
    
    const themeList = document.createElement('div');
    themeList.id = 'premium-theme-list';
    themeList.className = 'premium-theme-list';
    container.appendChild(themeList);
    
    const autoModeField = document.createElement('div');
    autoModeField.className = 'field field-toggle';
    autoModeField.style.marginTop = '16px';
    const autoModeLabel = document.createElement('label');
    autoModeLabel.setAttribute('for', 'autoThemeToggle');
    autoModeLabel.textContent = 'Modo Automático Día/Noche';
    const switchContainer = document.createElement('div');
    switchContainer.className = 'switch-container';
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    const switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    switchInput.id = 'autoThemeToggle';
    const switchSlider = document.createElement('span');
    switchSlider.className = 'slider round';
    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(switchSlider);
    switchContainer.appendChild(switchLabel);
    autoModeField.appendChild(autoModeLabel);
    autoModeField.appendChild(switchContainer);
    container.appendChild(autoModeField);

    const autoThemeSettings = document.createElement('div');
    autoThemeSettings.id = 'autoThemeSettings';
    autoThemeSettings.className = 'auto-theme-settings';
    autoThemeSettings.hidden = true;
    
    const createField = (labelStr, selectId) => {
        const f = document.createElement('div');
        f.className = 'field';
        const l = document.createElement('label');
        l.setAttribute('for', selectId);
        l.textContent = labelStr;
        const s = document.createElement('select');
        s.id = selectId;
        f.appendChild(l);
        f.appendChild(s);
        return f;
    };
    
    autoThemeSettings.appendChild(createField('Tema de Día (6:00 - 18:00)', 'dayThemeSelect'));
    autoThemeSettings.appendChild(createField('Tema de Noche (18:00 - 6:00)', 'nightThemeSelect'));
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'auto-mode-status';
    
    const svgIconContainer = document.createElement('span');
    setSVG(svgIconContainer, '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>');
    statusDiv.appendChild(svgIconContainer);
    
    const statusSpan = document.createElement('span');
    statusSpan.id = 'autoModeStatusText';
    statusSpan.textContent = 'Modo automático activado';
    statusDiv.appendChild(statusSpan);
    autoThemeSettings.appendChild(statusDiv);
    container.appendChild(autoThemeSettings);

    const gradientSection = $('#subtab-degradados');
    if (gradientSection) {
        gradientSection.insertBefore(container, gradientSection.firstChild);
    }

    premiumThemes.forEach(theme => {
        const btn = document.createElement('button');
        btn.className = 'premium-theme-btn';
        btn.dataset.themeId = theme.id;
        
        const preview = document.createElement('div');
        preview.className = 'premium-theme-preview';
        preview.style.background = theme.background.gradient;
        
        const panelPreview = document.createElement('div');
        panelPreview.className = 'premium-theme-panel-preview';
        panelPreview.style.backgroundColor = `rgba(${theme.panel.bgRgb}, ${theme.panel.opacity})`;
        panelPreview.style.backdropFilter = `blur(${theme.panel.blur}px)`;
        panelPreview.style.borderRadius = `${theme.panel.radius}px`;
        panelPreview.style.padding = '8px';
        
        const textPreview = document.createElement('div');
        textPreview.className = 'premium-theme-text';
        textPreview.style.color = theme.colors.text;
        textPreview.textContent = 'Aa';
        
        panelPreview.appendChild(textPreview);
        preview.appendChild(panelPreview);
        
        const info = document.createElement('div');
        info.className = 'premium-theme-info';
        const name = document.createElement('span');
        name.className = 'premium-theme-name';
        name.textContent = theme.name;
        const desc = document.createElement('span');
        desc.className = 'premium-theme-desc';
        desc.textContent = theme.description;
        
        info.appendChild(name);
        info.appendChild(desc);
        
        btn.appendChild(preview);
        btn.appendChild(info);
        
        btn.addEventListener('click', () => applyPremiumTheme(theme.id));
        themeList.appendChild(btn);
    });

    const daySelect = $('#dayThemeSelect');
    const nightSelect = $('#nightThemeSelect');

    premiumThemes.forEach(theme => {
        const optionDay = document.createElement('option');
        optionDay.value = theme.id;
        optionDay.textContent = theme.name;
        daySelect.appendChild(optionDay);

        const optionNight = document.createElement('option');
        optionNight.value = theme.id;
        optionNight.textContent = theme.name;
        nightSelect.appendChild(optionNight);
    });
}

function setupAutoModeControls() {
    const autoToggle = $('#autoThemeToggle');
    const autoSettings = $('#autoThemeSettings');
    const daySelect = $('#dayThemeSelect');
    const nightSelect = $('#nightThemeSelect');

    autoToggle.addEventListener('change', async (e) => {
        autoModeEnabled = e.target.checked;
        autoSettings.hidden = !autoModeEnabled;
        await saveAndSyncSetting({ autoThemeMode: autoModeEnabled });
        if (autoModeEnabled) startAutoMode();
        else stopAutoMode();
    });

    daySelect.addEventListener('change', async (e) => {
        await saveAndSyncSetting({ dayThemeId: e.target.value });
        if (autoModeEnabled && isDayTime()) applyPremiumTheme(e.target.value);
    });

    nightSelect.addEventListener('change', async (e) => {
        await saveAndSyncSetting({ nightThemeId: e.target.value });
        if (autoModeEnabled && !isDayTime()) applyPremiumTheme(e.target.value);
    });
}

export async function applyPremiumTheme(themeId, skipSave = false) {
    const theme = premiumThemes.find(t => t.id === themeId);
    if (!theme) return;

    // Aplicación centralizada a través del BackgroundManager
    BackgroundManager.apply({
        activePremiumTheme: themeId,
        premiumThemeData: theme,
        ...theme.background,
        ...theme.colors,
        ...theme.fonts
    });

    updateThemeControls(theme);
    updateActivePremiumTheme(themeId);

    if (!skipSave) {
        await saveAndSyncSetting({
            activePremiumTheme: themeId,
            premiumThemeData: theme,
            gradient: theme.background.gradient,
            bgType: 'premium',
            syncFirefoxTheme: false,
            // Guardamos los valores individuales para que el usuario pueda "editarlos" y que persistan
            panelBg: theme.panel.bg,
            panelOpacity: theme.panel.opacity,
            panelBlur: theme.panel.blur,
            panelRadius: theme.panel.radius,
            panelTextColor: theme.colors.text,
            panelTextSecondaryColor: theme.colors.textSecondary,
            greetingColor: theme.colors.greeting,
            nameColor: theme.colors.name,
            clockColor: theme.colors.clock,
            dateColor: theme.colors.date,
            greetingFont: theme.fonts ? theme.fonts.main : undefined,
            dateFont: theme.fonts ? theme.fonts.secondary : undefined
            // Eliminamos doodle: 'none' para permitir persistencia si el usuario añade uno después
        });
        localStorage.setItem('lastPremiumGradient', theme.background.gradient);
        const syncToggle = $('#syncFirefoxThemeToggle');
        if (syncToggle) syncToggle.checked = false;
    }
}

function updateThemeControls(theme) {
    const panelColor = $('#panelColor');
    const panelOpacity = $('#panelOpacity');
    const panelBlur = $('#panelBlur');
    const panelRadius = $('#panelRadius');
    const panelTextColor = $('#panelTextColor');
    const panelTextSecondaryColor = $('#panelTextSecondaryColor');

    if (panelColor) panelColor.value = theme.panel.bg;
    if (panelOpacity) panelOpacity.value = theme.panel.opacity;
    if (panelBlur) panelBlur.value = theme.panel.blur;
    if (panelRadius) panelRadius.value = theme.panel.radius;
    if (panelTextColor) panelTextColor.value = theme.colors.text;
    if (panelTextSecondaryColor) panelTextSecondaryColor.value = theme.colors.textSecondary;

    const opacityValue = $('#opacityValue');
    const blurValue = $('#blurValue');
    const radiusValue = $('#radiusValue');

    if (opacityValue) opacityValue.textContent = `${Math.round(theme.panel.opacity * 100)}%`;
    if (blurValue) blurValue.textContent = `${theme.panel.blur}px`;
    if (radiusValue) radiusValue.textContent = `${theme.panel.radius}px`;

    const greetingColor = $('#greetingColor');
    const nameColor = $('#nameColor');
    const clockColor = $('#clockColor');
    const dateColor = $('#dateColor');

    if (greetingColor) greetingColor.value = theme.colors.greeting;
    if (nameColor) nameColor.value = theme.colors.name;
    if (clockColor) clockColor.value = theme.colors.clock;
    if (dateColor) dateColor.value = theme.colors.date;
}

function updateActivePremiumTheme(themeId) {
    $$('.premium-theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeId === themeId);
    });
}

function isDayTime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
}

function startAutoMode() {
    applyAutoTheme();
    autoModeInterval = setInterval(() => {
        applyAutoTheme();
    }, 60000);
    updateAutoModeStatus();
}

function stopAutoMode() {
    if (autoModeInterval) {
        clearInterval(autoModeInterval);
        autoModeInterval = null;
    }
}

async function applyAutoTheme() {
    const settings = await storageGet(['dayThemeId', 'nightThemeId']);
    const isDay = isDayTime();
    const themeId = isDay ? settings.dayThemeId : settings.nightThemeId;
    if (themeId) applyPremiumTheme(themeId, true);
    updateAutoModeStatus();
}

function updateAutoModeStatus() {
    const statusText = $('#autoModeStatusText');
    if (!statusText) return;
    const isDay = isDayTime();
    const hour = new Date().getHours();
    const nextChange = isDay ? 18 : 6;
    const hoursUntilChange = isDay ? (nextChange - hour) : (nextChange + 24 - hour) % 24;
    statusText.textContent = `Modo ${isDay ? 'día' : 'noche'} activo • Cambia en ${hoursUntilChange}h`;
}

async function loadPremiumThemeSettings() {
    const settings = await storageGet(['activePremiumTheme', 'autoThemeMode', 'dayThemeId', 'nightThemeId']);
    autoModeEnabled = settings.autoThemeMode || false;
    const autoToggle = $('#autoThemeToggle');
    const autoSettings = $('#autoThemeSettings');
    if (autoToggle) autoToggle.checked = autoModeEnabled;
    if (autoSettings) autoSettings.hidden = !autoModeEnabled;
    const daySelect = $('#dayThemeSelect');
    const nightSelect = $('#nightThemeSelect');
    if (settings.dayThemeId && daySelect) daySelect.value = settings.dayThemeId;
    if (settings.nightThemeId && nightSelect) nightSelect.value = settings.nightThemeId;
    if (autoModeEnabled && (settings.dayThemeId || settings.nightThemeId)) startAutoMode();
    else if (settings.activePremiumTheme) applyPremiumTheme(settings.activePremiumTheme, true);
}

window.addEventListener('beforeunload', () => {
    stopAutoMode();
});
