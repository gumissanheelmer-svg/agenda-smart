-- Create barbershops table
CREATE TABLE public.barbershops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  whatsapp_number TEXT,
  primary_color TEXT NOT NULL DEFAULT '#D4AF37',
  secondary_color TEXT NOT NULL DEFAULT '#1a1a2e',
  background_color TEXT NOT NULL DEFAULT '#0f0f1a',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  opening_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
  closing_time TIME WITHOUT TIME ZONE DEFAULT '18:00:00',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Anyone can view active barbershops (for booking)
CREATE POLICY "Anyone can view active barbershops"
ON public.barbershops
FOR SELECT
USING (active = true);

-- Add barbershop_id to barbers
ALTER TABLE public.barbers 
ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to services
ALTER TABLE public.services 
ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to appointments
ALTER TABLE public.appointments 
ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to barber_accounts
ALTER TABLE public.barber_accounts 
ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Add barbershop_id to user_roles (to track which barbershop the admin belongs to)
ALTER TABLE public.user_roles 
ADD COLUMN barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Create function to check if user is admin of a specific barbershop
CREATE OR REPLACE FUNCTION public.is_barbershop_admin(_user_id uuid, _barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND barbershop_id = _barbershop_id
  )
$$;

-- Create function to get user's barbershop_id
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update barbers RLS policies
DROP POLICY IF EXISTS "Admins can manage barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can view active barbers" ON public.barbers;

CREATE POLICY "Admins can manage own barbershop barbers"
ON public.barbers
FOR ALL
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Anyone can view active barbers of barbershop"
ON public.barbers
FOR SELECT
USING (active = true);

-- Update services RLS policies
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;

CREATE POLICY "Admins can manage own barbershop services"
ON public.services
FOR ALL
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Anyone can view active services of barbershop"
ON public.services
FOR SELECT
USING (active = true);

-- Update appointments RLS policies
DROP POLICY IF EXISTS "Admins can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

CREATE POLICY "Admins can manage own barbershop appointments"
ON public.appointments
FOR ALL
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Anyone can view barbershop appointments"
ON public.appointments
FOR SELECT
USING (true);

CREATE POLICY "Public can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

-- Update barber_accounts RLS policies
DROP POLICY IF EXISTS "Admins can manage barber accounts" ON public.barber_accounts;

CREATE POLICY "Admins can manage own barbershop barber accounts"
ON public.barber_accounts
FOR ALL
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

-- Barbers can view own barbershop info
CREATE POLICY "Barbers can view own barbershop"
ON public.barbershops
FOR SELECT
USING (id = get_user_barbershop_id(auth.uid()));

-- Admins can manage their barbershop
CREATE POLICY "Admins can manage own barbershop"
ON public.barbershops
FOR ALL
USING (is_barbershop_admin(auth.uid(), id))
WITH CHECK (is_barbershop_admin(auth.uid(), id));

-- Update trigger for barbershops
CREATE TRIGGER update_barbershops_updated_at
BEFORE UPDATE ON public.barbershops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old settings table (replaced by barbershops)
DROP TABLE IF EXISTS public.settings;