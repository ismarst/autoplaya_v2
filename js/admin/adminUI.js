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

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    ${locals.map(local => `
                        <div class="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div class="flex justify-between items-start mb-6">
                                <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <i data-lucide="map-pin" class="w-7 h-7"></i>
                                </div>
                                <div class="flex gap-2">
                                    <button class="btn-edit-local w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition" data-id="${local.id}">
                                        <i data-lucide="edit-3" class="w-5 h-5"></i>
                                    </button>
                                    <button class="btn-delete-local w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-600 hover:text-white transition" data-id="${local.id}">
                                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="space-y-1">
                                <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tight">${local.nombre}</h3>
                                <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                                    <i data-lucide="map" class="w-3 h-3"></i>
                                    ${local.ciudad || 'Sin ciudad'}
                                </div>
                            </div>

                            <div class="mt-6 space-y-3">
                                ${local.direccion ? `
                                    <div class="flex items-start gap-3 text-gray-500">
                                        <i data-lucide="navigation" class="w-4 h-4 shrink-0 mt-0.5"></i>
                                        <p class="text-sm font-medium uppercase">${local.direccion}</p>
                                    </div>
                                ` : ''}
                                ${local.telefono ? `
                                    <div class="flex items-center gap-3 text-gray-500">
                                        <i data-lucide="phone" class="w-4 h-4 shrink-0"></i>
                                        <p class="text-sm font-medium">${local.telefono}</p>
                                    </div>
                                ` : ''}
                                ${local.horario ? `
                                    <div class="flex items-center gap-3 text-gray-500">
                                        <i data-lucide="clock" class="w-4 h-4 shrink-0"></i>
                                        <p class="text-sm font-medium uppercase">${local.horario}</p>
                                    </div>
                                ` : ''}
                            </div>

                            <div class="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Local Activo</span>
                                </div>
                                ${local.maps_url ? `
                                    <a href="${local.maps_url}" target="_blank" class="text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 transition-transform hover:scale-105">
                                        Ver en Maps <i data-lucide="external-link" class="w-3 h-3"></i>
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                    ${locals.length === 0 ? `
                        <div class="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
                            <i data-lucide="building-2" class="w-12 h-12 text-gray-200 mx-auto mb-4"></i>
                            <p class="text-gray-400 font-bold uppercase tracking-widest text-sm">No has registrado ningún local aún</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Eventos
        const btnNew = document.getElementById('btnNewLocal');
        if (btnNew) btnNew.onclick = () => this.renderLocalModal().then(data => onEdit(null, data));

        container.querySelectorAll('.btn-edit-local').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const local = locals.find(l => l.id === id);
                this.renderLocalModal(local).then(data => onEdit(id, data));
            };
        });

        container.querySelectorAll('.btn-delete-local').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                if (confirm('¿Estás seguro de eliminar este local?')) {
                    onDelete(id);
                }
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
            <div id="modalLocal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                    <div class="px-10 py-8 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h3 class="text-2xl font-black tracking-tight">${isEdit ? 'Editar Sucursal' : 'Nueva Sucursal'}</h3>
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Completa los datos del punto de venta</p>
                        </div>
                        <button id="closeLocalModal" class="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/10 transition active:scale-90">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <form id="formLocal" class="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2 md:col-span-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre del Local *</label>
                            <input type="text" name="nombre" required value="${isEdit ? local.nombre : ''}" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase placeholder:text-gray-300" placeholder="EJ: CASA MATRIZ / SUCURSAL 1">
                        </div>
                        
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad *</label>
                            <input type="text" name="ciudad" required value="${isEdit ? local.ciudad : ''}" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase placeholder:text-gray-300" placeholder="EJ: ASUNCIÓN">
                        </div>

                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono de contacto</label>
                            <input type="text" name="telefono" value="${isEdit ? (local.telefono || '') : ''}" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold placeholder:text-gray-300" placeholder="EJ: 0981 123 456">
                        </div>

                        <div class="space-y-2 md:col-span-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Exacta</label>
                            <input type="text" name="direccion" value="${isEdit ? (local.direccion || '') : ''}" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase placeholder:text-gray-300" placeholder="EJ: AVDA. MARISCAL LÓPEZ 1234">
                        </div>

                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horarios de Atención</label>
                            <input type="text" name="horario" value="${isEdit ? (local.horario || '') : ''}" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase placeholder:text-gray-300" placeholder="EJ: LUN A VIE 08:00 A 18:00">
                        </div>

                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link Google Maps</label>
                            <input type="url" name="maps_url" value="${isEdit ? (local.maps_url || '') : ''}" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold placeholder:text-gray-300" placeholder="https://maps.google.com/...">
                        </div>
                        
                        <div class="pt-6 md:col-span-2">
                            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                                <i data-lucide="${isEdit ? 'save' : 'check-circle'}" class="w-6 h-6"></i>
                                <span class="text-lg uppercase tracking-tight">${isEdit ? 'Guardar Cambios' : 'Confirmar y Crear'}</span>
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

        // Forzar mayúsculas en campos específicos
        const upperFields = ['nombre', 'ciudad', 'direccion', 'horario'];
        upperFields.forEach(name => {
            const el = form.querySelector(`input[name="${name}"]`);
            if (el) el.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
        });

        return new Promise((resolve) => {
            form.onsubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                // Normalización final
                upperFields.forEach(f => { if (data[f]) data[f] = data[f].toUpperCase().trim(); });
                if (data.telefono) data.telefono = data.telefono.trim();
                if (data.maps_url) data.maps_url = data.maps_url.trim();

                close();
                resolve(data);
            };
            if (window.lucide) lucide.createIcons();
        });
    }
};
