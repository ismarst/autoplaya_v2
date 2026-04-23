/**
 * Sistema de Notificaciones Premium (Toasts) y Modales de Confirmación
 * Integrado con Tailwind CSS para autoPlaya v2.
 */

const createContainer = () => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Inferior central en moviles, superior derecha en desktop
        container.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 sm:top-4 sm:right-4 sm:left-auto sm:translate-x-0 z-[100] flex flex-col gap-3 pointer-events-none max-w-xs sm:max-w-sm w-full px-4 sm:px-0';
        document.body.appendChild(container);
    }
    return container;
};

export const notifier = {
    /**
     * Muestra una notificación tipo Toast.
     * @param {string} message - Mensaje a mostrar.
     * @param {'success' | 'error' | 'info'} type - Tipo de notificación.
     */
    showToast(message, type = 'success') {
        const container = createContainer();
        const toast = document.createElement('div');

        const config = {
            success: { bg: 'bg-green-600', icon: '✅' },
            error: { bg: 'bg-red-600', icon: '⚠️' },
            info: { bg: 'bg-blue-600', icon: 'ℹ️' }
        };

        const { bg, icon } = config[type] || config.info;

        // Limpiar cualquier emoji que el mensaje pueda traer al inicio (Dingbats y Emojis)
        const cleanMessage = message.replace(/^[\u{2700}-\u{27BF}\u{1F300}-\u{1F9FF}]/u, '').trim();

        toast.className = `${bg} text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-500 scale-90 opacity-0 pointer-events-auto cursor-pointer border border-white/10`;
        toast.innerHTML = `
            <span class="text-xl">${icon}</span>
            <p class="font-bold text-sm leading-tight">${cleanMessage}</p>
        `;

        toast.onclick = () => this._removeToast(toast);
        container.appendChild(toast);

        // Forzar reflow para animación de entrada
        setTimeout(() => {
            toast.classList.remove('scale-90', 'opacity-0');
            toast.classList.add('scale-100', 'opacity-100');
        }, 10);

        // Auto-eliminar en 3.5 segundos para que de tiempo a leer
        setTimeout(() => this._removeToast(toast), 3500);
    },

    _removeToast(toast) {
        if (!toast.parentElement) return; // Ya borrado
        toast.classList.add('opacity-0', 'scale-90', '-translate-y-2');
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 500);
    },

    /**
     * Reemplazo estético de window.confirm()
     * @param {string} title - Título del modal.
     * @param {string} message - Mensaje informativo.
     * @returns {Promise<boolean>} - Resuelve true si el usuario confirma.
     */
    async confirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200';
            modal.innerHTML = `
                <div class="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🗑️</div>
                        <h3 class="text-xl font-black text-gray-900 mb-2">${title}</h3>
                        <p class="text-gray-500 text-sm font-medium leading-relaxed mb-8">${message}</p>
                    </div>
                    <div class="flex gap-3">
                        <button id="confirmCancel" class="flex-1 px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition">Cancelar</button>
                        <button id="confirmOk" class="flex-1 px-6 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition">Eliminar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cleanup = (val) => {
                modal.classList.add('fade-out');
                modal.querySelector('div').classList.add('zoom-out-95');
                setTimeout(() => {
                    modal.remove();
                    resolve(val);
                }, 200);
            };

            modal.querySelector('#confirmCancel').onclick = () => cleanup(false);
            modal.querySelector('#confirmOk').onclick = () => cleanup(true);
            modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
        });
    }
};
