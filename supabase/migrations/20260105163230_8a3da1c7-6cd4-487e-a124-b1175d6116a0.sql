-- Drop the problematic ALL policy that blocks inserts for non-admins
DROP POLICY IF EXISTS "Admins can manage own barbershop" ON public.barbershops;

-- Create separate policies for admin management (excluding INSERT)
CREATE POLICY "Admins can view own barbershop"
ON public.barbershops
FOR SELECT
TO authenticated
USING (is_barbershop_admin(auth.uid(), id));

CREATE POLICY "Admins can update own barbershop"
ON public.barbershops
FOR UPDATE
TO authenticated
USING (is_barbershop_admin(auth.uid(), id))
WITH CHECK (is_barbershop_admin(auth.uid(), id));

CREATE POLICY "Admins can delete own barbershop"
ON public.barbershops
FOR DELETE
TO authenticated
USING (is_barbershop_admin(auth.uid(), id));

-- Recreate the INSERT policy to ensure it works
DROP POLICY IF EXISTS "Authenticated users can create barbershops" ON public.barbershops;

CREATE POLICY "Authenticated users can create barbershops"
ON public.barbershops
FOR INSERT
TO authenticated
WITH CHECK (true);