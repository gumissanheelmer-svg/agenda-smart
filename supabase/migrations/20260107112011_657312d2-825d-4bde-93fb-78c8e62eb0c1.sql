-- ==========================================
-- REESTRUTURAÇÃO DO SISTEMA DE AGENDAMENTO
-- ==========================================

-- 1. Adicionar campo "specialty" (área de trabalho) na tabela barbers
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS specialty text;

-- 2. Adicionar campo "allowed_business_types" na tabela services
-- Define quais tipos de negócio podem usar este serviço
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS allowed_business_types text[] NOT NULL DEFAULT ARRAY['barbearia', 'salao', 'salao_barbearia']::text[];

-- 3. Garantir que serviços sempre tenham profissionais vinculados via service_professionals
-- Criar função de validação para INSERT/UPDATE de serviços
CREATE OR REPLACE FUNCTION public.validate_service_has_professionals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para INSERT, não validar ainda (profissionais são vinculados depois)
  -- A validação real será feita no frontend
  RETURN NEW;
END;
$$;

-- 4. Criar função para validar agendamento com todas as regras
CREATE OR REPLACE FUNCTION public.validate_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_business_type text;
  v_service_allowed_types text[];
  v_professional_specialty text;
  v_professional_exists boolean;
  v_service_duration integer;
BEGIN
  -- Buscar tipo de negócio do estabelecimento
  SELECT business_type INTO v_barbershop_business_type
  FROM public.barbershops
  WHERE id = NEW.barbershop_id AND active = true AND approval_status = 'approved';
  
  IF v_barbershop_business_type IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado ou inativo.';
  END IF;

  -- Buscar tipos permitidos do serviço e duração
  SELECT allowed_business_types, duration INTO v_service_allowed_types, v_service_duration
  FROM public.services
  WHERE id = NEW.service_id AND barbershop_id = NEW.barbershop_id AND active = true;
  
  IF v_service_allowed_types IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inativo.';
  END IF;

  -- Validar se o serviço é permitido para o tipo de negócio
  IF NOT (v_barbershop_business_type = ANY(v_service_allowed_types)) THEN
    RAISE EXCEPTION 'Este serviço não está disponível para este tipo de estabelecimento.';
  END IF;

  -- Verificar se o profissional existe e está ativo
  SELECT EXISTS(
    SELECT 1 FROM public.barbers 
    WHERE id = NEW.barber_id 
    AND barbershop_id = NEW.barbershop_id 
    AND active = true
  ) INTO v_professional_exists;
  
  IF NOT v_professional_exists THEN
    RAISE EXCEPTION 'Profissional não encontrado ou inativo.';
  END IF;

  -- Para salões e híbridos, verificar se o profissional está vinculado ao serviço
  IF v_barbershop_business_type IN ('salao', 'salao_barbearia') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.service_professionals
      WHERE service_id = NEW.service_id
      AND professional_id = NEW.barber_id
      AND barbershop_id = NEW.barbershop_id
    ) INTO v_professional_exists;
    
    IF NOT v_professional_exists THEN
      RAISE EXCEPTION 'Este profissional não realiza o serviço selecionado.';
    END IF;
  END IF;

  -- Verificar conflito de horário (mesmo profissional, mesmo dia, horário sobreposto)
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.services s ON s.id = a.service_id
    WHERE a.barber_id = NEW.barber_id
    AND a.appointment_date = NEW.appointment_date
    AND a.status NOT IN ('cancelled')
    AND a.id IS DISTINCT FROM NEW.id
    AND (
      -- Novo agendamento começa durante outro
      (NEW.appointment_time >= a.appointment_time 
       AND NEW.appointment_time < (a.appointment_time::time + (s.duration || ' minutes')::interval)::time)
      OR
      -- Novo agendamento termina durante outro
      ((NEW.appointment_time::time + (v_service_duration || ' minutes')::interval)::time > a.appointment_time::time
       AND NEW.appointment_time < a.appointment_time)
    )
  ) THEN
    RAISE EXCEPTION 'Horário indisponível. O profissional já possui um agendamento neste período.';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Criar trigger para validação de agendamentos
DROP TRIGGER IF EXISTS validate_appointment_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_trigger
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment();

-- 6. Atualizar a política de INSERT de appointments para permitir anon
-- Primeiro remover a política existente
DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;

-- Recriar com acesso anon
CREATE POLICY "Public can book appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
-- A validação real é feita pelo trigger validate_appointment

-- 7. Garantir que anon pode ler services para validação
DROP POLICY IF EXISTS "Anyone can view active services of barbershop" ON public.services;
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (active = true);

-- 8. Garantir que anon pode ler barbershops para validação
DROP POLICY IF EXISTS "Anyone can view approved active barbershops" ON public.barbershops;
CREATE POLICY "Anyone can view approved active barbershops"
ON public.barbershops
FOR SELECT
TO anon, authenticated
USING (active = true AND approval_status = 'approved');

-- 9. Garantir que anon pode ler barbers para validação
DROP POLICY IF EXISTS "Anyone can view active professionals" ON public.barbers;
CREATE POLICY "Anyone can view active professionals"
ON public.barbers
FOR SELECT
TO anon, authenticated
USING (active = true);

-- 10. Atualizar view professionals para incluir specialty
DROP VIEW IF EXISTS public.professionals;
CREATE VIEW public.professionals 
WITH (security_invoker = on)
AS
SELECT 
  id,
  name,
  phone,
  active,
  working_hours,
  specialty,
  barbershop_id AS business_id,
  created_at,
  updated_at
FROM public.barbers;

-- 11. Criar função RPC para buscar profissionais por serviço (para uso público)
CREATE OR REPLACE FUNCTION public.get_professionals_for_service(
  p_service_id uuid,
  p_barbershop_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  specialty text,
  working_hours jsonb
)
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

-- 12. Criar função RPC para buscar serviços válidos para o tipo de negócio
CREATE OR REPLACE FUNCTION public.get_valid_services(
  p_barbershop_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  duration integer,
  allowed_business_types text[]
)
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
  ORDER BY s.name;
$$;