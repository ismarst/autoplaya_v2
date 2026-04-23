import { supabase } from '../api/supabase.js';

export const collectionsService = {
    /**
     * Obtiene el total recaudado el día de hoy para la playa actual
     */
    async getTodayTotal(playaId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('pagos')
            .select('monto')
            .eq('playa_id', playaId)
            .gte('fecha_pago', today.toISOString());

        if (error) throw error;
        return data.reduce((acc, p) => acc + Number(p.monto), 0);
    },

    /**
     * Obtiene todos los clientes con saldo pendiente organizados para el Dashboard
     */
    async getDashboardClients(playaId) {
        // 1. Obtener todas las cuotas de ventas financiadas activas (No anuladas)
        // Traemos todas para determinar el estado global del cliente (si terminó de pagar o no)
        const { data: cuotas, error } = await supabase
            .from('cuotas')
            .select(`
                *,
                ventas!inner(
                    id, 
                    cliente_id, 
                    tipo_venta,
                    estado,
                    clientes(id, nombre, nro_documento, telefono),
                    vehiculos(marca, modelo, nro_stock)
                )
            `)
            .eq('playa_id', playaId)
            .eq('ventas.tipo_venta', 'financiado')
            .neq('ventas.estado', 'anulada') // Solo ventas activas
            .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;

        // 2. Agrupar por Cliente
        const clientsMap = new Map();

        cuotas.forEach(c => {
            const clientId = c.ventas.cliente_id;
            if (!clientsMap.has(clientId)) {
                clientsMap.set(clientId, {
                    client: c.ventas.clientes,
                    vehicle: c.ventas.vehiculos,
                    nextQuota: null,
                    status: 'paid', // Por defecto 'al día' hasta encontrar una pendiente
                    totalPending: 0,
                    activeSalesCount: 0,
                    saleIds: new Set()
                });
            }

            const entry = clientsMap.get(clientId);

            // Si la cuota NO está pagada
            if (c.estado !== 'pagado') {
                entry.saleIds.add(c.venta_id);
                entry.activeSalesCount = entry.saleIds.size;
                entry.totalPending += Number(c.monto);

                // La primera cuota no pagada que encontremos (por el sort asc) es la Próxima
                if (!entry.nextQuota) {
                    entry.nextQuota = c;
                    entry.vehicle = c.ventas.vehiculos;

                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(c.fecha_vencimiento); dueDate.setHours(0, 0, 0, 0);

                    if (dueDate < today) entry.status = 'overdue';
                    else if (dueDate.getTime() === today.getTime()) entry.status = 'today';
                    else entry.status = 'upcoming';
                }
            }
        });

        // 3. Convertir a Array y Ordenar por Prioridad
        return Array.from(clientsMap.values()).sort((a, b) => {
            const priority = { 'overdue': 0, 'today': 1, 'upcoming': 2, 'paid': 3 };
            if (priority[a.status] !== priority[b.status]) {
                return priority[a.status] - priority[b.status];
            }
            // Si ambos tienen próxima cuota, ordenar por fecha (más antigua primero)
            if (a.nextQuota && b.nextQuota) {
                return new Date(a.nextQuota.fecha_vencimiento) - new Date(b.nextQuota.fecha_vencimiento);
            }
            return 0;
        });
    },

    /**
     * Obtiene el resumen de cuenta y todas las cuotas de un cliente
     */
    async getClientAccountState(clientId, playaId) {
        // 1. Obtener todas las cuotas de todas las ventas del cliente
        const { data: cuotas, error } = await supabase
            .from('cuotas')
            .select(`
                *,
                ventas!inner(
                    id, 
                    vehiculo_id, 
                    total_venta, 
                    entrega_inicial, 
                    vehiculos(marca, modelo, nro_stock),
                    clientes(id, nombre, nro_documento, telefono)
                )
            `)
            .eq('playa_id', playaId)
            .eq('ventas.cliente_id', clientId)
            .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;

        // 2. Obtener todos los pagos realizados para esas ventas (incluyendo abonos a capital)
        const ventaIds = [...new Set(cuotas.map(c => c.venta_id))];
        const { data: pagos, error: pagosError } = await supabase
            .from('pagos')
            .select('*')
            .in('venta_id', ventaIds)
            .order('fecha_pago', { ascending: false });

        if (pagosError) throw pagosError;

        // 3. Calcular Resumen Basado en Pagos e Integridad
        // Usamos la primera venta como referencia si hay varias (usualmente es una activa)
        // O mejor, sumamos totales de ventas involucradas
        const uniqueSales = Array.from(new Map(cuotas.map(c => [c.venta_id, c.ventas])).values());
        const totalVentaOriginal = uniqueSales.reduce((acc, s) => acc + Number(s.total_venta), 0);

        // El total pagado es la sumatoria de todos los registros en la tabla pagos
        const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
        const saldoPendiente = totalVentaOriginal - totalPagado;

        return {
            summary: { totalDeuda: totalVentaOriginal, totalPagado, saldoPendiente },
            obligations: cuotas,
            payments: pagos,
            sales: uniqueSales // Retornamos la lista de ventas para el selector
        };
    },

    async _generateReceiptNumber(playaId) {
        // 1. Obtener e Incrementar el correlativo de recibo (Atómico en lo posible vía .select)
        const { data: config, error: configError } = await supabase
            .from('configuracion_caja')
            .update({ ultimo_nro_recibo: supabase.rpc('increment_receipt', { p_id: playaId }) || 1 }) // fallback si no hay rpc
            .eq('playa_id', playaId)
            .select()
            .single();

        // Si falla el update o no existe increment_receipt (procede manual por ahora)
        let nroRecibo;
        if (configError) {
            // Intento manual (lectura y suma)
            const { data: current } = await supabase
                .from('configuracion_caja')
                .select('ultimo_nro_recibo')
                .eq('playa_id', playaId)
                .single();

            nroRecibo = (current?.ultimo_nro_recibo || 0) + 1;
            await supabase.from('configuracion_caja').upsert({ playa_id: playaId, ultimo_nro_recibo: nroRecibo });
        } else {
            nroRecibo = config.ultimo_nro_recibo;
        }
        return nroRecibo;
    },

    /**
     * Procesa secuencialmente el cobro de una cuota
     */
    async processPayment(paymentData) {
        const { playa_id, cuota_id, venta_id, monto, tipo_pago, observaciones } = paymentData;

        try {
            const nroRecibo = await this._generateReceiptNumber(playa_id);

            // 2. Registrar el Pago
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    playa_id,
                    venta_id,
                    cuota_id,
                    monto,
                    tipo_pago,
                    nro_recibo: nroRecibo,
                    observaciones,
                    fecha_pago: new Date().toISOString()
                }]);

            if (paymentError) throw paymentError;

            // 3. Actualizar el estado de la cuota
            const { error: cuotaError } = await supabase
                .from('cuotas')
                .update({ estado: 'pagado' })
                .eq('id', cuota_id);

            if (cuotaError) throw cuotaError;

            return { success: true, nroRecibo };

        } catch (error) {
            console.error('Error en processPayment:', error);
            throw error;
        }
    },

    /**
     * Procesa un abono extra (amortización de capital)
     * Elimina cuotas desde el final hacia atrás.
     */
    async processExtraPayment(paymentData) {
        const { playa_id, venta_id, monto, tipo_pago, observaciones, cliente_id } = paymentData;

        try {
            const nroRecibo = await this._generateReceiptNumber(playa_id);

            // 1. Registrar el Pago (sin cuota_id específica, es amortización)
            const { error: paymentError } = await supabase
                .from('pagos')
                .insert([{
                    playa_id,
                    venta_id,
                    cuota_id: null,
                    monto,
                    tipo_pago,
                    nro_recibo: nroRecibo,
                    observaciones: `ABONO EXTRA A CAPITAL - RECALCULADO ${observaciones ? `(${observaciones})` : ''}`,
                    fecha_pago: new Date().toISOString()
                }]);

            if (paymentError) throw paymentError;

            // 2. Obtener cuotas pendientes ordenadas desde la última (descendente)
            const { data: reverseQuotas } = await supabase
                .from('cuotas')
                .select('*')
                .eq('venta_id', venta_id)
                .neq('estado', 'pagado')
                // Priorizar cuotas normales sobre refuerzos? O simplemente fecha?
                // Generalmente se cancela lo mas lejano.
                .order('fecha_vencimiento', { ascending: false });

            let remainingAmount = monto;
            const quotasToDelete = [];
            const quotasToUpdate = [];

            for (const q of reverseQuotas) {
                if (remainingAmount <= 0) break;

                if (remainingAmount >= q.monto) {
                    quotasToDelete.push(q.id);
                    remainingAmount -= q.monto;
                } else {
                    // Parcial? 
                    // Opción A: Reducir monto de esta cuota
                    quotasToUpdate.push({ id: q.id, nuevo_monto: q.monto - remainingAmount });
                    remainingAmount = 0;
                }
            }

            // 3. Aplicar Cambios
            if (quotasToDelete.length > 0) {
                await supabase.from('cuotas').delete().in('id', quotasToDelete);
            }

            if (quotasToUpdate.length > 0) {
                for (const u of quotasToUpdate) {
                    await supabase.from('cuotas').update({ monto: u.nuevo_monto }).eq('id', u.id);
                }
            }

            return { success: true, nroRecibo };

        } catch (error) {
            console.error('Error en processExtraPayment:', error);
            throw error;
        }
    }
};
