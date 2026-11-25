/**
 * Widget Pomodoro — Pro Edition
 * Temporizador con modos de foco/descanso, persistencia entre pestañas (endTimestamp),
 * steppers corregidos (data-step), anillo SVG y alertas sonoras/de escritorio.
 */
import { storageSet, storageGet } from '../../menubar/core/utils.js';

export class PomodoroWidget {
    constructor(container) {
        this.container = container;

        this.config = { focusTime: 25, breakTime: 5 };
        this.timeLeft = this.config.focusTime * 60;
        this.totalTime = this.config.focusTime * 60;
        this.timerId = null;
        this.isRunning = false;
        this.mode = 'focus';
        this.endTimestamp = null;
        this.STORAGE_KEY = 'widget_pomodoro_config';
        this.STATE_KEY = 'widget_pomodoro_state';

        this.init();
    }

    async init() {
        const stored = await storageGet([this.STORAGE_KEY, this.STATE_KEY]);
        if (stored[this.STORAGE_KEY]) {
            this.config = {
                focusTime: Math.max(1, Math.min(120, stored[this.STORAGE_KEY].focusTime || 25)),
                breakTime: Math.max(1, Math.min(30, stored[this.STORAGE_KEY].breakTime || 5))
            };
        }

        const savedState = stored[this.STATE_KEY];
        if (savedState) {
            this.mode = savedState.mode || 'focus';
            this.totalTime = savedState.totalTime || (this.mode === 'focus' ? this.config.focusTime : this.config.breakTime) * 60;
            if (savedState.isRunning && savedState.endTimestamp) {
                const remaining = Math.ceil((savedState.endTimestamp - Date.now()) / 1000);
                if (remaining > 0) {
                    this.timeLeft = remaining;
                    this.endTimestamp = savedState.endTimestamp;
                    this.render();
                    this.start(true);
                    return;
                }
                // El temporizador terminó mientras estaba en otra pestaña
                this.timeLeft = 0;
                this.isRunning = false;
                this.endTimestamp = null;
                this.saveState();
            } else if (typeof savedState.timeLeft === 'number') {
                this.timeLeft = savedState.timeLeft;
            } else {
                this.timeLeft = this.totalTime;
            }
        } else {
            this.timeLeft = this.config.focusTime * 60;
            this.totalTime = this.timeLeft;
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

        const focusInput = this.container.querySelector('#pomo-focus-input');
        const breakInput = this.container.querySelector('#pomo-break-input');
        if (focusInput) focusInput.value = this.config.focusTime;
        if (breakInput) breakInput.value = this.config.breakTime;

        const timeDiv = this.container.querySelector('#pomo-time');
        if (timeDiv) timeDiv.textContent = this.formatTime(this.timeLeft);

        const ringContainer = this.container.querySelector('#pomo-ring-container');
        if (ringContainer) ringContainer.dataset.mode = this.mode;

        const labelDiv = this.container.querySelector('#pomo-mode-label');
        if (labelDiv) labelDiv.textContent = this.mode === 'focus' ? 'FOCO' : 'DESCANSO';

        const focusBtn = this.container.querySelector('.pomodoro-mode-btn[data-mode="focus"]');
        const breakBtn = this.container.querySelector('.pomodoro-mode-btn[data-mode="short-break"]');
        if (focusBtn && breakBtn) {
            focusBtn.classList.toggle('active', this.mode === 'focus');
            breakBtn.classList.toggle('active', this.mode !== 'focus');
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
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.setMode(e.currentTarget.dataset.mode);
            })
        );

        settingsBtn.addEventListener('click', e => {
            e.stopPropagation();
            configPanel.classList.toggle('show');
        });

        // Steppers: leen data-step (con respaldo a data-dir)
        stepBtns.forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const field = btn.dataset.field;
                const step = parseInt(btn.dataset.step ?? btn.dataset.dir, 10);
                if (!field || Number.isNaN(step)) return;
                const maxLimit = field === 'focusTime' ? 120 : 30;
                this.config[field] = Math.max(1, Math.min(maxLimit, this.config[field] + step));
                this.save();
                const inp = this.container.querySelector(field === 'focusTime' ? '#pomo-focus-input' : '#pomo-break-input');
                if (inp) inp.value = this.config[field];
                if (!this.isRunning) this.resetTimer();
            });
        });

        const saveConfig = () => {
            const fTime = parseInt(focusInput.value, 10) || 25;
            const bTime = parseInt(breakInput.value, 10) || 5;
            this.config.focusTime = Math.max(1, Math.min(120, fTime));
            this.config.breakTime = Math.max(1, Math.min(30, bTime));
            focusInput.value = this.config.focusTime;
            breakInput.value = this.config.breakTime;
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

    async saveState() {
        await storageSet({
            [this.STATE_KEY]: {
                isRunning: this.isRunning,
                mode: this.mode,
                endTimestamp: this.endTimestamp,
                timeLeft: this.timeLeft,
                totalTime: this.totalTime
            }
        });
    }

    toggleTimer() {
        this.isRunning ? this.pause() : this.start();
    }

    start(resuming = false) {
        if (this.isRunning) return;
        if (this.timeLeft <= 0) {
            this.timeLeft = (this.mode === 'focus' ? this.config.focusTime : this.config.breakTime) * 60;
            this.totalTime = this.timeLeft;
        }
        this.isRunning = true;
        if (!resuming || !this.endTimestamp) {
            this.endTimestamp = Date.now() + this.timeLeft * 1000;
            this.saveState();
        }
        this.updatePlayPauseIcon();
        this.container.querySelector('#pomo-ring-container')?.classList.add('running');

        this.timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((this.endTimestamp - Date.now()) / 1000));
            this.timeLeft = remaining;
            this.updateDisplay();
            this.updateRing();

            if (remaining <= 0) {
                this.pause();
                this.notifyComplete();
            }
        }, 500);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.timerId);
        this.timerId = null;
        this.endTimestamp = null;
        this.saveState();
        this.updatePlayPauseIcon();
        this.container.querySelector('#pomo-ring-container')?.classList.remove('running');
    }

    resetTimer() {
        this.pause();
        this.timeLeft = (this.mode === 'focus' ? this.config.focusTime : this.config.breakTime) * 60;
        this.totalTime = this.timeLeft;
        this.saveState();
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
            playIcon.style.display = running ? 'none' : 'block';
            pauseIcon.style.display = running ? 'block' : 'none';
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
