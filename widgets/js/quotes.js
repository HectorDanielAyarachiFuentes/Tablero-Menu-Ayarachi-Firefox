import { setHTML } from '../../menubar/core/utils.js';
/**
 * Widget Frases Inspiradoras
 */
const QUOTES = [
    { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
    { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
    { text: "La mejor forma de predecir el futuro es crearlo.", author: "Peter Drucker" },
    { text: "Cree que puedes y ya estarás a medio camino.", author: "Theodore Roosevelt" },
    { text: "Tu tiempo es limitado, no lo desperdicies viviendo la vida de alguien más.", author: "Steve Jobs" },
    { text: "Si puedes soñarlo, puedes hacerlo.", author: "Walt Disney" },
    { text: "El fracaso es éxito si aprendemos de él.", author: "Malcolm Forbes" },
    { text: "La disciplina es el puente entre metas y logros.", author: "Jim Rohn" },
    { text: "Hazlo con pasión o no lo hagas.", author: "Rosa Nouchette Carey" },
    { text: "Cada día es una nueva oportunidad para cambiar tu vida.", author: "Anónimo" }
];

export class QuotesWidget {
    constructor(container) {
        this.container = container;
        this.render();
    }

    render() {
        setHTML(this.container, `
            <div class="widget-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>
                Inspiración
            </div>
            <div class="quote-content">
                <div class="quote-text">...</div>
                <div class="quote-author"></div>
            </div>
            <button class="quote-refresh-btn">Nueva Frase</button>
        `);

        this.showNewQuote();
        this.bindEvents();
    }

    showNewQuote() {
        const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        this.container.querySelector('.quote-text').textContent = `"${quote.text}"`;
        this.container.querySelector('.quote-author').textContent = `- ${quote.author}`;
    }

    bindEvents() {
        this.container.querySelector('.quote-refresh-btn').addEventListener('click', () => {
            this.showNewQuote();
        });
    }
}
