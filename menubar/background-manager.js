/**
 * Background Manager - El cerebro visual del tablero.
 * Centraliza la aplicación de fondos con un efecto de carga progresiva (Dithering).
 */
(function () {
    const BackgroundManager = {
        // Almacena el último fondo aplicado (para restaurar cuando se quita un doodle)
        lastAppliedBg: null,

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

            const panelBg = settings.panelBg || (theme && theme.panel ? theme.panel.bg : 'rgba(0, 0, 0, 0.2)');
            const accentColor = settings.accentColor || (theme && theme.colors ? theme.colors.accent : '#16a085');
            const textColor = settings.panelTextColor || (theme && theme.colors ? theme.colors.text : '#ffffff');

            root.setProperty('--panel-bg', panelBg);
            root.setProperty('--accent-color', accentColor);
            root.setProperty('--panel-text-color', textColor);
            root.setProperty('--panel-text-secondary-color', settings.panelTextSecondaryColor || (theme && theme.colors ? theme.colors.textSecondary : 'rgba(255, 255, 255, 0.7)'));

            root.setProperty('--greeting-color', settings.greetingColor || (theme && theme.colors ? theme.colors.greeting : '#ffffff'));
            root.setProperty('--name-color', settings.nameColor || (theme && theme.colors ? theme.colors.name : '#ffffff'));
            root.setProperty('--clock-color', settings.clockColor || (theme && theme.colors ? theme.colors.clock : '#ffffff'));
            root.setProperty('--date-color', settings.dateColor || (theme && theme.colors ? theme.colors.date : '#ffffff'));

            root.setProperty('--greeting-font', settings.greetingFont || (theme && theme.fonts ? theme.fonts.main : "'Poppins', sans-serif"));
            root.setProperty('--date-font', settings.dateFont || (theme && theme.fonts ? theme.fonts.secondary : "'Poppins', sans-serif"));

            root.setProperty('--panel-opacity', settings.panelOpacity ?? (theme && theme.panel ? theme.panel.opacity : 0.1));
            root.setProperty('--panel-blur', `${settings.panelBlur ?? (theme && theme.panel ? theme.panel.blur : 10)}px`);
            root.setProperty('--panel-radius', `${settings.panelRadius ?? (theme && theme.panel ? theme.panel.radius : 12)}px`);

            this.updatePanelRgb(panelBg);

            // Visibilidad de secciones (Protección contra elementos nulos en carga temprana)
            const searchSec = document.querySelector('.search-section');
            if (searchSec) searchSec.hidden = !(settings.showSearch ?? true);
            const weatherEl = document.getElementById('weather');
            if (weatherEl) weatherEl.hidden = !(settings.showWeather ?? true);
            const dateEl = document.getElementById('date');
            if (dateEl) dateEl.hidden = !(settings.showDate ?? true);

            // 2. DETERMINAR FONDO Y COMPARAR PARA PERSISTENCIA
            const lastAppliedBg = localStorage.getItem('last_bg');
            let finalBg = '#050505';
            let fallbackColor = '#050505';

            if (isDoodle) {
                finalBg = 'transparent';
                fallbackColor = settings.doodleColor || (theme && theme.panel ? theme.panel.bg : '#050505');
            } else if (settings.syncFirefoxTheme) {
                let cachedBg = localStorage.getItem('firefox_theme_bg') || lastAppliedBg;
                let cachedColor = localStorage.getItem('firefox_theme_color') || '#050505';

                // Si se fuerza la consulta asíncrona (acción directa del usuario al activar),
                // consultamos asíncronamente antes de aplicar para tener el fondo real de inmediato en la pantalla
                if (forceAsyncFetch) {
                    try {
                        const response = await this.fetchFirefoxThemeHelper();
                        if (response && response.success && response.theme) {
                            const themeInfo = response.theme;
                            const tc = themeInfo.colors || {};
                            let bgVal = tc.ntp_background || tc.toolbar || tc.frame || tc.background || '#050505';
                            let solidColor = '#050505';
                            if (Array.isArray(bgVal)) {
                                solidColor = bgVal.length === 4 ? `rgba(${bgVal.join(',')})` : `rgb(${bgVal.join(',')})`;
                            } else {
                                solidColor = bgVal;
                            }
                            
                            let themeImg = null;
                            if (themeInfo.images) {
                                themeImg = themeInfo.images.theme_frame || themeInfo.images.headerURL;
                                if (!themeImg && themeInfo.images.additional_backgrounds && themeInfo.images.additional_backgrounds.length > 0) {
                                    themeImg = themeInfo.images.additional_backgrounds[0];
                                }
                            }

                            cachedBg = themeImg ? `url("${themeImg}") center / cover no-repeat, ${solidColor}` : solidColor;
                            cachedColor = solidColor;

                            // Actualizar la caché de inmediato
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

                // Si no se forzó asíncrono, ejecutamos verificación en segundo plano
                if (!forceAsyncFetch) {
                    this.syncLatestFirefoxTheme(settings);
                }
            } else if (isPremium && theme && theme.background && theme.background.gradient) {
                finalBg = theme.background.gradient;
                fallbackColor = (theme.panel && theme.panel.bg) ? theme.panel.bg : '#050505';
            } else if (settings.bgData || settings.bgUrl) {
                finalBg = `url('${settings.bgData || settings.bgUrl}')`;
                fallbackColor = '#050505';
            } else {
                const gradId = settings.gradient || 'aurora-mist';
                const gradObj = window.GRADIENTS ? window.GRADIENTS.find(g => g.id === gradId) : null;
                if (gradObj) {
                    finalBg = gradObj.gradient;
                } else if (gradId.includes('gradient')) {
                    finalBg = gradId;
                } else {
                    const cachedBg = localStorage.getItem('last_bg');
                    if (cachedBg && cachedBg.includes('gradient')) {
                        finalBg = cachedBg;
                    } else {
                        finalBg = 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)';
                    }
                }
                const match = finalBg.match(/#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)/);
                if (match) fallbackColor = match[0];
            }

            // SMART PERSISTENCE: Animamos si el fondo cambió, o si es la primera carga de la sesión
            if (this.initialLoadDone === undefined) this.initialLoadDone = false;
            const hasChanged = !this.initialLoadDone || (this.normalizeBg(finalBg) !== this.normalizeBg(lastAppliedBg));
            this.initialLoadDone = true;

            if (isDoodle) {
                // Guardar el fondo que se usaría si no fuera doodle (para restaurar después)
                this.lastAppliedBg = finalBg;
                root.setProperty('background', 'transparent', 'important');
                if (body) body.style.setProperty('background', 'transparent', 'important');
                const bgLayer = document.getElementById('bg-layer');
                if (bgLayer) bgLayer.style.opacity = '0';
            } else {
                this.lastAppliedBg = finalBg;
                this.applyBackground(finalBg, hasChanged);
            }

            this.updateCache(settings, finalBg, fallbackColor, accentColor);
        },

        /**
         * Aplica el fondo y maneja la transición inteligente.
         */
        applyBackground(bg, animate) {
            const bgLayer = document.getElementById('bg-layer');
            const body = document.body;
            
            // Si el fondo es el mismo y está en medio de la animación de carga, no interrumpir la transición.
            if (this.isAnimating && this.normalizeBg(bg) === this.normalizeBg(this.lastAppliedBg) && !animate) {
                console.log('BackgroundManager: Animación en curso, omitiendo sobreescritura instantánea.');
                return;
            }
            
            if (bgLayer) {
                if (animate) {
                    this.isAnimating = true;
                    // Reiniciar opacidad y filtro para carga progresiva escalonada
                    bgLayer.style.opacity = '0';
                    bgLayer.style.filter = 'blur(20px) grayscale(50%)';
                    
                    bgLayer.style.setProperty('background', bg, 'important');
                    bgLayer.style.setProperty('background-size', 'cover', 'important');
                    bgLayer.style.setProperty('background-attachment', 'fixed', 'important');
                    bgLayer.style.setProperty('background-position', 'center', 'important');
                    
                    // Activar la secuencia de tandas
                    setTimeout(() => {
                        bgLayer.style.opacity = '1';
                        bgLayer.style.filter = 'blur(0px) grayscale(0%)';
                    }, 50);

                    // Restablecer flag de animación cuando termine el efecto de carga (1200ms de transición)
                    setTimeout(() => {
                        this.isAnimating = false;
                    }, 1300);
                } else {
                    // Si ya estaba cargado, asegurar visibilidad completa e instantánea estableciendo los estilos de fondo
                    bgLayer.style.setProperty('background', bg, 'important');
                    bgLayer.style.setProperty('background-size', 'cover', 'important');
                    bgLayer.style.setProperty('background-attachment', 'fixed', 'important');
                    bgLayer.style.setProperty('background-position', 'center', 'important');
                    bgLayer.style.opacity = '1';
                    bgLayer.style.filter = 'blur(0px) grayscale(0%)';
                }
            }

            if (body) {
                body.style.setProperty('background', 'transparent', 'important');

                if (animate) {
                    // Solo activar efectos si es un fondo nuevo (ej. desde Settings)
                    body.classList.remove('bg-ready');
                    body.classList.add('bg-blur', 'bg-progressive-loading');

                    setTimeout(() => {
                        body.classList.remove('bg-blur', 'bg-progressive-loading');
                        body.classList.add('bg-ready');
                    }, 600);
                } else {
                    // Si ya estaba cargado, asegurar estado listo sin transiciones
                    body.classList.remove('bg-blur', 'bg-progressive-loading');
                    body.classList.add('bg-ready');
                }
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
                    let bgVal = tc.ntp_background || tc.toolbar || tc.frame || tc.background || '#050505';
                    let solidColor = '#050505';
                    if (Array.isArray(bgVal)) {
                        solidColor = bgVal.length === 4 ? `rgba(${bgVal.join(',')})` : `rgb(${bgVal.join(',')})`;
                    } else {
                        solidColor = bgVal;
                    }
                    
                    let newBg = solidColor;
                    let themeImg = null;
                    if (themeInfo.images) {
                        themeImg = themeInfo.images.theme_frame || themeInfo.images.headerURL;
                        if (!themeImg && themeInfo.images.additional_backgrounds && themeInfo.images.additional_backgrounds.length > 0) {
                            themeImg = themeInfo.images.additional_backgrounds[0];
                        }
                    }

                    if (themeImg) {
                        newBg = `url("${themeImg}") center / cover no-repeat, ${solidColor}`;
                    }

                    const cachedBg = localStorage.getItem('firefox_theme_bg');
                    const cachedColor = localStorage.getItem('firefox_theme_color');

                    // Si el fondo del tema ha cambiado con respecto a la caché, o difiere del aplicado actualmente en pantalla
                    if (this.normalizeBg(newBg) !== this.normalizeBg(cachedBg) || solidColor !== cachedColor || this.normalizeBg(newBg) !== this.normalizeBg(this.lastAppliedBg)) {
                        console.log('BackgroundManager: Se detectó cambio en el tema de Firefox. Actualizando...');
                        localStorage.setItem('firefox_theme_bg', newBg);
                        localStorage.setItem('firefox_theme_color', solidColor);
                        if (newBg && newBg !== 'transparent') {
                            localStorage.setItem('last_bg', newBg);
                        }
                        localStorage.setItem('last_bg_color', solidColor);

                        // Actualizar la interfaz con el nuevo fondo de forma suave
                        this.lastAppliedBg = newBg;
                        this.applyBackground(newBg, true);
                        
                        // Actualizar la caché del Zero-Flash
                        const cache = JSON.parse(localStorage.getItem('zero_flash_cache') || '{}');
                        cache.syncFirefoxTheme = true;
                        localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
                    }
                }
            } catch (e) {
                console.warn('Error in syncLatestFirefoxTheme:', e);
            }
        },

        /**
         * Normaliza strings de fondo para una comparación precisa.
         */
        normalizeBg(bg) {
            if (!bg) return '';
            // Eliminar comillas, espacios y URLs relativas para comparar el contenido real
            return String(bg).replace(/['"]/g, '').replace(/\s+/g, '').toLowerCase();
        },

        updateCache(settings, bg, color, accent) {
            try {
                if (bg && bg !== 'transparent') localStorage.setItem('last_bg', bg);

                // Asegurar que last_bg_color siempre tenga un valor válido (nunca morado por defecto)
                const validColor = color && color !== '#a855f7' ? color : '#050505';
                localStorage.setItem('last_bg_color', validColor);

                const cache = JSON.parse(localStorage.getItem('zero_flash_cache') || '{}');
                const keysToSync = [
                    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
                    'panelTextColor', 'panelTextSecondaryColor', 'accentColor',
                    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
                    'activePremiumTheme', 'premiumThemeData', 'doodle', 'userName',
                    'showSearch', 'showWeather', 'showDate', 'greetingFont', 'dateFont',
                    'syncFirefoxTheme', 'gradient', 'bgData', 'bgUrl'
                ];

                keysToSync.forEach(k => {
                    if (settings[k] !== undefined) cache[k] = settings[k];
                });

                // Buscar y guardar el template del doodle si existe
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
            let rgb = "0, 0, 0";
            try {
                const hex = color.trim();
                if (hex.startsWith('#')) {
                    if (hex.length === 4) {
                        rgb = [1, 2, 3].map(i => parseInt(hex[i] + hex[i], 16)).join(', ');
                    } else {
                        const match = hex.substring(1).match(/.{2}/g);
                        if (match) rgb = match.slice(0, 3).map(x => parseInt(x, 16)).join(', ');
                    }
                } else if (hex.includes('rgb')) {
                    const match = hex.match(/\d+/g);
                    if (match) rgb = match.slice(0, 3).join(', ');
                }
                document.documentElement.style.setProperty('--panel-bg-rgb', rgb);
            } catch (e) { }
        }
    };

    window.BackgroundManager = BackgroundManager;
})();
