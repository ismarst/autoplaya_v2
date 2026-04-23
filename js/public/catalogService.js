import { supabase } from '../api/supabase.js';

export const catalogService = {
    /**
     * Obtiene el inventario público de vehículos disponibles con paginación
     */
    async getPublicInventory({ searchTerm = '', page = 1, pageSize = 6 } = {}) {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('vehiculos')
                .select(`
                    *,
                    locales (nombre)
                `)
                .is('deleted_at', null)
                .neq('estado', 'vendido')
                .order('created_at', { ascending: false })
                .range(from, to); // Paginación nativa de Supabase

            // Nota: Aquí se asume que si hubiera múltiples dueños, se filtraría por playa_id
            // query = query.eq('playa_id', 1);

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
                    // Búsqueda por Stock a veces puede ser útil si los refieren por código
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
    }
};
