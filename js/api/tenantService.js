import { supabase } from './supabase.js';

/**
 * Servicio para identificar la Playa actual basada en el dominio (Hostname).
 * Esto permite que el mismo código sirva para múltiples clientes.
 */
export const tenantService = {
    _currentPlaya: null,

    /**
     * Identifica la playa actual consultando la base de datos por el dominio.
     * Utiliza sessionStorage para cachear la identidad y evitar consultas repetitivas.
     */
    async identify() {
        try {
            // 1. Obtener el dominio actual (ej: localhost:8080 o playa1.com)
            const host = window.location.host;

            // 2. Revisar si ya lo tenemos en el caché de la sesión
            const cached = sessionStorage.getItem('current_playa_config');
            if (cached) {
                const config = JSON.parse(cached);
                if (config.dominio === host) {
                    this._currentPlaya = config;
                    return config;
                }
            }

            // 3. Si no está en caché o el host cambió, buscar en Supabase
            const { data, error } = await supabase
                .from('playas')
                .select('id, nombre_comercial, configuracion, dominio, logo_url')
                .eq('dominio', host)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                console.error(`DOMINIO NO REGISTRADO: ${host}. Verifica la tabla 'playas'.`);
                // En producción, aquí podrías redirigir a una página de error o landing principal
                return null;
            }

            // 4. Guardar en caché y en memoria
            this._currentPlaya = data;
            sessionStorage.setItem('current_playa_config', JSON.stringify(data));
            
            return data;
        } catch (error) {
            console.error('Error identificando inquilino (Tenant):', error.message);
            return null;
        }
    },

    /**
     * Obtiene el ID de la playa actual (Sustituye al valor estático de config.js)
     */
    getPlayaId() {
        return this._currentPlaya?.id || null;
    },

    /**
     * Obtiene la configuración completa (Nombre, Logo, etc.)
     */
    getConfig() {
        return this._currentPlaya || {};
    }
};
