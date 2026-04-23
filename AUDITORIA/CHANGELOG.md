# CHANGELOG — autoPlaya v2

Todos los cambios notables de este proyecto están documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).

---

## [v1.0.0-beta] — 2026-04-21

### ✅ Implementado en esta versión inicial

#### Arquitectura General
- Estructura modular con separación Service/UI por dominio
- ES Modules nativos (sin bundler en desarrollo)
- Sistema de autenticación con Supabase Auth
- Auth guard con bloqueo anti-parpadeo en `index.html`
- Arquitectura multitenant con `playa_id` en todas las tablas
- RLS habilitado en las 10 tablas del schema
- Funciones `get_my_playa_id()` y `get_my_role()` SECURITY DEFINER
- Sistema de roles: `admin` y `vendedor`

#### Base de Datos (master_schema.sql)
- Tabla `playas` — entidad raíz del sistema
- Tabla `perfiles` — extensión de auth.users con rol y playa
- Tabla `locales` — sucursales/patios por playa
- Tabla `vehiculos` — inventario con fotos en Storage
- Tabla `clientes` — CRM básico
- Tabla `ventas` — transacciones contado/financiado
- Tabla `cuotas` — plan de cuotas y refuerzos
- Tabla `pagos` — registros de cobros con número de recibo
- Tabla `configuracion_stock` — correlativo de stock por playa
- Tabla `configuracion_caja` — correlativo de recibos por playa
- Trigger automático de asignación de `nro_stock` correlativo por playa
- Trigger automático de `updated_at` en perfiles y vehículos
- Función `increment_receipt` para número de recibo atómico

#### Módulo Login (`login.html`)
- Formulario de login con email/password
- Redirección automática si ya hay sesión activa
- Animaciones de fondo (blobs)
- Estado de loading en botón durante autenticación
- Toast de error en credenciales incorrectas

#### Panel Principal (`index.html` + `js/main.js`)
- Sidebar responsivo con toggle mobile
- Perfil de usuario en sidebar (nombre, rol, avatar con iniciales)
- Menú de administración visible solo para `admin`
- Navegación SPA entre secciones sin recarga
- Búsqueda global con debounce (300ms)
- Filtro por local en inventario
- Botón de acción contextual por sección
- Cierre de sesión

#### Módulo Inventario
- Grid de vehículos con paginación server-side (12 por página)
- Búsqueda fuzzy multipalabra (marca, modelo, año, nro_stock)
- Filtro por local/sucursal
- Modal de carga de nuevo vehículo con todos los campos
- Drag & drop de fotos con preview
- Compresión de imágenes antes del upload
- Upload a Supabase Storage organizado por `playa_id`
- Modal de detalle del vehículo
- Edición de vehículo existente
- Borrado físico de vehículo con limpieza de Storage
- Borrado individual de fotos
- Numeración de stock correlativa automática por playa

#### Módulo Clientes (CRM)
- Grid de clientes con búsqueda por nombre/documento
- Modal de nuevo cliente con campos: nombre, documento, teléfono, dirección, email
- Edición de cliente existente
- Borrado lógico de clientes
- Alta rápida de cliente desde el módulo de ventas

#### Módulo Ventas
- Selector de vehículo disponible con búsqueda fuzzy
- Selector de cliente con búsqueda fuzzy
- Modo contado / financiado con toggle visual
- Auto-carga del precio según tipo de venta
- Simulador financiero con tasa mensual o anual
- Soporte de refuerzos (cuotas especiales) con montos y fechas
- Cálculo de cuota mensual con interés directo
- Generación de PDF de presupuesto (jsPDF)
- Modal de éxito post-presupuesto
- Registro definitivo de venta con generación de cuotas
- Vehículo marcado como VENDIDO al confirmar

#### Módulo Caja / Cobranzas
- Dashboard de clientes con deuda activa
- Priorización por estado: vencido > hoy > próximo > al día
- Estado de cuenta completo por cliente
- Registro de cobro de cuota con tipo de pago
- Registro de abono extra a capital (reduce cuotas desde el final)
- Número de recibo automático y correlativo
- Total recaudado del día

#### Módulo Historial
- Historial de ventas con filtros por fecha y búsqueda
- Historial de pagos/movimientos de caja
- Búsqueda por cliente o vehículo

#### Módulo Reportes (Dashboard Gerencial)
- Valor total de stock activo
- Ventas del mes en curso
- Recaudación del día
- Cuotas en mora (vencidas)
- Últimos 5 vehículos cargados
- Próximos 5 vencimientos de cuotas

#### Módulo Admin (solo admins)
- Gestión de locales/sucursales (crear, editar, eliminar lógico)

#### Catálogo Público (`catalogo.html`)
- Infinite scroll con paginación server-side (6 por carga)
- Búsqueda por marca, modelo, año, nro_stock
- Tarjetas de vehículo con foto, precio, sucursal
- Modal tipo Bottom Sheet con galería de fotos deslizable
- Ficha técnica completa
- Botón de WhatsApp con mensaje pre-cargado
- Footer con datos de contacto y mapa de Google Maps

#### Utilidades
- Sistema de notificaciones toast (`notifier.js`)
- Modal de confirmación (`notifier.confirm`)
- Formateo de fechas (`dateFormatter.js`)
- Compresor de imágenes client-side (`imageCompressor.js`)
