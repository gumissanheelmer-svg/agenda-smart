-- Atualizar trigger para ser mais tolerante (permitir quando não há vínculos configurados)
CREATE OR REPLACE FUNCTION public.validate_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_barbershop_business_type text;
  v_service_allowed_types text[];
  v_professional_exists boolean;
  v_service_duration integer;
  v_has_links boolean;
BEGIN
  -- Buscar tipo de negócio do estabelecimento
  SELECT business_type INTO v_barbershop_business_type
  FROM public.barbershops
  WHERE id = NEW.barbershop_id AND active = true AND approval_status = 'approved';
  
  IF v_barbershop_business_type IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado ou inativo.';
  END IF;

  -- Buscar tipos permitidos do serviço e duração
  SELECT allowed_business_types, duration INTO v_service_allowed_types, v_service_duration
  FROM public.services
  WHERE id = NEW.service_id AND barbershop_id = NEW.barbershop_id AND active = true;
  
  IF v_service_allowed_types IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inativo.';
  END IF;

  -- Validar se o serviço é permitido para o tipo de negócio
  IF NOT (v_barbershop_business_type = ANY(v_service_allowed_types)) THEN
    RAISE EXCEPTION 'Este serviço não está disponível para este tipo de estabelecimento.';
  END IF;

  -- Verificar se o profissional existe e está ativo
  SELECT EXISTS(
    SELECT 1 FROM public.barbers 
    WHERE id = NEW.barber_id 
    AND barbershop_id = NEW.barbershop_id 
    AND active = true
  ) INTO v_professional_exists;
  
  IF NOT v_professional_exists THEN
    RAISE EXCEPTION 'Profissional não encontrado ou inativo.';
  END IF;

  -- Para salões e híbridos, verificar vínculo APENAS se existirem vínculos cadastrados
  IF v_barbershop_business_type IN ('salao', 'salao_barbearia') THEN
    -- Primeiro, verificar se o serviço tem algum profissional vinculado
    SELECT EXISTS(
      SELECT 1 FROM public.service_professionals
      WHERE service_id = NEW.service_id
      AND barbershop_id = NEW.barbershop_id
    ) INTO v_has_links;
    
    -- Se tem vínculos, validar se o profissional está entre eles
    IF v_has_links THEN
      SELECT EXISTS(
        SELECT 1 FROM public.service_professionals
        WHERE service_id = NEW.service_id
        AND professional_id = NEW.barber_id
        AND barbershop_id = NEW.barbershop_id
      ) INTO v_professional_exists;
      
      IF NOT v_professional_exists THEN
        RAISE EXCEPTION 'Este profissional não realiza o serviço selecionado.';
      END IF;
    END IF;
    -- Se não tem vínculos, permitir qualquer profissional (retrocompatibilidade)
  END IF;

  -- Verificar conflito de horário
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.services s ON s.id = a.service_id
    WHERE a.barber_id = NEW.barber_id
    AND a.appointment_date = NEW.appointment_date
    AND a.status NOT IN ('cancelled')
    AND a.id IS DISTINCT FROM NEW.id
    AND (
      (NEW.appointment_time >= a.appointment_time 
       AND NEW.appointment_time < (a.appointment_time::time + (s.duration || ' minutes')::interval)::time)
      OR
      ((NEW.appointment_time::time + (v_service_duration || ' minutes')::interval)::time > a.appointment_time::time
       AND NEW.appointment_time < a.appointment_time)
    )
  ) THEN
    RAISE EXCEPTION 'Horário indisponível. O profissional já possui um agendamento neste período.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Atualizar RPC para filtrar serviços sem profissionais vinculados (para salões/mistos)
CREATE OR REPLACE FUNCTION public.get_valid_services(p_barbershop_id uuid)
RETURNS TABLE(id uuid, name text, price numeric, duration integer, allowed_business_types text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.price, s.duration, s.allowed_business_types
  FROM public.services s
  JOIN public.barbershops bs ON bs.id = s.barbershop_id
  WHERE s.barbershop_id = p_barbershop_id
  AND s.active = true
  AND bs.business_type = ANY(s.allowed_business_types)
  AND (
    -- Para barbearias, não precisa de vínculo
    bs.business_type = 'barbearia'
    OR
    -- Para salões/mistos, precisa ter pelo menos um profissional vinculado
    EXISTS (
      SELECT 1 FROM public.service_professionals sp
      WHERE sp.service_id = s.id AND sp.barbershop_id = p_barbershop_id
    )
  )
  ORDER BY s.name;
$$;