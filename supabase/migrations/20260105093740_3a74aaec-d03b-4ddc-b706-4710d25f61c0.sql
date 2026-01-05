-- 1. Add 'superadmin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Add approval_status column to barbershops table
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected', 'blocked'));

-- 3. Add owner_email column to barbershops for contact
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS owner_email TEXT;