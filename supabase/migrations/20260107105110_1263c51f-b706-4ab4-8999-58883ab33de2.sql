-- Create view for professionals (alias for barbers)
CREATE OR REPLACE VIEW public.professionals AS
SELECT 
  id,
  name,
  phone,
  active,
  working_hours,
  barbershop_id AS business_id,
  created_at,
  updated_at
FROM public.barbers;

-- Create view for businesses (alias for barbershops)
CREATE OR REPLACE VIEW public.businesses AS
SELECT 
  id,
  slug,
  name,
  logo_url,
  whatsapp_number,
  primary_color,
  secondary_color,
  background_color,
  text_color,
  opening_time,
  closing_time,
  active,
  approval_status,
  owner_email,
  business_type,
  created_at,
  updated_at
FROM public.barbershops;

-- Create view for professional_accounts (alias for barber_accounts)
CREATE OR REPLACE VIEW public.professional_accounts AS
SELECT 
  id,
  user_id,
  name,
  email,
  phone,
  barbershop_id AS business_id,
  barbershop_name AS business_name,
  barber_id AS professional_id,
  approval_status,
  created_at,
  updated_at
FROM public.barber_accounts;

-- Create view for professional_services (alias for barber_services)
CREATE OR REPLACE VIEW public.professional_services AS
SELECT 
  id,
  barber_id AS professional_id,
  service_id
FROM public.barber_services;

-- Create RPC function for public professionals using view
CREATE OR REPLACE FUNCTION public.get_public_professionals(p_business_id uuid)
RETURNS TABLE(id uuid, name text, working_hours jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, working_hours
  FROM public.barbers
  WHERE barbershop_id = p_business_id
    AND active = true;
$$;

-- Create RPC function for public business using view
CREATE OR REPLACE FUNCTION public.get_public_business(p_slug text)
RETURNS TABLE(
  id uuid, 
  slug text, 
  name text, 
  logo_url text, 
  whatsapp_number text, 
  primary_color text, 
  secondary_color text, 
  background_color text, 
  text_color text, 
  opening_time time, 
  closing_time time, 
  business_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slug, name, logo_url, whatsapp_number,
         primary_color, secondary_color, background_color, text_color,
         opening_time, closing_time, business_type
  FROM public.barbershops
  WHERE slug = p_slug
    AND active = true
    AND approval_status = 'approved';
$$;

-- Create alias function for business admin check
CREATE OR REPLACE FUNCTION public.is_business_admin(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_barbershop_admin(_user_id, _business_id)
$$;

-- Create alias function to get user business id
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_barbershop_id(_user_id)
$$;

-- Create function to get professionals for a specific service
CREATE OR REPLACE FUNCTION public.get_public_professionals_for_service(p_business_id uuid, p_service_id uuid)
RETURNS TABLE(id uuid, name text, working_hours jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT b.id, b.name, b.working_hours
  FROM public.barbers b
  INNER JOIN public.service_professionals sp ON sp.professional_id = b.id
  WHERE b.barbershop_id = p_business_id
    AND b.active = true
    AND sp.service_id = p_service_id;
$$;