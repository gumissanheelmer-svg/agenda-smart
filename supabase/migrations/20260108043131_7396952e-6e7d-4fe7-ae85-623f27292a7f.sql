-- ==========================================
-- 🖼️ FEATURE: Imagem de fundo personalizada por empresa
-- ==========================================

-- 1️⃣ Adicionar campos à tabela barbershops
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS background_overlay_level TEXT DEFAULT 'medium' 
  CHECK (background_overlay_level IN ('low', 'medium', 'high'));

-- 2️⃣ Criar bucket para backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backgrounds', 
  'backgrounds', 
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3️⃣ Políticas de storage para backgrounds (com IF NOT EXISTS via DO block)
DO $$
BEGIN
  -- Visualização pública
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view backgrounds' AND tablename = 'objects') THEN
    CREATE POLICY "Public can view backgrounds"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'backgrounds');
  END IF;
  
  -- Upload apenas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can upload backgrounds' AND tablename = 'objects') THEN
    CREATE POLICY "Admins can upload backgrounds"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'backgrounds' 
      AND auth.uid() IS NOT NULL
      AND public.is_barbershop_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    );
  END IF;
  
  -- Update apenas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update backgrounds' AND tablename = 'objects') THEN
    CREATE POLICY "Admins can update backgrounds"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'backgrounds' 
      AND auth.uid() IS NOT NULL
      AND public.is_barbershop_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    );
  END IF;
  
  -- Delete apenas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete backgrounds' AND tablename = 'objects') THEN
    CREATE POLICY "Admins can delete backgrounds"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'backgrounds' 
      AND auth.uid() IS NOT NULL
      AND public.is_barbershop_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    );
  END IF;
END $$;

-- 4️⃣ DROP e recriar funções RPC com novos campos
DROP FUNCTION IF EXISTS public.get_public_barbershop(text);
DROP FUNCTION IF EXISTS public.get_public_business(text);

CREATE FUNCTION public.get_public_barbershop(p_slug text)
RETURNS TABLE(
  id uuid, 
  slug text, 
  name text, 
  logo_url text, 
  whatsapp_number text, 
  primary_color text, 
  secondary_color text, 
  background_color text, 
  text_color text, 
  opening_time time without time zone, 
  closing_time time without time zone, 
  business_type text,
  background_image_url text,
  background_overlay_level text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, slug, name, logo_url, whatsapp_number,
         primary_color, secondary_color, background_color, text_color,
         opening_time, closing_time, business_type,
         background_image_url, background_overlay_level
  FROM public.barbershops
  WHERE slug = p_slug
    AND active = true
    AND approval_status = 'approved';
$function$;

CREATE FUNCTION public.get_public_business(p_slug text)
RETURNS TABLE(
  id uuid, 
  slug text, 
  name text, 
  logo_url text, 
  whatsapp_number text, 
  primary_color text, 
  secondary_color text, 
  background_color text, 
  text_color text, 
  opening_time time without time zone, 
  closing_time time without time zone, 
  business_type text,
  background_image_url text,
  background_overlay_level text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, slug, name, logo_url, whatsapp_number,
         primary_color, secondary_color, background_color, text_color,
         opening_time, closing_time, business_type,
         background_image_url, background_overlay_level
  FROM public.barbershops
  WHERE slug = p_slug
    AND active = true
    AND approval_status = 'approved';
$function$;

-- 5️⃣ Comentários
COMMENT ON COLUMN public.barbershops.background_image_url IS 'URL da imagem de fundo personalizada do site público';
COMMENT ON COLUMN public.barbershops.background_overlay_level IS 'Intensidade do overlay escuro: low, medium, high';