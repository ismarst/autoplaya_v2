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
