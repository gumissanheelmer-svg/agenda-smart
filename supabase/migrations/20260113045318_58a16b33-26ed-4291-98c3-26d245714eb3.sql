
-- =====================================================
-- FIX: Corrigir políticas de barber_accounts para usar barbershop_id
-- em vez de correspondência por nome (vulnerabilidade de segurança)
-- =====================================================

-- 1. Remover políticas antigas que usam correspondência por nome
DROP POLICY IF EXISTS "Admins can view barbershop barber accounts" ON public.barber_accounts;
DROP POLICY IF EXISTS "Admins can update barbershop barber accounts" ON public.barber_accounts;

-- 2. Criar políticas corrigidas usando apenas barbershop_id
CREATE POLICY "Admins can view barbershop barber accounts" 
ON public.barber_accounts 
FOR SELECT 
USING (
  -- Admin pode ver apenas contas de barbeiros da SUA barbearia
  public.is_barbershop_admin(auth.uid(), barbershop_id)
);

CREATE POLICY "Admins can update barbershop barber accounts" 
ON public.barber_accounts 
FOR UPDATE 
USING (
  public.is_barbershop_admin(auth.uid(), barbershop_id)
)
WITH CHECK (
  public.is_barbershop_admin(auth.uid(), barbershop_id)
);

-- =====================================================
-- DOCUMENTAÇÃO: Justificativa de segurança para appointments
-- =====================================================
-- A tabela appointments tem as seguintes proteções:
-- 1. INSERT público: Permite agendamento sem login (necessário para clientes)
--    - Validado por trigger que verifica barbershop, service e barber ativos
--    - Status inicial sempre 'pending'
--    - Não retorna dados sensíveis após INSERT
-- 2. SELECT bloqueado para anon: "Block anonymous select on appointments" 
-- 3. Staff autenticado: Apenas admin/manager/barber da mesma barbearia podem ver
-- 4. Os dados de cliente (nome/telefone) são visíveis apenas para staff autorizado

COMMENT ON TABLE public.appointments IS 
'Agendamentos do sistema. RLS ativo com INSERT público (clientes não precisam login) 
e SELECT restrito a staff autenticado da barbearia. Dados de cliente (client_name, 
client_phone) protegidos - visíveis apenas para admin/manager/barber autorizado.';

COMMENT ON TABLE public.barber_accounts IS 
'Contas de acesso dos barbeiros. RLS ativo com isolamento por barbershop_id. 
Emails e telefones acessíveis apenas pelo admin/manager da mesma barbearia, 
o próprio barbeiro, ou superadmin.';
