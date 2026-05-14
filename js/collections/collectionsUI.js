import { collectionsService } from './collectionsService.js';
import { notifier } from '../utils/notifier.js';
import { formatDate, formatDateTime } from '../utils/dateFormatter.js';
import { security } from '../utils/security.js';

export const collectionsUI = {
    // Helpers Locales
    formatMoney: (val) => parseInt(val || 0).toLocaleString('es-PY') + ' Gs.',

    // Contenedor principal
    mainContainer: null,

    // Estado interno para Lazy Loading y Persistencia
    clientsData: [],
    filteredClients: [],
    currentSelectedClientId: null,
    currentSaleId: null, // Venta actualmente visualizada
    itemsToShow: 15,
    pageSize: 15,

    /**
     * Renderiza la vista principal de Caja
     */
    async render(playaId) {
        this.mainContainer = document.getElementById('mainContent');
        if (!this.mainContainer) return;

        // 1. Obtener Datos
        const totalHoy = await collectionsService.getTodayTotal(playaId);
        const clients = await collectionsService.getDashboardClients(playaId);

        // Guardar estado para Lazy Loading
        this.clientsData = clients;
        this.filteredClients = [...clients];
        this.itemsToShow = this.pageSize;

        this.mainContainer.innerHTML = `
            <div class="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 overflow-hidden">
                <!-- PANEL IZQUIERDO: LISTA DE CLIENTES -->
                <div class="w-full md:w-1/3 flex flex-col gap-4 bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 h-full overflow-hidden">
                    <!-- Header Sidebar -->
                    <div class="flex justify-between items-center mb-2 shrink-0">
                         <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Cobranzas & Gestión</h3>
                         <span class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg">${clients.length} Clientes</span>
                    </div>

                    <!-- Buscador (Estático) -->
                    <div class="relative group shrink-0">
                        <input type="text" id="filterClientList" 
                            class="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs uppercase shadow-inner"
                            placeholder="Filtrar cliente o auto...">
                         <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <i data-lucide="search" class="w-4 h-4"></i>
                         </span>
                    </div>

                    <!-- Lista Scrolleable (Independiente) -->
                    <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1" id="clientListContainer">
                        <!-- Se renderiza incrementalmente -->
                    </div>
                </div>

                <!-- PANEL DERECHO: DETALLE CLIENTE -->
                <div class="w-full md:w-2/3 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
                    
                    <!-- Dashboard Superior -->
                    <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden shrink-0">
                        <div class="relative z-10 flex justify-between items-end">
                            <div>
                                <h3 class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Caja Diaria</h3>
                                <div class="text-5xl font-black text-emerald-400 tracking-tighter" id="todayTotalText">
                                    ${this.formatMoney(totalHoy)}
                                </div>
                            </div>
                            <div class="text-right hidden md:block">
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block mr-1"></span> En Vivo
                                </p>
                            </div>
                        </div>
                         <div class="absolute -right-6 -bottom-8 text-[10rem] opacity-5 select-none font-black tracking-tighter italic">CAJA</div>
                    </div>

                    <!-- Contenedor Detalle -->
                    <div id="clientDetailPanel" class="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-center p-8 relative overflow-hidden">
                        <div class="text-center opacity-50 flex flex-col items-center">
                             <div class="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                                <i data-lucide="user" class="w-10 h-10 text-slate-400"></i>
                             </div>
                             <p class="text-slate-400 font-black uppercase text-xs tracking-widest">Selecciona un cliente para gestionar</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initListFilter();
        this.initLazyLoading();
        this.renderIncrementalList();

        window.selectDashboardClient = async (clientId) => {
            // Si los datos aún no cargaron, esperamos un poco o forzamos la carga
            if (this.clientsData.length === 0) {
                const clients = await collectionsService.getDashboardClients(playaId);
                this.clientsData = clients;
                this.filteredClients = [...clients];
            }
            this.loadClientDetail(clientId, playaId);
        };
    },

    /**
     * Renderiza porciones de la lista para optimizar el DOM
     */
    renderIncrementalList() {
        const container = document.getElementById('clientListContainer');
        if (!container) return;

        const slice = this.filteredClients.slice(0, this.itemsToShow);
        container.innerHTML = this.renderClientList(slice);
    },

    /**
     * Escucha el scroll para cargar más elementos (Lazy Loading)
     */
    initLazyLoading() {
        const container = document.getElementById('clientListContainer');
        if (!container) return;

        container.onscroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Si falta poco para el final (20px), cargar más
            if (scrollTop + clientHeight >= scrollHeight - 20) {
                if (this.itemsToShow < this.filteredClients.length) {
                    this.itemsToShow += this.pageSize;
                    this.renderIncrementalList();
                }
            }
        };
    },

    renderClientList(clients) {
        if (clients.length === 0) return '<div class="text-center py-10 text-xs text-slate-300 font-bold uppercase">No hay clientes con deuda</div>';

        return clients.map(entry => {
            const { client, vehicle, nextQuota, status, totalPending } = entry;
            let statusColor = 'bg-slate-100 border-slate-200 text-slate-400'; // Upcoming
            let icon = '📅';

            if (status === 'overdue') {
                statusColor = 'bg-rose-50 border-rose-100 text-rose-600 ring-1 ring-rose-200';
                icon = 'alert-triangle';
            } else if (status === 'today') {
                statusColor = 'bg-amber-50 border-amber-100 text-amber-600 ring-1 ring-amber-200';
                icon = 'bell';
            } else if (status === 'tomorrow') {
                statusColor = 'bg-amber-50 border-amber-100 text-amber-600 ring-1 ring-amber-200';
                icon = 'bell';
            } else if (status === 'upcoming') {
                statusColor = 'bg-blue-50 border-blue-100 text-blue-600';
                icon = 'calendar';
            } else { // status === 'paid'
                statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-600 opacity-80';
                icon = 'check-circle';
            }

            const isSelected = this.currentSelectedClientId === client.id;
            const activeClass = isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 shadow-md translate-x-1' : '';

            const quotaAmount = nextQuota ? this.formatMoney(nextQuota.monto) : '---';
            const quotaDate = nextQuota ? formatDate(nextQuota.fecha_vencimiento) : (status === 'paid' ? 'FINALIZADO' : '---');
            const stock = vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : '-----';

            const multiIndicator = entry.activeSalesCount > 1 ? `
                <div class="mt-2 flex items-center gap-1.5 bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded-lg w-fit">
                    <i data-lucide="layers" class="w-3 h-3"></i>
                    <span class="text-[9px] font-black uppercase tracking-tighter">${entry.activeSalesCount} VEHÍCULOS ACTIVOS</span>
                </div>
            ` : '';

            const clientName = security.esc(client.nombre);
            const marca = security.esc(vehicle.marca);
            const modelo = security.esc(vehicle.modelo || '');

            return `
                <button onclick="window.selectDashboardClient('${client.id}')" 
                    id="client-card-${client.id}"
                    class="w-full text-left p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.98] group ${statusColor} ${activeClass} relative overflow-hidden shrink-0">
                    
                    <div class="absolute right-3 top-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        <i data-lucide="${icon}" class="w-5 h-5"></i>
                    </div>

                    <div class="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <p class="text-[9px] font-black uppercase opacity-70 tracking-widest mb-0.5">
                                STOCK ${stock} ${marca} ${modelo}
                            </p>
                            <h4 class="text-sm font-black uppercase truncate max-w-[200px]">${clientName}</h4>
                            ${multiIndicator}
                        </div>
                    </div>

                    <div class="flex justify-between items-end relative z-10">
                        <div>
                            <p class="text-[9px] font-bold opacity-60 uppercase">${status === 'paid' ? 'Estado' : 'Próx. Venc.'}</p>
                            <p class="text-xs font-black">${quotaDate}</p>
                        </div>
                        <div class="text-right">
                             <p class="text-[9px] font-bold opacity-60 uppercase">Saldo Pend.</p>
                             <p class="text-xs font-black">${this.formatMoney(totalPending)}</p>
                        </div>
                    </div>
                </button>
            `;
        }).join('');
    },

    initListFilter() {
        const input = document.getElementById('filterClientList');
        if (!input) return;

        input.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            this.filteredClients = this.clientsData.filter(c =>
                c.client.nombre.toLowerCase().includes(term) ||
                c.vehicle.marca.toLowerCase().includes(term) ||
                (c.vehicle.modelo && c.vehicle.modelo.toLowerCase().includes(term)) ||
                (c.vehicle.nro_stock && c.vehicle.nro_stock.toString().includes(term))
            );
            this.itemsToShow = this.pageSize; // Reset pagination
            this.renderIncrementalList();

            // Actualizar contador
            const counter = document.querySelector('span.bg-slate-100.text-slate-500');
            if (counter) counter.textContent = `${this.filteredClients.length} Clientes`;
        };
    },

    /**
     * Carga el Detalle del Cliente
     */
    async loadClientDetail(clientId, playaId, saleId = null) {
        this.currentSelectedClientId = clientId;

        // Resaltar en el sidebar instantáneamente
        this.renderIncrementalList();

        const panel = document.getElementById('clientDetailPanel');
        panel.innerHTML = `<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>`;

        try {
            const { sales, obligations, payments } = await collectionsService.getClientAccountState(clientId, playaId);

            if (sales.length === 0) {
                throw new Error("El cliente no posee ventas activas o deudas pendientes en este momento.");
            }

            // Determinar qué venta visualizar
            if (!saleId && sales.length > 0) {
                // Buscamos la primera venta con saldo pendiente, si no, la primera de la lista
                const saleWithDebt = sales.find(s => {
                    const sPagos = payments.filter(p => p.venta_id === s.id).reduce((acc, p) => acc + Number(p.monto), 0);
                    return (Number(s.total_venta) - sPagos) > 0;
                });
                this.currentSaleId = saleWithDebt ? saleWithDebt.id : sales[0].id;
            } else if (saleId) {
                this.currentSaleId = saleId;
            }

            const currentSale = sales.find(s => s.id === this.currentSaleId);

            // Intentar obtener info del cliente del cache local, sino fallback a la primera venta
            let client = this.clientsData.find(c => c.client.id === clientId)?.client;

            if (!client && sales.length > 0) {
                // Si no está en la lista de 'Próximos', lo extraemos de la relación de la venta
                // Nota: Asegúrate de que collectionsService.getClientAccountState traiga la info del cliente si es necesario
                // Por ahora, asumimos que 'currentSale.clientes' podría existir o lo buscamos
                client = sales[0].clientes;
            }

            if (!client || !currentSale) {
                throw new Error("No pudimos encontrar la información completa de este cliente.");
            }

            const vehicle = currentSale.vehiculos;
            const phoneClean = client.telefono?.replace(/\D/g, '') || '';

            // Filtrar obligaciones y pagos por la venta actual
            const filteredObs = obligations.filter(o => o.venta_id === this.currentSaleId);
            const filteredPayments = payments.filter(p => p.venta_id === this.currentSaleId);

            // Resumen de la venta específica
            const totalPagadoSale = filteredPayments.reduce((acc, p) => acc + Number(p.monto), 0);
            const saldoPendienteSale = Number(currentSale.total_venta) - totalPagadoSale;

            // Selector de Ventas si hay múltiples
            let salesSelectorHtml = '';
            if (sales.length > 1) {
                salesSelectorHtml = `
                    <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl mb-6 shadow-sm">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Gestionar Cuenta:</label>
                        <select onchange="window.changeClientSale('${clientId}', this.value)" class="bg-transparent font-black text-xs uppercase text-slate-700 outline-none flex-1">
                            ${sales.map(s => {
                                const sMarca = security.esc(s.vehiculos.marca);
                                const sModelo = security.esc(s.vehiculos.modelo);
                                const sStock = s.vehiculos.nro_stock ? s.vehiculos.nro_stock.toString().padStart(5, '0') : '-----';
                                return `
                                    <option value="${s.id}" ${s.id === this.currentSaleId ? 'selected' : ''}>
                                        ${sMarca} ${sModelo} [STOCK ${sStock}]
                                    </option>
                                `;
                            }).join('')}
                        </select>
                    </div>
                `;
            }

            // Bindings Globales vinculados
            window.changeClientSale = (cId, sId) => this.loadClientDetail(cId, playaId, sId);

            const clientName = security.esc(client.nombre);
            const clientDoc = security.esc(client.nro_documento);
            const vMarca = security.esc(vehicle.marca);
            const vModelo = security.esc(vehicle.modelo);
            const vStock = vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : '-----';

            // Render Panel Estructura
            panel.innerHTML = `
                <div class="w-full h-full flex flex-col animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                    
                    ${salesSelectorHtml}

                    <!-- HEADER CLIENTE (ESTÁTICO) -->
                    <div class="flex justify-between items-start mb-6 shrink-0">
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-3xl font-black uppercase text-slate-900 tracking-tight">${clientName}</h2>
                                <span class="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                                    ${clientDoc}
                                </span>
                            </div>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                ${vMarca} ${vModelo} [STOCK ${vStock}]
                            </p>
                        </div>
                        
                         <div class="flex gap-2">
                             <button onclick="window.openExtraPaymentModal('${clientId}', '${this.currentSaleId}', '${client.nombre}')" 
                                class="bg-indigo-50 text-indigo-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition border border-indigo-100 flex items-center gap-2">
                                <i data-lucide="trending-down" class="w-4 h-4"></i> Abono Capital
                            </button>
                            ${phoneClean ? `
                                <button onclick="window.notifyWhatsapp('${phoneClean}', '${client.nombre}', '${saldoPendienteSale}', '${vehicle.marca}', '${vehicle.nro_stock || ''}', '${filteredObs.find(o => o.estado !== 'pagado')?.monto || 0}')"
                                    class="bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                                    <i data-lucide="message-square" class="w-4 h-4"></i> Notificar Deuda
                                </button>
                            ` : ''}
                        </div>
                    </div>

                     <div class="grid grid-cols-3 gap-4 mb-6 shrink-0">
                        <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Financiado</p>
                            <p class="text-lg font-black text-slate-900 mt-1">${this.formatMoney(currentSale.total_venta)}</p>
                        </div>
                         <div class="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
                            <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Pagado</p>
                            <p class="text-lg font-black text-emerald-700 mt-1">${this.formatMoney(totalPagadoSale)}</p>
                        </div>
                         <div class="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm">
                            <p class="text-[9px] font-black text-rose-600 uppercase tracking-widest">Saldo Cuenta</p>
                            <p class="text-lg font-black text-rose-700 mt-1">${this.formatMoney(saldoPendienteSale)}</p>
                        </div>
                    </div>

                    <!-- AREA DE TABLAS (SCROLL) -->
                    <div id="detailScrollContainer" class="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                        
                        <!-- TABLA DE CUOTAS -->
                        <div class="bg-white rounded-[2rem] border border-slate-100 shadow-md overflow-hidden">
                            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan de Cuotas</h4>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead class="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-20">
                                        <tr>
                                            <th class="px-6 py-4 bg-slate-50">Concepto</th>
                                            <th class="px-6 py-4 bg-slate-50">Vencimiento</th>
                                            <th class="px-6 py-4 bg-slate-50">Monto</th>
                                            <th class="px-6 py-4 bg-slate-50 text-center">Estado</th>
                                            <th class="px-6 py-4 bg-slate-50 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody id="obligationsTableBody" class="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                                        <!-- Se cargará incrementalmente -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- HISTORIAL DE TRANSACCIONES -->
                        <div class="bg-white rounded-[2rem] border border-slate-100 shadow-md overflow-hidden">
                            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Historial de Transacciones</h4>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead class="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th class="px-6 py-4">Fecha</th>
                                            <th class="px-6 py-4">Concepto</th>
                                            <th class="px-6 py-4">Monto</th>
                                            <th class="px-6 py-4">Nro Recibo</th>
                                            <th class="px-6 py-4 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                     <tbody class="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                                        ${filteredPayments.length === 0 ? `
                                            <tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 uppercase text-[10px] font-black">No hay pagos registrados para esta unidad</td></tr>
                                        ` : filteredPayments.map(p => {
                const concept = p.cuota_id ? (filteredObs.find(o => o.id === p.cuota_id)?.es_refuerzo ? 'Refuerzo' : `Cuota ${filteredObs.find(o => o.id === p.cuota_id)?.nro_cuota || ''}`) : (p.observaciones?.includes('ABONO') ? 'Abono Capital' : 'Pago');
                return `
                                                <tr class="hover:bg-slate-50/50 transition">
                                                    <td class="px-6 py-4 text-slate-400 text-[10px]">${formatDateTime(p.fecha_pago)}</td>
                                                    <td class="px-6 py-4 font-black uppercase text-slate-900">${concept}</td>
                                                    <td class="px-6 py-4 font-black text-emerald-600">${this.formatMoney(p.monto)}</td>
                                                    <td class="px-6 py-4 font-mono font-bold">#${p.nro_recibo.toString().padStart(6, '0')}</td>
                                                    <td class="px-6 py-4 text-right">
                                                        <button onclick="window.reprintReceipt('${p.nro_recibo}', '${client.nombre}', '${p.monto}', '${concept}', '${vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : '---'}')"
                                                            class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 transition border border-slate-200 flex items-center gap-2">
                                                            <i data-lucide="printer" class="w-3 h-3"></i> Re-Imprimir
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
            }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Estado para Lazy Loading de Obligaciones
            this.currentObligations = filteredObs;
            this.obsShown = 20;

            this.renderIncrementalObligations(client.nombre, vehicle.nro_stock);
            this.initObligationsScroll(client.nombre, vehicle.nro_stock);

            // Bindings Globales vinculados a esta selección específica
            window.notifyWhatsapp = (phone, name, balance, model, stock, quota) => {
                const stockFormatted = stock ? stock.toString().padStart(5, '0') : '---';
                const msg = `¡Hola ${name}! Te saludamos de autoPlaya. Te recordamos que tienes una cuota de ${this.formatMoney(quota)} pendiente para tu ${model} (#${stockFormatted}). El saldo total de tu cuenta a la fecha es de ${this.formatMoney(balance)}. Quedamos atentos a tu visita. ¡Saludos!`;
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
            };

            window.openPaymentModal = (cuotaId, ventaId, monto, nroCuota, esRefuerzo) => {
                const concept = esRefuerzo ? 'Refuerzo' : `Cuota ${nroCuota}`;
                const stockFormatted = vehicle.nro_stock ? vehicle.nro_stock.toString().padStart(5, '0') : '---';
                this.renderPaymentModal({ cuotaId, ventaId, monto, concept, clientId, clientName: client.nombre, stock: stockFormatted }, playaId);
            };

            window.openExtraPaymentModal = (cId, vId, cName) => {
                this.renderExtraPaymentModal({ clientId: cId, ventaId: vId, clientName: cName }, playaId);
            };

            window.reprintReceipt = (recibo, cliente, monto, concepto, stock) => {
                this.generateReceiptPDF({ recibo, cliente, monto, concepto, stock });
            };

        } catch (error) {
            console.error(error);
            panel.innerHTML = `
                <div class="text-center p-10 flex flex-col items-center">
                    <div class="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                        <i data-lucide="alert-circle" class="w-8 h-8 text-rose-500"></i>
                    </div>
                    <p class="text-slate-900 font-black uppercase text-sm tracking-tight mb-2">Atención</p>
                    <p class="text-slate-500 text-xs font-bold max-w-xs mx-auto mb-6">
                        ${error.message || 'Hubo un problema al cargar la ficha del cliente.'}
                    </p>
                    <button onclick="location.reload()" class="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition">
                        Reintentar
                    </button>
                    <p class="text-[9px] text-slate-400 mt-8 uppercase font-bold tracking-widest">O puedes usar el buscador de la izquierda</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    },

    /**
     * Renderiza porciones de las cuotas para optimizar el rendimiento
     */
    renderIncrementalObligations(clientName, vehicleStock) {
        const tbody = document.getElementById('obligationsTableBody');
        if (!tbody) return;

        const slice = this.currentObligations.slice(0, this.obsShown);

        tbody.innerHTML = slice.map(o => {
            const isPaid = o.estado === 'pagado';
            const dateStr = formatDate(o.fecha_vencimiento);
            const now = new Date(); now.setHours(0, 0, 0, 0);
            const date = new Date(o.fecha_vencimiento);

            let statusBadge = `<span class="px-2 py-1 rounded-md bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-wider">Pendiente</span>`;
            if (isPaid) statusBadge = `<span class="px-2 py-1 rounded-md bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider">Pagado</span>`;
            else if (date < now) statusBadge = `<span class="px-2 py-1 rounded-md bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-wider">Atrasado</span>`;
            else if (date.getTime() === now.getTime()) statusBadge = `<span class="px-2 py-1 rounded-md bg-amber-100 text-amber-600 text-[9px] font-black uppercase tracking-wider">Vence Hoy</span>`;

            return `
                <tr class="hover:bg-slate-50/50 transition group">
                    <td class="px-6 py-4 font-black ${o.es_refuerzo ? 'text-indigo-600' : 'text-slate-900'} uppercase">
                        ${o.es_refuerzo ? '🚀 Refuerzo' : `📅 Cuota ${o.nro_cuota}`}
                    </td>
                    <td class="px-6 py-4 uppercase font-bold text-slate-400">${formatDate(o.fecha_vencimiento)}</td>
                    <td class="px-6 py-4 font-black text-slate-900">${this.formatMoney(o.monto)}</td>
                    <td class="px-6 py-4 text-center">${statusBadge}</td>
                    <td class="px-6 py-4 text-right">
                        ${!isPaid ? `
                            <button onclick="window.openPaymentModal('${o.id}', '${o.venta_id}', ${o.monto}, '${o.nro_cuota}', ${o.es_refuerzo})" 
                                class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition shadow-lg">
                                Cobrar
                            </button>
                        ` : `
                            <button onclick="window.reprintReceipt('${o.pagos?.[0]?.nro_recibo || ''}', '${clientName}', '${o.pagos?.[0]?.monto || o.monto}', '${o.es_refuerzo ? 'Pago de Refuerzo' : `Pago de Cuota ${o.nro_cuota}`}', '${vehicleStock || ''}')"
                                class="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition border border-slate-200 shadow-sm flex items-center gap-2">
                                <i data-lucide="printer" class="w-3 h-3"></i> Recibo
                            </button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Inicializa el scroll infinito para la tabla de obligaciones
     */
    initObligationsScroll(clientName, vehicleStock) {
        const container = document.getElementById('detailScrollContainer');
        if (!container) return;

        container.onscroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop + clientHeight >= scrollHeight - 30) {
                if (this.obsShown < this.currentObligations.length) {
                    this.obsShown += 20;
                    this.renderIncrementalObligations(clientName, vehicleStock);
                }
            }
        };
    },

    /**
     * Modal de Cobro Normal
     */
    renderPaymentModal(data, playaId) {
        const modalId = 'paymentModal';
        if (document.getElementById(modalId)) document.getElementById(modalId).remove();

        const html = `
             <div id="${modalId}" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                    <div class="p-6 bg-slate-900 text-white text-center">
                        <h3 class="text-xl font-black uppercase tracking-tight">Cobrar ${data.concept}</h3>
                    </div>
                    <form id="formPayment" class="p-8 space-y-6">
                         <div class="text-center">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Total</p>
                            <p class="text-3xl font-black text-slate-900">${this.formatMoney(data.monto)}</p>
                         </div>
                         
                          <div class="space-y-4">
                            <select name="tipo_pago" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta">Tarjeta</option>
                            </select>
                            <textarea name="observaciones" class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none h-20 focus:ring-2 focus:ring-emerald-500 transition-all resize-none" placeholder="Observación..."></textarea>
                         </div>

                         <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition text-xs uppercase tracking-widest">Confirmar Cobro</button>
                         <button type="button" onclick="document.getElementById('${modalId}').remove()" class="w-full py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">Cancelar</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const form = document.getElementById('formPayment');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = 'Procesando...';
            btn.disabled = true;

            const formData = new FormData(form);
            const payload = {
                playa_id: playaId,
                cuota_id: data.cuotaId,
                venta_id: data.ventaId,
                monto: data.monto,
                tipo_pago: formData.get('tipo_pago'),
                observaciones: formData.get('observaciones')
            };

            try {
                const res = await collectionsService.processPayment(payload);
                document.getElementById(modalId).remove();

                // Generar PDF
                this.generateReceiptPDF({
                    recibo: res.nroRecibo,
                    cliente: data.clientName,
                    monto: data.monto,
                    concepto: `Pago de ${data.concept}`,
                    stock: data.stock
                });

                // Refresco Inteligente Sin Resetear
                const newTotal = await collectionsService.getTodayTotal(playaId);
                const totalEl = document.getElementById('todayTotalText');
                if (totalEl) totalEl.textContent = this.formatMoney(newTotal);

                const clients = await collectionsService.getDashboardClients(playaId);
                this.clientsData = clients;
                this.filteredClients = [...clients];
                this.renderIncrementalList();

                this.loadClientDetail(data.clientId, playaId);
            } catch (err) {
                console.error(err);
                notifier.showToast('Error al procesar cobro', 'error');
                btn.disabled = false;
                btn.innerHTML = 'Confirmar Cobro';
            }
        };
    },

    /**
     * Modal de Abono Extra (Amortización Capital)
     */
    renderExtraPaymentModal(data, playaId) {
        const modalId = 'extraPaymentModal';
        if (document.getElementById(modalId)) document.getElementById(modalId).remove();

        const html = `
             <div id="${modalId}" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                    <div class="p-6 bg-indigo-600 text-white text-center">
                        <div class="mx-auto bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mb-3 backdrop-blur-md">
                            <i data-lucide="trending-down" class="w-8 h-8 text-white"></i>
                        </div>
                        <h3 class="text-xl font-black uppercase tracking-tight">Abono a Capital</h3>
                        <p class="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">Reduce Plazo / Elimina Cuotas Finales</p>
                    </div>
                    <form id="formExtraPayment" class="p-8 space-y-6">
                         
                         <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto a Abonar</label>
                            <input type="text" id="extraAmount" required class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black text-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 text-center" placeholder="0">
                         </div>
                         
                         <div class="space-y-4">
                            <select name="tipo_pago" class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-xs uppercase outline-none">
                                <option value="efectivo">💵 Efectivo</option>
                                <option value="transferencia">🏦 Transferencia</option>
                            </select>
                            <textarea name="observaciones" class="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-xs uppercase outline-none h-20" placeholder="Observación..."></textarea>
                         </div>

                         <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition text-xs uppercase tracking-widest">Confirmar Abono</button>
                         <button type="button" onclick="document.getElementById('${modalId}').remove()" class="w-full py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">Cancelar</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const form = document.getElementById('formExtraPayment');
        const inputAmount = document.getElementById('extraAmount');

        // Input Masking simple
        inputAmount.oninput = (e) => {
            let val = parseInt(e.target.value.replace(/\D/g, '') || 0);
            e.target.value = val.toLocaleString('es-PY');
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const rawAmount = parseInt(inputAmount.value.replace(/\D/g, ''));
            if (!rawAmount || rawAmount <= 0) return notifier.showToast('Monto inválido', 'error');

            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = 'Procesando...';
            btn.disabled = true;

            const formData = new FormData(form);
            const payload = {
                playa_id: playaId,
                venta_id: data.ventaId,
                cliente_id: data.clientId, // pass for ref
                monto: rawAmount,
                tipo_pago: formData.get('tipo_pago'),
                observaciones: formData.get('observaciones')
            };

            try {
                const res = await collectionsService.processExtraPayment(payload);
                document.getElementById(modalId).remove();

                // Generar PDF
                this.generateReceiptPDF({
                    recibo: res.nroRecibo,
                    cliente: data.clientName,
                    monto: rawAmount,
                    concepto: `ABONO CAPITAL (Reducción Plazo)`,
                    stock: '---'
                });

                // Refresco Inteligente Sin Resetear
                const newTotal = await collectionsService.getTodayTotal(playaId);
                const totalEl = document.getElementById('todayTotalText');
                if (totalEl) totalEl.textContent = this.formatMoney(newTotal);

                const clients = await collectionsService.getDashboardClients(playaId);
                this.clientsData = clients;
                this.filteredClients = [...clients];
                this.renderIncrementalList();

                this.loadClientDetail(data.clientId, playaId);
                notifier.showToast('Abono registrado. Cuotas reducidas.', 'success');

            } catch (err) {
                console.error(err);
                notifier.showToast('Error al procesar abono', 'error');
                btn.disabled = false;
                btn.innerHTML = 'Confirmar Abono';
            }
        };
    },

    /**
     * Generador de PDF
     */
    generateReceiptPDF({ recibo, cliente, monto, concepto, stock }) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: [80, 200] }); // Formato ticket opcional, pero usaremos A5 o similar simple. Vamos con A4 estandar mejor para imprimir.
        // Revertir a A4 Portrait
        const receiptDoc = new jsPDF();

        receiptDoc.setFont("helvetica", "bold");
        receiptDoc.setFontSize(22);
        receiptDoc.text("RECIBO DE DINERO", 105, 20, { align: "center" });

        receiptDoc.setFontSize(12);
        receiptDoc.setFont("helvetica", "normal");
        receiptDoc.text(`Nro: ${recibo.toString().padStart(6, '0')}`, 105, 30, { align: "center" });

        receiptDoc.setLineWidth(0.5);
        receiptDoc.line(20, 35, 190, 35);

        const startY = 50;
        const lineHeight = 10;

        receiptDoc.setFont("helvetica", "bold");
        receiptDoc.text("Cliente:", 20, startY);
        receiptDoc.setFont("helvetica", "normal");
        receiptDoc.text(cliente, 60, startY);

        receiptDoc.setFont("helvetica", "bold");
        receiptDoc.text("Monto:", 20, startY + lineHeight);
        receiptDoc.setFont("helvetica", "normal");
        receiptDoc.text(this.formatMoney(monto), 60, startY + lineHeight);

        receiptDoc.setFont("helvetica", "bold");
        receiptDoc.text("Concepto:", 20, startY + lineHeight * 2);
        receiptDoc.setFont("helvetica", "normal");
        receiptDoc.text(concepto, 60, startY + lineHeight * 2);

        if (stock) {
            receiptDoc.setFont("helvetica", "bold");
            receiptDoc.text("Stock Vehículo:", 20, startY + lineHeight * 3);
            receiptDoc.setFont("helvetica", "normal");
            receiptDoc.text(`#${stock}`, 60, startY + lineHeight * 3);
        }

        receiptDoc.setFont("helvetica", "italic");
        receiptDoc.setFontSize(10);
        receiptDoc.text(`Fecha: ${new Date().toLocaleString()}`, 20, startY + lineHeight * 5);

        // Footer
        receiptDoc.line(20, 130, 80, 130);
        receiptDoc.text("Firma Responsable", 30, 135);

        // Guardar/Mostrar
        const filename = `Recibo_${recibo}_${cliente}.pdf`;

        // SweetAlert o custom modal de éxito
        const successModalId = 'successReceiptModal';
        const html = `
            <div id="${successModalId}" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div class="bg-white rounded-[3rem] p-10 text-center max-w-sm w-full animate-in zoom-in-95">
                    <div class="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <i data-lucide="check-circle" class="w-10 h-10 text-emerald-500"></i>
                    </div>
                    <h3 class="text-2xl font-black text-slate-900 mb-2">Pago Exitoso</h3>
                    <p class="text-slate-500 mb-8 font-bold text-sm">El recibo #${recibo} ha sido generado correctamente.</p>
                    
                    <div class="space-y-3">
                        <button id="btnDownloadPdf" class="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-slate-800 transition uppercase tracking-widest text-xs">
                            📥 Descargar Recibo
                        </button>
                        <button onclick="document.getElementById('${successModalId}').remove()" class="w-full py-3 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('btnDownloadPdf').onclick = () => {
            receiptDoc.save(filename);
            document.getElementById(successModalId).remove();
        };
    }
};
