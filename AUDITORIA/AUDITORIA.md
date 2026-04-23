# 🔍 AUDITORÍA COMPLETA — autoPlaya v2
**Fecha:** 21 de Abril 2026 | **Auditor:** Antigravity (Senior SaaS Architect AI)

---

## 1. 🔴 SEGURIDAD CRÍTICA

### 1.1 — Credenciales hardcodeadas en DOS archivos

| Archivo | Líneas |
|---|---|
| `js/api/supabase.js` | 5-6 |
| `test_rls.mjs` | 2-3 |

La `anon key` de Supabase está duplicada. En `supabase.js` es esperado (es una key pública por diseño de Supabase, segura **solo si RLS está bien configurado**). El problema es `test_rls.mjs`: es un archivo de prueba de desarrollo que **no debe existir en producción ni en el repositorio**.

**Acción:**
1. Eliminar `test_rls.mjs` del proyecto.
2. Crear `.gitignore` con: `test_rls.mjs`, `*.env`, `node_modules/`

---

### 1.2 — Política RLS pública sin filtro de tenant en `locales`
**Archivo:** `master_schema.sql` línea **232**

```sql
-- PROBLEMA: devuelve locales de TODOS los tenants a cualquier anónimo
CREATE POLICY "Public can view locales" ON public.locales
  FOR SELECT TO public USING (deleted_at IS NULL);
```

Cualquier persona sin cuenta puede consultar `supabase.from('locales').select('*')` y obtener los locales de todas las empresas registradas en el sistema.

**Corrección:** Eliminar esta política. El catálogo público debe filtrar por `playa_id` explícito.

---

### 1.3 — Política RLS pública sin filtro de tenant en `vehiculos`
**Archivo:** `master_schema.sql` línea **236**

```sql
-- PROBLEMA: devuelve vehículos de TODOS los tenants
CREATE POLICY "Public can view catalog vehicles" ON public.vehiculos
  FOR SELECT TO public USING (deleted_at IS NULL AND estado != 'vendido');
```

En `catalogService.js` líneas 23-24 hay incluso un comentario que confirma que el filtro por tenant **está comentado y nunca se aplica:**

```js
// Nota: Aquí se asume que si hubiera múltiples dueños, se filtraría por playa_id
// query = query.eq('playa_id', 1);  ← NUNCA SE EJECUTA
```

**Corrección:** La URL del catálogo debe recibir un `playa_id` por parámetro o subdominio, y la política debe filtrarlo.

---

### 1.4 — XSS potencial: datos de DB insertados directamente en innerHTML

| Archivo | Líneas | Dato peligroso |
|---|---|---|
| `js/public/catalogUI.js` | 127, 134, 135, 185, 193, 251 | `v.marca`, `v.modelo`, `vehicle.observaciones` |
| `js/main.js` | 591-604 | contenido de refuerzos |
| `js/admin/adminUI.js` | 37-38 | `local.nombre`, `local.ciudad` |

Si un admin guarda `marca = '<img src=x onerror=alert(1)>'`, ese script se ejecuta en el browser de todos los clientes del catálogo. Agregar una función de escape:

```js
// js/utils/stringUtils.js (nuevo archivo)
export const esc = (str) =>
  String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                   .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
```

Aplicar en todos los template literals que usen datos de la DB.

---

### 1.5 — Handlers globales en `window` manipulables desde consola
**Archivo:** `js/main.js` líneas **512–528**

```js
window.updateReinforceAmount = (idx, val) => { ... };
window.updateReinforceDate = (idx, val) => { ... };
window.removeReinforce = (idx) => { ... };
```

Cualquier usuario puede abrir DevTools y llamar `window.updateReinforceAmount(0, '999999999')` para alterar el simulador de cuotas y generar un PDF con montos adulterados. No impacta la DB directamente, pero sí la integridad del presupuesto impreso.

---

### 1.6 — CSRF → ✅ SEGURO
Supabase usa tokens Bearer en headers. No hay cookies de sesión. Sin riesgo CSRF.

### 1.7 — SQL Injection → ✅ SEGURO
Todas las queries usan el cliente tipado de Supabase con parámetros. No se construyen strings SQL en el cliente.

---

## 2. 🏗️ ARQUITECTURA MULTITENANT

### Estado General del Aislamiento

| Tabla | `playa_id` | RLS activo | Política autenticada | Política pública |
|---|---|---|---|---|
| `playas` | es el ID raíz | ✅ | ✅ SELECT por id | — |
| `perfiles` | ✅ | ✅ | ✅ SELECT + UPDATE | — |
| `locales` | ✅ | ✅ | ✅ | ⚠️ sin filtro tenant |
| `vehiculos` | ✅ | ✅ | ✅ | ⚠️ sin filtro tenant |
| `clientes` | ✅ | ✅ | ✅ ALL | — |
| `ventas` | ✅ | ✅ | ✅ ALL | — |
| `cuotas` | ✅ | ✅ | ✅ ALL | — |
| `pagos` | ✅ | ✅ | ✅ ALL | — |
| `configuracion_stock` | ✅ | ✅ | ✅ ALL | — |
| `configuracion_caja` | ✅ | ✅ | ✅ ALL | — |

**Conclusión general:** El aislamiento multitenant para usuarios autenticados está **bien implementado**. Las funciones `get_my_playa_id()` y `get_my_role()` como `SECURITY DEFINER` son el patrón correcto. Los únicos problemas son las dos políticas públicas documentadas en §1.2 y §1.3.

### 2.1 — Conflicto de políticas en `vehiculos` (overlap SELECT)
**Archivo:** `master_schema.sql` líneas **235-236**

Existen dos políticas aplicables a SELECT para usuarios autenticados: la política de tenant y la pública. PostgreSQL aplica OR entre ellas, lo que podría permitir a un usuario autenticado ver vehículos de otros tenants a través de la política pública.

### 2.2 — Falta política INSERT en `perfiles`
**Archivo:** `master_schema.sql` líneas **226-227**

Solo hay políticas SELECT y UPDATE. Si el trigger de auto-creación de perfil falla, el usuario queda sin perfil y la app se rompe silenciosamente (solo muestra un toast genérico en `main.js` línea 91).

---

## 3. 🐛 BUGS POTENCIALES

### 3.1 — Race condition en generación de número de recibo
**Archivo:** `js/collections/collectionsService.js` líneas **153–178**

El fallback manual (líneas 164-177) que se activa cuando falla la RPC hace: leer → sumar → escribir en pasos separados. Si dos pagos se procesan simultáneamente, ambos leerán el mismo número y generarán **recibos duplicados**.

```js
// PELIGROSO: no es atómico
nroRecibo = (current?.ultimo_nro_recibo || 0) + 1;
await supabase.from('configuracion_caja').upsert({ ..., nroRecibo });
```

**Corrección:** Eliminar el fallback. Hacer obligatoria la RPC `increment_receipt`:
```js
async _generateReceiptNumber(playaId) {
    const { data, error } = await supabase.rpc('increment_receipt', { p_id: playaId });
    if (error) throw new Error('No se pudo generar número de recibo');
    return data;
}
```

### 3.2 — `processSale` no es transaccional
**Archivo:** `js/sales/salesService.js` líneas **7–46**

3 operaciones encadenadas sin rollback: insertar venta → insertar cuotas → marcar vehículo vendido. Si el paso 2 o 3 falla, el sistema queda inconsistente (venta registrada pero vehículo disponible, o cuotas huérfanas).

**Corrección:** Convertir en una función PostgreSQL RPC que ejecute todo en una transacción:
```sql
CREATE OR REPLACE FUNCTION public.process_sale(p_sale JSONB, p_quotas JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- INSERT ventas, cuotas, UPDATE vehiculos en un solo bloque transaccional
END;
$$;
```

### 3.3 — Loop de updates individuales en `processExtraPayment`
**Archivo:** `js/collections/collectionsService.js` líneas **280–283**

```js
for (const u of quotasToUpdate) {  // N queries al servidor en loop
    await supabase.from('cuotas').update({ monto: u.nuevo_monto }).eq('id', u.id);
}
```

Si hay 10 cuotas a actualizar, genera 10 round-trips. Además, si una falla a mitad del loop, las anteriores ya se ejecutaron sin rollback.

### 3.4 — Validaciones faltantes al finalizar una venta
**Archivo:** `js/main.js` líneas **758–762**

No se valida:
- `total_venta > 0`
- En financiado: `cant_cuotas >= 1`
- En financiado: `entrega_inicial < total_venta`
- Que el vehículo siga `disponible` al momento exacto del submit (ventana de tiempo entre carga y confirmación)

### 3.5 — Toast de error puede mostrar `undefined`
**Archivo:** `js/main.js` línea **956**

```js
} catch (err) { notifier.showToast(err.message, 'error'); }
// Si err.message es undefined → muestra "undefined" al usuario
```

**Corrección:** `notifier.showToast(err.message || 'Error inesperado', 'error');`

### 3.6 — `tasaInfo` usada sin null-check
**Archivo:** `js/main.js` líneas **471** y **571**

```js
const tasaInfo = document.getElementById('tasaInfo'); // puede ser null
// ... más abajo:
tasaInfo.textContent = "Tasa Mensual Directa"; // crashea si no existe el elemento
```

### 3.7 — Búsqueda de historial filtra en cliente, no en servidor
**Archivo:** `js/history/historyService.js` líneas **29–50**

Se descargan todos los registros de la DB y se filtran en JavaScript. Con cientos de ventas esto es lento e ineficiente.

---

## 4. ⚡ RENDIMIENTO

### 4.1 — Sin índices en columnas de búsqueda frecuente
**Archivo:** `master_schema.sql` — ningún `CREATE INDEX` definido

```sql
-- Agregar al final del schema:
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
```

### 4.2 — 4 queries en serie en `getManagerStats`
**Archivo:** `js/reports/reportsService.js` líneas **7–58**

```js
// Actual: ~400ms (serie)
// Corrección: ~100ms (paralelo)
const [stockData, salesCount, paymentsToday, overdueCount] = await Promise.all([
    supabase.from('vehiculos')...,
    supabase.from('ventas')...,
    supabase.from('pagos')...,
    supabase.from('cuotas')...
]);
```

### 4.3 — Carga de 1000 vehículos en la sección de ventas
**Archivo:** `js/main.js` línea **366**

```js
const { data: vehicles } = await inventoryService.getVehicles({ pageSize: 1000, ... });
```

Se traen hasta 1000 registros completos para llenar un `<select>`. Reemplazar por autocomplete con búsqueda server-side.

### 4.4 — Tailwind CSS completo desde CDN (sin build/purge)
**Archivos:** `index.html` L8, `login.html` L8, `catalogo.html` L11

El CDN de Tailwind carga ~3MB de CSS sin compilar y bloquea el render. En producción usar Tailwind CLI con purge o Vite.

### 4.5 — Lucide sin versión fija
**Archivos:** `index.html` L15, `login.html` L10, `catalogo.html` L19

```html
<script src="https://unpkg.com/lucide@latest"></script>
<!-- Pinear: lucide@0.344.0 -->
```

---

## 5. 🧹 CALIDAD DE CÓDIGO

### 5.1 — `normalizeStr` duplicada en 3 lugares

| Archivo | Línea | Nombre local |
|---|---|---|
| `js/main.js` | 18 | `normalizeStr` |
| `js/history/historyService.js` | 30 | `normalize` |
| `js/history/historyService.js` | 83 | `normalize` (definida 2 veces) |

Consolidar en `js/utils/stringUtils.js`.

### 5.2 — `formatMoney` duplicada en 2 módulos
- `js/public/catalogUI.js` línea 278
- `js/main.js` línea 478

Mover a `js/utils/` y exportar.

### 5.3 — `main.js` viola el principio de responsabilidad única
977 líneas que manejan: autenticación, navegación, inventario, clientes, ventas, simulador financiero, PDFs, configuración, locales. Dificulta testing y mantenimiento.

### 5.4 — Número de WhatsApp inconsistente y hardcodeado
- `js/public/catalogUI.js` L3: `"59599999999"` (placeholder)
- `catalogo.html` L57: `"59599999999"` (placeholder)
- `catalogo.html` L118: `"595981123123"` (distinto, posiblemente real)

Debe venir de `playas.configuracion` JSONB.

### 5.5 — Datos de contacto hardcodeados en HTML del catálogo
**Archivo:** `catalogo.html` líneas **114, 124, 134**

Dirección, teléfono y horario están fijos en el HTML. En un SaaS multitenant deben cargarse dinámicamente desde la DB.

### 5.6 — Código comentado sin uso
- `catalogService.js` L23-24: `// query = query.eq('playa_id', 1);`
- `main.js` L462-463: comentario de función reemplazada

---

## 6. ✅ LO QUE ESTÁ BIEN IMPLEMENTADO

- **RLS en las 10 tablas** — completo, sin tabla desprotegida ✅
- **`SECURITY DEFINER`** en `get_my_playa_id()` y `get_my_role()` — patrón correcto ✅
- **Trigger atómico** `asignar_nro_stock()` con `UPDATE...RETURNING` ✅
- **Soft delete** en `vehiculos`, `locales` y `clientes` ✅
- **Auth guard** en `index.html` con bloqueo de parpadeo (líneas 65-74) ✅
- **Debounce en búsquedas** (300ms) en todos los módulos ✅
- **Compresión de imágenes** antes del upload (`imageCompressor.js`) ✅
- **Paginación server-side** en inventario ✅
- **Infinite scroll** en catálogo público ✅
- **Separación Service / UI** en todos los módulos ✅

---

## 7. 🎯 RECOMENDACIONES PRIORIZADAS

### 🔴 CRÍTICO — Corregir antes de dar acceso a clientes

| # | Acción | Archivo | Línea |
|---|---|---|---|
| C1 | Eliminar `test_rls.mjs` y agregarlo a `.gitignore` | `test_rls.mjs` | todo |
| C2 | Agregar filtro tenant a política pública de `vehiculos` | `master_schema.sql` | 236 |
| C3 | Eliminar política pública irrestricta de `locales` | `master_schema.sql` | 232 |
| C4 | Sanitizar datos de DB con función `esc()` antes de innerHTML | `catalogUI.js`, `main.js`, `adminUI.js` | múltiples |
| C5 | Eliminar fallback no-atómico en `_generateReceiptNumber` | `collectionsService.js` | 153-178 |
| C6 | Agregar validaciones de negocio al submit de venta | `main.js` | 758-762 |

### 🟡 IMPORTANTE — Antes del primer mes en producción

| # | Acción | Archivo | Línea |
|---|---|---|---|
| I1 | Agregar índices en columnas de búsqueda frecuente | `master_schema.sql` | nuevo bloque |
| I2 | Convertir `processSale` en RPC transaccional de PostgreSQL | `salesService.js` | 7-46 |
| I3 | Cargar contacto y WhatsApp desde `playas.configuracion` | `catalogo.html`, `catalogUI.js` | 114, 3 |
| I4 | Paralelizar queries de `getManagerStats` con `Promise.all` | `reportsService.js` | 7-58 |
| I5 | Reemplazar carga de 1000 vehículos por autocomplete server-side | `main.js` | 366 |
| I6 | Build de Tailwind con purge para producción | `*.html` | — |
| I7 | Pinear versión de Lucide en los 3 HTMLs | `*.html` | — |

### 🟢 MEJORA — Cuando haya tiempo

| # | Acción | Archivo | Línea |
|---|---|---|---|
| M1 | Consolidar `normalizeStr` y `formatMoney` en utils compartidos | múltiples | — |
| M2 | Dividir `main.js` en módulos por dominio | `main.js` | todo |
| M3 | Mover filtro de historial al servidor | `historyService.js` | 29-50 |
| M4 | Agregar política INSERT en `perfiles` | `master_schema.sql` | — |
| M5 | Reemplazar `window.*` de refuerzos con event delegation | `main.js` | 512-528 |
| M6 | Agregar null-check en `tasaInfo` | `main.js` | 471, 571 |
| M7 | Limpiar código comentado sin uso | `catalogService.js`, `main.js` | 23-24, 462 |
| M8 | Mover búsqueda de historial a server-side | `historyService.js` | 29-50 |
