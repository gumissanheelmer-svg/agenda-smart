-- Add status column to managers table
ALTER TABLE public.managers 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'active', 'blocked'));

-- Update existing active managers to have 'active' status
UPDATE public.managers 
SET status = 'active' 
WHERE active = true AND status = 'pending';