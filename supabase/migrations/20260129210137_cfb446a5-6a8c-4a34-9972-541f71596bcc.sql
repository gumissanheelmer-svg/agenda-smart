-- Tabela para confirmações de pagamento (anti-fraude)
CREATE TABLE public.payment_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'emola')),
  phone_expected TEXT,
  amount_expected NUMERIC NOT NULL,
  confirmation_text TEXT NOT NULL,
  transaction_code TEXT NOT NULL,
  amount_detected NUMERIC,
  phone_detected TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints anti-fraude
  CONSTRAINT unique_transaction_code UNIQUE (transaction_code),
  CONSTRAINT unique_appointment_confirmation UNIQUE (appointment_id)
);

-- Índices para performance
CREATE INDEX idx_payment_confirmations_barbershop ON public.payment_confirmations(barbershop_id);
CREATE INDEX idx_payment_confirmations_status ON public.payment_confirmations(status);
CREATE INDEX idx_payment_confirmations_created ON public.payment_confirmations(created_at);

-- Enable RLS
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can insert payment confirmations"
ON public.payment_confirmations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can view payment confirmations"
ON public.payment_confirmations
FOR SELECT
USING (
  is_superadmin(auth.uid())
  OR is_barbershop_admin_or_manager(auth.uid(), barbershop_id)
);

CREATE POLICY "Staff can update payment confirmations"
ON public.payment_confirmations
FOR UPDATE
USING (
  is_superadmin(auth.uid())
  OR is_barbershop_admin_or_manager(auth.uid(), barbershop_id)
);

-- RPC para validar e registrar pagamento (transação atômica)
CREATE OR REPLACE FUNCTION public.validate_and_confirm_payment(
  p_appointment_id UUID,
  p_barbershop_id UUID,
  p_payment_method TEXT,
  p_phone_expected TEXT,
  p_amount_expected NUMERIC,
  p_confirmation_text TEXT,
  p_transaction_code TEXT,
  p_amount_detected NUMERIC DEFAULT NULL,
  p_phone_detected TEXT DEFAULT NULL,
  p_max_hours INTEGER DEFAULT 2
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_existing_code RECORD;
  v_existing_confirmation RECORD;
  v_reject_reason TEXT := NULL;
  v_status TEXT := 'accepted';
  v_confirmation_id UUID;
  v_phone_expected_normalized TEXT;
  v_phone_detected_normalized TEXT;
BEGIN
  -- Buscar dados do agendamento
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND barbershop_id = p_barbershop_id;
  
  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;

  -- Regra A: verificar se código já foi usado (globalmente)
  SELECT * INTO v_existing_code
  FROM public.payment_confirmations
  WHERE transaction_code = p_transaction_code;
  
  IF v_existing_code IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código já utilizado', 'code', 'CODE_REUSED');
  END IF;

  -- Regra B: verificar se já existe confirmação para este agendamento
  SELECT * INTO v_existing_confirmation
  FROM public.payment_confirmations
  WHERE appointment_id = p_appointment_id;
  
  IF v_existing_confirmation IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe confirmação para este agendamento', 'code', 'ALREADY_CONFIRMED');
  END IF;

  -- Regra C: verificar tempo (agendamento criado há no máximo X horas)
  IF v_appointment.created_at < (now() - (p_max_hours || ' hours')::interval) THEN
    v_status := 'rejected';
    v_reject_reason := 'Fora do tempo permitido para confirmação de pagamento';
  END IF;

  -- Regra D: verificar valor (se detectado)
  IF v_status = 'accepted' AND p_amount_detected IS NOT NULL THEN
    IF p_amount_detected != p_amount_expected THEN
      v_status := 'rejected';
      v_reject_reason := 'Valor não corresponde: esperado ' || p_amount_expected || ' MZN, detectado ' || p_amount_detected || ' MZN';
    END IF;
  END IF;

  -- Regra E: verificar telefone destinatário (se ambos existirem)
  IF v_status = 'accepted' AND p_phone_expected IS NOT NULL AND p_phone_detected IS NOT NULL THEN
    -- Normalizar para comparação (apenas dígitos, prefixo 258)
    v_phone_expected_normalized := regexp_replace(p_phone_expected, '\D', '', 'g');
    v_phone_detected_normalized := regexp_replace(p_phone_detected, '\D', '', 'g');
    
    -- Adicionar 258 se necessário
    IF length(v_phone_expected_normalized) = 9 THEN
      v_phone_expected_normalized := '258' || v_phone_expected_normalized;
    END IF;
    IF length(v_phone_detected_normalized) = 9 THEN
      v_phone_detected_normalized := '258' || v_phone_detected_normalized;
    END IF;
    
    IF v_phone_expected_normalized != v_phone_detected_normalized THEN
      v_status := 'rejected';
      v_reject_reason := 'Número do destinatário não corresponde';
    END IF;
  END IF;

  -- Inserir registro de confirmação
  INSERT INTO public.payment_confirmations (
    appointment_id,
    barbershop_id,
    payment_method,
    phone_expected,
    amount_expected,
    confirmation_text,
    transaction_code,
    amount_detected,
    phone_detected,
    status,
    reject_reason
  ) VALUES (
    p_appointment_id,
    p_barbershop_id,
    p_payment_method,
    p_phone_expected,
    p_amount_expected,
    p_confirmation_text,
    p_transaction_code,
    p_amount_detected,
    p_phone_detected,
    v_status,
    v_reject_reason
  )
  RETURNING id INTO v_confirmation_id;

  IF v_status = 'accepted' THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_status,
      'confirmation_id', v_confirmation_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'status', v_status,
      'error', v_reject_reason,
      'code', 'VALIDATION_FAILED',
      'confirmation_id', v_confirmation_id
    );
  END IF;

EXCEPTION WHEN unique_violation THEN
  -- Captura violações de constraint UNIQUE
  IF SQLERRM LIKE '%unique_transaction_code%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código já utilizado', 'code', 'CODE_REUSED');
  ELSIF SQLERRM LIKE '%unique_appointment_confirmation%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe confirmação para este agendamento', 'code', 'ALREADY_CONFIRMED');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'DB_ERROR');
  END IF;
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'UNKNOWN_ERROR');
END;
$$;