import { security } from '../utils/security.js';

/**
 * Formatea moneda a Guaraníes (PYG) sin decimales.
 */
const formatPYG = (amount) => {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0
    }).format(amount);
};

export const inventoryUI = {
    /**
     * Componente de Paginación Premium
     */
    renderPagination(pagination) {
        if (!pagination || pagination.totalPages <= 1) return '';

        const isFirst = pagination.page <= 1;
        const isLast = pagination.page >= pagination.totalPages;

        const start = (pagination.page - 1) * pagination.pageSize + 1;
        const end = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

        return `
            <div class="col-span-full mt-16 mb-12 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <!-- Barra de Navegación Principal -->
                <div class="flex items-center bg-white/90 backdrop-blur-xl p-2 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-slate-200/50 gap-2 sm:gap-6">
                    
                    <!-- Botón Anterior -->
                    <button id="prevPage" ${isFirst ? 'disabled' : ''} 
                        class="w-14 h-14 flex items-center justify-center rounded-[1.5rem] transition-all duration-300 
                        ${isFirst ? 'bg-gray-50 text-gray-200 cursor-not-allowed' : 'bg-slate-50 text-slate-700 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-200 active:scale-90'}">
                        <i data-lucide="chevron-left" class="w-6 h-6" stroke-width="3"></i>
                    </button>
                    
                    <!-- Indicador de Página Central -->
                    <div class="px-6 sm:px-10 py-2 flex flex-col items-center min-w-[140px] border-x border-gray-50">
                        <span class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Página</span>
                        <div class="flex items-baseline gap-2">
                            <span class="text-3xl font-black text-slate-900 tabular-nums">${pagination.page}</span>
                            <span class="text-sm font-bold text-slate-300 uppercase italic">de ${pagination.totalPages}</span>
                        </div>
                    </div>

                    <!-- Botón Siguiente -->
                    <button id="nextPage" ${isLast ? 'disabled' : ''} 
                        class="w-14 h-14 flex items-center justify-center rounded-[1.5rem] transition-all duration-300 
                        ${isLast ? 'bg-gray-50 text-gray-200 cursor-not-allowed' : 'bg-slate-50 text-slate-700 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-200 active:scale-90'}">
                        <i data-lucide="chevron-right" class="w-6 h-6" stroke-width="3"></i>
                    </button>
                </div>

                <!-- Contador de Resultados Inferior -->
                <div class="flex flex-col items-center gap-1">
                    <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500/20"></span>
                        Mostrando <span class="text-slate-600">${start} a ${end}</span> de <span class="text-slate-600">${pagination.totalRecords}</span> vehículos
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500/20"></span>
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza la grilla de vehículos con soporte para paginación.
     */
    renderVehicleGrid(vehicles, onVehicleClick, pagination = null) {
        const grid = document.getElementById('vehicleGrid');
        const counter = document.getElementById('vehicleCount');
        if (!grid) return;

        // Actualizar contador si existe
        if (counter && pagination) {
            counter.textContent = `${pagination.totalRecords} Vehículos`;
            counter.classList.remove('hidden');
        }

        if (vehicles.length === 0) {
            const isSearching = document.getElementById('searchVehicle')?.value.length > 0;
            grid.innerHTML = `
                <div class="col-span-full py-20 text-center animate-in fade-in duration-500">
                    <div class="flex justify-center mb-6">
                        <div class="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                             <i data-lucide="search-x" class="w-10 h-10"></i>
                        </div>
                    </div>
                    <p class="text-gray-500 text-lg font-medium">
                        ${isSearching ? 'No se encontraron vehículos que coincidan con tu búsqueda.' : 'No hay vehículos registrados en este patio.'}
                    </p>
                    ${isSearching ? '<button onclick="document.getElementById(\'searchVehicle\').value=\'\'; document.getElementById(\'searchVehicle\').dispatchEvent(new Event(\'input\'))" class="mt-4 text-blue-600 font-bold hover:underline">Limpiar búsqueda</button>' : ''}
                </div>
            `;
            return;
        }

        let gridHtml = vehicles.map(v => {
            const photoCount = v.fotos ? v.fotos.length : 0;
            const mainPhoto = photoCount > 0 ? v.fotos[0] : 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400';
            
            const marca = security.esc(v.marca);
            const modelo = security.esc(v.modelo);
            const color = security.esc(v.color || 'S/C');
            const local = security.esc(v.locales?.nombre || 'Central');

            return `
                <div class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group border border-gray-100 cursor-pointer vehicle-card animate-in fade-in duration-500" data-id="${v.id}">
                    <!-- Image -->
                    <div class="relative h-48 overflow-hidden">
                        <img src="${mainPhoto}" alt="${marca} ${modelo}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute top-3 right-3 flex flex-col gap-2 items-end">
                            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${v.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                    v.estado === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                }">
                                ${v.estado}
                            </span>
                            ${photoCount > 1 ? `
                                <span class="bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                    <i data-lucide="camera" class="w-3 h-3"></i> 1/${photoCount}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Details -->
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-gray-900 text-lg truncate flex-1">${marca} ${modelo}</h3>
                            <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">${color}</span>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">${v.anho} • ${v.combustible} • ${v.transmision}</p>
                        
                        <div class="space-y-1 mb-4">
                            <div class="flex justify-between items-end">
                                <span class="text-xs text-gray-400 uppercase font-semibold">Contado</span>
                                <span class="font-bold text-blue-600 text-lg">${formatPYG(v.precio_contado)}</span>
                            </div>
                            <div class="flex justify-between items-end">
                                <span class="text-xs text-gray-400 uppercase font-semibold">Lista</span>
                                <span class="font-semibold text-gray-700">${formatPYG(v.precio_lista)}</span>
                            </div>
                        </div>
 
                        <div class="flex items-center text-xs text-gray-400 border-t pt-3 justify-between">
                            <div class="flex items-center">
                                <i data-lucide="map-pin" class="mr-1 w-3 h-3"></i> ${local}
                            </div>
                            <span class="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                STOCK ${v.nro_stock ? v.nro_stock.toString().padStart(5, '0') : '-----'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Añadir controles de paginación si existen
        if (pagination && pagination.totalPages > 1) {
            gridHtml += this.renderPagination(pagination);
        }

        grid.innerHTML = gridHtml;

        // Eventos Clic Tarjetas
        document.querySelectorAll('.vehicle-card').forEach(card => {
            card.onclick = () => {
                const id = card.getAttribute('data-id');
                const vehicle = vehicles.find(v => v.id === id);
                if (onVehicleClick) onVehicleClick(vehicle);
            };
        });

        // Eventos Paginación
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (prevBtn && pagination.page > 1) {
            prevBtn.onclick = () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                pagination.onPageChange(pagination.page - 1);
            };
        }

        if (nextBtn && pagination.page < pagination.totalPages) {
            nextBtn.onclick = () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                pagination.onPageChange(pagination.page + 1);
            };
        }

        // Refrescar iconos Lucide
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Renderiza esqueletos de carga animados.
     */
    renderSkeletons() {
        const grid = document.getElementById('vehicleGrid');
        if (!grid) return;

        grid.innerHTML = Array(6).fill(0).map(() => `
            <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-50 animate-pulse">
                <div class="h-48 bg-gray-200"></div>
                <div class="p-6 space-y-4">
                    <div class="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                    <div class="h-4 bg-gray-100 rounded-lg w-1/2"></div>
                    <div class="pt-4 space-y-3">
                        <div class="flex justify-between">
                            <div class="h-4 bg-gray-100 rounded w-1/4"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div class="flex justify-between">
                            <div class="h-4 bg-gray-100 rounded w-1/4"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Renderiza la vista de detalle (visualizador) de un vehículo.
     */
    renderVehicleDetailModal(vehicle, onEdit, onDelete, isReadOnly = false) {
        let currentPhotoIndex = 0;
        const photos = vehicle.fotos && vehicle.fotos.length > 0 ? vehicle.fotos : ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'];

        const marca = security.esc(vehicle.marca);
        const modelo = security.esc(vehicle.modelo);
        const color = security.esc(vehicle.color || '-');
        const chapa = security.esc(vehicle.chapa || 'SIN CHAPA');
        const combustible = security.esc(vehicle.combustible);
        const transmision = security.esc(vehicle.transmision);
        const local = security.esc(vehicle.locales?.nombre || 'Central');
        const chasis = security.esc(vehicle.nro_chasis || 'S/N');
        const descripcion = security.esc(vehicle.descripcion);

        const modalHtml = `
            <div id="modalDetail" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                <div class="bg-gray-50 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                    
                    <!-- Galería de Fotos -->
                    <div class="relative h-[40vh] sm:h-[50vh] bg-black group">
                        <img id="mainDetailPhoto" src="${photos[0]}" alt="${marca}" class="w-full h-full object-contain transition-all duration-500">
                        
                        <!-- Controles de Galería -->
                        ${photos.length > 1 ? `
                            <button id="prevPhoto" class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition opacity-0 group-hover:opacity-100">❮</button>
                            <button id="nextPhoto" class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition opacity-0 group-hover:opacity-100">❯</button>
                            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5" id="photoIndicators">
                                ${photos.map((_, i) => `<div class="w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-white w-4' : 'bg-white/40'}" data-index="${i}"></div>`).join('')}
                            </div>
                        ` : ''}

                        <!-- Badge de Estado -->
                        <div class="absolute top-6 right-6">
                            <span class="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg ${vehicle.estado === 'disponible' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}">
                                ${vehicle.estado}
                            </span>
                        </div>

                        <!-- Botón de Cierre -->
                        <button id="closeDetail" class="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition text-2xl font-light">×</button>
                    </div>

                    <!-- Información -->
                    <div class="p-8 max-h-[40vh] overflow-y-auto custom-scrollbar">
                        <div class="mb-8">
                            <h2 class="text-3xl font-black text-gray-900 leading-tight uppercase">${marca} ${modelo}</h2>
                            <p class="text-gray-400 font-bold tracking-widest uppercase text-sm mt-1">${vehicle.anho} • ${combustible} • ${transmision}</p>
                        </div>

                        <!-- Grid de Datos -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-1">Color</p>
                                <p class="font-bold text-gray-800 uppercase truncate">${color}</p>
                            </div>
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-1">Chapa</p>
                                <p class="font-bold text-gray-800 uppercase truncate">${chapa}</p>
                            </div>
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-1">Transmisión</p>
                                <p class="font-bold text-gray-800 uppercase truncate">${transmision}</p>
                            </div>
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <p class="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-1">Local</p>
                                <p class="font-bold text-gray-800 uppercase truncate">${local}</p>
                            </div>
                        </div>

                        <!-- Precios Destacados -->
                        <div class="flex flex-col sm:flex-row gap-4 mb-8">
                            <div class="flex-1 bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20">
                                <p class="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1 opacity-80">Precio Contado</p>
                                <p class="text-3xl font-black italic tracking-tighter">${formatPYG(vehicle.precio_contado)}</p>
                            </div>
                            <div class="flex-1 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Precio Lista / Financiado</p>
                                <p class="text-2xl font-black text-gray-700 italic tracking-tighter">${formatPYG(vehicle.precio_lista)}</p>
                                ${vehicle.entrega_minima > 0 ? `
                                    <div class="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <span class="text-[9px] font-black text-green-600 uppercase tracking-widest">Entrega Mínima</span>
                                        <span class="text-sm font-black text-green-600">${formatPYG(vehicle.entrega_minima)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex justify-between px-2">
                           <span>NRO. CHASIS: ${chasis}</span>
                           <span class="text-blue-500 font-black">STOCK ${vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : '-----'}</span>
                        </div>

                        <!-- Nueva Sección: Descripción -->
                        ${vehicle.descripcion ? `
                            <div class="mb-8 py-5 border-y border-gray-100 italic">
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Información técnica y Extras</p>
                                <p class="text-sm font-bold text-gray-700 leading-relaxed uppercase">${descripcion}</p>
                            </div>
                        ` : ''}

                        <!-- Acciones -->
                        ${!isReadOnly ? `
                        <div class="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                            <button id="btnDeleteDetail" class="px-6 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all active:scale-95 flex items-center gap-2">
                                <i data-lucide="trash-2" class="w-4 h-4"></i> Borrar
                            </button>
                            <button id="btnEditDetail" class="bg-gray-100 hover:bg-gray-200 text-slate-800 font-bold py-4 px-6 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                <i data-lucide="edit-3" class="w-4 h-4"></i> Editar
                            </button>
                            ${vehicle.estado === 'disponible' ? `
                                <button id="btnStartSale" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                    <i data-lucide="dollar-sign" class="w-5 h-5"></i> Iniciar Venta
                                </button>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        if (window.lucide) lucide.createIcons();

        const modal = document.getElementById('modalDetail');
        const mainPhoto = document.getElementById('mainDetailPhoto');
        const indicators = document.querySelectorAll('#photoIndicators > div');

        const updatePhoto = (index) => {
            currentPhotoIndex = (index + photos.length) % photos.length;
            mainPhoto.style.opacity = '0';
            setTimeout(() => {
                mainPhoto.src = photos[currentPhotoIndex];
                mainPhoto.style.opacity = '1';
                // Actualizar indicadores
                if (indicators.length > 0) {
                    indicators.forEach((ind, i) => {
                        ind.className = `w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-4' : 'bg-white/40'}`;
                    });
                }
            }, 200);
        };

        // Eventos Galería
        const nextBtn = document.getElementById('nextPhoto');
        const prevBtn = document.getElementById('prevPhoto');
        if (nextBtn) nextBtn.onclick = () => updatePhoto(currentPhotoIndex + 1);
        if (prevBtn) prevBtn.onclick = () => updatePhoto(currentPhotoIndex - 1);

        // Cierre
        const close = () => {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        };
        document.getElementById('closeDetail').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };

        // Acciones
        if (!isReadOnly) {
            document.getElementById('btnEditDetail').onclick = () => {
                close();
                if (onEdit) onEdit(vehicle);
            };
            document.getElementById('btnDeleteDetail').onclick = () => {
                if (onDelete) onDelete(vehicle);
            };
        }
    },

    /**
     * Renderiza el modal para cargar o editar vehículos.
     */
    renderVehicleModal(locals, vehicle = null) {
        const isEdit = !!vehicle;
        
        // Sanitizar valores para el formulario
        const vMarca = isEdit ? security.esc(vehicle.marca) : '';
        const vModelo = isEdit ? security.esc(vehicle.modelo) : '';
        const vAnho = isEdit ? vehicle.anho : '';
        const vColor = isEdit ? security.esc(vehicle.color || '') : '';
        const vChapa = isEdit ? security.esc(vehicle.chapa || '') : '';
        const vChasis = isEdit ? security.esc(vehicle.nro_chasis || '') : '';
        const vEntrega = isEdit ? vehicle.entrega_minima : '';
        const vPrecio = isEdit ? vehicle.precio_contado : '';
        const vDesc = isEdit ? security.esc(vehicle.descripcion || '') : '';

        const modalHtml = `
            <div id="modalVehicle" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 transform border border-gray-100">
                    <!-- Modal Header -->
                    <div class="px-8 py-6 bg-slate-900 text-white flex justify-between items-center relative">
                        <div>
                            <h3 class="text-2xl font-black tracking-tight">${isEdit ? 'Editar Vehículo' : 'Cargar Vehículo'}</h3>
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">${isEdit ? 'Actualizar información de stock' : 'Nuevo ingreso al inventario'}</p>
                        </div>
                        <button id="closeModal" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition text-2xl">&times;</button>
                    </div>

                    <!-- Modal Body (Scrollable) -->
                    <form id="formVehicle" class="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Marca y Modelo -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Marca *</label>
                                <input type="text" name="marca" required value="${vMarca}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase" placeholder="EJ: TOYOTA">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modelo *</label>
                                <input type="text" name="modelo" required value="${vModelo}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase" placeholder="EJ: HILUX">
                            </div>

                            <!-- Año y Color -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Año *</label>
                                <input type="text" name="anho" required value="${vAnho}" maxlength="4" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold" placeholder="EJ: 2024">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Color *</label>
                                <input type="text" name="color" required value="${vColor}" placeholder="Ej: Blanco" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase">
                            </div>

                            <!-- Chapa y Chasis -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapa</label>
                                <input type="text" name="chapa" value="${vChapa}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold placeholder:text-gray-300 uppercase" placeholder="ABC 123">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nro de Chasis</label>
                                <input type="text" name="nro_chasis" value="${vChasis}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase placeholder:text-gray-300" placeholder="OPCIONAL">
                            </div>

                            <!-- Local y Estado -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Local *</label>
                                <select name="local_id" required class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold appearance-none">
                                    <option value="">Seleccione...</option>
                                    ${locals.map(l => `<option value="${l.id}" ${isEdit && vehicle.local_id === l.id ? 'selected' : ''}>${l.nombre}</option>`).join('')}
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado de Venta *</label>
                                <select name="estado" required class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold appearance-none">
                                     <option value="disponible" ${isEdit && vehicle.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
                                     <option value="reservado" ${isEdit && vehicle.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
                                     ${isEdit && (vehicle.estado === 'vendido' || vehicle.estado === 'entregado') ? `
                                         <option value="${vehicle.estado}" selected class="capitalize">${vehicle.estado}</option>
                                     ` : ''}
                                 </select>
                            </div>

                            <!-- Transmisión y Combustible -->
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transmisión *</label>
                                <select name="transmision" required class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold appearance-none">
                                    <option value="manual" ${isEdit && vehicle.transmision === 'manual' ? 'selected' : ''}>Manual</option>
                                    <option value="automatica" ${isEdit && vehicle.transmision === 'automatica' ? 'selected' : ''}>Automática</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Combustible *</label>
                                <select name="combustible" required class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold appearance-none">
                                    <option value="nafta" ${isEdit && vehicle.combustible === 'nafta' ? 'selected' : ''}>Nafta</option>
                                    <option value="diesel" ${isEdit && vehicle.combustible === 'diesel' ? 'selected' : ''}>Diesel</option>
                                    <option value="flex" ${isEdit && vehicle.combustible === 'flex' ? 'selected' : ''}>Flex</option>
                                </select>
                            </div>

                             <!-- Precios -->
                             <div class="space-y-2">
                                 <label class="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Precio Contado (PYG) *</label>
                                 <input type="text" name="precio_contado" data-type="currency" required value="${isEdit ? security.esc(formatPYG(vehicle.precio_contado).replace(/[^\d]/g, '')) : ''}" class="w-full px-5 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-blue-600 text-lg">
                             </div>
                             <div class="space-y-2">
                                 <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio Lista / Financiado</label>
                                 <input type="text" name="precio_lista" data-type="currency" value="${isEdit ? security.esc(vehicle.precio_lista ? formatPYG(vehicle.precio_lista).replace(/[^\d]/g, '') : '') : ''}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-gray-700 text-lg" placeholder="OPCIONAL">
                             </div>
                             <div class="space-y-2">
                                 <label class="block text-[10px] font-black text-green-600 uppercase tracking-widest ml-1">Entrega Mínima</label>
                                 <input type="text" name="entrega_minima" data-type="currency" value="${isEdit ? security.esc(vehicle.entrega_minima ? formatPYG(vehicle.entrega_minima).replace(/[^\d]/g, '') : '') : ''}" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-green-600 text-lg" placeholder="OPCIONAL">
                             </div>
                         </div>
 
                         <!-- Descripción / Extras -->
                         <div class="space-y-2">
                             <div class="flex justify-between items-center ml-1">
                                 <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest font-black">Descripción / Extras</label>
                                 <span id="charCounter" class="text-[9px] font-black bg-gray-100 px-2 py-0.5 rounded-full text-gray-400 uppercase tracking-tighter">0 / 170</span>
                             </div>
                             <textarea name="descripcion" maxlength="170" rows="2" class="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold uppercase resize-none placeholder:text-gray-300" placeholder="Ej: Techo solar, Tapizado de cuero, Poco uso...">${vDesc}</textarea>
                         </div>

                        <!-- Fotos -->
                        <div class="pt-4 border-t border-gray-100">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-4">Galería de Imágenes</label>
                            <div id="photoContainer" class="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                ${isEdit && vehicle.fotos ? vehicle.fotos.map(url => `
                                    <div class="photo-item aspect-square relative rounded-2xl overflow-hidden shadow-sm group border border-gray-100 cursor-move" draggable="true" data-url="${url}">
                                        <img src="${url}" class="w-full h-full object-cover pointer-events-none">
                                        <button type="button" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-lg text-xs flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition btn-delete-photo">×</button>
                                    </div>
                                `).join('') : ''}
                                <label class="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group">
                                    <span class="text-3xl text-gray-300 group-hover:text-blue-400 transition-colors">+</span>
                                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-blue-500 transition-colors mt-1">Añadir</span>
                                    <input type="file" id="inputPhotos" multiple accept="image/*" class="hidden">
                                </label>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="pt-6 flex gap-4">
                            ${isEdit ? `
                                <button type="button" id="btnDeleteVehicle" class="px-6 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center">
                                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                                </button>
                            ` : ''}
                            <button type="submit" id="btnSave" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                                <i data-lucide="${isEdit ? 'save' : 'rocket'}" class="w-5 h-5"></i>
                                <span>${isEdit ? 'Actualizar Vehículo' : 'Guardar en Inventario'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this._initModalLogic(isEdit);
    },

    /**
     * Lógica interna del modal (Máscaras, Previsualización y Cierre)
     */
    _initModalLogic(isEdit) {
        const modal = document.getElementById('modalVehicle');
        const form = document.getElementById('formVehicle');
        const closeModal = document.getElementById('closeModal');
        const inputPhotos = document.getElementById('inputPhotos');
        const photoContainer = document.getElementById('photoContainer');
        const currencyInputs = form.querySelectorAll('input[data-type="currency"]');

        const selfDestruct = () => {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        };
        closeModal.onclick = selfDestruct;
        modal.onclick = (e) => { if (e.target === modal) selfDestruct(); };

        // Mascara de moneda inicial para edición
        currencyInputs.forEach(input => {
            if (input.value) {
                input.value = parseInt(input.value).toLocaleString('es-PY');
            }
            input.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, "");
                if (val) val = parseInt(val).toLocaleString('es-PY');
                e.target.value = val;
            });
        });

        // Forzar mayúsculas en tiempo real para campos de texto y textarea
        form.querySelectorAll('input[type="text"], textarea').forEach(input => {
            input.addEventListener('input', (e) => {
                // Si es el campo AÑO, permitir solo números
                if (e.target.name === 'anho') {
                    e.target.value = e.target.value.replace(/\D/g, "");
                } else {
                    e.target.value = e.target.value.toUpperCase();
                }

                // Si es el textarea de descripción, actualizar contador
                if (e.target.name === 'descripcion') {
                    const counter = document.getElementById('charCounter');
                    if (counter) {
                        const count = e.target.value.length;
                        counter.textContent = `${count}/170`;
                        counter.classList.toggle('text-blue-600', count > 0);
                        counter.classList.toggle('bg-blue-50', count > 0);
                    }
                }
            });
        });

        // Inicializar contador si es edición
        const descArea = form.querySelector('textarea[name="descripcion"]');
        if (descArea && descArea.value) {
            const counter = document.getElementById('charCounter');
            if (counter) counter.textContent = `${descArea.value.length}/170`;
        }


        // Previsualización de nuevas fotos con límite de 6 y Drag & Drop
        inputPhotos.onchange = (e) => {
            const files = Array.from(e.target.files);
            const currentPhotosCount = photoContainer.querySelectorAll('.photo-item').length;

            // Limitamos a un máximo de 6 fotos en total
            const remainingSpots = 6 - currentPhotosCount;
            const filesToProcess = files.slice(0, remainingSpots);

            filesToProcess.forEach(file => {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const div = document.createElement('div');
                    div.className = "photo-item aspect-square relative rounded-2xl overflow-hidden shadow-sm group border border-gray-100 cursor-move";
                    div.draggable = true;
                    div.innerHTML = `
                        <img src="${re.target.result}" class="w-full h-full object-cover pointer-events-none">
                        <button type="button" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-lg text-xs flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition btn-delete-photo">×</button>
                    `;
                    div.fileObj = file;

                    // Eventos Drag & Drop
                    this._addDragEvents(div);

                    div.querySelector('.btn-delete-photo').onclick = () => {
                        div.remove();
                        this._updateAddButtonVisibility();
                    };

                    photoContainer.querySelector('label').before(div);
                    this._updateAddButtonVisibility();
                };
                reader.readAsDataURL(file);
            });
        };

        // Inicializar drag events para fotos existentes (en caso de edición)
        photoContainer.querySelectorAll('.photo-item').forEach(item => {
            this._addDragEvents(item);
            const deleteBtn = item.querySelector('.btn-delete-photo');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    item.remove();
                    this._updateAddButtonVisibility();
                };
            }
        });

        this._updateAddButtonVisibility();
    },

    /**
     * Oculta el botón de añadir si se llega al límite de 6 fotos.
     */
    _updateAddButtonVisibility() {
        const photoContainer = document.getElementById('photoContainer');
        const addButton = photoContainer.querySelector('label');
        const count = photoContainer.querySelectorAll('.photo-item').length;

        if (count >= 6) {
            addButton.classList.add('hidden');
        } else {
            addButton.classList.remove('hidden');
        }
    },

    /**
     * Implementación nativa de Reordenamiento Drag & Drop
     */
    _addDragEvents(el) {
        // Prevenir menú contextual nativo en tablets (gesto long-press)
        el.addEventListener('contextmenu', (e) => e.preventDefault());

        el.addEventListener('dragstart', (e) => {
            el.classList.add('opacity-40', 'scale-95');
            e.dataTransfer.effectAllowed = 'move';
            window.draggedItem = el;
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('opacity-40', 'scale-95');
            window.draggedItem = null;
            document.querySelectorAll('.photo-item').forEach(i => i.classList.remove('border-blue-500', 'border-2'));
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (el !== window.draggedItem) {
                el.classList.add('border-blue-500', 'border-2');
            }
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('border-blue-500', 'border-2');
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('border-blue-500', 'border-2');

            if (el !== window.draggedItem) {
                const container = el.parentNode;
                const items = Array.from(container.querySelectorAll('.photo-item, label'));
                const draggedIdx = items.indexOf(window.draggedItem);
                const targetIdx = items.indexOf(el);

                if (draggedIdx < targetIdx) {
                    el.after(window.draggedItem);
                } else {
                    el.before(window.draggedItem);
                }
            }
        });
    },

    setLoading(isLoading, text = "Procesando...") {
        const btn = document.getElementById('btnSave');
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>${text}</span>
            `;
        } else {
            btn.disabled = false;
            btn.innerHTML = `
                <i data-lucide="save" class="w-5 h-5 mr-2"></i>
                <span>Guardar Cambios</span>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }
};
