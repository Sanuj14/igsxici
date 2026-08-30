'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

// Admin client — bypasses RLS for server-side operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function registerTeam(
  teamName: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; redirect?: string }> {

  // 1. Check team name not taken
  const { data: existing } = await supabaseAdmin
    .from('teams')
    .select('id')
    .ilike('name', teamName)
    .single()

  if (existing) {
    return { success: false, error: 'Team name is already taken. Choose another.' }
  }

  // 2. Create auth user via admin (auto-confirms email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: teamName, role: 'team' }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'This email is already registered.' }
    }
    return { success: false, error: authError.message }
  }

  const userId = authData.user.id

  // 3. Create team
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert({ name: teamName, funds: 85000 })
    .select()
    .single()

  if (teamError) {
    // Rollback user creation
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return { success: false, error: 'Failed to create team: ' + teamError.message }
  }

  // 4. Link user profile to team (trigger may have already created the row)
  await supabaseAdmin
    .from('user_profiles')
    .upsert({
      id: userId,
      role: 'team',
      team_id: team.id,
      display_name: teamName
    }, { onConflict: 'id' })

  // 5. Seed 6 Labours
  const { data: labourRes } = await supabaseAdmin.from('resources').select('id').eq('slug', 'labour').single()
  if (labourRes) {
    await supabaseAdmin.from('team_inventory').insert({
      team_id: team.id,
      resource_id: labourRes.id,
      quantity: 6
    })
  }

  return { success: true, redirect: '/login' }
}

export async function promoteToAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ role: 'admin', team_id: null })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
