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

        // 4. Mora Activa (Cuotas pendientes vencidas)
        const { count: overdueCount, error: overdueError } = await supabase
            .from('cuotas')
            .select('*', { count: 'exact', head: true })
            .eq('playa_id', playaId)
            .eq('estado', 'pendiente')
            .lt('fecha_vencimiento', today.toISOString().split('T')[0]);

        if (overdueError) throw overdueError;

        return {
            activeStockValue,
            salesCount: salesCount || 0,
            totalCollectedToday,
            overdueCount: overdueCount || 0
        };
    },

    /**
     * Obtiene listados rápidos para el dashboard
     */
    async getDashboardLists(playaId) {
        // Últimos 5 vehículos
        const { data: latestVehicles, error: vError } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('playa_id', playaId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (vError) throw vError;

        // Próximos 5 vencimientos (incluyendo info de vehículo)
        const { data: nextExpirations, error: eError } = await supabase
            .from('cuotas')
            .select(`
                *,
                ventas(
                    clientes(id, nombre, nro_documento),
                    vehiculos(marca, modelo, nro_stock, anho)
                )
            `)
            .eq('playa_id', playaId)
            .eq('estado', 'pendiente')
            .gte('fecha_vencimiento', new Date().toISOString().split('T')[0])
            .order('fecha_vencimiento', { ascending: true })
            .limit(5);

        if (eError) throw eError;

        return {
            latestVehicles,
            nextExpirations
        };
    }
};
