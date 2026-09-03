'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import { calculateTeamScore } from '@/lib/constants/scoring'

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

import { EVENT_PRESETS } from '@/lib/constants/events'


export async function expireEvent(eventId: string) {
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) return { success: false, error: fetchError?.message || 'Event not found' }

  const effects = event.effects as any

  // Restore price multipliers
  if (effects?.price_effects) {
    await restoreMarketPrices(effects.price_effects)
  }

  // Restore steel stock if emptied
  if (effects?.steel_stock_zero) {
    const { data: steelRes } = await supabaseAdmin.from('resources').select('id').eq('slug', 'steel').single()
    if (steelRes) {
      await supabaseAdmin.from('market_prices').update({ stock: 1000 }).eq('resource_id', steelRes.id)
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ status: 'expired' })
    .eq('id', eventId)

  if (updateError) return { success: false, error: updateError.message }

  // Broadcast recovery notification
  const { data: allTeams } = await supabaseAdmin.from('teams').select('id')
  if (allTeams && allTeams.length > 0) {
    const notifs = allTeams.map((t: any) => ({
      team_id: t.id,
      title: '🟢 Event Concluded',
      message: `The event "${event.title}" has ended. Market and construction operations are back to normal!`,
      notif_type: 'info'
    }))
    await supabaseAdmin.from('notifications').insert(notifs)
  }

  return { success: true }
}

export async function triggerPresetEvent(presetId: string) {
  const preset = EVENT_PRESETS.find(p => p.id === presetId)
  if (!preset) return { success: false, error: 'Preset not found' }

  // Check if an event with this title is already active
  const { data: activeExisting } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('title', preset.title)
    .eq('status', 'active')
    .single()

  if (activeExisting) {
    return { success: false, error: `"${preset.title}" is already active!` }
  }

  const endAt = new Date(Date.now() + preset.duration * 60000).toISOString()

  // 1. Insert Event
  const { data: eventRecord, error: evErr } = await supabaseAdmin
    .from('events')
    .insert({
      title: preset.title,
      description: preset.desc,
      event_type: preset.type,
      scope: 'global',
      effects: { ...preset.effects, preset_id: preset.id, effectSummary: preset.effectSummary },
      status: 'active',
      end_at: endAt
    })
    .select()
    .single()

  if (evErr) return { success: false, error: evErr.message }

  // 2. Apply price multipliers
  if (preset.effects.price_effects) {
    await applyMarketPriceEffects(preset.effects.price_effects)
  }

  // 3. If steel stock zero
  if (preset.effects.steel_stock_zero) {
    const { data: steelRes } = await supabaseAdmin.from('resources').select('id').eq('slug', 'steel').single()
    if (steelRes) {
      await supabaseAdmin.from('market_prices').update({ stock: 0 }).eq('resource_id', steelRes.id)
    }
  }

  // 4. If stability change
  if (preset.effects.stability_change) {
    const { data: blds } = await supabaseAdmin.from('buildings').select('id, structural_stability')
    if (blds) {
      for (const b of blds) {
        const newStab = Math.max(0, Number(b.structural_stability) + preset.effects.stability_change)
        await supabaseAdmin.from('buildings').update({ structural_stability: newStab }).eq('id', b.id)
      }
    }
  }

  // 5. If inventory pct cut (e.g. 10% cement washed away)
  if (preset.effects.inventory_pct_cut) {
    for (const [slug, pct] of Object.entries(preset.effects.inventory_pct_cut)) {
      const { data: res } = await supabaseAdmin.from('resources').select('id').eq('slug', slug).single()
      if (res) {
        const { data: invs } = await supabaseAdmin.from('team_inventory').select('id, quantity').eq('resource_id', res.id)
        if (invs) {
          for (const inv of invs) {
            const cut = Math.floor(Number(inv.quantity) * (pct as number))
            const newQty = Math.max(0, Number(inv.quantity) - cut)
            await supabaseAdmin.from('team_inventory').update({ quantity: newQty }).eq('id', inv.id)
          }
        }
      }
    }
  }

  // 6. If fund change (fine)
  if (preset.effects.fund_change) {
    const { data: teams } = await supabaseAdmin.from('teams').select('id, funds')
    if (teams) {
      for (const t of teams) {
        const newF = Math.max(0, Number(t.funds) + preset.effects.fund_change)
        await supabaseAdmin.from('teams').update({ funds: newF }).eq('id', t.id)
      }
    }
  }

  // 7. If heatwave sustainability drop
  if (preset.effects.heatwave_sustainability_drop) {
    const { data: blds } = await supabaseAdmin.from('buildings').select('id, sustainability_score')
    if (blds) {
      for (const b of blds) {
        if (Number(b.sustainability_score) < 50) {
          const newSust = Math.max(0, Number(b.sustainability_score) - 5)
          await supabaseAdmin.from('buildings').update({ sustainability_score: newSust }).eq('id', b.id)
        }
      }
    }
  }

  // 8. Notify all teams
  const { data: allTeams } = await supabaseAdmin.from('teams').select('id')
  if (allTeams && allTeams.length > 0) {
    const notifs = allTeams.map((t: any) => ({
      team_id: t.id,
      title: `🚨 ${preset.title} Triggered!`,
      message: `${preset.desc} Effect: ${preset.effectSummary} (Duration: ${preset.duration}m)`,
      notif_type: 'disaster'
    }))
    await supabaseAdmin.from('notifications').insert(notifs)
  }

  return { success: true, event: eventRecord }
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

export async function createGame(title: string, durationMinutes: number = 30) {
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

  const endAt = new Date(Date.now() + durationMinutes * 60000).toISOString()

  // Create the new game
  const { data, error } = await supabaseAdmin
    .from('games')
    .insert({ 
      title, 
      access_code: accessCode, 
      status: 'active',
      duration_minutes: durationMinutes,
      end_at: endAt
    })
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

export async function deleteChallenge(challengeId: string) {
  const { error } = await supabaseAdmin
    .from('challenges')
    .delete()
    .eq('id', challengeId)

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

export async function adjustTeamFunds(teamId: string, amount: number) {
  if (!teamId || amount === 0) return { success: false, error: 'Invalid team or amount' }
  const { data: team, error: fetchErr } = await supabaseAdmin
    .from('teams')
    .select('id, name, funds')
    .eq('id', teamId)
    .single()

  if (fetchErr || !team) return { success: false, error: fetchErr?.message || 'Team not found' }

  const newFunds = team.funds + amount
  const { error: updateErr } = await supabaseAdmin
    .from('teams')
    .update({ funds: newFunds })
    .eq('id', teamId)

  if (updateErr) return { success: false, error: updateErr.message }

  // Log transaction
  await supabaseAdmin.from('transactions').insert({
    team_id: teamId,
    type: 'admin_adjustment',
    amount: amount,
    metadata: { reason: 'Admin manual adjustment', previous_funds: team.funds, new_funds: newFunds }
  })

  // Notify team
  await supabaseAdmin.from('notifications').insert({
    team_id: teamId,
    title: '💰 Funds Adjusted by Admin',
    message: `Your balance was adjusted by ${amount >= 0 ? '+' : ''}₹${amount.toLocaleString('en-IN')}. Current balance: ₹${newFunds.toLocaleString('en-IN')}.`,
    notif_type: amount >= 0 ? 'success' : 'warning'
  })

  return { success: true, newFunds }
}

export async function updateMarketPrice(resourceId: string, price: number) {
  const { error } = await supabaseAdmin
    .from('market_prices')
    .update({ current_price: Math.max(0, price), updated_at: new Date().toISOString() })
    .eq('resource_id', resourceId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateMarketStock(resourceId: string, stock: number) {
  const { error } = await supabaseAdmin
    .from('market_prices')
    .update({ stock: Math.max(0, stock), updated_at: new Date().toISOString() })
    .eq('resource_id', resourceId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function activateChallenge(challengeId: string) {
  const { data: ch } = await supabaseAdmin
    .from('challenges')
    .select('duration_minutes')
    .eq('id', challengeId)
    .single()

  const duration = ch?.duration_minutes || 5
  const expiresAt = new Date(Date.now() + duration * 60000).toISOString()

  const { error } = await supabaseAdmin
    .from('challenges')
    .update({ status: 'active', expires_at: expiresAt })
    .eq('id', challengeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function closeChallenge(challengeId: string) {
  const { error } = await supabaseAdmin
    .from('challenges')
    .update({ status: 'closed' })
    .eq('id', challengeId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function approveChallenge(participantId: string, teamId: string, challengeId: string, success: boolean) {
  const { data: ch } = await supabaseAdmin
    .from('challenges')
    .select('title, reward_funds, penalty_funds')
    .eq('id', challengeId)
    .single()

  const { error: partErr } = await supabaseAdmin
    .from('challenge_participants')
    .update({
      status: success ? 'success' : 'failed',
      completed_at: new Date().toISOString()
    })
    .eq('id', participantId)

  if (partErr) return { success: false, error: partErr.message }

  if (ch) {
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('funds, name')
      .eq('id', teamId)
      .single()

    if (team) {
      const fundChange = success ? (ch.reward_funds || 0) : -(ch.penalty_funds || 0)
      if (fundChange !== 0) {
        await supabaseAdmin
          .from('teams')
          .update({ funds: team.funds + fundChange })
          .eq('id', teamId)

        await supabaseAdmin.from('transactions').insert({
          team_id: teamId,
          type: success ? 'challenge_reward' : 'challenge_penalty',
          amount: fundChange,
          metadata: { challenge_id: challengeId, challenge_title: ch.title }
        })

        await supabaseAdmin.from('notifications').insert({
          team_id: teamId,
          title: success ? '🏆 Challenge Reward Awarded!' : '⚠️ Challenge Penalty Incurred',
          message: success 
            ? `Your team won the "${ch.title}" challenge! +₹${ch.reward_funds.toLocaleString('en-IN')} deposited.`
            : `Challenge "${ch.title}" failed. -₹${ch.penalty_funds.toLocaleString('en-IN')} deducted.`,
          notif_type: success ? 'success' : 'warning'
        })
      }
    }
  }

  return { success: true }
}

export async function getAdminChallengesDataAction() {
  const [chRes, partsRes, quizRes] = await Promise.all([
    supabaseAdmin.from('challenges').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('challenge_participants').select('*, team:teams(id, name, funds, city_id)').order('claimed_at', { ascending: true }),
    supabaseAdmin.from('quiz_responses').select('*, team:teams(id, name)').order('created_at', { ascending: false })
  ])

  return {
    success: true,
    challenges: chRes.data || [],
    participants: partsRes.data || [],
    quizResponses: quizRes.data || []
  }
}

export async function removeParticipantFromSlotAction(participantId: string, challengeId: string) {
  const { error } = await supabaseAdmin
    .from('challenge_participants')
    .delete()
    .eq('id', participantId)

  if (error) return { success: false, error: error.message }

  const { data: ch } = await supabaseAdmin
    .from('challenges')
    .select('claimed_slots')
    .eq('id', challengeId)
    .single()

  if (ch && ch.claimed_slots > 0) {
    await supabaseAdmin
      .from('challenges')
      .update({ claimed_slots: ch.claimed_slots - 1 })
      .eq('id', challengeId)
  }

  return { success: true }
}

export async function syncTeamScoreAction(teamId: string) {
  if (!teamId) return { success: false }
  try {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabaseAdmin.from('buildings').select('height, building_value, sustainability_score').eq('team_id', teamId).maybeSingle(),
      supabaseAdmin.from('teams').select('funds').eq('id', teamId).maybeSingle()
    ])
    if (t) {
      const score = calculateTeamScore(b, t.funds)
      await supabaseAdmin.from('teams').update({ score }).eq('id', teamId)
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function syncAllTeamScoresAction() {
  try {
    const [{ data: teams }, { data: buildings }] = await Promise.all([
      supabaseAdmin.from('teams').select('id, funds'),
      supabaseAdmin.from('buildings').select('team_id, height, building_value, sustainability_score')
    ])

    const buildMap = new Map((buildings || []).map((b: any) => [b.team_id, b]))

    for (const t of (teams || [])) {
      const b = buildMap.get(t.id)
      const score = calculateTeamScore(b, t.funds)
      await supabaseAdmin.from('teams').update({ score }).eq('id', t.id)
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

