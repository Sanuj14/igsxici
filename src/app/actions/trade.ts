'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) as any

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
  for (const [slug, qty] of Object.entries(offerRes)) {
    if (qty > 0) {
      const resMeta = resMap[slug]
      if (!resMeta) continue
      const { data: inv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.from_team_id)
        .eq('resource_id', resMeta.id)
        .single()

      const currentQty = inv ? Number(inv.quantity) : 0
      if (currentQty < qty) {
        return { success: false, error: `${fromTeam.name} does not have enough ${resMeta.name} (${currentQty}/${qty}) to complete this trade.` }
      }
    }
  }

  // Check to_team inventory
  for (const [slug, qty] of Object.entries(requestRes)) {
    if (qty > 0) {
      const resMeta = resMap[slug]
      if (!resMeta) continue
      const { data: inv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.to_team_id)
        .eq('resource_id', resMeta.id)
        .single()

      const currentQty = inv ? Number(inv.quantity) : 0
      if (currentQty < qty) {
        return { success: false, error: `Your team does not have enough ${resMeta.name} (${currentQty}/${qty}) to fulfill the requested trade.` }
      }
    }
  }

  // Execute transfer: Funds
  const newFromFunds = fromTeam.funds - offerFunds + requestFunds
  const newToFunds = toTeam.funds - requestFunds + offerFunds

  await supabaseAdmin.from('teams').update({ funds: newFromFunds }).eq('id', trade.from_team_id)
  await supabaseAdmin.from('teams').update({ funds: newToFunds }).eq('id', trade.to_team_id)

  // Execute transfer: Offer Resources (from_team -> to_team)
  for (const [slug, qty] of Object.entries(offerRes)) {
    if (qty > 0) {
      const resMeta = resMap[slug]
      if (!resMeta) continue

      // Deduct from sender
      const { data: senderInv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.from_team_id)
        .eq('resource_id', resMeta.id)
        .single()
      const sQty = Math.max(0, (senderInv?.quantity || 0) - qty)
      await supabaseAdmin
        .from('team_inventory')
        .upsert({ team_id: trade.from_team_id, resource_id: resMeta.id, quantity: sQty })

      // Add to receiver
      const { data: recvInv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.to_team_id)
        .eq('resource_id', resMeta.id)
        .single()
      const rQty = (recvInv?.quantity || 0) + qty
      await supabaseAdmin
        .from('team_inventory')
        .upsert({ team_id: trade.to_team_id, resource_id: resMeta.id, quantity: rQty })
    }
  }

  // Execute transfer: Request Resources (to_team -> from_team)
  for (const [slug, qty] of Object.entries(requestRes)) {
    if (qty > 0) {
      const resMeta = resMap[slug]
      if (!resMeta) continue

      // Deduct from receiver
      const { data: recvInv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.to_team_id)
        .eq('resource_id', resMeta.id)
        .single()
      const rQty = Math.max(0, (recvInv?.quantity || 0) - qty)
      await supabaseAdmin
        .from('team_inventory')
        .upsert({ team_id: trade.to_team_id, resource_id: resMeta.id, quantity: rQty })

      // Add to sender
      const { data: senderInv } = await supabaseAdmin
        .from('team_inventory')
        .select('quantity')
        .eq('team_id', trade.from_team_id)
        .eq('resource_id', resMeta.id)
        .single()
      const sQty = (senderInv?.quantity || 0) + qty
      await supabaseAdmin
        .from('team_inventory')
        .upsert({ team_id: trade.from_team_id, resource_id: resMeta.id, quantity: sQty })
    }
  }

  // Update trade status
  await supabaseAdmin
    .from('trades')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', tradeId)

  // Log transactions
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

  // Notifications
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
      message: `You accepted trade with ${fromTeam.name}. All funds & materials have been transferred!`,
      notif_type: 'success'
    }
  ])

  return { success: true, message: 'Trade executed successfully! Funds and materials transferred.' }
}
