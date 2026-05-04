-- ========================================================
-- MASTER SCHEMA: autoPlaya v2
-- Arquitectura Consolidada (Playas -> Locales -> Vehículos)
-- ========================================================

-- 1. EXTENSIONES Y CONFIGURACIÓN GLOBAL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- 2. FUNCIONES DE APOYO (SEGURIDAD Y UTILIDAD)
-- Función para obtener el playa_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_playa_id()
RETURNS UUID AS $$
  SELECT playa_id FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para auto-incrementar stock por Playa
CREATE OR REPLACE FUNCTION public.asignar_nro_stock()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_nro INTEGER;
BEGIN
    INSERT INTO public.configuracion_stock (playa_id, ultimo_nro)
    VALUES (NEW.playa_id, 0)
    ON CONFLICT (playa_id) DO NOTHING;

    UPDATE public.configuracion_stock 
    SET ultimo_nro = ultimo_nro + 1
    WHERE playa_id = NEW.playa_id
    RETURNING ultimo_nro INTO nuevo_nro;

    NEW.nro_stock := nuevo_nro;
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar correlativo de recibos (Caja)
CREATE OR REPLACE FUNCTION public.increment_receipt(p_id UUID)
RETURNS INTEGER AS $$
DECLARE
    nuevo_nro INTEGER;
    v_my_playa_id UUID;
BEGIN
    -- VALIDACIÓN DE SEGURIDAD: Solo permitir si es la playa del usuario
    v_my_playa_id := public.get_my_playa_id();
    IF v_my_playa_id IS NULL OR v_my_playa_id != p_id THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permiso para gestionar esta caja.';
    END IF;

    UPDATE public.configuracion_caja 
    SET ultimo_nro_recibo = ultimo_nro_recibo + 1,
        updated_at = NOW()
    WHERE playa_id = p_id
    RETURNING ultimo_nro_recibo INTO nuevo_nro;
    
    RETURN nuevo_nro;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. TABLAS DINÁMICAS

-- TABLA: playas (Entidad Raíz)
-- DROP TABLE IF EXISTS public.playas CASCADE;
CREATE TABLE IF NOT EXISTS public.playas (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    nombre_comercial TEXT NOT NULL,
    ruc TEXT,
    configuracion JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- TABLA: configuracion_stock (Contador correlativo por playa)
CREATE TABLE IF NOT EXISTS public.configuracion_stock (
    playa_id UUID PRIMARY KEY REFERENCES public.playas(id) ON DELETE CASCADE,
    ultimo_nro INTEGER DEFAULT 0
);

-- TABLA: perfiles (Extensión de Auth User)
-- DROP TABLE IF EXISTS public.perfiles CASCADE;
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    playa_id UUID REFERENCES public.playas(id),
    rol TEXT DEFAULT 'vendedor' CHECK (rol IN ('admin', 'vendedor')),
    nombre_completo TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA: locales (Sucursales/Patios)
-- DROP TABLE IF EXISTS public.locales CASCADE;
CREATE TABLE IF NOT EXISTS public.locales (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    playa_id UUID REFERENCES public.playas(id) NOT NULL,
    nombre TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- TABLA: vehiculos (Inventario)
-- DROP TABLE IF EXISTS public.vehiculos CASCADE;
CREATE TABLE IF NOT EXISTS public.vehiculos (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    playa_id UUID REFERENCES public.playas(id) NOT NULL,
    local_id UUID REFERENCES public.locales(id) NOT NULL,
    nro_stock INTEGER, -- Correlativo por playa #00001
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anho INTEGER NOT NULL,
    color TEXT,
    chapa TEXT,
    nro_chasis TEXT,
    transmision TEXT,
    combustible TEXT,
    precio_contado BIGINT DEFAULT 0 NOT NULL,
    precio_lista BIGINT DEFAULT 0,
    entrega_minima BIGINT DEFAULT 0,
    estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'vendido')),
    fotos JSONB DEFAULT '[]'::jsonb,
    descripcion VARCHAR(170),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- TABLA: clientes (Módulo de CRM Inicial)
-- DROP TABLE IF EXISTS public.clientes CASCADE;
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    playa_id UUID REFERENCES public.playas(id) NOT NULL,
    nombre TEXT NOT NULL,
    nro_documento TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- TABLA: ventas (Transacciones)
-- DROP TABLE IF EXISTS public.ventas CASCADE;
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    playa_id UUID REFERENCES public.playas(id) NOT NULL,
    vehiculo_id UUID REFERENCES public.vehiculos(id) NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
    vendedor_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('contado', 'financiado')),
    entrega_inicial BIGINT DEFAULT 0,
    total_venta BIGINT NOT NULL,
    estado TEXT DEFAULT 'completada' CHECK (estado IN ('pendiente', 'completada', 'anulada')),
    fecha_venta TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA: cuotas (Financiación)
-- DROP TABLE IF EXISTS public.cuotas CASCADE;
CREATE TABLE IF NOT EXISTS public.cuotas (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    venta_id UUID REFERENCES public.ventas(id) ON DELETE CASCADE,
    playa_id UUID REFERENCES public.playas(id) NOT NULL,
    nro_cuota INTEGER NOT NULL,
    monto BIGINT NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    es_refuerzo BOOLEAN DEFAULT false,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'atrasado')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA: configuracion_caja (Contador de recibos por playa)
CREATE TABLE IF NOT EXISTS public.configuracion_caja (
    playa_id UUID PRIMARY KEY REFERENCES public.playas(id) ON DELETE CASCADE,
    ultimo_nro_recibo INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA: pagos (Cobros/Entradas de dinero)
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
    cuota_id UUID REFERENCES public.cuotas(id) ON DELETE SET NULL,
    playa_id UUID REFERENCES public.playas(id) NOT NULL,
    monto BIGINT NOT NULL,
    tipo_pago TEXT CHECK (tipo_pago IN ('efectivo', 'transferencia', 'cheque', 'giro', 'tarjeta')),
    nro_recibo INTEGER NOT NULL,
    fecha_pago TIMESTAMPTZ DEFAULT now(),
    cobrado_por UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 4. DISPARADORES (TRIGGERS)
CREATE TRIGGER tr_updated_at_perfiles BEFORE UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_updated_at_vehiculos BEFORE UPDATE ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_vehiculos_stock BEFORE INSERT ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.asignar_nro_stock();


-- 5. SEGURIDAD (RLS - ROW LEVEL SECURITY)

-- Habilitar RLS en todas las tablas
ALTER TABLE public.playas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: playas
CREATE POLICY "Users can view their own playa" ON public.playas FOR SELECT USING (id = public.get_my_playa_id());

-- POLÍTICAS: perfiles
CREATE POLICY "Users can view profiles of their playa" ON public.perfiles FOR SELECT USING (playa_id = public.get_my_playa_id());
CREATE POLICY "Admins can update profiles of their playa" ON public.perfiles FOR UPDATE USING (playa_id = public.get_my_playa_id() AND public.get_my_role() = 'admin');

-- POLÍTICAS: locales
CREATE POLICY "Users can view locales of their playa" ON public.locales FOR SELECT USING (playa_id = public.get_my_playa_id());
CREATE POLICY "Admins can manage locales" ON public.locales FOR ALL USING (playa_id = public.get_my_playa_id() AND public.get_my_role() = 'admin');
CREATE POLICY "Public can view locales" ON public.locales FOR SELECT TO public USING (deleted_at IS NULL);

-- POLÍTICAS: vehiculos
CREATE POLICY "Users can view/manage vehicles of their playa" ON public.vehiculos FOR ALL USING (playa_id = public.get_my_playa_id());
CREATE POLICY "Public can view catalog vehicles" ON public.vehiculos FOR SELECT TO public USING (deleted_at IS NULL AND estado != 'vendido');

-- POLÍTICAS: clientes
CREATE POLICY "Users can view/manage clientes of their playa" ON public.clientes FOR ALL USING (playa_id = public.get_my_playa_id());

-- POLÍTICAS: ventas
CREATE POLICY "Users can view/manage sales of their playa" ON public.ventas FOR ALL USING (playa_id = public.get_my_playa_id());

-- POLÍTICAS: cuotas
CREATE POLICY "Users can view/manage quotas of their playa" ON public.cuotas FOR ALL USING (playa_id = public.get_my_playa_id());

-- POLÍTICAS: configuracion_stock
CREATE POLICY "Users can view/manage stock config of their playa" ON public.configuracion_stock FOR ALL USING (playa_id = public.get_my_playa_id());

-- POLÍTICAS: pagos
CREATE POLICY "Users can view/manage payments of their playa" ON public.pagos FOR ALL USING (playa_id = public.get_my_playa_id());

-- POLÍTICAS: configuracion_caja
CREATE POLICY "Users can view/manage caja config of their playa" ON public.configuracion_caja FOR ALL USING (playa_id = public.get_my_playa_id());

-- 6. INSERTAR CONFIGURACIÓN INICIAL PARA PLAYAS EXISTENTES
INSERT INTO public.configuracion_caja (playa_id, ultimo_nro_recibo)
SELECT id, 0 FROM public.playas
ON CONFLICT (playa_id) DO NOTHING;

-- 7. ÍNDICES DE PERFORMANCE
-- Búsquedas frecuentes en inventario (catálogo público y panel admin)
CREATE INDEX IF NOT EXISTS idx_vehiculos_playa_estado
    ON public.vehiculos(playa_id, estado) WHERE deleted_at IS NULL;

-- Cobranzas: cuotas por estado y vencimiento
CREATE INDEX IF NOT EXISTS idx_cuotas_playa_estado_venc
    ON public.cuotas(playa_id, estado, fecha_vencimiento);

-- Reportes y caja: pagos por fecha
CREATE INDEX IF NOT EXISTS idx_pagos_playa_fecha
    ON public.pagos(playa_id, fecha_pago DESC);

-- Historial de ventas
CREATE INDEX IF NOT EXISTS idx_ventas_playa_fecha
    ON public.ventas(playa_id, fecha_venta DESC);

-- Búsqueda de clientes activos
CREATE INDEX IF NOT EXISTS idx_clientes_playa
    ON public.clientes(playa_id) WHERE deleted_at IS NULL;

-- Locales activos por playa
CREATE INDEX IF NOT EXISTS idx_locales_playa
    ON public.locales(playa_id) WHERE deleted_at IS NULL;
