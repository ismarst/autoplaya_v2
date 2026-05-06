import { supabase } from '../api/supabase.js';
import { CONFIG } from '../config.js';
import { tenantService } from '../api/tenantService.js';

export const inventoryService = {
    /**
     * Obtiene la lista de vehículos con paginación y filtros.
     * RLS se encarga del aislamiento por playa_id.
     */
    async getVehicles({ page = 1, pageSize = 12, localId = null, searchTerm = '' } = {}) {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Usamos el ID identificado por el dominio (SaaS dinámico)
            const playaId = tenantService.getPlayaId();

            let query = supabase
                .from('vehiculos')
                .select(`
                    *,
                    locales (nombre)
                `, { count: 'exact' })
                .eq('playa_id', playaId) // <-- FILTRO DE HIERRO
                .is('deleted_at', null)
                .neq('estado', 'vendido')
                .order('created_at', { ascending: false });

            if (localId) query = query.eq('local_id', localId);

            if (searchTerm) {
                const words = searchTerm.trim().split(/\s+/);
                words.forEach(word => {
                    const search = `%${word}%`;
                    let filterParts = [
                        `marca.ilike.${search}`,
                        `modelo.ilike.${search}`,
                        `color.ilike.${search}`,
                        `chapa.ilike.${search}`,
                        `nro_chasis.ilike.${search}`
                    ];

                    // Manejo del Año (campo entero - solo si son 4 dígitos)
                    if (!isNaN(word) && word.length === 4) {
                        filterParts.push(`anho.eq.${parseInt(word)}`);
                    }

                    // Manejo de Stock (campo entero - requiere 5 dígitos para desambiguar)
                    if (!isNaN(word) && word.length === 5) {
                        filterParts.push(`nro_stock.eq.${parseInt(word)}`);
                    }

                    query = query.or(filterParts.join(','));
                });
            }

            const { data, error, count } = await query.range(from, to);

            if (error) throw error;
            return { data, totalRecords: count };
        } catch (error) {
            console.error('Error en getVehicles:', error.message);
            throw error;
        }
    },

    /**
     * Sube una foto al Storage organizado por playa_id.
     */
    async uploadVehiclePhoto(file, playaId) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${playaId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('fotos_vehiculos')
                .upload(filePath, file);

            if (error) throw error;

            // Obtener la URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('fotos_vehiculos')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error en uploadVehiclePhoto:', error.message);
            throw error;
        }
    },

    /**
     * Guarda un nuevo vehículo en la base de datos.
     */
    async saveVehicle(vehicleData) {
        try {
            const { data, error } = await supabase
                .from('vehiculos')
                .insert([vehicleData])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error en saveVehicle:', error.message);
            throw error;
        }
    },

    /**
     * Actualiza un vehículo existente.
     */
    async updateVehicle(id, updatedData) {
        try {
            const { data, error } = await supabase
                .from('vehiculos')
                .update(updatedData)
                .eq('id', id)
                .eq('playa_id', tenantService.getPlayaId()) // BLINDAJE DINÁMICO
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error en updateVehicle:', error.message);
            throw error;
        }
    },

    /**
     * Obtiene la ruta relativa del Storage a partir de una URL pública.
     */
    _extractStoragePath(url) {
        // Ejemplo URL: .../storage/v1/object/public/fotos_vehiculos/playa_id/imagen.jpg
        const parts = url.split('/fotos_vehiculos/');
        return parts.length > 1 ? parts[1] : null;
    },

    /**
     * Borrado definitivo de un vehículo y sus fotos físicas en Storage.
     */
    async deleteVehicle(id) {
        try {
            // 1. Obtener datos del vehículo antes de borrar (para tener las URLs de las fotos)
            const { data: vehicle, error: fetchError } = await supabase
                .from('vehiculos')
                .select('fotos')
                .eq('id', id)
                .eq('playa_id', tenantService.getPlayaId()) // BLINDAJE DINÁMICO
                .single();

            if (fetchError) throw fetchError;

            // 2. Limpieza de Storage
            if (vehicle.fotos && vehicle.fotos.length > 0) {
                const pathsToDelete = vehicle.fotos
                    .map(url => this._extractStoragePath(url))
                    .filter(path => path !== null);

                if (pathsToDelete.length > 0) {
                    const { error: storageError } = await supabase.storage
                        .from('fotos_vehiculos')
                        .remove(pathsToDelete);

                    if (storageError) console.error('Error limpiando archivos de Storage:', storageError);
                }
            }

            // 3. Borrado físico del registro (Ya no lógico, a menos que el usuario lo pida)
            const { error: dbError } = await supabase
                .from('vehiculos')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;
            return true;
        } catch (error) {
            console.error('Error en deleteVehicle:', error.message);
            throw error;
        }
    },

    /**
     * Borra una foto específica del Storage y actualiza el array en la DB.
     */
    async deletePhotoFromVehicle(vehicleId, photoUrl) {
        try {
            // 1. Borrar archivo del Storage
            const path = this._extractStoragePath(photoUrl);
            if (path) {
                await supabase.storage.from('fotos_vehiculos').remove([path]);
            }

            // 2. Obtener fotos actuales
            const { data: vehicle } = await supabase
                .from('vehiculos')
                .select('fotos')
                .eq('id', vehicleId)
                .single();

            // 3. Actualizar array filtrado
            const updatedFotos = vehicle.fotos.filter(f => f !== photoUrl);
            const { error: updateError } = await supabase
                .from('vehiculos')
                .update({ fotos: updatedFotos })
                .eq('id', vehicleId);

            if (updateError) throw updateError;
            return updatedFotos;
        } catch (error) {
            console.error('Error en deletePhotoFromVehicle:', error.message);
            throw error;
        }
    },

    /**
     * Borra múltiples fotos del Storage por sus URLs públicas.
     */
    async deletePhotosFromStorage(urls) {
        try {
            const pathsToCleanup = urls
                .map(url => this._extractStoragePath(url))
                .filter(path => path !== null);

            if (pathsToCleanup.length > 0) {
                const { error } = await supabase.storage
                    .from('fotos_vehiculos')
                    .remove(pathsToCleanup);

                if (error) throw error;
            }
            return true;
        } catch (error) {
            console.error('Error en deletePhotosFromStorage:', error.message);
            throw error;
        }
    },

    /**
     * Obtiene los locales de la playa actual.
     */
    async getLocals() {
        try {
            const { data, error } = await supabase
                .from('locales')
                .select('*')
                .eq('playa_id', tenantService.getPlayaId()) // <-- BLINDAJE DINÁMICO
                .is('deleted_at', null)
                .order('nombre', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error en getLocals:', error.message);
            throw error;
        }
    },

    async saveLocal(localData) {
        try {
            const { data, error } = await supabase
                .from('locales')
                .insert([localData])
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error en saveLocal:', error.message);
            throw error;
        }
    },

    async updateLocal(id, localData) {
        try {
            const { data, error } = await supabase
                .from('locales')
                .update(localData)
                .eq('id', id)
                .eq('playa_id', tenantService.getPlayaId()) // CANDADO DINÁMICO
                .select();
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error en updateLocal:', error.message);
            throw error;
        }
    },

    async deleteLocal(id) {
        try {
            // Borrado lógico para mantener integridad
            const { error } = await supabase
                .from('locales')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('playa_id', tenantService.getPlayaId()); // CANDADO DINÁMICO
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error en deleteLocal:', error.message);
            throw error;
        }
    }
};
