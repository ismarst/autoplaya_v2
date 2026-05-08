import { supabase } from '../api/supabase.js';
import { collectionsService } from '../collections/collectionsService.js';

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

            // 4. REGISTRAR INGRESO INMEDIATO EN CAJA (CONTADO O ENTREGA INICIAL)
            let montoIngreso = 0;
            let observacion = '';

            if (saleData.tipo_venta === 'contado' && saleData.total_venta > 0) {
                montoIngreso = saleData.total_venta;
                observacion = 'PAGO TOTAL AL CONTADO';
            } else if (saleData.tipo_venta === 'financiado' && saleData.entrega_inicial > 0) {
                montoIngreso = saleData.entrega_inicial;
                observacion = 'ENTREGA INICIAL DE FINANCIACIÓN';
            }

            if (montoIngreso > 0) {
                // Generamos recibo oficial usando el módulo de cobranzas (auto-sanador incluido)
                const nroRecibo = await collectionsService._generateReceiptNumber(saleData.playa_id);
                
                const { error: pagoError } = await supabase
                    .from('pagos')
                    .insert([{
                        playa_id: saleData.playa_id,
                        venta_id: sale.id,
                        cuota_id: null,
                        monto: montoIngreso,
                        tipo_pago: 'efectivo', // Por defecto en MVP
                        nro_recibo: nroRecibo,
                        observaciones: observacion,
                        fecha_pago: new Date().toISOString()
                    }]);

                if (pagoError) throw pagoError;
            }

            return sale;
        } catch (error) {
            console.error('Error al procesar venta:', error.message);
            throw error;
        }
    }
};
