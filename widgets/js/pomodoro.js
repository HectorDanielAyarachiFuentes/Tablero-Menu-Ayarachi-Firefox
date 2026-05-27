/**
 * Widget Pomodoro — Pro Edition
 */
import { storageSet, storageGet, setSVG, setHTML } from '../../menubar/core/utils.js';

export class PomodoroWidget {
    constructor(container) {
        this.container = container;

        this.config = { focusTime: 25, breakTime: 5 };
        this.timeLeft = this.config.focusTime * 60;
        this.totalTime = this.config.focusTime * 60;
        this.timerId = null;
        this.isRunning = false;
        this.mode = 'focus';
        this.STORAGE_KEY = 'widget_pomodoro_config';

        this.init();
    }

    async init() {
        const stored = await storageGet([this.STORAGE_KEY]);
        if (stored[this.STORAGE_KEY]) {
            this.config = stored[this.STORAGE_KEY];
            if (!this.isRunning) {
                this.timeLeft = this.config.focusTime * 60;
                this.totalTime = this.config.focusTime * 60;
            }
        }
        this.render();
    }

    render() {
        this.container.textContent = '';
        
        const template = document.getElementById('pomodoro-template');
        if (!template) {
            console.error('No se encontró el template de Pomodoro');
            return;
        }
        
        const clone = template.content.cloneNode(true);
        this.container.appendChild(clone);
        
        // Inicializar los valores de los inputs
        const focusInput = this.container.querySelector('#pomo-focus-input');
        const breakInput = this.container.querySelector('#pomo-break-input');
        if (focusInput) focusInput.value = this.config.focusTime;
        if (breakInput) breakInput.value = this.config.breakTime;
        
        // Actualizar el tiempo en pantalla
        const timeDiv = this.container.querySelector('#pomo-time');
        if (timeDiv) timeDiv.textContent = this.formatTime(this.timeLeft);
        
        // Actualizar el modo
        const labelDiv = this.container.querySelector('#pomo-mode-label');
        if (labelDiv) labelDiv.textContent = this.mode === 'focus' ? 'FOCO' : 'DESCANSO';
        
        // Actualizar la clase active en el switch
        const focusBtn = this.container.querySelector('.pomodoro-mode-btn[data-mode="focus"]');
        const breakBtn = this.container.querySelector('.pomodoro-mode-btn[data-mode="short-break"]');
        if (this.mode === 'focus') {
            if (focusBtn) focusBtn.classList.add('active');
            if (breakBtn) breakBtn.classList.remove('active');
        } else {
            if (focusBtn) focusBtn.classList.remove('active');
            if (breakBtn) breakBtn.classList.add('active');
        }

        this.bindEvents();
        this.updatePlayPauseIcon();
        this.updateRing();
    }

    bindEvents() {
        const toggleBtn = this.container.querySelector('#pomo-toggle');
        const resetBtn = this.container.querySelector('#pomo-reset');
        const modeBtns = this.container.querySelectorAll('.pomodoro-mode-btn');
        const settingsBtn = this.container.querySelector('#pomo-settings-toggle');
        const configPanel = this.container.querySelector('#pomo-config-panel');
        const focusInput = this.container.querySelector('#pomo-focus-input');
        const breakInput = this.container.querySelector('#pomo-break-input');
        const stepBtns = this.container.querySelectorAll('.pomo-step-btn');

        toggleBtn.addEventListener('click', e => { e.stopPropagation(); this.toggleTimer(); });
        resetBtn.addEventListener('click', e => { e.stopPropagation(); this.resetTimer(); });

        modeBtns.forEach(btn =>
            btn.addEventListener('click', e => { e.stopPropagation(); this.setMode(e.target.dataset.mode); })
        );

        settingsBtn.addEventListener('click', e => {
            e.stopPropagation();
            configPanel.classList.toggle('show');
        });

        // Steppers
        stepBtns.forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const field = btn.dataset.field;
                const dir = parseInt(btn.dataset.dir);
                this.config[field] = Math.max(1, Math.min(field === 'focusTime' ? 60 : 30, this.config[field] + dir));
                this.save();
                // Update input display
                const inp = this.container.querySelector(field === 'focusTime' ? '#pomo-focus-input' : '#pomo-break-input');
                if (inp) inp.value = this.config[field];
                if (!this.isRunning) this.resetTimer();
            });
        });

        const saveConfig = () => {
            const fTime = parseInt(focusInput.value) || 25;
            const bTime = parseInt(breakInput.value) || 5;
            this.config.focusTime = Math.max(1, Math.min(60, fTime));
            this.config.breakTime = Math.max(1, Math.min(30, bTime));
            this.save();
            if (!this.isRunning) this.resetTimer();
        };

        focusInput.addEventListener('change', saveConfig);
        breakInput.addEventListener('change', saveConfig);
        [focusInput, breakInput].forEach(inp => inp.addEventListener('click', e => e.stopPropagation()));
        configPanel.addEventListener('click', e => e.stopPropagation());
    }

    async save() {
        await storageSet({ [this.STORAGE_KEY]: this.config });
    }

    toggleTimer() {
        this.isRunning ? this.pause() : this.start();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.updatePlayPauseIcon();
        this.container.querySelector('#pomo-ring-container')?.classList.add('running');

        this.timerId = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.updateDisplay();
                this.updateRing();
            } else {
                this.pause();
                this.notifyComplete();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.timerId);
        this.updatePlayPauseIcon();
        this.container.querySelector('#pomo-ring-container')?.classList.remove('running');
    }

    resetTimer() {
        this.pause();
        this.timeLeft = (this.mode === 'focus' ? this.config.focusTime : this.config.breakTime) * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateRing();
    }

    setMode(newMode) {
        this.mode = newMode;
        this.container.querySelectorAll('.pomodoro-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === newMode);
        });
        const container = this.container.querySelector('#pomo-ring-container');
        if (container) {
            container.dataset.mode = newMode;
        }
        const label = this.container.querySelector('#pomo-mode-label');
        if (label) label.textContent = newMode === 'focus' ? 'FOCO' : 'DESCANSO';
        this.resetTimer();
    }

    updateDisplay() {
        const el = this.container.querySelector('#pomo-time');
        if (el) el.textContent = this.formatTime(this.timeLeft);
    }

    updateRing() {
        const ring = this.container.querySelector('#pomo-ring-progress');
        if (!ring) return;
        const r = 52;
        const circumference = 2 * Math.PI * r;
        const progress = this.totalTime > 0 ? this.timeLeft / this.totalTime : 1;
        const offset = circumference * (1 - progress);
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${offset}`;
    }

    updatePlayPauseIcon() {
        const running = this.isRunning;
        const playIcon = this.container.querySelector('.pomo-icon-play');
        const pauseIcon = this.container.querySelector('.pomo-icon-pause');
        
        if (playIcon && pauseIcon) {
            if (running) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    notifyComplete() {
        const ring = this.container.querySelector('#pomo-ring-container');
        if (ring) {
            ring.classList.add('pomo-complete');
            setTimeout(() => ring.classList.remove('pomo-complete'), 3000);
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        this.playNotificationSound();
        this.showDesktopNotification();
    }

    playNotificationSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const playNote = (freq, time, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
                gain.gain.setValueAtTime(0.1, ctx.currentTime + time);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + time);
                osc.stop(ctx.currentTime + time + duration);
            };
            playNote(880, 0, 0.1);
            playNote(1108.73, 0.15, 0.1);
            playNote(1318.51, 0.3, 0.4);
        } catch (e) { console.warn('Audio failed', e); }
    }

    showDesktopNotification() {
        const title = this.mode === 'focus' ? '¡Tiempo de Foco Terminado!' : '¡Descanso Terminado!';
        const body = this.mode === 'focus' ? 'Hora de tomar un descanso. ☕' : 'Hora de volver a enfocarse. 💪';
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'icons/icon.svg' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') new Notification(title, { body, icon: 'icons/icon.svg' });
            });
        }
    }
}
