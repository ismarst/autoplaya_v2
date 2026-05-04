import { historyService } from './historyService.js';
import { formatDate, formatDateTime } from '../utils/dateFormatter.js';
import { security } from '../utils/security.js';

export const historyUI = {
    currentTab: 'sales', // 'sales' o 'cash'
    playaId: null,

    /**
     * Renderiza la interfaz principal del historial
     */
    async render(playaId) {
        this.playaId = playaId;
        const container = document.getElementById('mainContent');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-8 animate-in fade-in duration-500">
                <!-- CABECERA EXCLUSIVA IMPRESIÓN (OCULTA EN WEB) -->
                <div id="printHeader" class="hidden print-header p-6 border-b-2 border-slate-900 mb-8">
                    <div class="flex justify-between items-center">
                        <div>
                            <p id="printReportTitle" class="text-xl font-black uppercase tracking-tighter">Historial de Operaciones</p>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Reporte Detallado de Actividad</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] font-black uppercase text-slate-400">Generado el</p>
                            <p class="text-xs font-bold">${formatDate(new Date())}</p>
                        </div>
                    </div>
                </div>

                <!-- HEADER Y TABS (OCULTOS EN IMPRESIÓN) -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
                    <div class="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <button id="btnTabSales" onclick="window.setHistoryTab('sales')" 
                            class="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${this.currentTab === 'sales' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            <i data-lucide="shopping-cart" class="w-4 h-4" stroke-width="2"></i> Historial de Ventas
                        </button>
                        <button id="btnTabCash" onclick="window.setHistoryTab('cash')" 
                            class="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${this.currentTab === 'cash' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            <i data-lucide="wallet" class="w-4 h-4" stroke-width="2"></i> Movimientos de Caja
                        </button>
                    </div>

                    <button onclick="window.printHistory()" 
                        class="bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
                        <i data-lucide="printer" class="w-4 h-4" stroke-width="2"></i> Imprimir Reporte
                    </button>
                </div>

                <!-- FILTROS DINÁMICOS (OCULTOS EN IMPRESIÓN) -->
                <div id="historyFilters" class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm no-print">
                    <!-- Se llena según el tab activo -->
                </div>

                <!-- TABLA DE RESULTADOS -->
                <div class="bg-white rounded-[2.5rem] md:border border-slate-100 shadow-xl overflow-hidden shadow-slate-200/40 print-table-container">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse" id="historyTable">
                            <thead id="historyTableHeader" class="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <!-- Cabecera dinámica -->
                            </thead>
                            <tbody id="historyTableBody" class="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                                <!-- Datos dinámicos -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>
                @media print {
                    /* Eliminar encabezados y pies de página del navegador (Nombre SaaS, URL, Fecha/Hora) */
                    @page {
                        margin: 0;
                    }
                    
                    /* Añadir padding al body para que el contenido no pegue al borde de la hoja */
                    body {
                        padding: 1.5cm !important;
                        background: white !important;
                    }

                    /* Ocultar elementos innecesarios */
                    .no-print, #sidebar, #sidebarOverlay, #mainContent > div > div:not(.print-table-container):not(#printHeader), button, .lucide, #userAvatar {
                        display: none !important;
                    }

                    /* Mostrar cabecera de impresión */
                    #printHeader {
                        display: block !important;
                        visibility: visible !important;
                    }

                    /* Reset de layouts y backgrounds */
                    .bg-gray-100, #mainContent {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .flex, .grid {
                        display: block !important;
                    }

                    /* Ajustes de Tabla para impresión profesional */
                    .print-table-container {
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                    }

                    table {
                        width: 100% !important;
                        table-layout: auto !important;
                        border: 1px solid #e2e8f0 !important;
                    }

                    th {
                        background-color: #f8fafc !important;
                        color: #64748b !important;
                        -webkit-print-color-adjust: exact;
                        border-bottom: 2px solid #e2e8f0 !important;
                    }

                    th, td {
                        padding: 8px 12px !important;
                        border: 1px solid #f1f5f9 !important;
                        font-size: 8pt !important; /* Ligeramente más pequeño para optimizar espacio */
                        color: #1e293b !important;
                    }

                    tr {
                        page-break-inside: avoid !important;
                    }

                    /* Forzar colores en impresión */
                    .text-emerald-600 { color: #059669 !important; }
                    .text-indigo-600 { color: #4f46e5 !important; }
                    .text-slate-900 { color: #0f172a !important; }
                    .font-black { font-weight: 900 !important; }
                }
            </style>
        `;

        // Bindings Globales
        window.setHistoryTab = (tab) => {
            this.currentTab = tab;
            this.render(this.playaId);
        };

        window.printHistory = () => {
            const titleEl = document.getElementById('printReportTitle');
            if (titleEl) {
                titleEl.textContent = this.currentTab === 'sales' ? 'Historial de Ventas Corporativas' : 'Detalle de Movimientos de Caja';
            }
            window.print();
        };

        this.renderFilters();
        this.loadData();
    },

    /**
     * Renderiza los filtros según la pestaña activa
     */
    renderFilters() {
        const container = document.getElementById('historyFilters');
        if (this.currentTab === 'sales') {
            container.innerHTML = `
                <div class="relative group md:col-span-3">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block opacity-60">Buscar por Cliente o Vehículo</label>
                    <div class="relative">
                        <input type="text" id="filterSalesTerm" placeholder="ESCRIBE NOMBRE, CI, MARCA, MODELO O STOCK..."
                            class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs font-bold uppercase placeholder:text-slate-300">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <i data-lucide="search" class="w-4 h-4"></i>
                        </span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-3 pt-2 border-t border-slate-50 mt-2">
                    <div class="space-y-1">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                        <input type="date" id="filterSalesStart" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-bold text-slate-600 transition-all">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                        <input type="date" id="filterSalesEnd" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-bold text-slate-600 transition-all">
                    </div>
                    <div class="flex items-end">
                        <button onclick="window.applyHistoryFilters()" class="w-full h-[46px] bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-2">
                            <i data-lucide="filter" class="w-3.5 h-3.5"></i>
                            Filtrar Ventas
                        </button>
                    </div>
                    <div class="flex items-end">
                        <button onclick="window.clearHistoryFilters()" class="w-full h-[46px] bg-white text-slate-400 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                            Limpiar
                        </button>
                    </div>
                </div>
            `;
            // Aplicar Lucide después de insertar el HTML
            if (window.lucide) lucide.createIcons();
            // El contenedor padre ahora usa span completo para sus hijos articulados
            container.className = "flex flex-col gap-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm shadow-slate-200/50";
        } else {
            container.innerHTML = `
                <div class="relative group md:col-span-4">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block opacity-60">Buscar por Cliente (Nombre o CI)</label>
                    <div class="relative">
                        <input type="text" id="filterCashTerm" placeholder="BUSCAR POR NOMBRE O DOCUMENTO..."
                            class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs font-bold uppercase placeholder:text-slate-300">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <i data-lucide="search" class="w-4 h-4"></i>
                        </span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 w-full pt-2 border-t border-slate-50 mt-2">
                    <div class="space-y-1">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 opacity-60">Desde</label>
                        <input type="date" id="filterCashStart" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-bold text-slate-600 transition-all">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 opacity-60">Hasta</label>
                        <input type="date" id="filterCashEnd" class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-bold text-slate-600 transition-all">
                    </div>
                    <div class="flex items-end">
                        <button onclick="window.applyHistoryFilters()" class="w-full h-[46px] bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-2">
                            <i data-lucide="search" class="w-3.5 h-3.5"></i>
                            Filtrar
                        </button>
                    </div>
                    <div class="flex items-end">
                        <button onclick="window.clearHistoryFilters()" class="w-full h-[46px] bg-white text-slate-400 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                            Limpiar
                        </button>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            // Ajustar grid para caja: Mismo padding que ventas
            container.className = "flex flex-col gap-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm shadow-slate-200/50";
        }

        window.applyHistoryFilters = () => this.loadData();

        window.clearHistoryFilters = () => {
            if (this.currentTab === 'sales') {
                const term = document.getElementById('filterSalesTerm');
                const start = document.getElementById('filterSalesStart');
                const end = document.getElementById('filterSalesEnd');
                if (term) term.value = '';
                if (start) start.value = '';
                if (end) end.value = '';
            } else {
                const term = document.getElementById('filterCashTerm');
                const start = document.getElementById('filterCashStart');
                const end = document.getElementById('filterCashEnd');
                if (term) term.value = '';
                if (start) start.value = '';
                if (end) end.value = '';
            }
            this.loadData();
        };
    },

    /**
     * Carga y renderiza los datos en la tabla
     */
    async loadData() {
        const tbody = document.getElementById('historyTableBody');
        const thead = document.getElementById('historyTableHeader');
        tbody.innerHTML = `<tr><td colspan="10" class="py-20 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div></td></tr>`;

        try {
            if (this.currentTab === 'sales') {
                const term = document.getElementById('filterSalesTerm')?.value || '';
                const startDate = document.getElementById('filterSalesStart')?.value;
                const endDate = document.getElementById('filterSalesEnd')?.value;

                const data = await historyService.getSalesHistory(this.playaId, {
                    searchTerm: term,
                    startDate,
                    endDate
                });

                thead.innerHTML = `
                    <tr>
                        <th class="px-6 py-4">Fecha</th>
                        <th class="px-6 py-4">Cliente</th>
                        <th class="px-6 py-4">Vehículo</th>
                        <th class="px-6 py-4">Venta Final</th>
                        <th class="px-6 py-4">Entrega</th>
                        <th class="px-6 py-4">Vendedor</th>
                    </tr>
                `;

                tbody.innerHTML = data.length === 0 ? `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 uppercase text-[10px] font-black">No se encontraron ventas</td></tr>` :
                    data.map(v => {
                        const clientName = security.esc(v.clientes.nombre);
                        const clientDoc = security.esc(v.clientes.nro_documento);
                        const vMarca = security.esc(v.vehiculos.marca);
                        const vModelo = security.esc(v.vehiculos.modelo);
                        const seller = security.esc(v.perfiles?.nombre_completo || 'S/V');

                        return `
                            <tr class="hover:bg-slate-50/50 transition border-b border-slate-50">
                                <td class="px-6 py-4 text-slate-400 font-bold">${formatDate(v.fecha_venta)}</td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="text-slate-900 font-black uppercase">${clientName}</span>
                                        <span class="text-[9px] text-slate-400">${clientDoc}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="text-slate-900 font-black uppercase">${vMarca} ${vModelo} - ${v.vehiculos.anho || '----'}</span>
                                        <span class="text-[9px] text-slate-400 font-mono text-xs">STOCK ${v.vehiculos.nro_stock ? v.vehiculos.nro_stock.toString().padStart(5, '0') : '-----'}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4 font-black text-slate-900">${this.formatMoney(v.total_venta)}</td>
                                <td class="px-6 py-4 font-black text-emerald-600">${this.formatMoney(v.entrega_inicial)}</td>
                                <td class="px-6 py-4 text-[10px] font-black uppercase text-slate-400">${seller}</td>
                            </tr>
                        `;
                    }).join('');

            } else {
                const start = document.getElementById('filterCashStart')?.value;
                const end = document.getElementById('filterCashEnd')?.value;
                const term = document.getElementById('filterCashTerm')?.value || '';

                const data = await historyService.getPaymentHistory(this.playaId, {
                    startDate: start,
                    endDate: end,
                    searchTerm: term
                });

                thead.innerHTML = `
                    <tr>
                        <th class="px-6 py-4">Fecha/Hora</th>
                        <th class="px-6 py-4">Cliente</th>
                        <th class="px-6 py-4">CI/RUC</th>
                        <th class="px-6 py-4">Concepto</th>
                        <th class="px-6 py-4">Monto</th>
                        <th class="px-6 py-4">Tipo</th>
                        <th class="px-6 py-4">Recibo</th>
                    </tr>
                `;

                tbody.innerHTML = data.length === 0 ? `<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400 uppercase text-[10px] font-black">No se encontraron movimientos</td></tr>` :
                    data.map(p => {
                        const clientName = security.esc(p.ventas?.clientes?.nombre || 'S/D');
                        const clientDoc = security.esc(p.ventas?.clientes?.nro_documento || '---');
                        const concept = p.cuota_id ? (p.cuotas?.es_refuerzo ? '<i data-lucide="rocket" class="w-3 h-3 inline mr-1"></i> Refuerzo' : `<i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i> Cuota ${p.cuotas?.nro_cuota}`) : (p.observaciones?.includes('ABONO') ? '<i data-lucide="trending-down" class="w-3 h-3 inline mr-1"></i> Abono Capital' : '<i data-lucide="dollar-sign" class="w-3 h-3 inline mr-1 text-emerald-500"></i> Pago');
                        
                        return `
                        <tr class="hover:bg-slate-50/50 transition border-b border-slate-50">
                            <td class="px-6 py-4 text-slate-400 font-bold text-[10px]">${formatDateTime(p.fecha_pago)}</td>
                            <td class="px-6 py-4 font-black uppercase text-slate-900">${clientName}</td>
                            <td class="px-6 py-4 font-bold text-slate-500">${clientDoc}</td>
                            <td class="px-6 py-4 font-black uppercase text-indigo-600 text-[10px] flex items-center">${concept}</td>
                            <td class="px-6 py-4 font-black text-emerald-600">${this.formatMoney(p.monto)}</td>
                            <td class="px-6 py-4 uppercase text-[9px] font-black text-slate-400">${p.tipo_pago}</td>
                            <td class="px-6 py-4 font-mono font-bold">#${p.nro_recibo.toString().padStart(6, '0')}</td>
                        </tr>
                    `}).join('');
            }

            if (window.lucide) lucide.createIcons();
        } catch (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="10" class="py-10 text-center text-rose-500 font-bold">Error al cargar datos</td></tr>`;
        }
    },

    formatMoney(amount) {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(amount).replace('PYG', 'Gs.');
    }
};
