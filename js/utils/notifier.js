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
     * Reemplazo estético y dinámico de window.confirm()
     * @param {string} title - Título del modal.
     * @param {string} message - Mensaje informativo.
     * @param {Object} options - Configuración de estilo y botones.
     */
    async confirm(title, message, options = {}) {
        const {
            okText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'danger' // danger, success, info
        } = options;

        const config = {
            danger: { btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20', icon: '🗑️', iconBg: 'bg-rose-50 text-rose-600' },
            success: { btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20', icon: '💰', iconBg: 'bg-emerald-50 text-emerald-600' },
            info: { btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20', icon: 'ℹ️', iconBg: 'bg-blue-50 text-blue-600' }
        };

        const theme = config[type] || config.danger;

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300';
            modal.innerHTML = `
                <div class="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-300 border border-slate-100">
                    <div class="text-center">
                        <div class="w-20 h-20 ${theme.iconBg} rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                            ${theme.icon}
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 mb-3 tracking-tighter">${title}</h3>
                        <p class="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed mb-10 opacity-70 px-4">${message}</p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button id="confirmCancel" class="flex-1 px-6 py-5 bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all active:scale-95 order-2 sm:order-1">${cancelText}</button>
                        <button id="confirmOk" class="flex-1 px-6 py-5 ${theme.btn} text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 order-1 sm:order-2">${okText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cleanup = (val) => {
                modal.classList.add('animate-out', 'fade-out', 'duration-200');
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
