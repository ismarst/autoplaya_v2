import { supabase } from '../api/supabase.js';
import { tenantService } from '../api/tenantService.js';

export const clientService = {
    async getClients({ searchTerm = '' } = {}) {
        try {
            let query = supabase
                .from('clientes')
                .select('*')
                .eq('playa_id', tenantService.getPlayaId()) // <-- BLINDAJE DINÁMICO
                .is('deleted_at', null)
                .order('nombre', { ascending: true });

            if (searchTerm) {
                const search = `%${searchTerm.trim().toUpperCase()}%`;
                query = query.or(`nombre.ilike.${search},nro_documento.ilike.${search}`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error en getClients:', error.message);
            throw error;
        }
    },

    async getClientPurchases(clientId) {
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select('id, fecha_venta, total_venta, vehiculos(id, marca, modelo, anho, nro_stock)')
                .eq('cliente_id', clientId)
                .neq('estado', 'anulada')
                .order('fecha_venta', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching client purchases:', error.message);
            return [];
        }
    },

    async getClientBudgets(clientId) {
        try {
            const { data, error } = await supabase
                .from('presupuestos')
                .select('id, fecha_presupuesto, tipo_venta, precio_negociado, entrega_inicial, cantidad_cuotas, vehiculos(id, marca, modelo, anho, nro_stock, estado)')
                .eq('cliente_id', clientId)
                .order('fecha_presupuesto', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching client budgets:', error.message);
            return [];
        }
    },

    async getClientNotes(clientId) {
        try {
            const { data, error } = await supabase
                .from('crm_notas')
                .select('*')
                .eq('cliente_id', clientId)
                .order('fecha_creacion', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching client notes:', error.message);
            return [];
        }
    },

    async saveClientNote(noteData) {
        try {
            const { data, error } = await supabase
                .from('crm_notas')
                .insert([noteData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving client note:', error.message);
            throw error;
        }
    },

    async updateClientNote(noteId, text) {
        try {
            const { data, error } = await supabase
                .from('crm_notas')
                .update({ comentario: text.toUpperCase() })
                .eq('id', noteId);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating client note:', error.message);
            throw error;
        }
    },

    async deleteClientNote(noteId) {
        try {
            const { error } = await supabase
                .from('crm_notas')
                .delete()
                .eq('id', noteId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting client note:', error.message);
            throw error;
        }
    },

    async saveClient(clientData) {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .insert([clientData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error en saveClient:', error.message);
            throw error;
        }
    },

    async updateClient(id, clientData) {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .update(clientData)
                .eq('id', id)
                .eq('playa_id', tenantService.getPlayaId()) // BLINDAJE DINÁMICO
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error en updateClient:', error.message);
            throw error;
        }
    },

    async deleteClient(id) {
        try {
            const { error } = await supabase
                .from('clientes')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('playa_id', tenantService.getPlayaId()); // BLINDAJE DINÁMICO

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error en deleteClient:', error.message);
            throw error;
        }
    }
};
