-- Drop and recreate the get_public_barbershop function with new columns
DROP FUNCTION IF EXISTS public.get_public_barbershop(text);

CREATE OR REPLACE FUNCTION public.get_public_barbershop(p_slug text)
 RETURNS TABLE(id uuid, slug text, name text, logo_url text, primary_color text, secondary_color text, background_color text, text_color text, opening_time text, closing_time text, business_type text, background_image_url text, background_overlay_level text, mpesa_number text, emola_number text, payment_methods_enabled text[], whatsapp_number text, payment_required boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    b.payment_required
  FROM barbershops b
  WHERE b.slug = p_slug AND b.active = true AND b.approval_status = 'approved';
$function$;