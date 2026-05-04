# Guía de Deploy en cPanel — autoPlaya v2

## ¿Está seguro para producción?

**Respuesta corta: Sí, con las instrucciones de esta guía.**

La `anon key` de Supabase es pública **por diseño** — la protección real está
en las políticas RLS de la DB (que están correctamente configuradas).
Lo importante es seguir exactamente qué subir y qué NO subir al servidor.

---

## PASO 1 — Configurar Supabase ANTES del deploy

### 1.1 — Agregar tu dominio como URL autorizada

En el dashboard de Supabase → **Authentication → URL Configuration**:

```
Site URL:          https://tu-dominio.com
Redirect URLs:     https://tu-dominio.com/index.html
                   https://tu-dominio.com/login.html
```

### 1.2 — Verificar CORS en Supabase

Supabase permite requests desde cualquier origen a la API por defecto.
Para restringirlo a solo tu dominio, ir a **Settings → API** y verificar
que no haya orígenes no autorizados configurados.

---

## PASO 2 — Actualizar js/config.js con las credenciales de producción

El archivo `js/config.js` (no está en git, existe solo en tu disco) tiene
las credenciales que se subirán al servidor.

```js
// js/config.js — Este archivo SÍ se sube al servidor (anon key es pública)
export const SUPABASE_CONFIG = {
    URL: "https://cjxmwfqvpvtpxufvubcw.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

> La anon key es pública por diseño de Supabase. El archivo será accesible
> en el servidor pero esto es aceptable — la seguridad real está en RLS.

---

## PASO 3 — Actualizar la URL del catálogo en catalogo.html

El catálogo ahora requiere el `playa_id` en la URL para filtrar por tenant:

```
https://tu-dominio.com/catalogo.html?playa=TU_UUID_DE_PLAYA
```

Para obtener el UUID de tu playa, ejecutar en Supabase SQL Editor:
```sql
SELECT id, nombre_comercial FROM public.playas;
```

---

## PASO 4 — Archivos a subir al File Manager de cPanel

### ✅ SUBIR estos archivos/carpetas a `public_html/`:

```
✅ index.html
✅ login.html
✅ catalogo.html
✅ .htaccess              ← IMPORTANTE: protege archivos sensibles
✅ js/                   ← toda la carpeta (incluyendo config.js)
✅ img/                  ← logo y assets
```

### ❌ NO subir estos archivos:

```
❌ master_schema.sql     → expone estructura de DB
❌ schema.json           → ídem
❌ .env                  → no tiene sentido en static hosting
❌ test_rls.mjs          → archivo de pruebas de desarrollo
❌ AUDITORIA/            → contiene info de vulnerabilidades
❌ sql/                  → scripts SQL
❌ .git/                 → historial Git completo
❌ *.md                  → documentación interna (VERSION, CHANGELOG, etc.)
❌ js/config.example.js  → puede confundir (opcional subir, no tiene credenciales)
```

---

## PASO 5 — Verificar que .htaccess funciona

Después del deploy, verificar que estos archivos NO son accesibles:

```bash
# Debe responder 403 Forbidden:
https://tu-dominio.com/.env
https://tu-dominio.com/master_schema.sql   (si por error se subió)

# Debe responder 200 OK:
https://tu-dominio.com/index.html
https://tu-dominio.com/login.html
https://tu-dominio.com/catalogo.html?playa=UUID
```

---

## PASO 6 — Habilitar SSL en cPanel

En cPanel → **SSL/TLS** → **Let's Encrypt** → emitir certificado para tu dominio.

Una vez activo, descomentar esta línea en `.htaccess`:
```apache
# Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```
Cambiar a:
```apache
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

---

## PASO 7 — Aplicar los índices de performance en Supabase

Los índices nuevos del `master_schema.sql` (sección 7) deben aplicarse
manualmente en el SQL Editor de Supabase:

```sql
CREATE INDEX IF NOT EXISTS idx_vehiculos_playa_estado
    ON public.vehiculos(playa_id, estado) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cuotas_playa_estado_venc
    ON public.cuotas(playa_id, estado, fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_pagos_playa_fecha
    ON public.pagos(playa_id, fecha_pago DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_playa_fecha
    ON public.ventas(playa_id, fecha_venta DESC);

CREATE INDEX IF NOT EXISTS idx_clientes_playa
    ON public.clientes(playa_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_locales_playa
    ON public.locales(playa_id) WHERE deleted_at IS NULL;
```

---

## Resumen de seguridad en producción

| Riesgo | Estado en producción |
|---|---|
| Credenciales en git/repo | ✅ SEGURO — nunca se commitearon |
| Anon key expuesta en browser | ✅ ACEPTABLE — diseño de Supabase + RLS |
| `.env` accesible en servidor | ✅ BLOQUEADO por .htaccess |
| `master_schema.sql` accesible | ✅ BLOQUEADO por .htaccess (si se subió) |
| XSS en catálogo público | ✅ CORREGIDO — función esc() aplicada |
| Mezcla de datos entre tenants | ✅ CORREGIDO — filtro PLAYA_ID por URL |
| Race condition en recibos | ✅ CORREGIDO — RPC atómica |
| Validaciones de venta | ✅ CORREGIDO — 3 validaciones nuevas |
| HTTPS | ⚠️ Activar SSL en cPanel (Let's Encrypt) |
| Headers de seguridad HTTP | ✅ Configurados en .htaccess |
