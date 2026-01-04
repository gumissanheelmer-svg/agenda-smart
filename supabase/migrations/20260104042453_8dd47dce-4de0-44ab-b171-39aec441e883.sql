-- Add 'barber' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'barber';

-- Create barber_accounts table for registration with approval workflow
CREATE TABLE public.barber_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'blocked')),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barber_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for barber_accounts
CREATE POLICY "Admins can manage barber accounts"
ON public.barber_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own barber account"
ON public.barber_accounts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert barber account requests"
ON public.barber_accounts
FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_barber_accounts_updated_at
BEFORE UPDATE ON public.barber_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to assign barber role when approved
CREATE OR REPLACE FUNCTION public.handle_barber_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes to approved
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    -- Create barber entry if not exists
    IF NEW.barber_id IS NULL THEN
      INSERT INTO public.barbers (name, phone, active)
      VALUES (NEW.name, NEW.phone, true)
      RETURNING id INTO NEW.barber_id;
    END IF;
    
    -- Assign barber role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'barber')
    ON CONFLICT (user_id, role) DO NOTHING;
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
$$;

-- Trigger for approval workflow
CREATE TRIGGER on_barber_approval_change
BEFORE UPDATE ON public.barber_accounts
FOR EACH ROW
EXECUTE FUNCTION public.handle_barber_approval();

-- Function to check if user is approved barber
CREATE OR REPLACE FUNCTION public.is_approved_barber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.barber_accounts
    WHERE user_id = _user_id
      AND approval_status = 'approved'
  )
$$;