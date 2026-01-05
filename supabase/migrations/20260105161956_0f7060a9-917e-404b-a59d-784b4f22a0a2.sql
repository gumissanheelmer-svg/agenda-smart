-- Fix privilege escalation: Restrict user_roles INSERT to only allow 'admin' role during registration
-- Superadmin is assigned via trigger, not user insertion
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can insert admin role for themselves"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'admin'  -- Only allow admin role, superadmin is assigned via trigger
);

-- Fix barber_accounts: Remove the old "Users can view their own barber account" since we have the new ones
DROP POLICY IF EXISTS "Users can view their own barber account" ON public.barber_accounts;