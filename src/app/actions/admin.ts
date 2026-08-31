'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

// Admin client — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) as any

export async function resetGame() {
  const { error } = await supabaseAdmin
    .from('teams')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

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

async function applyMarketPriceEffects(priceEffects: Record<string, number>) {
  for (const [slug, multiplier] of Object.entries(priceEffects)) {
    const { data: res } = await supabaseAdmin.from('resources').select('id').eq('slug', slug).single()
    if (res) {
      const { data: marketPrice } = await supabaseAdmin.from('market_prices').select('current_price').eq('resource_id', res.id).single()
      if (marketPrice) {
        const newPrice = Number(marketPrice.current_price) * multiplier
        await supabaseAdmin.from('market_prices').update({ current_price: newPrice }).eq('resource_id', res.id)
      }
    }
  }
}

async function restoreMarketPrices(priceEffects: Record<string, number>) {
  for (const [slug, multiplier] of Object.entries(priceEffects)) {
    const { data: res } = await supabaseAdmin.from('resources').select('id').eq('slug', slug).single()
    if (res) {
      const { data: marketPrice } = await supabaseAdmin.from('market_prices').select('current_price').eq('resource_id', res.id).single()
      if (marketPrice) {
        const newPrice = Number(marketPrice.current_price) / multiplier
        await supabaseAdmin.from('market_prices').update({ current_price: newPrice }).eq('resource_id', res.id)
      }
    }
  }
}

export async function expireEvent(eventId: string) {
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('effects')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) return { success: false, error: fetchError?.message || 'Event not found' }

  const effects = event.effects as any
  if (effects?.price_effects) {
    await restoreMarketPrices(effects.price_effects)
  }

  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ status: 'expired' })
    .eq('id', eventId)

  if (updateError) return { success: false, error: updateError.message }
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

  // 2. Apply market price effects if any
  if (effectsData.price_effects) {
    await applyMarketPriceEffects(effectsData.price_effects)
  }

  // 3. Apply targeted effects
  let query = supabaseAdmin.from('teams').select('id, funds, city_id')
  
  if (scope === 'city' && city_id) {
    query = query.eq('city_id', city_id)
  } else if (scope === 'team' && team_id) {
    query = query.eq('id', team_id)
  }

  const { data: targetTeams } = await query

  if (targetTeams && targetTeams.length > 0) {
    for (const team of targetTeams) {
      if (effectsData.fund_change) {
        await supabaseAdmin
          .from('teams')
          .update({ funds: team.funds + (effectsData.fund_change || 0) })
          .eq('id', team.id)
      }
      
      if (effectsData.stability_change) {
        const { data: bld } = await supabaseAdmin.from('buildings').select('id, structural_stability').eq('team_id', team.id).single()
        if (bld) {
          const newStab = Math.min(100, Math.max(0, Number(bld.structural_stability) + effectsData.stability_change))
          await supabaseAdmin.from('buildings').update({ structural_stability: newStab }).eq('id', bld.id)
        }
      }

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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let accessCode = ''
  for (let i = 0; i < 6; i++) {
    accessCode += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // Mark previous games as finished
  await supabaseAdmin.from('games').update({ status: 'finished' }).eq('status', 'active')

  // Expire all active events from previous game
  await supabaseAdmin.from('events').update({ status: 'expired' }).eq('status', 'active')

  // Reset ALL market stock quantities to 1000 (prices stay as configured)
  await supabaseAdmin.from('market_prices').update({ stock: 1000 }).neq('id', '00000000-0000-0000-0000-000000000000')

  // Reset all team inventories: zero everything out, then set labours to 6
  const { data: allInventory } = await supabaseAdmin.from('team_inventory').select('id, resource_id')
  if (allInventory && allInventory.length > 0) {
    // Zero all
    await supabaseAdmin.from('team_inventory').update({ quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
    // Set labour back to 6
    const { data: labourResource } = await supabaseAdmin.from('resources').select('id').eq('slug', 'labour').single()
    if (labourResource) {
      await supabaseAdmin.from('team_inventory').update({ quantity: 6 }).eq('resource_id', labourResource.id)
    }
  }

  // Create the new game
  const { data, error } = await supabaseAdmin
    .from('games')
    .insert({ title, access_code: accessCode, status: 'active' })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, game: data }
}

export async function joinGame(accessCode: string, teamId: string) {
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

  const { error } = await supabaseAdmin
    .from('team_games')
    .insert({ team_id: teamId, game_id: game.id })

  if (error) {
    if (error.code === '23505') {
      return { success: true }
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

export async function createChallenge(data: any) {
  const expiresAt = new Date(Date.now() + (data.duration_minutes || 5) * 60000).toISOString()
  const { error } = await supabaseAdmin
    .from('challenges')
    .insert({
      title: data.title,
      description: data.description,
      challenge_type: data.challenge_type,
      reward_funds: data.reward_funds,
      penalty_funds: data.penalty_funds,
      max_slots: data.max_slots,
      duration_minutes: data.duration_minutes,
      status: 'active',
      expires_at: expiresAt
    })
  
  if (error) return { success: false, error: error.message }
  return { success: true }
}
