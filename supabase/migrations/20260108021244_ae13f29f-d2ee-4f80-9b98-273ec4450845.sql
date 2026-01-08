-- ==========================================
-- 🔐 FIX: Remover acesso público direto à tabela barbershops
-- ==========================================

-- O problema: a política "Anyone can view approved active barbershops" 
-- permite SELECT público em TODOS os campos, incluindo owner_email.
-- RLS só filtra LINHAS, não COLUNAS.

-- Solução: Remover acesso público direto e forçar uso de funções RPC

-- 1️⃣ Remover política que expõe owner_email
DROP POLICY IF EXISTS "Anyone can view approved active barbershops" ON public.barbershops;

-- 2️⃣ Garantir que apenas usuários autenticados com contexto podem ver barbershops
-- O acesso público DEVE usar as funções RPC (get_public_barbershop, get_public_business)

-- Nota: As outras políticas já existentes cobrem:
-- - Admins can view own barbershop
-- - Barbers can view own barbershop  
-- - Superadmin can view all barbershops

-- 3️⃣ Comentário explicativo
COMMENT ON TABLE public.barbershops IS 
'Security: Acesso público bloqueado. Usar funções RPC (get_public_barbershop) para dados públicos. owner_email nunca é exposto publicamente.';