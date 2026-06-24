/**
 * Toast System — Tomodachi POS
 * Sistema de notificaciones moderno para reemplazar alert() nativos.
 * 
 * Uso:
 *   Toast.success('Producto guardado');
 *   Toast.error('Error al guardar');
 *   Toast.warning('Stock bajo', 5000);
 *   Toast.info('Sincronizando...', 2000);
 *   
 *   // Confirmación moderna (reemplaza confirm())
 *   const confirmed = await Toast.confirm('¿Eliminar producto?');
 *   if (confirmed) { ... }
 */

class Toast {
    static CONTAINER_ID = 'tomodachi-toast-container';

    static #getContainer() {
        let container = document.getElementById(this.CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = this.CONTAINER_ID;
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    static #createToast(message, type = 'info', duration = 3500) {
        const container = this.#getContainer();
        const toast = document.createElement('div');
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const colors = {
            success: '#48bb78',
            error: '#f56565',
            warning: '#ed8936',
            info: '#4299e1'
        };

        toast.style.cssText = `
            background: #1a202c;
            color: #e2e8f0;
            padding: 14px 20px;
            border-radius: 12px;
            border-left: 4px solid ${colors[type]};
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            font-family: 'Inter', -apple-system, sans-serif;
            pointer-events: auto;
            cursor: pointer;
            transform: translateX(120%);
            transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            min-width: 280px;
            max-width: 400px;
        `;

        toast.innerHTML = `
            <i class="${icons[type]}" style="color: ${colors[type]}; font-size: 20px; flex-shrink: 0;"></i>
            <span style="flex: 1; line-height: 1.4;">${message}</span>
            <i class="fas fa-times" style="color: #718096; font-size: 14px; cursor: pointer; flex-shrink: 0; padding: 2px;"></i>
        `;

        container.appendChild(toast);

        // Animación de entrada
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Cerrar al hacer click
        toast.addEventListener('click', (e) => {
            if (e.target.closest('.fa-times')) {
                this.#dismiss(toast);
            }
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.#dismiss(toast), duration);
        }

        return toast;
    }

    static #dismiss(toast) {
        if (!toast || toast._dismissing) return;
        toast._dismissing = true;
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }

    static success(message, duration = 3500) {
        return this.#createToast(message, 'success', duration);
    }

    static error(message, duration = 5000) {
        return this.#createToast(message, 'error', duration);
    }

    static warning(message, duration = 4000) {
        return this.#createToast(message, 'warning', duration);
    }

    static info(message, duration = 3000) {
        return this.#createToast(message, 'info', duration);
    }

    /**
     * Confirmación moderna - reemplaza confirm()
     * @param {string} message - Mensaje de confirmación
     * @param {object} options - Opciones {confirmText, cancelText, title, danger}
     * @returns {Promise<boolean>}
     */
    static confirm(message, options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = 'Sí, continuar',
                cancelText = 'Cancelar',
                title = 'Confirmar',
                danger = false
            } = options;

            // Modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.6);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #1a202c;
                border-radius: 16px;
                padding: 28px 32px;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 24px 64px rgba(0,0,0,0.4);
                border: 1px solid #2d3748;
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                font-family: 'Inter', -apple-system, sans-serif;
            `;

            const dangerColor = '#fc8181';
            const accentColor = danger ? dangerColor : '#4299e1';

            modal.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas ${danger ? 'fa-exclamation-triangle' : 'fa-question-circle'}" 
                       style="font-size: 42px; color: ${accentColor}; margin-bottom: 12px;"></i>
                    <h3 style="color: #f7fafc; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">${title}</h3>
                    <p style="color: #a0aec0; font-size: 14px; margin: 0; line-height: 1.5;">${message}</p>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="toast-btn toast-btn-cancel" style="
                        padding: 10px 20px;
                        border-radius: 10px;
                        border: 1px solid #4a5568;
                        background: transparent;
                        color: #e2e8f0;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: inherit;
                    ">${cancelText}</button>
                    <button class="toast-btn toast-btn-confirm" style="
                        padding: 10px 24px;
                        border-radius: 10px;
                        border: none;
                        background: ${accentColor};
                        color: white;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: inherit;
                    ">${confirmText}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Animaciones
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });

            // Cerrar
            function close(result) {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    resolve(result);
                }, 300);
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });

            modal.querySelector('.toast-btn-cancel').addEventListener('click', () => close(false));
            modal.querySelector('.toast-btn-confirm').addEventListener('click', () => close(true));
        });
    }
}
