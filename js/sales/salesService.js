import { supabase } from '../api/supabase.js';

export const salesService = {
    /**
     * Registra una venta completa y genera sus cuotas si es financiada
     */
    async processSale(saleData, quotas = []) {
        try {
            // 1. Iniciar Venta en Supabase
            const { data: sale, error: saleError } = await supabase
                .from('ventas')
                .insert([saleData])
                .select()
                .single();

            if (saleError) throw saleError;

            // 2. Si hay cuotas, insertarlas vinculadas a la venta
            if (quotas.length > 0) {
                const quotasToInsert = quotas.map(q => ({
                    ...q,
                    venta_id: sale.id,
                    playa_id: saleData.playa_id
                }));

                const { error: quotasError } = await supabase
                    .from('cuotas')
                    .insert(quotasToInsert);

                if (quotasError) throw quotasError;
            }

            // 3. Marcar vehículo como VENDIDO
            const { error: vehicleError } = await supabase
                .from('vehiculos')
                .update({ estado: 'vendido' })
                .eq('id', saleData.vehiculo_id);

            if (vehicleError) throw vehicleError;

            return sale;
        } catch (error) {
            console.error('Error al procesar venta:', error.message);
            throw error;
        }
    }
};
