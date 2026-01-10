import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateManagerRequest {
  name: string
  email: string
  password: string
  phone?: string
  barbershopId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create user client to validate the admin's token
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Validate admin's token using getUser
    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !userData?.user) {
      console.error('User validation error:', userError)
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminUserId = userData.user.id

    // Parse request body
    const body: CreateManagerRequest = await req.json()
    const { name, email, password, phone, barbershopId } = body

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password?.trim() || !barbershopId) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: name, email, password, barbershopId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin has permission for this barbershop (using service role to bypass RLS)
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .eq('barbershop_id', barbershopId)
      .maybeSingle()

    if (roleError || !adminRole) {
      console.error('Admin role check failed:', roleError)
      return new Response(
        JSON.stringify({ error: 'Sem permissão para criar gerente neste estabelecimento' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if email already exists as manager in this barbershop
    const { data: existingManager } = await supabaseAdmin
      .from('managers')
      .select('id, active, status')
      .eq('email', email.trim().toLowerCase())
      .eq('barbershop_id', barbershopId)
      .maybeSingle()

    if (existingManager) {
      if (existingManager.status === 'pending' || (!existingManager.active && existingManager.status !== 'blocked')) {
        return new Response(
          JSON.stringify({ error: 'Este gerente já foi criado e está aguardando ativação' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (existingManager.status === 'active' && existingManager.active) {
        return new Response(
          JSON.stringify({ error: 'Já existe um gerente ativo com este email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create user via Admin API (doesn't change client session)
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email
    })

    if (createUserError) {
      console.error('Create user error:', createUserError)
      
      // Handle specific error cases
      if (createUserError.message.includes('already registered') || createUserError.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado no sistema' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível criar a conta do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = newUser.user.id

    // Create manager record (using service role bypasses RLS)
    const { error: managerError } = await supabaseAdmin
      .from('managers')
      .insert({
        user_id: newUserId,
        barbershop_id: barbershopId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        created_by: adminUserId,
        active: false,
        status: 'pending',
      })

    if (managerError) {
      console.error('Create manager error:', managerError)
      
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      
      return new Response(
        JSON.stringify({ error: `Erro ao criar registro do gerente: ${managerError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Assign manager role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'manager',
        barbershop_id: barbershopId,
      })

    if (roleInsertError) {
      console.error('Role insert error:', roleInsertError)
      // Don't fail the whole operation, manager was created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${name} foi criado e aguarda ativação`,
        managerId: newUserId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
