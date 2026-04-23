export const adminUI = {
    /**
     * Renderiza la tabla de locales.
     */
    renderLocalsTable(locals, onEdit, onDelete) {
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 animate-in fade-in duration-500">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-3xl font-black text-gray-900 tracking-tight">Gestión de Locales</h2>
                        <p class="text-gray-500 font-medium">Administra los puntos de venta y depósitos de tu playa.</p>
                    </div>
                    <button id="btnNewLocal" class="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Nuevo Local
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${locals.map(local => `
                        <div class="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div class="flex justify-between items-start mb-4">
                                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <i data-lucide="map-pin" class="w-6 h-6"></i>
                                </div>
                                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button class="btn-edit-local w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition" data-id="${local.id}">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button class="btn-delete-local w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition" data-id="${local.id}">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                            <h3 class="text-xl font-black text-gray-900 mb-1 uppercase">${local.nombre}</h3>
                            <p class="text-gray-400 text-sm font-bold uppercase tracking-widest">${local.ciudad || 'Sin ciudad'}</p>
                            <div class="mt-6 pt-6 border-t border-gray-50 flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Local Activo</span>
                            </div>
                        </div>
                    `).join('')}
                    ${locals.length === 0 ? `
                        <div class="col-span-full py-20 text-center">
                            <p class="text-gray-400 font-medium">No has registrado ningún local aún.</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Eventos
        const btnNew = document.getElementById('btnNewLocal');
        if (btnNew) btnNew.onclick = () => this.renderLocalModal();

        container.querySelectorAll('.btn-edit-local').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const local = locals.find(l => l.id === id);
                if (onEdit) onEdit(local);
            };
        });

        container.querySelectorAll('.btn-delete-local').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                if (onDelete) onDelete(id);
            };
        });

        if (window.lucide) lucide.createIcons();
    },

    /**
     * Modal para crear/editar local.
     */
    renderLocalModal(local = null) {
        const isEdit = !!local;
        const modalHtml = `
            <div id="modalLocal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                    <div class="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h3 class="text-xl font-black tracking-tight">${isEdit ? 'Editar Local' : 'Nuevo Local'}</h3>
                        </div>
                        <button id="closeLocalModal" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <form id="formLocal" class="p-8 space-y-6">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre del Local *</label>
                            <input type="text" name="nombre" required value="${isEdit ? local.nombre : ''}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase" placeholder="EJ: CENTRAL / SUCURSAL 1">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad / Ubicación *</label>
                            <input type="text" name="ciudad" required value="${isEdit ? local.ciudad : ''}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase" placeholder="EJ: ASUNCIÓN">
                        </div>
                        
                        <div class="pt-4">
                            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <i data-lucide="${isEdit ? 'save' : 'rocket'}" class="w-5 h-5"></i>
                                <span>${isEdit ? 'Actualizar Cambios' : 'Guardar Local'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('modalLocal');
        const form = document.getElementById('formLocal');

        const close = () => {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        };

        const closeBtn = document.getElementById('closeLocalModal');
        if (closeBtn) closeBtn.onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };

        // Forzar mayúsculas
        const inputNombre = form.querySelector('input[name="nombre"]');
        const inputCiudad = form.querySelector('input[name="ciudad"]');

        if (inputNombre) inputNombre.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
        if (inputCiudad) inputCiudad.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

        return new Promise((resolve) => {
            form.onsubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.nombre = data.nombre.toUpperCase().trim();
                data.ciudad = data.ciudad.toUpperCase().trim();
                close();
                resolve(data);
            };
            if (window.lucide) lucide.createIcons();
        });
    }
};
