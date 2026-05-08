import { supabase } from '../api/supabase.js';

export const catalogService = {
    /**
     * Obtiene el inventario público de vehículos disponibles con paginación.
     * El playaId viene de la URL (?playa=UUID) y filtra los resultados por tenant.
     * La anon key de Supabase es pública por diseño; la seguridad real está en RLS.
     */
    async getPublicInventory({ searchTerm = '', page = 1, pageSize = 6, playaId = null, localId = null } = {}) {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('vehiculos')
                .select(`
                    *,
                    locales (*)
                `)
                .is('deleted_at', null)
                .neq('estado', 'vendido')
                .order('created_at', { ascending: false })
                .range(from, to);

            // Filtro por tenant
            if (playaId) {
                query = query.eq('playa_id', playaId);
            } else {
                return [];
            }

            // Filtro por sucursal específica
            if (localId && localId !== 'all') {
                query = query.eq('local_id', localId);
            }

            if (searchTerm) {
                const words = searchTerm.trim().split(/\s+/);
                words.forEach(word => {
                    const search = `%${word}%`;
                    let filterParts = [
                        `marca.ilike.${search}`,
                        `modelo.ilike.${search}`
                    ];

                    if (!isNaN(word) && word.length === 4) {
                        filterParts.push(`anho.eq.${parseInt(word)}`);
                    }
                    if (!isNaN(word) && word.length === 5) {
                        filterParts.push(`nro_stock.eq.${parseInt(word)}`);
                    }

                    query = query.or(filterParts.join(','));
                });
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error en getPublicInventory:', error.message);
            throw error;
        }
    },

    /**
     * Obtiene los locales públicos de la playa actual.
     */
    async getPublicLocales(playaId) {
        try {
            const { data, error } = await supabase
                .from('locales')
                .select('*')
                .eq('playa_id', playaId)
                .is('deleted_at', null)
                .order('nombre', { ascending: true });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error en getPublicLocales:', error.message);
            throw error;
        }
    }
};
