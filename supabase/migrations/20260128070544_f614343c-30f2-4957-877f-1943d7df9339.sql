-- =====================================================
-- FIX 1: Create missing storage helper function
-- The storage policies reference is_admin_or_manager_of_barbershop but it doesn't exist
-- We'll create it as an alias to the existing is_barbershop_admin_or_manager
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_manager_of_barbershop(_user_id uuid, _barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_barbershop_admin_or_manager(_user_id, _barbershop_id)
$$;

-- =====================================================
-- FIX 2: Tighten appointments table RLS policies
-- Ensure client PII (client_name, client_phone) is only accessible by authorized staff
-- =====================================================

-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "Authenticated users can view appointments in their context" ON public.appointments;
DROP POLICY IF EXISTS "Staff can view appointments in their barbershop" ON public.appointments;
DROP POLICY IF EXISTS "Barbers can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments in their barbershop" ON public.appointments;
DROP POLICY IF EXISTS "Managers can view all appointments in their barbershop" ON public.appointments;

-- Create strict SELECT policy: Only staff of the same barbershop can view appointments
-- This covers admin, manager, and barber roles
CREATE POLICY "Staff can view appointments in their barbershop"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  -- SuperAdmin has full access
  public.is_superadmin(auth.uid())
  OR
  -- Admin or Manager of the barbershop
  public.is_barbershop_admin_or_manager(auth.uid(), barbershop_id)
  OR
  -- Approved barber assigned to this appointment
  EXISTS (
    SELECT 1 FROM public.barber_accounts ba
    WHERE ba.user_id = auth.uid()
      AND ba.barber_id = appointments.barber_id
      AND ba.approval_status = 'approved'
  )
);

-- =====================================================
-- FIX 3: Tighten barbers table RLS policies
-- Consolidate overlapping policies and restrict phone access
-- =====================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Authenticated users can view barbers in their context" ON public.barbers;
DROP POLICY IF EXISTS "Staff can view barbers in their barbershop" ON public.barbers;
DROP POLICY IF EXISTS "Admins can view all barbers in their barbershop" ON public.barbers;
DROP POLICY IF EXISTS "Managers can view all barbers in their barbershop" ON public.barbers;
DROP POLICY IF EXISTS "Barbers can view their own profile" ON public.barbers;

-- Create a single consolidated SELECT policy for barbers table
-- Phone numbers are only visible to admin/manager of the same barbershop or the barber themselves
CREATE POLICY "Authorized staff can view barbers in their barbershop"
ON public.barbers
FOR SELECT
TO authenticated
USING (
  -- SuperAdmin has full access
  public.is_superadmin(auth.uid())
  OR
  -- Admin or Manager of the barbershop
  public.is_barbershop_admin_or_manager(auth.uid(), barbershop_id)
  OR
  -- The barber themselves (via barber_accounts)
  EXISTS (
    SELECT 1 FROM public.barber_accounts ba
    WHERE ba.user_id = auth.uid()
      AND ba.barber_id = barbers.id
      AND ba.approval_status = 'approved'
  )
);

-- =====================================================
-- Create secure RPC for public appointment availability
-- This returns ONLY time slots, NO PII
-- =====================================================

-- The get_public_appointments_for_day already exists and is secure (no PII)
-- Let's create an additional summary RPC for admin dashboards

CREATE OR REPLACE FUNCTION public.get_appointment_stats_for_barbershop(
  p_barbershop_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_appointments bigint,
  pending_count bigint,
  confirmed_count bigint,
  completed_count bigint,
  cancelled_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*)::bigint as total_appointments,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint as confirmed_count,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::bigint as cancelled_count
  FROM public.appointments
  WHERE barbershop_id = p_barbershop_id
    AND appointment_date = p_date
    AND (
      public.is_superadmin(auth.uid())
      OR public.is_barbershop_admin_or_manager(auth.uid(), p_barbershop_id)
    );
$$;

-- =====================================================
-- Create secure RPC to get barber list without phones for public use
-- =====================================================

-- The existing get_public_professionals already excludes phone numbers
-- Just verify it's being used correctly (it already is)