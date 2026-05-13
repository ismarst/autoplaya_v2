import { supabase } from '../api/supabase.js';

export const historyService = {
    /**
     * Obtiene el listado completo de ventas realizadas
     */
    async getSalesHistory(playaId, { searchTerm = '', startDate = null, endDate = null } = {}) {
        let query = supabase
            .from('ventas')
            .select(`
                *,
                clientes(nombre, nro_documento),
                vehiculos(*)
            `)
            .eq('playa_id', playaId)
            .neq('estado', 'anulada')
            .order('fecha_venta', { ascending: false });

        if (startDate) {
            query = query.gte('fecha_venta', `${startDate}T00:00:00`);
        }
        if (endDate) {
            query = query.lte('fecha_venta', `${endDate}T23:59:59`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (searchTerm) {
            const normalize = (str) => str ? str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            const words = searchTerm.trim().split(/\s+/).map(w => normalize(w)).filter(w => w.length > 0);

            if (words.length === 0) return data;

            return data.filter(v => {
                const cliente = v.clientes || {};
                const vehiculo = v.vehiculos || {};

                // Texto consolidado para búsqueda
                const stockPadded = vehiculo.nro_stock ? vehiculo.nro_stock.toString().padStart(5, '0') : '';
                const baseText = normalize(`
                    ${cliente.nombre} ${cliente.nro_documento} 
                    ${vehiculo.marca} ${vehiculo.modelo} 
                    ${vehiculo.anho} ${stockPadded}
                `);

                // Cada palabra de la búsqueda debe estar en el texto base
                return words.every(word => baseText.includes(word));
            });
        }

        return data;
    },

    /**
     * Obtiene el historial de pagos (Movimientos de Caja)
     */
    async getPaymentHistory(playaId, { startDate, endDate, searchTerm = '' } = {}) {
        let query = supabase
            .from('pagos')
            .select(`
                *,
                ventas(
                    clientes(nombre, nro_documento),
                    vehiculos(nro_stock)
                ),
                cuotas(nro_cuota, es_refuerzo)
            `)
            .eq('playa_id', playaId)
            .order('fecha_pago', { ascending: false });

        if (startDate) {
            query = query.gte('fecha_pago', `${startDate}T00:00:00`);
        }
        if (endDate) {
            query = query.lte('fecha_pago', `${endDate}T23:59:59`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (searchTerm) {
            const normalize = (str) => str ? str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            const words = normalize(searchTerm).split(' ').filter(w => w.length > 0);

            return data.filter(p => {
                const cliente = p.ventas?.clientes || {};
                const baseText = normalize(`${cliente.nombre || ''} ${cliente.nro_documento || ''}`);
                return words.every(word => baseText.includes(word));
            });
        }

        return data;
    }
};
