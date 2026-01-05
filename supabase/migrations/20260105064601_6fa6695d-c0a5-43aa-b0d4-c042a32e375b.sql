-- Update the barber approval trigger to include barbershop_id
CREATE OR REPLACE FUNCTION public.handle_barber_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes to approved
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    -- Create barber entry if not exists
    IF NEW.barber_id IS NULL THEN
      INSERT INTO public.barbers (name, phone, active, barbershop_id)
      VALUES (NEW.name, NEW.phone, true, NEW.barbershop_id)
      RETURNING id INTO NEW.barber_id;
    END IF;
    
    -- Assign barber role with barbershop_id
    INSERT INTO public.user_roles (user_id, role, barbershop_id)
    VALUES (NEW.user_id, 'barber', NEW.barbershop_id)
    ON CONFLICT (user_id, role) DO UPDATE SET barbershop_id = NEW.barbershop_id;
  END IF;
  
  -- When status changes to blocked or rejected, remove role
  IF NEW.approval_status IN ('blocked', 'rejected') AND OLD.approval_status = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'barber';
    
    -- Deactivate barber
    IF NEW.barber_id IS NOT NULL THEN
      UPDATE public.barbers SET active = false WHERE id = NEW.barber_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_barber_account_update ON public.barber_accounts;
CREATE TRIGGER on_barber_account_update
  BEFORE UPDATE ON public.barber_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_barber_approval();