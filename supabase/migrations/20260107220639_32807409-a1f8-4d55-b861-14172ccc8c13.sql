-- ==========================================
-- 🔐 SECURITY HARDENING - CORREÇÃO DEFINITIVA
-- ==========================================

-- 1️⃣ BARBERS TABLE: Remover acesso público direto
-- O acesso público deve usar APENAS as funções RPC que filtram dados sensíveis

-- Remover política que expõe telefones publicamente
DROP POLICY IF EXISTS "Anyone can view active professionals" ON public.barbers;

-- Criar política restrita: público pode ver apenas via RPC (que já filtra dados)
-- Acesso direto à tabela requer autenticação
CREATE POLICY "Authenticated users can view barbers in their context"
ON public.barbers
FOR SELECT
USING (
  -- Superadmin vê todos
  is_superadmin(auth.uid())
  OR
  -- Admin da empresa vê seus profissionais
  is_barbershop_admin(auth.uid(), barbershop_id)
  OR
  -- Staff da empresa vê colegas
  is_barbershop_staff(auth.uid(), barbershop_id)
  OR
  -- Barbeiro aprovado vê a si mesmo
  EXISTS (
    SELECT 1 FROM public.barber_accounts ba
    WHERE ba.user_id = auth.uid()
    AND ba.barber_id = barbers.id
    AND ba.approval_status = 'approved'
  )
);

-- 2️⃣ BUSINESSES VIEW: Adicionar segurança (é uma VIEW, precisa de security barrier)
-- Primeiro, verificar se é uma view e recriá-la com segurança

-- Drop a view existente se for uma view
DROP VIEW IF EXISTS public.businesses;

-- Recriar como VIEW com security_barrier para dados públicos seguros
CREATE VIEW public.businesses WITH (security_barrier = true) AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  -- Não expor whatsapp_number publicamente
  NULL::text as whatsapp_number,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  opening_time,
  closing_time,
  business_type,
  active,
  approval_status,
  -- Não expor owner_email publicamente
  NULL::text as owner_email,
  created_at,
  updated_at
FROM public.barbershops
WHERE active = true AND approval_status = 'approved';

-- 3️⃣ PROFESSIONAL_ACCOUNTS VIEW: Recriar sem dados sensíveis
DROP VIEW IF EXISTS public.professional_accounts;

CREATE VIEW public.professional_accounts WITH (security_barrier = true) AS
SELECT 
  id,
  name,
  -- Não expor email e phone publicamente
  NULL::text as email,
  NULL::text as phone,
  user_id,
  barber_id,
  barbershop_id,
  -- Renomear para consistência
  barbershop_id as business_id,
  barber_id as professional_id,
  barbershop_name as business_name,
  approval_status,
  created_at,
  updated_at
FROM public.barber_accounts;

-- 4️⃣ PROFESSIONALS VIEW: Criar view pública segura
DROP VIEW IF EXISTS public.professionals;

CREATE VIEW public.professionals WITH (security_barrier = true) AS
SELECT 
  id,
  name,
  specialty,
  -- Não expor phone publicamente
  NULL::text as phone,
  barbershop_id as business_id,
  working_hours,
  active,
  created_at,
  updated_at
FROM public.barbers
WHERE active = true;

-- 5️⃣ PROFESSIONAL_SERVICES VIEW: Criar para consistência
DROP VIEW IF EXISTS public.professional_services;

CREATE VIEW public.professional_services WITH (security_barrier = true) AS
SELECT 
  id,
  service_id,
  professional_id,
  barbershop_id
FROM public.service_professionals;

-- 6️⃣ APPOINTMENTS: Garantir que público só pode INSERT (write-only)
-- As políticas existentes já estão corretas, mas vamos reforçar

-- Verificar e recriar política de insert público
DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;

CREATE POLICY "Public can book appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  -- Qualquer pessoa pode criar agendamento
  -- Mas a validação de dados é feita pelo trigger validate_appointment
  true
);

-- 7️⃣ SUBSCRIPTIONS: Garantir que apenas admin e superadmin acessam
-- Políticas existentes já estão corretas

-- 8️⃣ EXPENSES: Garantir isolamento por empresa
-- Política existente já está correta

-- 9️⃣ USER_ROLES: Reforçar segurança
-- Políticas existentes já estão corretas

-- 🔟 Atualizar funções RPC para garantir que não expõem dados sensíveis

-- Atualizar get_public_barbers para garantir segurança
CREATE OR REPLACE FUNCTION public.get_public_barbers(p_barbershop_id uuid)
RETURNS TABLE(id uuid, name text, working_hours jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, working_hours
  FROM public.barbers
  WHERE barbershop_id = p_barbershop_id
    AND active = true;
$$;

-- Revogar acesso direto à função para anônimos e garantir que só retorna dados seguros
REVOKE ALL ON FUNCTION public.get_public_barbers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_barbers(uuid) TO anon, authenticated;

-- Atualizar get_public_professionals para garantir segurança
CREATE OR REPLACE FUNCTION public.get_public_professionals(p_business_id uuid)
RETURNS TABLE(id uuid, name text, working_hours jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, working_hours
  FROM public.barbers
  WHERE barbershop_id = p_business_id
    AND active = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_professionals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_professionals(uuid) TO anon, authenticated;

-- Atualizar get_public_services para garantir segurança
CREATE OR REPLACE FUNCTION public.get_public_services(p_barbershop_id uuid)
RETURNS TABLE(id uuid, name text, price numeric, duration integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, price, duration
  FROM public.services
  WHERE barbershop_id = p_barbershop_id
    AND active = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_services(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_services(uuid) TO anon, authenticated;

-- Atualizar get_public_barbershop para garantir segurança
CREATE OR REPLACE FUNCTION public.get_public_barbershop(p_slug text)
RETURNS TABLE(
  id uuid, 
  slug text, 
  name text, 
  logo_url text, 
  whatsapp_number text, -- Mantido pois é necessário para o link de WhatsApp no agendamento
  primary_color text, 
  secondary_color text, 
  background_color text, 
  text_color text, 
  opening_time time, 
  closing_time time, 
  business_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slug, name, logo_url, whatsapp_number,
         primary_color, secondary_color, background_color, text_color,
         opening_time, closing_time, business_type
  FROM public.barbershops
  WHERE slug = p_slug
    AND active = true
    AND approval_status = 'approved';
$$;

REVOKE ALL ON FUNCTION public.get_public_barbershop(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_barbershop(text) TO anon, authenticated;

-- Atualizar get_public_business para consistência
CREATE OR REPLACE FUNCTION public.get_public_business(p_slug text)
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
  opening_time time, 
  closing_time time, 
  business_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slug, name, logo_url, whatsapp_number,
         primary_color, secondary_color, background_color, text_color,
         opening_time, closing_time, business_type
  FROM public.barbershops
  WHERE slug = p_slug
    AND active = true
    AND approval_status = 'approved';
$$;

REVOKE ALL ON FUNCTION public.get_public_business(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_business(text) TO anon, authenticated;

-- Atualizar get_professionals_for_service
CREATE OR REPLACE FUNCTION public.get_professionals_for_service(p_service_id uuid, p_barbershop_id uuid)
RETURNS TABLE(id uuid, name text, specialty text, working_hours jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.specialty, b.working_hours
  FROM public.barbers b
  WHERE b.barbershop_id = p_barbershop_id
  AND b.active = true
  AND (
    -- Para barbearias, retornar todos
    (SELECT business_type FROM public.barbershops WHERE id = p_barbershop_id) = 'barbearia'
    OR
    -- Para salões/híbridos, verificar vínculo com serviço
    EXISTS (
      SELECT 1 FROM public.service_professionals sp
      WHERE sp.professional_id = b.id
      AND sp.service_id = p_service_id
      AND sp.barbershop_id = p_barbershop_id
    )
  )
  ORDER BY b.name;
$$;

REVOKE ALL ON FUNCTION public.get_professionals_for_service(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professionals_for_service(uuid, uuid) TO anon, authenticated;

-- Atualizar get_public_professionals_for_service
CREATE OR REPLACE FUNCTION public.get_public_professionals_for_service(p_business_id uuid, p_service_id uuid)
RETURNS TABLE(id uuid, name text, working_hours jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT b.id, b.name, b.working_hours
  FROM public.barbers b
  INNER JOIN public.service_professionals sp ON sp.professional_id = b.id
  WHERE b.barbershop_id = p_business_id
    AND b.active = true
    AND sp.service_id = p_service_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_professionals_for_service(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_professionals_for_service(uuid, uuid) TO anon, authenticated;

-- Atualizar get_valid_services
CREATE OR REPLACE FUNCTION public.get_valid_services(p_barbershop_id uuid)
RETURNS TABLE(id uuid, name text, price numeric, duration integer, allowed_business_types text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.price, s.duration, s.allowed_business_types
  FROM public.services s
  JOIN public.barbershops bs ON bs.id = s.barbershop_id
  WHERE s.barbershop_id = p_barbershop_id
  AND s.active = true
  AND bs.business_type = ANY(s.allowed_business_types)
  AND (
    -- Para barbearias, não precisa de vínculo
    bs.business_type = 'barbearia'
    OR
    -- Para salões/mistos, precisa ter pelo menos um profissional vinculado
    EXISTS (
      SELECT 1 FROM public.service_professionals sp
      WHERE sp.service_id = s.id AND sp.barbershop_id = p_barbershop_id
    )
  )
  ORDER BY s.name;
$$;

REVOKE ALL ON FUNCTION public.get_valid_services(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_valid_services(uuid) TO anon, authenticated;

-- 1️⃣1️⃣ Comentário de documentação
COMMENT ON POLICY "Authenticated users can view barbers in their context" ON public.barbers IS 
'Security: Acesso direto à tabela barbers requer autenticação. Dados públicos devem usar funções RPC que filtram campos sensíveis.';

COMMENT ON VIEW public.businesses IS 
'Security: View pública que oculta owner_email e whatsapp_number. Para dados completos, use acesso autenticado à tabela barbershops.';

COMMENT ON VIEW public.professionals IS 
'Security: View pública que oculta phone. Para dados completos, use acesso autenticado à tabela barbers.';

COMMENT ON VIEW public.professional_accounts IS 
'Security: View que oculta email e phone. Para dados completos, use acesso autenticado à tabela barber_accounts.';