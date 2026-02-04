-- Create affiliates_agenda table
CREATE TABLE public.affiliates_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  commission_fixed NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate_sales_agenda table
CREATE TABLE public.affiliate_sales_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates_agenda(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  sale_value NUMERIC NOT NULL DEFAULT 0,
  commission_value NUMERIC NOT NULL DEFAULT 0,
  platform_profit NUMERIC GENERATED ALWAYS AS (sale_value - commission_value) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliates_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales_agenda ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliates_agenda
CREATE POLICY "Superadmin can manage all affiliates_agenda"
ON public.affiliates_agenda FOR ALL
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Block anonymous select on affiliates_agenda"
ON public.affiliates_agenda FOR SELECT
USING (false);

-- RLS policies for affiliate_sales_agenda
CREATE POLICY "Superadmin can manage all affiliate_sales_agenda"
ON public.affiliate_sales_agenda FOR ALL
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Block anonymous select on affiliate_sales_agenda"
ON public.affiliate_sales_agenda FOR SELECT
USING (false);

-- Create index for better performance
CREATE INDEX idx_affiliate_sales_affiliate_id ON public.affiliate_sales_agenda(affiliate_id);
CREATE INDEX idx_affiliate_sales_business_id ON public.affiliate_sales_agenda(business_id);
CREATE INDEX idx_affiliate_sales_created_at ON public.affiliate_sales_agenda(created_at);

-- Create trigger for updated_at on affiliates_agenda
CREATE TRIGGER update_affiliates_agenda_updated_at
BEFORE UPDATE ON public.affiliates_agenda
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();