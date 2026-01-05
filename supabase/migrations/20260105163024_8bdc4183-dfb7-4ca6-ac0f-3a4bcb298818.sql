-- Fix: Make the barbershop creation policy PERMISSIVE instead of RESTRICTIVE
-- With restrictive policies, ALL must pass. With permissive, at least ONE must pass.

DROP POLICY IF EXISTS "Authenticated users can create barbershops" ON public.barbershops;

CREATE POLICY "Authenticated users can create barbershops"
ON public.barbershops
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure the admin management policy doesn't block new inserts by making it permissive
DROP POLICY IF EXISTS "Admins can manage own barbershop" ON public.barbershops;

CREATE POLICY "Admins can manage own barbershop"
ON public.barbershops
FOR ALL
TO authenticated
USING (is_barbershop_admin(auth.uid(), id))
WITH CHECK (is_barbershop_admin(auth.uid(), id));