export const clientUI = {
    renderClientGrid(clients, onClientClick) {
        const grid = document.getElementById('clientGrid');
        if (!grid) return;

        if (clients.length === 0) {
            const isSearching = document.getElementById('searchClient')?.value.length > 0;
            grid.innerHTML = `
                <div class="col-span-full py-20 text-center animate-in fade-in duration-500 flex flex-col items-center">
                    <div class="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                        <i data-lucide="search-x" class="w-10 h-10 text-slate-400"></i>
                    </div>
                    <p class="text-gray-500 text-lg font-medium">
                        ${isSearching ? 'No se encontraron clientes que coincidan con tu búsqueda.' : 'No hay clientes registrados.'}
                    </p>
                </div>
            `;
            return;
        }

        grid.innerHTML = clients.map(c => `
            <div class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group border border-gray-100 cursor-pointer client-card p-6" data-id="${c.id}">
                <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <i data-lucide="contact-2" class="w-6 h-6"></i>
                    </div>
                    <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                        <i data-lucide="user" class="w-3 h-3"></i> ${c.id.substring(0, 8)}
                    </span>
                </div>
                
                <h3 class="font-bold text-gray-900 text-lg truncate mb-1 uppercase">${c.nombre}</h3>
                <p class="text-sm text-gray-500 mb-4 font-medium flex items-center gap-2">
                    <i data-lucide="id-card" class="w-4 h-4 text-blue-500"></i> ${c.nro_documento}
                </p>
                
                <div class="space-y-2 border-t pt-4">
                    <div class="flex items-center text-xs text-gray-500 gap-2">
                        <i data-lucide="phone" class="w-3.5 h-3.5 text-blue-400"></i> ${c.telefono || 'Sin teléfono'}
                    </div>
                    <div class="flex items-center text-xs text-gray-500 gap-2 truncate">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-blue-400"></i> ${c.direccion || 'Sin dirección'}
                    </div>
                    <div class="flex items-center text-xs text-gray-400 gap-2 truncate italic">
                        <i data-lucide="mail" class="w-3.5 h-3.5 text-blue-400"></i> ${c.email || 'Sin email'}
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.client-card').forEach(card => {
            card.onclick = () => {
                const id = card.getAttribute('data-id');
                const client = clients.find(c => c.id === id);
                if (onClientClick) onClientClick(client);
            };
        });

        if (window.lucide) lucide.createIcons();
    },

    renderClientModal(client = null) {
        const isEdit = !!client;
        const modalHtml = `
            <div id="modalClient" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
                    <div class="p-8 pb-4 flex justify-between items-center bg-slate-50 border-b border-gray-100">
                        <div>
                            <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">${isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <p class="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">CRM • autoPlaya v2</p>
                        </div>
                        <button id="closeClientModal" class="w-10 h-10 rounded-full bg-white text-slate-400 hover:text-slate-900 flex items-center justify-center transition shadow-sm border border-gray-100">
                             <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <form id="formClient" class="p-8 space-y-5">
                        <div class="grid grid-cols-1 gap-5">
                            <div class="space-y-1.5">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo / Razón Social *</label>
                                <input type="text" name="nombre" value="${client?.nombre || ''}" required placeholder="EJ: JUAN PÉREZ"
                                    class="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm uppercase">
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1.5">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CI / RUC *</label>
                                    <input type="text" name="nro_documento" value="${client?.nro_documento || ''}" required placeholder="EJ: 1234567-8"
                                        class="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm uppercase">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                                    <input type="text" name="telefono" value="${client?.telefono || ''}" placeholder="EJ: 0981 123456"
                                        class="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm uppercase">
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Particular/Comercial</label>
                                <input type="text" name="direccion" value="${client?.direccion || ''}" placeholder="EJ: AVDA. ESPAÑA 123"
                                    class="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm uppercase">
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <input type="email" name="email" value="${client?.email || ''}" placeholder="EJ: CONTACTO@EJEMPLO.COM"
                                    class="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-sm uppercase">
                            </div>
                        </div>

                        <div class="pt-6 flex gap-3">
                            <button type="button" id="btnDeleteClient" class="${isEdit ? '' : 'hidden'} flex-1 px-6 py-4 border-2 border-red-50 hover:bg-red-50 text-red-500 font-black rounded-2xl transition uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                                <i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar
                            </button>
                            <button type="submit" id="btnSaveClient" class="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3">
                                <i data-lucide="${isEdit ? 'save' : 'plus'}" class="w-5 h-5"></i>
                                <span>${isEdit ? 'Actualizar' : 'Guardar Cliente'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('modalClient');
        const closeModal = () => modal.remove();

        document.getElementById('closeClientModal').onclick = closeModal;

        // Cerrar al clickear afuera
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        if (window.lucide) lucide.createIcons();

        return {
            form: document.getElementById('formClient'),
            btnDelete: document.getElementById('btnDeleteClient'),
            closeModal
        };
    },

    renderSkeletons() {
        const grid = document.getElementById('clientGrid');
        if (!grid) return;

        grid.innerHTML = Array(4).fill(0).map(() => `
            <div class="bg-white rounded-2xl p-6 border border-gray-50 animate-pulse space-y-4">
                <div class="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div class="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                <div class="h-4 bg-gray-100 rounded-lg w-1/2"></div>
                <div class="space-y-2 pt-4 border-t border-gray-50">
                    <div class="h-3 bg-gray-50 rounded w-full"></div>
                    <div class="h-3 bg-gray-50 rounded w-2/3"></div>
                </div>
            </div>
        `).join('');
    }
};
