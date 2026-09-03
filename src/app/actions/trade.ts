'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) as any

/**
 * Safely adjusts quantity for a team's inventory row.
 * Handles existing rows vs. missing rows without violating PostgreSQL unique constraints.
 */
async function adjustInventory(teamId: string, resourceId: string, deltaQty: number) {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('team_inventory')
    .select('id, quantity')
    .eq('team_id', teamId)
    .eq('resource_id', resourceId)
    .maybeSingle()

  if (fetchErr) {
    console.error(`Fetch inventory error (team ${teamId}, res ${resourceId}):`, fetchErr)
    throw new Error(`Inventory check failed: ${fetchErr.message}`)
  }

  if (existing) {
    const currentQty = Number(existing.quantity) || 0
    const newQty = Math.max(0, currentQty + deltaQty)
    const { error: updErr } = await supabaseAdmin
      .from('team_inventory')
      .update({ quantity: newQty })
      .eq('id', existing.id)

    if (updErr) {
      console.error(`Update inventory error (id ${existing.id}):`, updErr)
      throw new Error(`Inventory update failed: ${updErr.message}`)
    }
  } else {
    const newQty = Math.max(0, deltaQty)
    const { error: insErr } = await supabaseAdmin
      .from('team_inventory')
      .insert({ team_id: teamId, resource_id: resourceId, quantity: newQty })

    if (insErr) {
      console.error(`Insert inventory error (team ${teamId}, res ${resourceId}):`, insErr)
      throw new Error(`Inventory creation failed: ${insErr.message}`)
    }
  }
}

/**
 * Recalculates team score after fund change.
 */
async function recalculateTeamScore(teamId: string) {
  try {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabaseAdmin.from('buildings').select('height, building_value, structural_stability, sustainability_score').eq('team_id', teamId).maybeSingle(),
      supabaseAdmin.from('teams').select('funds').eq('id', teamId).maybeSingle()
    ])

    if (t) {
      const height = Number(b?.height) || 0
      const bValue = Number(b?.building_value) || 0
      const stability = Number(b?.structural_stability) || 100
      const sustainability = Number(b?.sustainability_score) || 0
      const funds = Number(t.funds) || 0

      const score = (height * 0.25) + ((bValue / 1000) * 0.25) + (stability * 0.20) + (sustainability * 0.15) + ((funds / 10000) * 0.15)
      await supabaseAdmin.from('teams').update({ score }).eq('id', teamId)
    }
  } catch (e) {
    console.error(`Failed to recalculate score for team ${teamId}:`, e)
  }
}

/**
 * Creates a trade offer with server-side balance & inventory validation.
 */
export async function createTradeOfferAction(
  fromTeamId: string,
  toTeamId: string,
  offerFunds: number,
  requestFunds: number,
  offerRes: Record<string, number>,
  requestRes: Record<string, number>,
  message?: string
) {
  if (!fromTeamId || !toTeamId) {
    return { success: false, error: 'Select both teams for the trade.' }
  }
  if (fromTeamId === toTeamId) {
    return { success: false, error: 'Cannot trade with your own team.' }
  }

  // Sanitize funds
  const cleanOfferFunds = Math.max(0, Number(offerFunds) || 0)
  const cleanRequestFunds = Math.max(0, Number(requestFunds) || 0)

  // Sanitize resources (keep only > 0)
  const cleanOfferRes: Record<string, number> = {}
  for (const [k, v] of Object.entries(offerRes || {})) {
    const n = Math.floor(Number(v) || 0)
    if (n > 0) cleanOfferRes[k] = n
  }

  const cleanRequestRes: Record<string, number> = {}
  for (const [k, v] of Object.entries(requestRes || {})) {
    const n = Math.floor(Number(v) || 0)
    if (n > 0) cleanRequestRes[k] = n
  }

  // Must offer or request something
  const hasOffer = cleanOfferFunds > 0 || Object.keys(cleanOfferRes).length > 0
  const hasRequest = cleanRequestFunds > 0 || Object.keys(cleanRequestRes).length > 0
  if (!hasOffer && !hasRequest) {
    return { success: false, error: 'Trade must include at least one fund or material offer/request.' }
  }

  // Check sender funds
  const { data: senderTeam } = await supabaseAdmin
    .from('teams')
    .select('id, name, funds')
    .eq('id', fromTeamId)
    .single()

  if (!senderTeam) return { success: false, error: 'Sender team not found.' }
  if (senderTeam.funds < cleanOfferFunds) {
    return {
      success: false,
      error: `Insufficient funds. You have ₹${senderTeam.funds.toLocaleString('en-IN')}, cannot offer ₹${cleanOfferFunds.toLocaleString('en-IN')}.`
    }
  }

  // Check sender inventory
  const { data: allResources } = await supabaseAdmin.from('resources').select('id, slug, name')
  const resMap: Record<string, { id: string; name: string }> = {}
  allResources?.forEach((r: any) => { resMap[r.slug] = { id: r.id, name: r.name } })

  for (const [slug, qty] of Object.entries(cleanOfferRes)) {
    const rMeta = resMap[slug]
    if (!rMeta) continue
    const { data: inv } = await supabaseAdmin
      .from('team_inventory')
      .select('quantity')
      .eq('team_id', fromTeamId)
      .eq('resource_id', rMeta.id)
      .maybeSingle()

    const currentQty = inv ? Number(inv.quantity) : 0
    if (currentQty < qty) {
      return {
        success: false,
        error: `Insufficient ${rMeta.name}. You only have ${currentQty} units (trying to offer ${qty}).`
      }
    }
  }

  // Insert trade offer
  const { data: newTrade, error: insertErr } = await supabaseAdmin
    .from('trades')
    .insert({
      from_team_id: fromTeamId,
      to_team_id: toTeamId,
      offer_funds: cleanOfferFunds,
      request_funds: cleanRequestFunds,
      offer_resources: cleanOfferRes,
      request_resources: cleanRequestRes,
      message: message || '',
      status: 'pending'
    })
    .select()
    .single()

  if (insertErr || !newTrade) {
    return { success: false, error: insertErr?.message || 'Failed to send trade offer.' }
  }

  // Notify recipient team
  await supabaseAdmin.from('notifications').insert({
    team_id: toTeamId,
    title: '📨 New Trade Offer Received!',
    message: `${senderTeam.name} proposed a trade deal with your team. Review it on the Trading Center!`,
    notif_type: 'info'
  })

  return { success: true, trade: newTrade }
}

/**
 * Responds to a trade offer (accept or reject).
 * Atomically transfers funds and materials between both teams upon acceptance.
 */
export async function respondTradeAction(tradeId: string, respondingTeamId: string, accept: boolean) {
  if (!tradeId || !respondingTeamId) {
    return { success: false, error: 'Invalid parameters.' }
  }

  // 1. Fetch trade
  const { data: trade, error: tradeErr } = await supabaseAdmin
    .from('trades')
    .select('*, from_team:teams!from_team_id(id, name, funds), to_team:teams!to_team_id(id, name, funds)')
    .eq('id', tradeId)
    .single()

  if (tradeErr || !trade) {
    return { success: false, error: 'Trade offer not found.' }
  }

  if (trade.status !== 'pending') {
    return { success: false, error: `This trade is already ${trade.status}.` }
  }

  if (trade.to_team_id !== respondingTeamId) {
    return { success: false, error: 'Unauthorized to respond to this trade.' }
  }

  // If rejecting
  if (!accept) {
    await supabaseAdmin
      .from('trades')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', tradeId)

    await supabaseAdmin.from('notifications').insert({
      team_id: trade.from_team_id,
      title: '❌ Trade Declined',
      message: `${trade.to_team?.name || 'The team'} declined your trade offer.`,
      notif_type: 'warning'
    })

    return { success: true, message: 'Trade declined.' }
  }

  // If accepting, validate balances
  const offerFunds = Number(trade.offer_funds) || 0
  const requestFunds = Number(trade.request_funds) || 0
  const offerRes: Record<string, number> = trade.offer_resources || {}
  const requestRes: Record<string, number> = trade.request_resources || {}

  const fromTeam = trade.from_team
  const toTeam = trade.to_team

  if (fromTeam.funds < offerFunds) {
    return { success: false, error: `${fromTeam.name} no longer has enough funds (₹${fromTeam.funds.toLocaleString('en-IN')}) to fulfill the offer of ₹${offerFunds.toLocaleString('en-IN')}.` }
  }

  if (toTeam.funds < requestFunds) {
    return { success: false, error: `Your team does not have enough funds (₹${toTeam.funds.toLocaleString('en-IN')}) to pay the requested ₹${requestFunds.toLocaleString('en-IN')}.` }
  }

  // Get resources mapping
  const { data: allResources } = await supabaseAdmin.from('resources').select('id, slug, name')
  const resMap: Record<string, { id: string; name: string }> = {}
  allResources?.forEach((r: any) => { resMap[r.slug] = { id: r.id, name: r.name } })

  // Check from_team inventory
  for (const [slug, rawQty] of Object.entries(offerRes)) {
    const qty = Number(rawQty)
    if (qty > 0) {
      const resMeta = resMap[slug]
      if (!resMeta) continue
      const { data: inv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.from_team_id)
        .eq('resource_id', resMeta.id)
        .maybeSingle()

      const currentQty = inv ? Number(inv.quantity) : 0
      if (currentQty < qty) {
        return { success: false, error: `${fromTeam.name} no longer has enough ${resMeta.name} (${currentQty}/${qty}) to complete this trade.` }
      }
    }
  }

  // Check to_team inventory
  for (const [slug, rawQty] of Object.entries(requestRes)) {
    const qty = Number(rawQty)
    if (qty > 0) {
      const resMeta = resMap[slug]
      if (!resMeta) continue
      const { data: inv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.to_team_id)
        .eq('resource_id', resMeta.id)
        .maybeSingle()

      const currentQty = inv ? Number(inv.quantity) : 0
      if (currentQty < qty) {
        return { success: false, error: `Your team does not have enough ${resMeta.name} (${currentQty}/${qty}) to fulfill the requested trade.` }
      }
    }
  }

  try {
    // 1. Execute transfer: Offer Resources (from_team -> to_team)
    for (const [slug, rawQty] of Object.entries(offerRes)) {
      const qty = Number(rawQty)
      if (qty > 0) {
        const resMeta = resMap[slug]
        if (resMeta) {
          // Deduct from sender
          await adjustInventory(trade.from_team_id, resMeta.id, -qty)
          // Add to receiver
          await adjustInventory(trade.to_team_id, resMeta.id, qty)
        }
      }
    }

    // 2. Execute transfer: Request Resources (to_team -> from_team)
    for (const [slug, rawQty] of Object.entries(requestRes)) {
      const qty = Number(rawQty)
      if (qty > 0) {
        const resMeta = resMap[slug]
        if (resMeta) {
          // Deduct from receiver
          await adjustInventory(trade.to_team_id, resMeta.id, -qty)
          // Add to sender
          await adjustInventory(trade.from_team_id, resMeta.id, qty)
        }
      }
    }

    // 3. Execute transfer: Funds
    const newFromFunds = fromTeam.funds - offerFunds + requestFunds
    const newToFunds = toTeam.funds - requestFunds + offerFunds

    await supabaseAdmin.from('teams').update({ funds: newFromFunds }).eq('id', trade.from_team_id)
    await supabaseAdmin.from('teams').update({ funds: newToFunds }).eq('id', trade.to_team_id)

    // Recalculate scores for both teams
    await Promise.all([
      recalculateTeamScore(trade.from_team_id),
      recalculateTeamScore(trade.to_team_id)
    ])

    // 4. Update trade status
    await supabaseAdmin
      .from('trades')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', tradeId)

    // 5. Log transactions
    await supabaseAdmin.from('transactions').insert([
      {
        team_id: trade.from_team_id,
        type: 'trade_executed',
        amount: requestFunds - offerFunds,
        metadata: { partner_team: toTeam.name, trade_id: tradeId, offerRes, requestRes }
      },
      {
        team_id: trade.to_team_id,
        type: 'trade_executed',
        amount: offerFunds - requestFunds,
        metadata: { partner_team: fromTeam.name, trade_id: tradeId, offerRes, requestRes }
      }
    ])

    // 6. Notifications
    await supabaseAdmin.from('notifications').insert([
      {
        team_id: trade.from_team_id,
        title: '🤝 Trade Deal Completed!',
        message: `${toTeam.name} accepted your trade offer. All funds & materials have been transferred!`,
        notif_type: 'success'
      },
      {
        team_id: trade.to_team_id,
        title: '🤝 Trade Deal Completed!',
        message: `You accepted the trade with ${fromTeam.name}. All funds & materials have been transferred!`,
        notif_type: 'success'
      }
    ])

    return { success: true, message: 'Trade executed successfully! Funds and materials transferred.' }
  } catch (err: any) {
    console.error('Trade execution fatal error:', err)
    return { success: false, error: err.message || 'An error occurred while transferring trade materials.' }
  }
}
