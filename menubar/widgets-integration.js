import { $, setSVG } from './core/utils.js';

export function initWidgetsSidebar() {
    let sidebar = null;
    let toggleBtn = null;
    let isOpen = false;
    let iframeLoaded = false;

    // Crear Toggle Button
    toggleBtn = document.createElement('div');
    toggleBtn.id = 'widgets-toggle-btn';
    toggleBtn.title = "Abrir Widgets";
    // Reuse original styles for toggle button, so we inject them here if needed 
    // or rely on a small inline style since widgets.css is no longer globally loaded.
    // For now we add basic styling or a small stylesheet specifically for the toggle button.
    Object.assign(toggleBtn.style, {
        position: 'fixed',
        bottom: '30px',
        left: '30px',
        width: '48px',
        height: '48px',
        background: 'rgba(var(--panel-bg-rgb), var(--panel-opacity))',
        backdropFilter: 'blur(var(--panel-blur))',
        WebkitBackdropFilter: 'blur(var(--panel-blur))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        color: 'var(--panel-text-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: '10000',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    });

    setSVG(toggleBtn, `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="2"></rect>
            <rect x="14" y="3" width="7" height="7" rx="2"></rect>
            <rect x="14" y="14" width="7" height="7" rx="2"></rect>
            <rect x="3" y="14" width="7" height="7" rx="2"></rect>
        </svg>
    `);
    
    // Add hover styles via JS events since CSS is moved
    toggleBtn.addEventListener('mouseenter', () => {
        if(!isOpen) toggleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
        if(!isOpen) toggleBtn.style.background = 'rgba(var(--panel-bg-rgb), var(--panel-opacity))';
    });

    document.body.appendChild(toggleBtn);

    sidebar = document.createElement('aside');
    sidebar.id = 'widgets-sidebar-container';
    Object.assign(sidebar.style, {
        position: 'fixed',
        top: '0',
        right: '-420px',
        width: '380px',
        height: '100vh',
        background: 'rgba(var(--panel-bg-rgb), var(--panel-opacity))',
        backdropFilter: 'blur(var(--panel-blur))',
        WebkitBackdropFilter: 'blur(var(--panel-blur))',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: '9999',
        transition: 'right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden' // Important for iframe
    });
    
    document.body.appendChild(sidebar);

    const toggleSidebar = () => {
        isOpen = !isOpen;
        
        if (isOpen && !iframeLoaded) {
            // Load iframe exactly when first opened
            const iframe = document.createElement('iframe');
            iframe.src = 'widgets/widgets.html';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.background = 'transparent';
            iframe.setAttribute('allowtransparency', 'true');
            sidebar.appendChild(iframe);
            iframeLoaded = true;
        }

        sidebar.style.right = isOpen ? '0' : '-420px';
        toggleBtn.style.background = isOpen ? 'var(--accent-color)' : 'rgba(var(--panel-bg-rgb), var(--panel-opacity))';
        toggleBtn.style.color = isOpen ? '#fff' : 'var(--panel-text-color)';
        toggleBtn.style.borderColor = isOpen ? 'transparent' : 'rgba(255, 255, 255, 0.1)';
    };

    toggleBtn.addEventListener('click', toggleSidebar);

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (isOpen && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            toggleSidebar();
        }
    });
}
