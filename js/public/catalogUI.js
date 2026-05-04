import { catalogService } from './catalogService.js';
import { SUPABASE_CONFIG } from '../config.js'; // Importamos la config para el ID por defecto

// Protección XSS: escapa caracteres HTML antes de insertar datos de la DB en el DOM
const esc = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Lógica de Identificación de Playa:
 * 1. Intenta leer 'playa' de la URL (Ej: catalogo.html?playa=UUID) - Útil para pruebas.
 * 2. Si no hay en URL, usa el PLAYA_ID definido en js/config.js - Útil para dominios propios.
 */
const PLAYA_ID = new URLSearchParams(window.location.search).get('playa') || SUPABASE_CONFIG.PLAYA_ID;

const waNumber = "59599999999"; // TODO: cargar desde playas.configuracion
const catalogUI = {
    allVehicles: [], // Vehículos CARGADOS ACTUALMENTE
    currentPage: 1,
    pageSize: 6,
    isLoading: false,
    hasMore: true,
    searchTerm: '',

    async init() {
        if (window.lucide) lucide.createIcons();
        this.bindEvents();
        await this.loadMoreVehicles(); // Carga inicial
        this.setupInfiniteScroll();
    },

    bindEvents() {
        const searchInput = document.getElementById('searchInput');
        let timeout = null;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                this.searchTerm = e.target.value;
                this.resetCatalog(); // Al buscar de cero, reseteamos todo
                await this.loadMoreVehicles();
            }, 300); // Debounce
        });

        // Eventos del Modal
        document.getElementById('modalBackdrop').addEventListener('click', () => this.closeModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
    },

    setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (this.isLoading || !this.hasMore) return;

            // Detectar si estamos cerca del final (100px antes)
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) {
                this.loadMoreVehicles();
            }
        });
    },

    resetCatalog() {
        this.allVehicles = [];
        this.currentPage = 1;
        this.hasMore = true;
        document.getElementById('catalogGrid').innerHTML = ''; // Limpiar grilla
    },

    async loadMoreVehicles() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        this.showLoadingIndicator(true);

        try {
            const newVehicles = await catalogService.getPublicInventory({ 
                searchTerm: this.searchTerm, 
                page: this.currentPage, 
                pageSize: this.pageSize,
                playaId: PLAYA_ID
            });

            if (newVehicles.length < this.pageSize) {
                this.hasMore = false; // Ya no hay más para cargar
            }

            this.allVehicles = [...this.allVehicles, ...newVehicles];
            this.appendVehiclesToGrid(newVehicles);
            this.updateTotalCount(this.allVehicles.length);
            
            this.currentPage++;
        } catch (error) {
            console.error('Error cargando vehículos:', error);
            if (this.allVehicles.length === 0) {
                document.getElementById('catalogGrid').innerHTML = `<div class="col-span-full py-10 text-center text-rose-500 font-bold text-sm">Error al cargar el catálogo.</div>`;
            }
        } finally {
            this.isLoading = false;
            this.showLoadingIndicator(false);
        }
    },

    updateTotalCount(count) {
        const countSpan = document.getElementById('vehicleCount');
        if (countSpan) countSpan.textContent = `${count} VEHÍCULOS MOSTRADOS`;
    },

    showLoadingIndicator(show) {
        let loader = document.getElementById('scrollLoader');
        if (!loader && show) {
            loader = document.createElement('div');
            loader.id = 'scrollLoader';
            loader.className = 'col-span-full py-10 flex justify-center';
            loader.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>';
            document.getElementById('catalogGrid').appendChild(loader);
        } else if (loader && !show) {
            loader.remove();
        }
    },

    appendVehiclesToGrid(vehicles) {
        const grid = document.getElementById('catalogGrid');
        
        if (this.allVehicles.length === 0 && vehicles.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center opacity-70">
                    <i data-lucide="car" class="w-12 h-12 text-slate-300 mb-4"></i>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">No encontramos vehículos</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        const html = vehicles.map(v => {
            const mainImg = (v.fotos && v.fotos.length > 0) ? v.fotos[0] : 'https://placehold.co/600x400/f8fafc/94a3b8?text=Sin+Foto';
            const price = this.formatMoney(v.precio_contado || v.precio_lista);
            const marca = esc(v.marca);
            const modelo = esc(v.modelo);
            const sucursal = esc(v.locales?.nombre || 'Sucursal Principal');

            return `
                <div class="bg-white rounded-[2rem] shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col group cursor-pointer hover:shadow-xl transition-all duration-300 transform md:hover:-translate-y-1">
                    <div class="relative h-56 bg-slate-100 overflow-hidden" onclick="window.catalogUI.showDetails('${v.id}')">
                        <img src="${mainImg}" alt="${marca} ${modelo}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                        <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-lg border border-white/50">
                            ${v.anho}
                        </div>
                    </div>
                    <div class="p-5 flex flex-col flex-1 space-y-4">
                        <div class="flex-1" onclick="window.catalogUI.showDetails('${v.id}')">
                            <h2 class="text-lg font-black text-slate-900 leading-tight uppercase tracking-tighter line-clamp-2">${marca} ${modelo}</h2>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${sucursal}</p>
                            <div class="mt-4 flex items-baseline text-blue-600 gap-1">
                                <span class="text-[10px] font-bold uppercase tracking-widest align-top mt-1">Gs.</span>
                                <span class="text-xl font-black tracking-tighter">${price}</span>
                            </div>
                        </div>
                        <div class="flex gap-2 pt-2 border-t border-slate-50 mt-2">
                            <button onclick="window.catalogUI.showDetails('${v.id}')" class="flex-1 bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
                                <i data-lucide="eye" class="w-4 h-4"></i> Ver más
                            </button>
                            ${this.getWhatsAppButtonSmall(v)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        while (wrapper.firstChild) {
            grid.appendChild(wrapper.firstChild);
        }

        if (window.lucide) lucide.createIcons();
    },

    showDetails(id) {
        const vehicle = this.allVehicles.find(v => v.id === id);
        if (!vehicle) return;

        const content = document.getElementById('modalContent');
        const price = this.formatMoney(vehicle.precio_contado || vehicle.precio_lista);
        const images = (vehicle.fotos && vehicle.fotos.length > 0) ? vehicle.fotos : ['https://placehold.co/600x400/f8fafc/94a3b8?text=Sin+Foto'];
        const marca = esc(vehicle.marca);
        const modelo = esc(vehicle.modelo);
        const observaciones = esc(vehicle.observaciones);

        content.innerHTML = `
            <!-- Galeria -->
            <div class="w-full bg-slate-50 relative">
                <div class="flex snap-x snap-mandatory overflow-x-auto no-scrollbar scroll-smooth snap-start pb-2" style="scroll-snap-type: x mandatory;">
                    ${images.map(img => `
                        <div class="shrink-0 w-full h-[35vh] sm:h-80 relative snap-center">
                            <img src="${img}" class="w-full h-full object-cover sm:object-contain absolute inset-0" alt="Foto">
                        </div>
                    `).join('')}
                </div>
                ${images.length > 1 ? `<div class="absolute bottom-6 right-4 bg-black/60 backdrop-blur-md text-white text-[9px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-lg border border-white/20">${images.length} Fotos (Desliza) 👉</div>` : ''}
            </div>

            <!-- Header Detalles -->
            <div class="p-6 bg-white border-b border-slate-50 relative -mt-4 rounded-t-[2.5rem] z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <div class="flex justify-between items-start gap-4 mb-2">
                    <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">${marca} <br/><span class="text-slate-500">${modelo}</span></h2>
                    <div class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-sm text-center border border-blue-100/50 shadow-sm ml-auto">
                        ${vehicle.anho}
                    </div>
                </div>
                
                <div class="flex items-baseline text-emerald-600 gap-1 mt-6">
                    <span class="text-[10px] font-bold uppercase tracking-widest align-top mt-1">Precio Contado</span>
                    <span class="text-3xl font-black tracking-tighter ml-1">Gs. ${price}</span>
                </div>
            </div>

            <!-- Ficha Técnica -->
            <div class="p-6 space-y-6">
                <div>
                    <h3 class="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4">Especificaciones</h3>
                    <div class="grid grid-cols-2 gap-4">
                        ${this.renderSpecItem('car-front', 'Marca', vehicle.marca)}
                        ${this.renderSpecItem('bar-chart-2', 'Modelo', vehicle.modelo)}
                        ${this.renderSpecItem('palette', 'Color', vehicle.color || '-')}
                        ${this.renderSpecItem('cog', 'Transmisión', vehicle.transmision || 'A Consultar')}
                        ${this.renderSpecItem('fuel', 'Combustible', vehicle.combustible || 'A Consultar')}
                        ${this.renderSpecItem('hash', 'Ref. Stock', vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : '-')}
                    </div>
                </div>

                ${vehicle.observaciones ? `
                    <div class="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                        <h3 class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Notas Adicionales</h3>
                        <p class="text-xs text-slate-600 leading-relaxed font-bold whitespace-pre-line">${observaciones}</p>
                    </div>
                ` : ''}
            </div>

            <!-- Floating CTA Action -->
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20">
                ${this.getWhatsAppButtonLarge(vehicle)}
            </div>
            
            <div class="h-10"></div> <!-- Espaciador Extra -->
        `;

        this.openModal();
        if (window.lucide) lucide.createIcons();
    },

    openModal() {
        document.getElementById('modalBackdrop').classList.add('open');
        document.getElementById('vehicleModal').classList.add('open');
        document.body.style.overflow = 'hidden'; // Previene scroll del body en background
    },

    closeModal() {
        document.getElementById('modalBackdrop').classList.remove('open');
        document.getElementById('vehicleModal').classList.remove('open');
        document.body.style.overflow = '';
    },

    renderSpecItem(icon, label, value) {
        const safeValue = esc(value);
        return `
            <div class="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-50 shadow-sm shadow-slate-100/50">
                <div class="bg-slate-50 w-8 h-8 rounded-xl flex justify-center items-center shrink-0">
                    <i data-lucide="${icon}" class="w-4 h-4 text-slate-400"></i>
                </div>
                <div class="overflow-hidden">
                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 opacity-70">${label}</p>
                    <p class="text-[11px] font-bold text-slate-700 uppercase break-words leading-tight line-clamp-2">${safeValue}</p>
                </div>
            </div>
        `;
    },

    getWhatsAppButtonSmall(vehicle) {
        const text = encodeURIComponent(`Hola! Vengo del catálogo web. Me interesa este vehículo:\n*${vehicle.marca} ${vehicle.modelo} ${vehicle.anho}*\n(Ref/Stock: #${vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : 'S/D'})`);
        return `
            <a href="https://wa.me/${waNumber}?text=${text}" target="_blank" 
               class="active:scale-[0.9] transition-transform flex justify-center items-center">
                <img src="./img/whatsapp.svg" alt="WA" class="w-10 h-10">
            </a>
        `;
    },

    getWhatsAppButtonLarge(vehicle) {
        const text = encodeURIComponent(`Hola! Vengo del catálogo web. Me interesa este vehículo:\n*${vehicle.marca} ${vehicle.modelo} ${vehicle.anho}*\n(Ref/Stock: #${vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : 'S/D'})\n\nMe gustaría recibir más información.`);
        return `
            <a href="https://wa.me/${waNumber}?text=${text}" target="_blank" 
               class="w-full bg-[#25D366] text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest shadow-xl shadow-green-500/30 active:scale-[0.98] transition-all">
                <img src="./img/whatsapp.svg" alt="WA" class="w-6 h-6">
                Contactar a un Asesor
            </a>
        `;
    },

    formatMoney(amount) {
        return new Intl.NumberFormat('es-PY', { style: 'decimal', minimumFractionDigits: 0 }).format(amount || 0);
    }
};

// Export to window so inline onclicks can find it
window.catalogUI = catalogUI;
document.addEventListener('DOMContentLoaded', () => catalogUI.init());
