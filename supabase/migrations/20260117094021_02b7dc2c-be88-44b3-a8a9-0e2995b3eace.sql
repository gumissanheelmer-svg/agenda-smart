-- Criar bucket para imagens de serviços
INSERT INTO storage.buckets (id, name, public)
VALUES ('service_images', 'service_images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket: permitir SELECT público
CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service_images');

-- RLS para upload: apenas admin/manager do barbershop
-- O path deve ser: {barbershop_id}/{service_id}/{filename}
CREATE POLICY "Admin/manager can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service_images'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_superadmin(auth.uid())
    OR public.is_barbershop_admin_or_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Admin/manager can update service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service_images'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_superadmin(auth.uid())
    OR public.is_barbershop_admin_or_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Admin/manager can delete service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service_images'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_superadmin(auth.uid())
    OR public.is_barbershop_admin_or_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

-- Criar tabela service_images
CREATE TABLE public.service_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL,
  image_url text NOT NULL,
  is_cover boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_service_images_service_id ON public.service_images(service_id);
CREATE INDEX idx_service_images_barbershop_id ON public.service_images(barbershop_id);
CREATE INDEX idx_service_images_cover ON public.service_images(service_id, is_cover) WHERE is_cover = true;

-- Habilitar RLS
ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT público para serviços ativos, limitado a 8 fotos
CREATE POLICY "Public can view images of active services"
ON public.service_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_id AND s.active = true
  )
);

-- RLS: Admin/manager podem gerenciar fotos do seu negócio
CREATE POLICY "Admin can manage service images"
ON public.service_images FOR ALL
USING (
  public.is_superadmin(auth.uid())
  OR public.is_barbershop_admin_or_manager(auth.uid(), barbershop_id)
)
WITH CHECK (
  public.is_superadmin(auth.uid())
  OR public.is_barbershop_admin_or_manager(auth.uid(), barbershop_id)
);

-- Função trigger para garantir apenas 1 cover por serviço
CREATE OR REPLACE FUNCTION public.ensure_single_cover_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Se estamos marcando como cover, desmarcar todas as outras
  IF NEW.is_cover = true THEN
    UPDATE public.service_images
    SET is_cover = false
    WHERE service_id = NEW.service_id
      AND id != NEW.id
      AND is_cover = true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_ensure_single_cover
AFTER INSERT OR UPDATE OF is_cover ON public.service_images
FOR EACH ROW
WHEN (NEW.is_cover = true)
EXECUTE FUNCTION public.ensure_single_cover_image();

-- RPC para obter fotos públicas de um serviço (limitado a 8)
CREATE OR REPLACE FUNCTION public.get_public_service_images(p_service_id uuid)
RETURNS TABLE (
  id uuid,
  image_url text,
  is_cover boolean,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT si.id, si.image_url, si.is_cover, si.sort_order
  FROM public.service_images si
  JOIN public.services s ON s.id = si.service_id
  WHERE si.service_id = p_service_id
    AND s.active = true
  ORDER BY si.is_cover DESC, si.sort_order ASC
  LIMIT 8;
$$;

-- RPC para obter a foto de capa de um serviço
CREATE OR REPLACE FUNCTION public.get_service_cover_image(p_service_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT si.image_url
  FROM public.service_images si
  JOIN public.services s ON s.id = si.service_id
  WHERE si.service_id = p_service_id
    AND s.active = true
    AND si.is_cover = true
  LIMIT 1;
$$;

-- RPC para listar fotos com covers de todos os serviços de um negócio (para listagem)
CREATE OR REPLACE FUNCTION public.get_services_cover_images(p_barbershop_id uuid)
RETURNS TABLE (
  service_id uuid,
  cover_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (si.service_id) si.service_id, si.image_url as cover_image_url
  FROM public.service_images si
  JOIN public.services s ON s.id = si.service_id
  WHERE s.barbershop_id = p_barbershop_id
    AND s.active = true
    AND si.is_cover = true
  ORDER BY si.service_id;
$$;