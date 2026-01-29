-- Add payment_required column to barbershops table
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.barbershops.payment_required IS 'Whether payment confirmation is required before booking confirmation';