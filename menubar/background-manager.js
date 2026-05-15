/**
 * Background Manager - El cerebro visual del tablero.
 * Centraliza la aplicación de fondos con un efecto de carga progresiva (Dithering).
 */
(function() {
    const BackgroundManager = {
        /**
         * Aplica de forma integral un conjunto de ajustes visuales.
         */
        async apply(settings) {
            if (!settings) return;

            const root = document.documentElement.style;
            const body = document.body;
            let finalBg = '#050505';
            let fallbackColor = '#050505';
            const isDoodle = settings.doodle && settings.doodle !== 'none';

            // 1. DETERMINAR COLORES Y TEMA
            const isPremium = settings.activePremiumTheme && settings.premiumThemeData;
            const theme = isPremium ? settings.premiumThemeData : null;

            const panelBg = settings.panelBg || (theme ? theme.panel.bg : 'rgba(0, 0, 0, 0.2)');
            const accentColor = settings.accentColor || (theme ? theme.colors.accent : '#16a085');
            const textColor = settings.panelTextColor || (theme ? theme.colors.text : '#ffffff');

            root.setProperty('--panel-bg', panelBg);
            root.setProperty('--accent-color', accentColor);
            root.setProperty('--panel-text-color', textColor);
            root.setProperty('--panel-text-secondary-color', settings.panelTextSecondaryColor || (theme ? theme.colors.textSecondary : 'rgba(255, 255, 255, 0.7)'));
            
            root.setProperty('--greeting-color', settings.greetingColor || (theme ? theme.colors.greeting : '#ffffff'));
            root.setProperty('--name-color', settings.nameColor || (theme ? theme.colors.name : '#ffffff'));
            root.setProperty('--clock-color', settings.clockColor || (theme ? theme.colors.clock : '#ffffff'));
            root.setProperty('--date-color', settings.dateColor || (theme ? theme.colors.date : '#ffffff'));

            root.setProperty('--greeting-font', settings.greetingFont || (theme ? theme.fonts.main : "'Poppins', sans-serif"));
            root.setProperty('--date-font', settings.dateFont || (theme ? theme.fonts.secondary : "'Poppins', sans-serif"));

            root.setProperty('--panel-opacity', settings.panelOpacity ?? (theme ? theme.panel.opacity : 0.1));
            root.setProperty('--panel-blur', `${settings.panelBlur ?? (theme ? theme.panel.blur : 10)}px`);
            root.setProperty('--panel-radius', `${settings.panelRadius ?? (theme ? theme.panel.radius : 12)}px`);

            this.updatePanelRgb(panelBg);

            // Visibilidad de secciones
            const searchSec = document.querySelector('.search-section');
            if (searchSec) searchSec.hidden = !(settings.showSearch ?? true);
            const weatherEl = document.getElementById('weather');
            if (weatherEl) weatherEl.hidden = !(settings.showWeather ?? true);
            const dateEl = document.getElementById('date');
            if (dateEl) dateEl.hidden = !(settings.showDate ?? true);

            // 2. DETERMINAR FONDO Y ACTIVAR EFECTO PROGRESIVO
            if (isDoodle) {
                root.setProperty('background', 'transparent', 'important');
                if (body) body.style.background = 'transparent';
                fallbackColor = settings.doodleColor || (theme ? theme.panel.bg : '#050505');
            } else if (isPremium) {
                finalBg = theme.background.gradient;
                fallbackColor = theme.panel.bg;
            } else if (settings.bgData || settings.bgUrl) {
                finalBg = `url('${settings.bgData || settings.bgUrl}')`;
                fallbackColor = '#050505';
            } else {
                finalBg = settings.gradient || 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
                const match = finalBg.match(/#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)/);
                if (match) fallbackColor = match[0];
            }

            // Aplicar efecto de "Revelado por Puntos" (Dither)
            if (!isDoodle) {
                this.triggerProgressiveReveal(finalBg, fallbackColor);
            }

            this.updateCache(settings, finalBg, fallbackColor, accentColor);
        },

        /**
         * Simula la carga progresiva de videojuegos usando una máscara de ruido.
         */
        triggerProgressiveReveal(bg, fallback) {
            const root = document.documentElement.style;
            const body = document.body;

            // Inyectar el fondo al HTML inmediatamente para evitar flash
            root.setProperty('background', bg, 'important');
            root.setProperty('background-size', 'cover', 'important');
            root.setProperty('background-attachment', 'fixed', 'important');

            if (body) {
                // Añadimos una clase para activar el shader de ruido en el CSS
                body.classList.add('bg-progressive-loading');
                body.style.background = bg;
                body.style.backgroundSize = 'cover';
                body.style.backgroundAttachment = 'fixed';
                
                // Quitamos el efecto tras una breve animación
                setTimeout(() => {
                    body.classList.remove('bg-progressive-loading');
                    body.classList.add('bg-ready');
                }, 400);
            }
        },

        updateCache(settings, bg, color, accent) {
            try {
                if (bg && bg !== 'transparent') localStorage.setItem('last_bg', bg);
                localStorage.setItem('last_bg_color', color);
                
                const cache = JSON.parse(localStorage.getItem('zero_flash_cache') || '{}');
                const keysToSync = [
                    'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius', 
                    'panelTextColor', 'panelTextSecondaryColor', 'accentColor', 
                    'greetingColor', 'nameColor', 'clockColor', 'dateColor',
                    'activePremiumTheme', 'premiumThemeData', 'doodle', 'userName',
                    'showSearch', 'showWeather', 'showDate', 'greetingFont', 'dateFont'
                ];
                
                keysToSync.forEach(k => {
                    if (settings[k] !== undefined) cache[k] = settings[k];
                });
                if (!settings.accentColor && accent) cache.accentColor = accent;
                localStorage.setItem('zero_flash_cache', JSON.stringify(cache));
            } catch (e) {}
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
            } catch (e) {}
        }
    };

    // Hacerlo disponible globalmente
    window.BackgroundManager = BackgroundManager;
})();
