import { supabase } from '../api/supabase.js';

export const reportsService = {
    /**
     * Obtiene estadísticas maestras para el Dashboard de Gerencia
     */
    async getManagerStats(playaId) {
        // 1. Stock Activo (Suma precio_contado de disponibles como fallback)
        const { data: stockData, error: stockError } = await supabase
            .from('vehiculos')
            .select('precio_contado')
            .eq('playa_id', playaId)
            .eq('estado', 'disponible');

        if (stockError) throw stockError;
        const activeStockValue = stockData.reduce((acc, v) => acc + (Number(v.precio_contado) || 0), 0);

        // 2. Ventas del Mes
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const { count: salesCount, error: salesError } = await supabase
            .from('ventas')
            .select('*', { count: 'exact', head: true })
            .eq('playa_id', playaId)
            .gte('fecha_venta', firstDayOfMonth.toISOString());

        if (salesError) throw salesError;

        // 3. Recaudación Hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: paymentsToday, error: paymentsError } = await supabase
            .from('pagos')
            .select('monto')
            .eq('playa_id', playaId)
            .gte('fecha_pago', today.toISOString());

        if (paymentsError) throw paymentsError;
        const totalCollectedToday = paymentsToday.reduce((acc, p) => acc + Number(p.monto), 0);

        // 4. Mora Activa (Contar CLIENTES únicos con deuda vencida, sincronizado con la lógica visual)
        const dStats = new Date();
        const t = new Date(); t.setDate(dStats.getDate() + 1);
        const tomorrowStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

        const { data: overdueData, error: overdueError } = await supabase
            .from('cuotas')
            .select('venta_id, ventas!inner(cliente_id)')
            .eq('playa_id', playaId)
            .neq('estado', 'pagado')
            .lt('fecha_vencimiento', tomorrowStr);

        if (overdueError) throw overdueError;

        // Contar IDs de clientes únicos
        const uniqueOverdueClients = new Set();
        if (overdueData) {
            overdueData.forEach(c => {
                if (c.ventas && c.ventas.cliente_id) {
                    uniqueOverdueClients.add(c.ventas.cliente_id);
                }
            });
        }
        const overdueCount = uniqueOverdueClients.size;

        return {
            activeStockValue,
            salesCount: salesCount || 0,
            totalCollectedToday,
            overdueCount: overdueCount || 0
        };
    },

    async getDashboardLists(playaId) {
        try {
            // 1. Últimos 5 vehículos ingresados
            const { data: latestVehicles, error: vError } = await supabase
                .from('vehiculos')
                .select('*')
                .eq('playa_id', playaId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(5);

            if (vError) throw vError;

            // 2. PRÓXIMOS VENCIMIENTOS
            // Sincronizado con collectionsService: Traemos todas las cuotas de ventas activas
            const { data: rawData, error: eError } = await supabase
                .from('cuotas')
                .select(`
                    *,
                    ventas!inner(
                        id,
                        estado,
                        clientes(id, nombre, nro_documento),
                        vehiculos(marca, modelo, nro_stock, anho)
                    )
                `)
                .eq('playa_id', playaId)
                .neq('ventas.estado', 'anulada');

            if (eError) throw eError;

            // Filtro Seguro en JS (Evita la trampa de los NULL de Postgres)
            const allUnpaid = rawData.filter(c => c.estado !== 'pagado');

            // --- PROCESAMIENTO CENTRADO EN EL CLIENTE ---

            // --- PROCESAMIENTO CENTRADO EN EL CLIENTE (Lógica Robusta de Fechas) ---
            const today = new Date(); today.setHours(0, 0, 0, 0);

            // A) Identificar CLIENTES que tienen DEUDA VENCIDA (Mora en CUALQUIER vehículo)
            const clientsWithArrears = new Set();
            allUnpaid.forEach(c => {
                const dueDate = new Date(c.fecha_vencimiento);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate < today && c.ventas && c.ventas.clientes) {
                    clientsWithArrears.add(c.ventas.clientes.id);
                }
            });

            // B) Filtrar vencimientos FUTUROS de CLIENTES que NO tengan mora
            const upcomingCandidates = allUnpaid.filter(c => {
                const dueDate = new Date(c.fecha_vencimiento);
                dueDate.setHours(0, 0, 0, 0);

                const isFutureOrToday = dueDate >= today;
                const clientId = c.ventas?.clientes?.id;
                const isClean = clientId && !clientsWithArrears.has(clientId);
                return isFutureOrToday && isClean;
            });

            // C) ORDENAMIENTO MANUAL POR FECHA (Garantiza prioridad de inminentes sobre refuerzos)
            upcomingCandidates.sort((a, b) => {
                if (a.fecha_vencimiento < b.fecha_vencimiento) return -1;
                if (a.fecha_vencimiento > b.fecha_vencimiento) return 1;
                return 0;
            });

            // D) Agrupar por CLIENTE: Solo la PRÓXIMA cuota global del cliente
            const finalExpirations = [];
            const processedClients = new Set();

            for (const item of upcomingCandidates) {
                const clientId = item.ventas?.clientes?.id;
                if (clientId && !processedClients.has(clientId)) {
                    finalExpirations.push(item);
                    processedClients.add(clientId);
                }
                if (finalExpirations.length >= 5) break;
            }

            return {
                latestVehicles: latestVehicles || [],
                nextExpirations: finalExpirations
            };
        } catch (error) {
            console.error('Error en getDashboardLists:', error.message);
            throw error;
        }
    }
};
