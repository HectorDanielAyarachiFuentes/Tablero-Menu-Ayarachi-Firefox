/**
 * Background Manager - El cerebro visual del tablero.
 * Centraliza la aplicación de fondos (IndexedDB, URLs, degradados, tema de Firefox y doodles),
 * modos de visualización (cover/contain/stretch/center), color de acento y caché Zero-Flash.
 */
(function () {
    const IDB_DB_NAME = 'keyval-store';
    const IDB_STORE_NAME = 'keyval';

    function readIdbValue(key) {
        return new Promise((resolve) => {
            try {
                const req = indexedDB.open(IDB_DB_NAME);
                req.onupgradeneeded = () => {
                    if (!req.result.objectStoreNames.contains(IDB_STORE_NAME)) {
                        req.result.createObjectStore(IDB_STORE_NAME);
                    }
                };
                req.onsuccess = () => {
                    try {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
                            db.close();
                            return resolve(null);
                        }
                        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
                        const getReq = tx.objectStore(IDB_STORE_NAME).get(key);
                        getReq.onsuccess = () => { db.close(); resolve(getReq.result || null); };
                        getReq.onerror = () => { db.close(); resolve(null); };
                    } catch (err) {
                        resolve(null);
                    }
                };
                req.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    }

    function parseRgb(color, fallback = [168, 85, 247]) {
        try {
            if (!color) return fallback;
            const hex = String(color).trim();
            if (hex.startsWith('#')) {
                if (hex.length === 4) {
                    return [1, 2, 3].map(i => parseInt(hex[i] + hex[i], 16));
                }
                const match = hex.substring(1).match(/.{2}/g);
                if (match && match.length >= 3) {
                    return match.slice(0, 3).map(x => parseInt(x, 16));
                }
            } else if (hex.includes('rgb')) {
                const match = hex.match(/\d+/g);
                if (match && match.length >= 3) {
                    return match.slice(0, 3).map(Number);
                }
            }
        } catch (e) {}
        return fallback;
    }

    function getBackgroundSizeRules(mode) {
        switch (mode) {
            case 'contain':
                return { size: 'contain', repeat: 'no-repeat', position: 'center' };
            case 'stretch':
                return { size: '100% 100%', repeat: 'no-repeat', position: 'center' };
            case 'center':
                return { size: 'auto', repeat: 'no-repeat', position: 'center' };
            case 'cover':
            default:
                return { size: 'cover', repeat: 'no-repeat', position: 'center' };
        }
    }

    const BackgroundManager = {
        lastAppliedBg: null,
        lastDisplayMode: 'cover',
        _sessionRandomGradient: null,

        /**
         * Aplica de forma integral un conjunto de ajustes visuales.
         */
        async apply(settings, forceAsyncFetch = false) {
            if (!settings) return;

            const root = document.documentElement.style;
            const body = document.body;

            // 1. DETERMINAR COLORES Y TEMA
            const isPremium = settings.activePremiumTheme && settings.premiumThemeData;
            const theme = isPremium ? settings.premiumThemeData : null;
            const isDoodle = settings.doodle && settings.doodle !== 'none';

            const panelBg = settings.panelBg || (theme && theme.panel ? theme.panel.bg : '#064e3b');
            const accentColor = settings.accentColor || (theme && theme.colors ? theme.colors.accent : '#34d399');
            const textColor = settings.panelTextColor || (theme && theme.colors ? theme.colors.text : '#ecfdf5');

            root.setProperty('--panel-bg', panelBg);
            root.setProperty('--accent-color', accentColor);
            root.setProperty('--accent-color-rgb', parseRgb(accentColor, [52, 211, 153]).join(', '));
            root.setProperty('--panel-text-color', textColor);
            root.setProperty('--panel-text-secondary-color', settings.panelTextSecondaryColor || (theme && theme.colors ? theme.colors.textSecondary : '#6ee7b7'));

            root.setProperty('--greeting-color', settings.greetingColor || (theme && theme.colors ? theme.colors.greeting : '#ecfdf5'));
            root.setProperty('--name-color', settings.nameColor || (theme && theme.colors ? theme.colors.name : '#34d399'));
            root.setProperty('--clock-color', settings.clockColor || (theme && theme.colors ? theme.colors.clock : '#ffffff'));
            root.setProperty('--date-color', settings.dateColor || (theme && theme.colors ? theme.colors.date : '#6ee7b7'));

            root.setProperty('--greeting-font', settings.greetingFont || (theme && theme.fonts ? theme.fonts.main : "'Playfair Display', serif"));
            root.setProperty('--date-font', settings.dateFont || (theme && theme.fonts ? theme.fonts.secondary : "'Lato', sans-serif"));

            root.setProperty('--panel-opacity', settings.panelOpacity ?? (theme && theme.panel ? theme.panel.opacity : 0.2));
            root.setProperty('--panel-blur', `${settings.panelBlur ?? (theme && theme.panel ? theme.panel.blur : 25)}px`);
            root.setProperty('--panel-radius', `${settings.panelRadius ?? (theme && theme.panel ? theme.panel.radius : 18)}px`);

            this.updatePanelRgb(panelBg);

            // Visibilidad de secciones
            const searchSec = document.querySelector('.search-section');
            if (searchSec) searchSec.hidden = !(settings.showSearch ?? true);
            const weatherEl = document.getElementById('weather');
            if (weatherEl) weatherEl.hidden = !(settings.showWeather ?? true);
            const dateEl = document.getElementById('date');
            if (dateEl) dateEl.hidden = !(settings.showDate ?? true);

            // 2. DETERMINAR FONDO Y MODO DE VISUALIZACIÓN
            const displayMode = settings.bgDisplayMode || 'cover';
            const lastAppliedBg = localStorage.getItem('last_bg');
            let finalBg = '#050505';
            let fallbackColor = settings.bgColor || '#050505';

            // Obtener imagen personalizada desde IndexedDB si existe
            let customBgData = settings.bgData || null;
            if (!customBgData && settings.hasCustomBgData) {
                customBgData = await readIdbValue('custom_bg_data');
            }

            if (isDoodle) {
                finalBg = 'transparent';
                fallbackColor = settings.doodleColor || (theme && theme.panel ? theme.panel.bg : '#050505');
            } else if (settings.syncFirefoxTheme) {
                let cachedBg = localStorage.getItem('firefox_theme_bg') || lastAppliedBg;
                let cachedColor = localStorage.getItem('firefox_theme_color') || '#050505';

                if (forceAsyncFetch) {
                    try {
                        const response = await this.fetchFirefoxThemeHelper();
                        if (response && response.success && response.theme) {
                            const themeInfo = response.theme;
                            const tc = themeInfo.colors || {};
                            const bgVal = tc.ntp_background || tc.toolbar || tc.frame || tc.background || '#050505';
                            const solidColor = Array.isArray(bgVal)
                                ? (bgVal.length === 4 ? `rgba(${bgVal.join(',')})` : `rgb(${bgVal.join(',')})`)
                                : bgVal;

                            let themeImg = null;
                            if (themeInfo.images) {
                                themeImg = themeInfo.images.theme_frame || themeInfo.images.headerURL;
                                if (!themeImg && themeInfo.images.additional_backgrounds?.length > 0) {
                                    themeImg = themeInfo.images.additional_backgrounds[0];
                                }
                            }

                            cachedBg = themeImg ? `url("${themeImg}") center / cover no-repeat, ${solidColor}` : solidColor;
                            cachedColor = solidColor;

                            localStorage.setItem('firefox_theme_bg', cachedBg);
                            localStorage.setItem('firefox_theme_color', cachedColor);
                            if (cachedBg && cachedBg !== 'transparent') {
                                localStorage.setItem('last_bg', cachedBg);
                            }
                            localStorage.setItem('last_bg_color', cachedColor);
                        }
                    } catch (e) {
                        console.warn('Error fetching Firefox theme in force mode:', e);
                    }
                }

                finalBg = cachedBg || '#050505';
                fallbackColor = cachedColor;

                if (!forceAsyncFetch) {
                    this.syncLatestFirefoxTheme(settings);
                }
            } else if (isPremium && theme && theme.background && theme.background.gradient) {
                finalBg = theme.background.gradient;
                fallbackColor = (theme.panel && theme.panel.bg) ? theme.panel.bg : '#050505';
            } else if (customBgData || settings.bgUrl) {
                const imgSource = customBgData || settings.bgUrl;
                finalBg = `url("${imgSource}")`;
                fallbackColor = settings.bgColor || '#050505';
            } else {
                let gradId = settings.gradient || 'aurora-mist';

                // Si "Degradado aleatorio en cada pestaña" está activado, elegimos uno por sesión
                if (settings.randomBg && Array.isArray(window.GRADIENTS) && window.GRADIENTS.length > 0) {
                    if (!this._sessionRandomGradient || forceAsyncFetch) {
                        const pool = window.GRADIENTS.length > 1
                            ? window.GRADIENTS.filter(g => g.id !== gradId)
                            : window.GRADIENTS;
                        this._sessionRandomGradient = pool[Math.floor(Math.random() * pool.length)];
                    }
                    if (this._sessionRandomGradient) {
                        finalBg = this._sessionRandomGradient.gradient;
                    }
                } else {
                    this._sessionRandomGradient = null;
                    const gradObj = window.GRADIENTS ? window.GRADIENTS.find(g => g.id === gradId) : null;
                    if (gradObj) {
                        finalBg = gradObj.gradient;
                    } else if (String(gradId).includes('gradient')) {
                        finalBg = gradId;
                    } else {
                        const cachedBg = localStorage.getItem('last_bg');
                        if (cachedBg && cachedBg.includes('gradient')) {
                            finalBg = cachedBg;
                        } else {
                            finalBg = 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)';
                        }
                    }
                }

                const match = finalBg.match(/#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)/);
                if (match) fallbackColor = match[0];
            }

            const hasChanged = this.initialLoadDone
                ? (this.normalizeBg(finalBg) !== this.normalizeBg(this.lastAppliedBg || lastAppliedBg) || displayMode !== this.lastDisplayMode)
                : false;
            this.initialLoadDone = true;

            if (isDoodle) {
                this.lastAppliedBg = finalBg;
                this.lastDisplayMode = displayMode;
                root.setProperty('background', 'transparent', 'important');
                if (body) body.style.setProperty('background', 'transparent', 'important');
                const bgLayer = document.getElementById('bg-layer');
                if (bgLayer) bgLayer.style.opacity = '0';
            } else {
                this.lastAppliedBg = finalBg;
                this.lastDisplayMode = displayMode;
                this.applyBackground(finalBg, hasChanged, displayMode);
            }

            this.updateCache(settings, finalBg, fallbackColor, accentColor, displayMode);
        },

        /**
         * Aplica el fondo y maneja la transición y el modo de visualización.
         */
        applyBackground(bg, animate, displayMode = 'cover') {
            const bgLayer = document.getElementById('bg-layer');
            const body = document.body;
            const sizeRules = getBackgroundSizeRules(displayMode);

            if (this.isAnimating && this.normalizeBg(bg) === this.normalizeBg(this.lastAppliedBg) && displayMode === this.lastDisplayMode && !animate) {
                return;
            }

            if (bgLayer) {
                if (animate) {
                    this.isAnimating = true;
                    bgLayer.style.transition = 'opacity 0.25s ease-out';
                    bgLayer.style.setProperty('background', bg, 'important');
                    bgLayer.style.setProperty('background-size', sizeRules.size, 'important');
                    bgLayer.style.setProperty('background-repeat', sizeRules.repeat, 'important');
                    bgLayer.style.setProperty('background-attachment', 'fixed', 'important');
                    bgLayer.style.setProperty('background-position', sizeRules.position, 'important');
                    bgLayer.style.opacity = '1';
                    bgLayer.style.filter = 'none';

                    setTimeout(() => {
                        this.isAnimating = false;
                        bgLayer.style.transition = '';
                    }, 260);
                } else {
                    bgLayer.style.transition = 'none';
                    bgLayer.style.setProperty('background', bg, 'important');
                    bgLayer.style.setProperty('background-size', sizeRules.size, 'important');
                    bgLayer.style.setProperty('background-repeat', sizeRules.repeat, 'important');
                    bgLayer.style.setProperty('background-attachment', 'fixed', 'important');
                    bgLayer.style.setProperty('background-position', sizeRules.position, 'important');
                    bgLayer.style.opacity = '1';
                    bgLayer.style.filter = 'none';
                }
            }

            if (body) {
                body.style.setProperty('background', 'transparent', 'important');
                body.classList.remove('bg-blur', 'bg-progressive-loading');
                body.classList.add('bg-ready');
            }
        },

        /**
         * Realiza la consulta de la API de temas de Firefox encapsulada de forma limpia.
         */
        async fetchFirefoxThemeHelper() {
            return new Promise(resolve => {
                const timer = setTimeout(() => {
                    console.warn('BackgroundManager: Timeout esperando el tema de Firefox.');
                    resolve({ success: false, error: 'Timeout' });
                }, 500);

                if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
                    browser.runtime.sendMessage({ type: 'GET_FIREFOX_THEME' })
                        .then(resp => {
                            clearTimeout(timer);
                            resolve(resp || { success: false });
                        })
                        .catch(err => {
                            clearTimeout(timer);
                            resolve({ success: false, error: err.message });
                        });
                } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'GET_FIREFOX_THEME' }, resp => {
                        clearTimeout(timer);
                        if (chrome.runtime.lastError) {
                            resolve({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve(resp || { success: false });
                        }
                    });
                } else {
                    clearTimeout(timer);
                    resolve({ success: false });
                }
            });
        },

        /**
         * Consulta en segundo plano el tema de Firefox y actualiza el fondo si cambió.
         */
        async syncLatestFirefoxTheme(settings) {
            try {
                const response = await this.fetchFirefoxThemeHelper();

                if (response && response.success && response.theme) {
                    const themeInfo = response.theme;
                    const tc = themeInfo.colors || {};
                    const bgVal = tc.ntp_background || tc.toolbar || tc.frame || tc.background || '#050505';
                    const solidColor = Array.isArray(bgVal)
                        ? (bgVal.length === 4 ? `rgba(${bgVal.join(',')})` : `rgb(${bgVal.join(',')})`)
                        : bgVal;

                    let newBg = solidColor;
                    let themeImg = null;
                    if (themeInfo.images) {
                        themeImg = themeInfo.images.theme_frame || themeInfo.images.headerURL;
                        if (!themeImg && themeInfo.images.additional_backgrounds?.length > 0) {
                            themeImg = themeInfo.images.additional_backgrounds[0];
                        }
                    }

                    if (themeImg) {
                        newBg = `url("${themeImg}") center / cover no-repeat, ${solidColor}`;
                    }

                    const cachedBg = localStorage.getItem('firefox_theme_bg');
                    const cachedColor = localStorage.getItem('firefox_theme_color');

                    if (this.normalizeBg(newBg) !== this.normalizeBg(cachedBg) || solidColor !== cachedColor || this.normalizeBg(newBg) !== this.normalizeBg(this.lastAppliedBg)) {
                        localStorage.setItem('firefox_theme_bg', newBg);
                        localStorage.setItem('firefox_theme_color', solidColor);
                        if (newBg && newBg !== 'transparent') {
                            localStorage.setItem('last_bg', newBg);
                        }
                        localStorage.setItem('last_bg_color', solidColor);

                        this.lastAppliedBg = newBg;
                        this.applyBackground(newBg, true, settings.bgDisplayMode || 'cover');

                        const cache = JSON.parse(localStorage.getItem('zero_flash_cache') || '{}');
                        cache.syncFirefoxTheme = true;
                        localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
                    }
                }
            } catch (e) {
                console.warn('Error in syncLatestFirefoxTheme:', e);
            }
        },

        normalizeBg(bg) {
            if (!bg) return '';
            return String(bg).replace(/['"]/g, '').replace(/\s+/g, '').toLowerCase();
        },

        updateCache(settings, bg, color, accent, displayMode = 'cover') {
            try {
                if (bg && bg !== 'transparent') {
                    // No guardar data URLs muy pesados en localStorage para no exceder cuota ni frenar el frame 0
                    if (bg.length < 150000) {
                        localStorage.setItem('last_bg', bg);
                    } else {
                        localStorage.removeItem('last_bg');
                    }
                }

                const validColor = color && color !== '#a855f7' ? color : '#050505';
                localStorage.setItem('last_bg_color', validColor);

                const cache = JSON.parse(localStorage.getItem('zero_flash_cache') || '{}');
                const keysToSync = [
                    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
                    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
                    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
                    'activePremiumTheme', 'premiumThemeData', 'doodle', 'userName',
                    'showSearch', 'showWeather', 'showDate', 'greetingFont', 'dateFont',
                    'syncFirefoxTheme', 'gradient', 'bgUrl', 'bgColor', 'bgDisplayMode',
                    'hasCustomBgData', 'use12HourFormat', 'showSeconds', 'randomBg'
                ];

                keysToSync.forEach(k => {
                    if (settings[k] === null || settings[k] === undefined) {
                        if (settings.hasOwnProperty(k)) delete cache[k];
                    } else {
                        cache[k] = settings[k];
                    }
                });
                delete cache.bgData;
                cache.bgDisplayMode = displayMode;

                if (cache.doodle && cache.doodle !== 'none' && window.DOODLES_LIST) {
                    const currentDoodle = window.DOODLES_LIST.find(d => d.id === cache.doodle);
                    if (currentDoodle) {
                        cache.doodleTemplate = currentDoodle.template;
                        const bgMatch = currentDoodle.template.match(/background:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|[a-z]+)/);
                        if (bgMatch) cache.doodleColor = bgMatch[1];
                    }
                } else if (cache.doodle === 'none') {
                    delete cache.doodleTemplate;
                    delete cache.doodleColor;
                }

                if (!settings.accentColor && accent) cache.accentColor = accent;
                localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
            } catch (e) { }
        },

        updatePanelRgb(color) {
            const rgb = parseRgb(color, [0, 0, 0]);
            try {
                document.documentElement.style.setProperty('--panel-bg-rgb', rgb.join(', '));
            } catch (e) { }
        }
    };

    window.BackgroundManager = BackgroundManager;
})();
