-- Criar função RPC para atualizar status de appointment com validação de permissões
CREATE OR REPLACE FUNCTION public.rpc_update_appointment_status(
  p_appointment_id uuid,
  p_new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment RECORD;
  v_user_id uuid := auth.uid();
  v_has_permission boolean := false;
BEGIN
  -- Buscar dados do appointment
  SELECT barbershop_id, barber_id INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id;
  
  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;
  
  -- Verificar permissões
  -- 1. Superadmin tem acesso total
  IF public.is_superadmin(v_user_id) THEN
    v_has_permission := true;
  
  -- 2. Admin ou Manager do barbershop
  ELSIF public.is_barbershop_admin_or_manager(v_user_id, v_appointment.barbershop_id) THEN
    v_has_permission := true;
  
  -- 3. Barber vinculado ao appointment
  ELSIF EXISTS (
    SELECT 1 FROM public.barber_accounts ba
    WHERE ba.user_id = v_user_id
      AND ba.barber_id = v_appointment.barber_id
      AND ba.approval_status = 'approved'
  ) THEN
    v_has_permission := true;
  END IF;
  
  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para alterar este agendamento');
  END IF;
  
  -- Validar status permitidos
  IF p_new_status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status inválido');
  END IF;
  
  -- Atualizar o status
  UPDATE public.appointments
  SET status = p_new_status, updated_at = now()
  WHERE id = p_appointment_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;