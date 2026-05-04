# autoPlaya v2 — SaaS de Gestión de Playas de Vehículos

Este proyecto es una plataforma multitenant para la gestión de inventario, ventas y cobranzas de playas de vehículos. Utiliza una arquitectura **Serverless** con **Supabase** como backend y un frontend estático optimizado para despliegue en **cPanel / Shared Hosting**.

## 🚀 Configuración para Nuevos Clientes (Dominios Propios)

El sistema está diseñado para que cada cliente (playa) tenga su propio dominio o subdominio independiente, compartiendo la misma base de datos pero aislados por su `PLAYA_ID`.

### Pasos para configurar una nueva instancia:

1.  **Obtener el ID de la Playa:**
    Ejecuta en el SQL Editor de Supabase:
    ```sql
    SELECT id, nombre_comercial FROM public.playas;
    ```

2.  **Configurar el archivo de acceso:**
    Crea un archivo en `js/config.js` (basado en `js/config.example.js`) con las credenciales y el ID específico del cliente:
    ```javascript
    export const SUPABASE_CONFIG = {
        URL: "https://tu-proyecto.supabase.co",
        ANON_KEY: "tu-anon-key-publica",
        PLAYA_ID: "EL-UUID-QUE-OBTUVISTE-EN-EL-PASO-1" // <--- CRÍTICO
    };
    ```

3.  **Despliegue:**
    Sube los archivos al servidor. El catálogo público (`catalogo.html`) detectará automáticamente el `PLAYA_ID` del archivo `config.js` y mostrará solo los vehículos de ese cliente sin necesidad de parámetros extra en la URL.

## 🔒 Seguridad y Auditoría

Este proyecto ha pasado por una auditoría de seguridad integral:
- **Aislamiento Multitenant:** Implementado vía RLS (Row Level Security) en Supabase y filtrado por `playa_id` en el cliente.
- **Protección XSS:** Sanitización de datos de base de datos antes de renderizar HTML.
- **Blindaje de Credenciales:** Las llaves sensibles no se incluyen en el repositorio (ver `.gitignore`).
- **Configuración de Servidor:** Incluye `.htaccess` para bloquear acceso a archivos `.env`, `.sql` y archivos de desarrollo en servidores Apache.

Para más detalles sobre el despliegue seguro, consulta:
👉 [Guía de Deploy en cPanel](AUDITORIA/DEPLOY_CPANEL.md)

## 🛠️ Desarrollo Local

Para probar el proyecto localmente:
1. Crea tu `js/config.js`.
2. Ejecuta un servidor local:
   ```bash
   npx http-server .
   ```
3. Accede a `http://localhost:8080`

---
**Desarrollado con enfoque en Seguridad y Escalabilidad.**
