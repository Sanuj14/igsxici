'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

// Admin client — bypasses RLS
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function resetGame() {
  // Truncate teams table (cascades to buildings, inventory, etc)
  const { error } = await supabaseAdmin
    .from('teams')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function removeTeam(teamId: string) {
  const { error } = await supabaseAdmin
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateAccessCode(code: string) {
  const { error } = await supabaseAdmin
    .from('game_config')
    .upsert({ key: 'access_code', value: `"${code}"`, updated_at: new Date().toISOString() })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function triggerTargetedEvent(eventData: any, effectsData: any) {
  const { title, description, event_type, scope, city_id, team_id, duration } = eventData

  // 1. Create the event record
  const { data: eventRecord, error: eventError } = await supabaseAdmin
    .from('events')
    .insert({
      title,
      description,
      event_type,
      scope,
      city_id: city_id || null,
      team_id: team_id || null,
      effects: effectsData,
      status: 'active',
      end_at: new Date(Date.now() + duration * 60000).toISOString()
    })
    .select()
    .single()

  if (eventError) return { success: false, error: eventError.message }

  // 2. Apply effects immediately
  let query = supabaseAdmin.from('teams').select('id, funds, city_id')
  
  if (scope === 'city' && city_id) {
    query = query.eq('city_id', city_id)
  } else if (scope === 'team' && team_id) {
    query = query.eq('id', team_id)
  }

  const { data: targetTeams } = await query

  if (targetTeams && targetTeams.length > 0) {
    for (const team of targetTeams) {
      // Apply funds adjustment
      if (effectsData.fund_change) {
        await supabaseAdmin
          .from('teams')
          .update({ funds: team.funds + (effectsData.fund_change || 0) })
          .eq('id', team.id)
      }
      
      // Apply stability adjustment
      if (effectsData.stability_change) {
        const { data: bld } = await supabaseAdmin.from('buildings').select('id, structural_stability').eq('team_id', team.id).single()
        if (bld) {
          const newStab = Math.min(100, Math.max(0, Number(bld.structural_stability) + effectsData.stability_change))
          await supabaseAdmin.from('buildings').update({ structural_stability: newStab }).eq('id', bld.id)
        }
      }

      // Apply resource deduction
      if (effectsData.resource_slug && effectsData.resource_change) {
        const { data: res } = await supabaseAdmin.from('resources').select('id').eq('slug', effectsData.resource_slug).single()
        if (res) {
          const { data: inv } = await supabaseAdmin.from('team_inventory').select('quantity').eq('team_id', team.id).eq('resource_id', res.id).single()
          if (inv) {
            const newQty = Math.max(0, Number(inv.quantity) + effectsData.resource_change)
            await supabaseAdmin.from('team_inventory').update({ quantity: newQty }).eq('team_id', team.id).eq('resource_id', res.id)
          }
        }
      }
    }
  }

  return { success: true }
}

export async function createGame(title: string) {
  // Generate random 6 char alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let accessCode = ''
  for (let i = 0; i < 6; i++) {
    accessCode += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // Mark all existing games as finished
  await supabaseAdmin.from('games').update({ status: 'finished' }).eq('status', 'active')

  // Create new game
  const { data, error } = await supabaseAdmin
    .from('games')
    .insert({ title, access_code: accessCode, status: 'active' })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, game: data }
}

export async function joinGame(accessCode: string, teamId: string) {
  // Check active game
  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select('id, access_code')
    .eq('status', 'active')
    .single()

  if (gameError || !game) {
    return { success: false, error: 'No active game found.' }
  }

  if (game.access_code.toUpperCase() !== accessCode.toUpperCase()) {
    return { success: false, error: 'Invalid access code.' }
  }

  // Add to team_games
  const { error } = await supabaseAdmin
    .from('team_games')
    .insert({ team_id: teamId, game_id: game.id })

  if (error) {
    if (error.code === '23505') { // unique violation
      return { success: true } // Already joined
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteGame(gameId: string) {
  const { error } = await supabaseAdmin
    .from('games')
    .delete()
    .eq('id', gameId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
