import { reportsService } from './reportsService.js?v=5';
import { formatDate } from '../utils/dateFormatter.js';

export const reportsUI = {
    /**
     * Renderiza el Dashboard Principal
     */
    async render(playaId) {
        const container = document.getElementById('mainContent');
        if (!container) return;

        // Loader Inicial
        container.innerHTML = `
            <div class="flex items-center justify-center min-h-[400px]">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        `;

        try {
            const stats = await reportsService.getManagerStats(playaId);
            const lists = await reportsService.getDashboardLists(playaId);

            container.innerHTML = `
                <div class="space-y-10 animate-in fade-in duration-700">
                    
                    <!-- 1. INDICADORES CLAVE -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        ${this._renderStatCard('STOCK ACTIVO', this._formatMoney(stats.activeStockValue), 'layout-grid', 'bg-blue-50 text-blue-600')}
                        ${this._renderStatCard('VENTAS DEL MES', stats.salesCount, 'briefcase', 'bg-emerald-50 text-emerald-600')}
                        ${this._renderStatCard('RECAUDACIÓN HOY', this._formatMoney(stats.totalCollectedToday), 'wallet', 'bg-indigo-50 text-indigo-600')}
                        ${this._renderStatCard(
                            'MORA ACTIVA', 
                            lists.overdueCount, 
                            'alert-triangle', 
                            lists.overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600', 
                            'window.navToCollections()'
                        )}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        <!-- 2. ÚLTIMOS INGRESOS -->
                        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden shadow-slate-200/50">
                            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Últimos Vehículos Ingresados</h3>
                                <span class="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded-lg uppercase">Recientes</span>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead class="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th class="px-6 py-4">Vehículo</th>
                                            <th class="px-6 py-4">Año</th>
                                            <th class="px-6 py-4">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                                        ${lists.latestVehicles.length === 0 ? `
                                            <tr><td colspan="3" class="px-6 py-10 text-center text-slate-400 uppercase text-[10px] font-black">No hay ingresos recientes</td></tr>
                                        ` : lists.latestVehicles.map(v => `
                                            <tr class="transition-colors">
                                                <td class="px-6 py-4">
                                                    <div class="flex flex-col">
                                                        <span class="text-slate-900 font-black uppercase tracking-tighter">${v.marca} ${v.modelo}</span>
                                                        <span class="text-[9px] text-slate-400">STOCK ${v.nro_stock ? v.nro_stock.toString().padStart(5, '0') : '-----'}</span>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 font-mono">${v.anho || '----'}</td>
                                                <td class="px-6 py-4">
                                                    <span class="px-2 py-1 rounded-md text-[9px] font-black uppercase ${v.estado === 'disponible' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}">
                                                        ${v.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 3. PRÓXIMOS VENCIMIENTOS -->
                        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden shadow-slate-200/50">
                            <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Próximos Vencimientos</h3>
                                <span class="bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase">Seguimiento</span>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead class="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th class="px-6 py-4">Cliente</th>
                                            <th class="px-6 py-4">Fecha</th>
                                            <th class="px-6 py-4">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                                        ${lists.nextExpirations.length === 0 ? `
                                            <tr><td colspan="3" class="px-6 py-10 text-center text-slate-400 uppercase text-[10px] font-black">No hay vencimientos próximos</td></tr>
                                        ` : lists.nextExpirations.map(e => {
                                            // Lógica sincronizada con formatDate (usando el mismo desfase de Date)
                                            const d = new Date();
                                            const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            
                                            const t = new Date(); t.setDate(d.getDate() + 1);
                                            const tomorrowStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

                                            const qDate = new Date(e.fecha_vencimiento);
                                            const quotaStr = `${qDate.getFullYear()}-${String(qDate.getMonth() + 1).padStart(2, '0')}-${String(qDate.getDate()).padStart(2, '0')}`;

                                            let colorClass = 'text-slate-400';
                                            let labelText = e.es_refuerzo ? 'REFUERZO' : `CUOTA ${e.nro_cuota}`;

                                            if (quotaStr < todayStr) {
                                                colorClass = 'text-rose-500';
                                                labelText += ' - VENCIDO';
                                            } else if (quotaStr === todayStr) {
                                                colorClass = 'text-amber-600';
                                                labelText += ' - VENCE HOY';
                                            } else if (quotaStr === tomorrowStr) {
                                                colorClass = 'text-amber-600';
                                                labelText += ' - VENCE MAÑANA';
                                            }

                                            return `
                                            <tr class="hover:bg-slate-50/50 transition cursor-pointer group" onclick="window.navToCollections('${e.ventas.clientes.id}')">
                                                <td class="px-6 py-4">
                                                    <div class="flex flex-col">
                                                        <span class="text-slate-900 font-black uppercase tracking-tighter group-hover:text-blue-600 transition-colors">${e.ventas.clientes.nombre}</span>
                                                        <span class="text-[9px] text-slate-400 font-bold uppercase">${e.ventas.vehiculos.marca} ${e.ventas.vehiculos.modelo} - ${e.ventas.vehiculos.anho || '----'}</span>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4">
                                                    <div class="flex flex-col">
                                                        <span class="text-slate-600 font-bold">${formatDate(e.fecha_vencimiento)}</span>
                                                        <span class="text-[9px] ${colorClass} font-black uppercase">
                                                            ${labelText}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 font-black text-slate-900">${this._formatMoney(e.monto)}</td>
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

            // Atajos de navegación globales
            window.navToInventory = () => document.getElementById('navInventory').click();
            window.navToCollections = (id) => {
                document.getElementById('navCollections').click();
                if (id) setTimeout(() => window.selectDashboardClient(id), 500);
            };

            if (window.lucide) lucide.createIcons();

        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="p-10 text-center text-rose-500 font-black uppercase tracking-widest bg-rose-50 rounded-[2.5rem] border border-rose-100">Error al cargar reportes</div>`;
        }
    },

    _renderStatCard(title, value, icon, colors, onclick = null) {
        const cursor = onclick ? 'cursor-pointer active:scale-95' : '';
        const clickEvent = onclick ? `onclick="${onclick}"` : '';

        return `
            <div ${clickEvent} class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-[1.02] transition-all group overflow-hidden relative ${cursor}">
                <div class="flex justify-between items-start mb-4 relative z-10">
                    <div class="w-12 h-12 ${colors} rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                        <i data-lucide="${icon}" class="w-6 h-6" stroke-width="1.5"></i>
                    </div>
                </div>
                <div class="relative z-10">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">${title}</p>
                    <p class="text-xl font-black text-slate-900 tracking-tight">${value}</p>
                </div>
            </div>
        `;
    },

    _formatMoney(amount) {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(amount).replace('PYG', 'Gs.');
    }
};
