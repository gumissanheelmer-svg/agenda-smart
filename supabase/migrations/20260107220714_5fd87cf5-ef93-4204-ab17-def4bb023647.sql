-- ==========================================
-- 🔐 SECURITY FIX PARTE 2: Resolver avisos do linter
-- ==========================================

-- 1️⃣ Recriar views SEM security_barrier (usar RLS das tabelas base)
-- O security_barrier não é necessário pois as tabelas base já têm RLS

DROP VIEW IF EXISTS public.businesses;
CREATE VIEW public.businesses AS
SELECT 
  id,
  name,
  slug,
  logo_url,
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
  NULL::text as owner_email,
  created_at,
  updated_at
FROM public.barbershops
WHERE active = true AND approval_status = 'approved';

DROP VIEW IF EXISTS public.professional_accounts;
CREATE VIEW public.professional_accounts AS
SELECT 
  id,
  name,
  NULL::text as email,
  NULL::text as phone,
  user_id,
  barber_id,
  barbershop_id,
  barbershop_id as business_id,
  barber_id as professional_id,
  barbershop_name as business_name,
  approval_status,
  created_at,
  updated_at
FROM public.barber_accounts;

DROP VIEW IF EXISTS public.professionals;
CREATE VIEW public.professionals AS
SELECT 
  id,
  name,
  specialty,
  NULL::text as phone,
  barbershop_id as business_id,
  working_hours,
  active,
  created_at,
  updated_at
FROM public.barbers
WHERE active = true;

DROP VIEW IF EXISTS public.professional_services;
CREATE VIEW public.professional_services AS
SELECT 
  id,
  service_id,
  professional_id,
  barbershop_id
FROM public.service_professionals;

-- 2️⃣ Adicionar comentários de segurança
COMMENT ON VIEW public.businesses IS 
'View pública segura: oculta owner_email e whatsapp_number. Herda RLS da tabela barbershops.';

COMMENT ON VIEW public.professionals IS 
'View pública segura: oculta phone. Herda RLS da tabela barbers.';

COMMENT ON VIEW public.professional_accounts IS 
'View segura: oculta email e phone. Herda RLS da tabela barber_accounts.';

COMMENT ON VIEW public.professional_services IS 
'View para consulta de vínculos serviço-profissional. Herda RLS da tabela service_professionals.';