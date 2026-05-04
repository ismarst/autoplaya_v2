/**
 * SECURITY UTILS - autoPlaya v2
 * Funciones de protección global contra ataques comunes.
 */

export const security = {
    /**
     * Protección XSS: Escapa caracteres especiales de HTML.
     * Úsalo SIEMPRE antes de insertar texto de la base de datos en un innerHTML.
     */
    esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
