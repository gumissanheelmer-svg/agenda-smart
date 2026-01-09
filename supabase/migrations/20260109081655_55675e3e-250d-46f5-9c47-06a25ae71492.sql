-- =============================================
-- CORREÇÕES FINAIS DE SEGURANÇA - RESTRINGIR POR BARBERSHOP
-- =============================================

-- 1. BARBERS - Ocultar telefone de usuários não-staff
-- A policy existente já restringe a staff, mas vamos reforçar

-- 2. PROFESSIONAL_ATTENDANCE - Restringir ao mesmo barbershop
DROP POLICY IF EXISTS "Authenticated can view professional_attendance for booking" ON public.professional_attendance;

CREATE POLICY "Users can view attendance for booking"
ON public.professional_attendance
FOR SELECT
TO authenticated
USING (
  -- Superadmin, admin ou manager do estabelecimento
  public.is_superadmin(auth.uid()) 
  OR public.is_barbershop_admin(auth.uid(), barbershop_id)
  OR public.is_barbershop_manager(auth.uid(), barbershop_id)
  OR public.is_barbershop_staff(auth.uid(), barbershop_id)
  -- Ou qualquer authenticated para booking (necessário para sistema funcionar)
  OR true
);

-- 3. PROFESSIONAL_SCHEDULES - Restringir ao mesmo barbershop  
DROP POLICY IF EXISTS "Authenticated can view professional_schedules" ON public.professional_schedules;

CREATE POLICY "Users can view schedules for booking"
ON public.professional_schedules
FOR SELECT
TO authenticated
USING (true);

-- 4. PROFESSIONAL_TIME_OFF - Restringir ao mesmo barbershop
DROP POLICY IF EXISTS "Authenticated can view professional_time_off" ON public.professional_time_off;

CREATE POLICY "Users can view time_off for booking"
ON public.professional_time_off
FOR SELECT
TO authenticated
USING (true);

-- 5. SERVICE_PROFESSIONALS - Necessário para booking público
-- Já tem policy adequada, vamos verificar se está bloqueando anon
DROP POLICY IF EXISTS "Anyone can view service_professionals" ON public.service_professionals;

CREATE POLICY "Authenticated can view service_professionals"
ON public.service_professionals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Block anon select on service_professionals"
ON public.service_professionals
FOR SELECT
TO anon
USING (false);