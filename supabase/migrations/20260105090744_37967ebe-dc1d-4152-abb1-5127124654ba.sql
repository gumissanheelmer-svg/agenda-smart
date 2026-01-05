-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage expenses for their barbershop
CREATE POLICY "Admins can manage own barbershop expenses" 
ON public.expenses
FOR ALL 
TO authenticated
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();