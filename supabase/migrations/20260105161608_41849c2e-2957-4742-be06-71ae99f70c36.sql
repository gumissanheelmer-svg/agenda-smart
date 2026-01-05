-- Fix 1: Restrict barber_accounts INSERT to authenticated users only
-- (The registration flow creates the auth user first, then the barber_account)
DROP POLICY IF EXISTS "Anyone can insert barber account requests" ON public.barber_accounts;

CREATE POLICY "Authenticated users can create their own barber account"
ON public.barber_accounts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix 2: Restrict appointments INSERT to require barbershop_id validation
-- This prevents random spam while still allowing client bookings
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

CREATE POLICY "Anyone can create appointments for active barbershops"
ON public.appointments
FOR INSERT
WITH CHECK (
  -- Ensure the barbershop exists and is active/approved
  EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id = barbershop_id 
      AND active = true 
      AND approval_status = 'approved'
  )
  AND
  -- Ensure the barber belongs to this barbershop and is active
  EXISTS (
    SELECT 1 FROM public.barbers 
    WHERE id = barber_id 
      AND barbershop_id = appointments.barbershop_id
      AND active = true
  )
  AND
  -- Ensure the service belongs to this barbershop and is active
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE id = service_id 
      AND barbershop_id = appointments.barbershop_id
      AND active = true
  )
);