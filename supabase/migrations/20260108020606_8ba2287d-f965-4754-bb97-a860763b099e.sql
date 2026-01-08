-- ==========================================
-- 🔐 SECURITY FIX PARTE 3: Remover views problemáticas
-- ==========================================

-- As views estão sendo detectadas como "security definer" porque o 
-- Supabase trata views que ocultam dados como tal.
-- Solução: Remover as views e usar apenas funções RPC para acesso público.

-- 1️⃣ Remover todas as views de compatibilidade
DROP VIEW IF EXISTS public.businesses CASCADE;
DROP VIEW IF EXISTS public.professionals CASCADE;
DROP VIEW IF EXISTS public.professional_accounts CASCADE;
DROP VIEW IF EXISTS public.professional_services CASCADE;

-- 2️⃣ As políticas de INSERT com WITH CHECK (true) são intencionais:
-- - "Public can book appointments" - Permite agendamentos públicos
-- - "Authenticated users can create barbershops" - Permite criar empresas

-- Vamos substituir por políticas mais específicas para appointments

DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;

-- Política mais específica: permite insert apenas com dados válidos
CREATE POLICY "Public can book appointments with validation"
ON public.appointments
FOR INSERT
WITH CHECK (
  -- Verifica se o barbershop existe e está ativo
  EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id = barbershop_id 
    AND active = true 
    AND approval_status = 'approved'
  )
  AND
  -- Verifica se o serviço existe e está ativo
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE id = service_id 
    AND barbershop_id = appointments.barbershop_id
    AND active = true
  )
  AND
  -- Verifica se o profissional existe e está ativo
  EXISTS (
    SELECT 1 FROM public.barbers 
    WHERE id = barber_id 
    AND barbershop_id = appointments.barbershop_id
    AND active = true
  )
  AND
  -- Status inicial deve ser pending
  status = 'pending'
);

-- 3️⃣ Política mais específica para criar barbershops
DROP POLICY IF EXISTS "Authenticated users can create barbershops" ON public.barbershops;

CREATE POLICY "Authenticated users can create barbershops with validation"
ON public.barbershops
FOR INSERT
WITH CHECK (
  -- Usuário deve estar autenticado
  auth.uid() IS NOT NULL
  AND
  -- Novo estabelecimento deve estar pendente
  approval_status = 'pending'
  AND
  -- Deve estar inativo até aprovação
  active = false
);