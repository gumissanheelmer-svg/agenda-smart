-- Add buffer and interval columns to barbershops table
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS prep_buffer_minutes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cleanup_buffer_minutes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS slot_interval_minutes integer NOT NULL DEFAULT 30;

-- Add constraints to ensure valid values (use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_prep_buffer_non_negative') THEN
    ALTER TABLE public.barbershops ADD CONSTRAINT check_prep_buffer_non_negative CHECK (prep_buffer_minutes >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cleanup_buffer_non_negative') THEN
    ALTER TABLE public.barbershops ADD CONSTRAINT check_cleanup_buffer_non_negative CHECK (cleanup_buffer_minutes >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_slot_interval_positive') THEN
    ALTER TABLE public.barbershops ADD CONSTRAINT check_slot_interval_positive CHECK (slot_interval_minutes > 0);
  END IF;
END
$$;

-- Drop old function first to allow signature change
DROP FUNCTION IF EXISTS public.get_public_barbershop(text);

-- Recreate the get_public_barbershop RPC with new columns
CREATE FUNCTION public.get_public_barbershop(p_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  background_color text,
  text_color text,
  opening_time text,
  closing_time text,
  business_type text,
  background_image_url text,
  background_overlay_level text,
  mpesa_number text,
  emola_number text,
  payment_methods_enabled text[],
  whatsapp_number text,
  payment_required boolean,
  prep_buffer_minutes integer,
  cleanup_buffer_minutes integer,
  slot_interval_minutes integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.slug,
    b.name,
    b.logo_url,
    b.primary_color,
    b.secondary_color,
    b.background_color,
    b.text_color,
    b.opening_time::text,
    b.closing_time::text,
    b.business_type,
    b.background_image_url,
    b.background_overlay_level,
    b.mpesa_number::text,
    b.emola_number::text,
    b.payment_methods_enabled,
    b.whatsapp_number,
    b.payment_required,
    b.prep_buffer_minutes,
    b.cleanup_buffer_minutes,
    b.slot_interval_minutes
  FROM barbershops b
  WHERE b.slug = p_slug AND b.active = true AND b.approval_status = 'approved';
$$;