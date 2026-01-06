-- Drop existing policy and recreate with better anonymous access
DROP POLICY IF EXISTS "Anyone can book appointments" ON public.appointments;

-- Create new policy that explicitly allows anonymous inserts
CREATE POLICY "Public can book appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Barbershop must be active and approved
  EXISTS (
    SELECT 1 FROM barbershops
    WHERE barbershops.id = appointments.barbershop_id
    AND barbershops.active = true
    AND barbershops.approval_status = 'approved'
  )
  AND
  -- Barber must be active and belong to the barbershop
  EXISTS (
    SELECT 1 FROM barbers
    WHERE barbers.id = appointments.barber_id
    AND barbers.barbershop_id = appointments.barbershop_id
    AND barbers.active = true
  )
  AND
  -- Service must be active and belong to the barbershop
  EXISTS (
    SELECT 1 FROM services
    WHERE services.id = appointments.service_id
    AND services.barbershop_id = appointments.barbershop_id
    AND services.active = true
  )
);