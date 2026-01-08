-- Add has_app_access column to barbers table
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS has_app_access BOOLEAN DEFAULT true;

-- Create professional_schedules table for custom daily schedules
CREATE TABLE IF NOT EXISTS public.professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  is_working_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  break_start TIME,
  break_end TIME,
  barbershop_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barber_id, day_of_week)
);

-- Create professional_time_off table for specific date time-offs
CREATE TABLE IF NOT EXISTS public.professional_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  off_date DATE NOT NULL,
  reason TEXT,
  barbershop_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barber_id, off_date)
);

-- Create professional_attendance table for daily presence tracking
CREATE TABLE IF NOT EXISTS public.professional_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'pending')) DEFAULT 'pending',
  marked_by UUID REFERENCES auth.users(id),
  marked_at TIMESTAMPTZ DEFAULT now(),
  barbershop_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barber_id, attendance_date)
);

-- Enable RLS on new tables
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professional_schedules
CREATE POLICY "Superadmin can manage all professional_schedules"
ON public.professional_schedules FOR ALL
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can manage own barbershop professional_schedules"
ON public.professional_schedules FOR ALL
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Anyone can view professional_schedules"
ON public.professional_schedules FOR SELECT
USING (true);

-- RLS Policies for professional_time_off
CREATE POLICY "Superadmin can manage all professional_time_off"
ON public.professional_time_off FOR ALL
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can manage own barbershop professional_time_off"
ON public.professional_time_off FOR ALL
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Anyone can view professional_time_off"
ON public.professional_time_off FOR SELECT
USING (true);

-- RLS Policies for professional_attendance
CREATE POLICY "Superadmin can manage all professional_attendance"
ON public.professional_attendance FOR ALL
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can manage own barbershop professional_attendance"
ON public.professional_attendance FOR ALL
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Barbers can view own attendance"
ON public.professional_attendance FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.barber_accounts ba
  WHERE ba.user_id = auth.uid()
  AND ba.barber_id = professional_attendance.barber_id
  AND ba.approval_status = 'approved'
));

CREATE POLICY "Barbers can manage own attendance"
ON public.professional_attendance FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.barber_accounts ba
  JOIN public.barbers b ON b.id = ba.barber_id
  WHERE ba.user_id = auth.uid()
  AND ba.barber_id = professional_attendance.barber_id
  AND ba.approval_status = 'approved'
  AND b.has_app_access = true
));

CREATE POLICY "Barbers can update own attendance"
ON public.professional_attendance FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.barber_accounts ba
  JOIN public.barbers b ON b.id = ba.barber_id
  WHERE ba.user_id = auth.uid()
  AND ba.barber_id = professional_attendance.barber_id
  AND ba.approval_status = 'approved'
  AND b.has_app_access = true
));

CREATE POLICY "Anyone can view professional_attendance for booking"
ON public.professional_attendance FOR SELECT
USING (true);

-- Create function to get available professionals for a specific date
CREATE OR REPLACE FUNCTION public.get_available_professionals(p_barbershop_id UUID, p_date DATE)
RETURNS TABLE(
  id UUID,
  name TEXT,
  specialty TEXT,
  working_hours JSONB,
  attendance_status TEXT,
  is_day_off BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.specialty,
    b.working_hours,
    COALESCE(pa.status, 'pending') as attendance_status,
    CASE 
      WHEN pto.id IS NOT NULL THEN true
      WHEN ps.id IS NOT NULL AND ps.is_working_day = false THEN true
      ELSE false
    END as is_day_off
  FROM public.barbers b
  LEFT JOIN public.professional_attendance pa 
    ON pa.barber_id = b.id AND pa.attendance_date = p_date
  LEFT JOIN public.professional_time_off pto 
    ON pto.barber_id = b.id AND pto.off_date = p_date
  LEFT JOIN public.professional_schedules ps 
    ON ps.barber_id = b.id AND ps.day_of_week = v_day_of_week
  WHERE b.barbershop_id = p_barbershop_id
    AND b.active = true
  ORDER BY b.name;
END;
$$;

-- Add comments
COMMENT ON TABLE public.professional_schedules IS 'Custom work schedules per professional per day of week';
COMMENT ON TABLE public.professional_time_off IS 'Specific date time-offs for professionals';
COMMENT ON TABLE public.professional_attendance IS 'Daily attendance tracking for professionals';
COMMENT ON COLUMN public.barbers.has_app_access IS 'Whether the professional has access to the app (for those without smartphones)';