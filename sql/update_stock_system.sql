-- 1. SISTEMA DE NRO DE STOCK CORRELATIVO
CREATE TABLE IF NOT EXISTS public.configuracion_stock (
    playa_id UUID PRIMARY KEY REFERENCES public.playas(id) ON DELETE CASCADE,
    ultimo_nro INTEGER DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE public.configuracion_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view/manage stock config of their playa" 
ON public.configuracion_stock FOR ALL USING (playa_id = public.get_my_playa_id());

-- Campo en Vehículos
ALTER TABLE public.vehiculos ADD COLUMN IF NOT EXISTS nro_stock INTEGER;

-- Función para auto-incrementar stock por Playa
CREATE OR REPLACE FUNCTION public.asignar_nro_stock()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_nro INTEGER;
BEGIN
    -- Insertar registro si no existe para la playa
    INSERT INTO public.configuracion_stock (playa_id, ultimo_nro)
    VALUES (NEW.playa_id, 0)
    ON CONFLICT (playa_id) DO NOTHING;

    -- Incrementar y obtener el nuevo nro bloqueando la fila para evitar duplicados
    UPDATE public.configuracion_stock 
    SET ultimo_nro = ultimo_nro + 1
    WHERE playa_id = NEW.playa_id
    RETURNING ultimo_nro INTO nuevo_nro;

    NEW.nro_stock := nuevo_nro;
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS tr_vehiculos_stock ON public.vehiculos;
CREATE TRIGGER tr_vehiculos_stock
BEFORE INSERT ON public.vehiculos
FOR EACH ROW
EXECUTE FUNCTION public.asignar_nro_stock();

-- Migración Inicial: Asignar números a vehículos existentes
DO $$
DECLARE
    p_id UUID;
    v_id UUID;
    counter INTEGER;
BEGIN
    FOR p_id IN SELECT id FROM public.playas LOOP
        counter := 1;
        FOR v_id IN SELECT id FROM public.vehiculos WHERE playa_id = p_id ORDER BY created_at ASC LOOP
            UPDATE public.vehiculos SET nro_stock = counter WHERE id = v_id;
            counter := counter + 1;
        END LOOP;
        INSERT INTO public.configuracion_stock (playa_id, ultimo_nro) 
        VALUES (p_id, counter - 1)
        ON CONFLICT (playa_id) DO UPDATE SET ultimo_nro = counter - 1;
    END LOOP;
END $$;
