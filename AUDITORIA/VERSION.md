# autoPlaya v2 — Estado del Proyecto

## Versión: v1.0.0-beta
**Fecha de corte:** 21 de Abril de 2026
**Estado:** En desarrollo activo / Pre-producción

---

## Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| HTML5 | — | Estructura de páginas |
| Vanilla JavaScript (ESM) | ES2022 | Lógica de aplicación |
| Tailwind CSS (CDN) | Latest | Estilos |
| Lucide Icons (CDN) | @latest | Iconografía |
| jsPDF | 2.5.1 | Generación de PDFs |
| jsPDF-AutoTable | 3.5.31 | Tablas en PDFs |
| Google Fonts (Inter) | — | Tipografía |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Supabase | Cloud | BaaS (DB + Auth + Storage) |
| PostgreSQL | 15+ | Base de datos relacional |
| Row Level Security (RLS) | — | Aislamiento multitenant |
| Supabase Storage | — | Almacenamiento de fotos |
| Supabase Auth | — | Autenticación de usuarios |

---

## Módulos Existentes

| Módulo | Archivos | Estado |
|---|---|---|
| **Login** | `login.html` | ✅ Completo |
| **Dashboard / Reportes** | `js/reports/reportsService.js`, `reportsUI.js` | ✅ Completo |
| **Inventario** | `js/inventory/inventoryService.js`, `inventoryUI.js` | ✅ Completo |
| **Clientes (CRM)** | `js/clients/clientService.js`, `clientUI.js` | ✅ Completo |
| **Ventas** | `js/sales/salesService.js`, `salesUI.js` | ✅ Completo |
| **Caja / Cobranzas** | `js/collections/collectionsService.js`, `collectionsUI.js` | ✅ Completo |
| **Historial** | `js/history/historyService.js`, `historyUI.js` | ✅ Completo |
| **Catálogo Público** | `catalogo.html`, `js/public/catalogUI.js`, `catalogService.js` | ✅ Completo |
| **Admin / Locales** | `js/admin/adminUI.js` | ✅ Completo |
| **Utilidades** | `js/utils/notifier.js`, `dateFormatter.js`, `imageCompressor.js` | ✅ Completo |

## Páginas
- `login.html` — Acceso al sistema
- `index.html` — Panel de gestión (app principal)
- `catalogo.html` — Catálogo público de vehículos

## Schema de Base de Datos
Ver `master_schema.sql` — 10 tablas con RLS habilitado en todas.

## Arquitectura
- **Patrón:** Service / UI separation (sin framework)
- **Módulos:** ES Modules nativos (import/export)
- **Multitenancy:** `playa_id` en todas las tablas + RLS via `get_my_playa_id()`
- **Roles:** `admin` | `vendedor`
