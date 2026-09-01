'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) as any

export async function claimChallengeSlotAction(teamId: string, challengeId: string) {
  if (!teamId || !challengeId) {
    return { success: false, error: 'Invalid team or challenge.' }
  }

  // Fetch challenge
  const { data: ch, error: chErr } = await supabaseAdmin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (chErr || !ch) {
    return { success: false, error: 'Challenge not found.' }
  }

  if (ch.status !== 'active') {
    return { success: false, error: `Challenge is ${ch.status}.` }
  }

  // Check if team already claimed
  const { data: existing } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, status')
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)
    .single()

  if (existing) {
    return { success: true, alreadyClaimed: true }
  }

  if (ch.claimed_slots >= ch.max_slots) {
    return { success: false, error: 'All slots for this challenge are taken!' }
  }

  // Insert participant
  const { error: partErr } = await supabaseAdmin
    .from('challenge_participants')
    .insert({
      challenge_id: challengeId,
      team_id: teamId,
      status: 'claimed'
    })

  if (partErr) {
    return { success: false, error: partErr.message }
  }

  // Increment claimed slots
  await supabaseAdmin
    .from('challenges')
    .update({ claimed_slots: ch.claimed_slots + 1 })
    .eq('id', challengeId)

  return { success: true, alreadyClaimed: false }
}

export async function evaluateAndCloseQuiz(challengeId: string) {
  const { data: ch } = await supabaseAdmin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (!ch) return { success: false, error: 'Challenge not found.' }
  if (ch.status === 'closed') return { success: true, alreadyClosed: true }

  // Fetch all responses
  const { data: responses } = await supabaseAdmin
    .from('quiz_responses')
    .select('*, team:teams(id, name, funds)')
    .eq('challenge_id', challengeId)

  if (!responses || responses.length === 0) {
    // If no responses, just close
    await supabaseAdmin.from('challenges').update({ status: 'closed' }).eq('id', challengeId)
    return { success: true, closedWithNoResponses: true }
  }

  // Sort by score DESC, then time_taken_secs ASC
  const sorted = [...responses].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.time_taken_secs || 9999) - (b.time_taken_secs || 9999)
  })

  const topResponse = sorted[0]
  // Find all tied top scorers
  const winners = sorted.filter(r => r.score === topResponse.score && r.time_taken_secs === topResponse.time_taken_secs)
  const winnerTeamIds = new Set(winners.map(w => w.team_id))

  const rewardPerWinner = Math.round((ch.reward_funds || 0) / winners.length)

  // Award winners
  for (const win of winners) {
    const team = win.team
    if (team && rewardPerWinner > 0) {
      const newFunds = team.funds + rewardPerWinner
      await supabaseAdmin.from('teams').update({ funds: newFunds }).eq('id', team.id)

      await supabaseAdmin.from('transactions').insert({
        team_id: team.id,
        type: 'challenge_reward',
        amount: rewardPerWinner,
        metadata: { challenge_id: challengeId, challenge_title: ch.title, score: win.score, time_taken_secs: win.time_taken_secs }
      })

      await supabaseAdmin.from('notifications').insert({
        team_id: team.id,
        title: '🏆 QUIZ CHALLENGE WON!',
        message: `Congratulations! Your team WON the "${ch.title}" quiz challenge with a top score of ${win.score}/5 in ${win.time_taken_secs}s! ₹${rewardPerWinner.toLocaleString('en-IN')} has been deposited to your account.`,
        notif_type: 'success'
      })
    }

    // Update participant status
    await supabaseAdmin
      .from('challenge_participants')
      .update({ status: 'success' })
      .eq('challenge_id', challengeId)
      .eq('team_id', win.team_id)
  }

  // Non-winners
  const nonWinners = sorted.filter(r => !winnerTeamIds.has(r.team_id))
  for (const nw of nonWinners) {
    await supabaseAdmin.from('notifications').insert({
      team_id: nw.team_id,
      title: 'Quiz Challenge Concluded',
      message: `The quiz challenge "${ch.title}" has concluded. You scored ${nw.score}/5 in ${nw.time_taken_secs}s. Top winner: ${topResponse.team?.name || 'Another team'} (${topResponse.score}/5).`,
      notif_type: 'info'
    })

    await supabaseAdmin
      .from('challenge_participants')
      .update({ status: 'failed' })
      .eq('challenge_id', challengeId)
      .eq('team_id', nw.team_id)
  }

  // Close the challenge
  await supabaseAdmin.from('challenges').update({ status: 'closed' }).eq('id', challengeId)

  return { success: true, winners: winners.map(w => ({ teamId: w.team_id, name: w.team?.name, score: w.score, time: w.time_taken_secs })) }
}

export async function submitQuizResponseAction(
  challengeId: string,
  teamId: string,
  answers: Record<number, string>,
  score: number,
  timeTakenSecs: number
) {
  if (!challengeId || !teamId) {
    return { success: false, error: 'Missing parameters.' }
  }

  // 1. Fetch challenge
  const { data: ch, error: chErr } = await supabaseAdmin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (chErr || !ch) {
    return { success: false, error: 'Challenge not found.' }
  }

  // 2. Ensure slot is recorded in participants
  const { data: participant } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, status, completed_at')
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)
    .single()

  if (!participant) {
    // If not claimed yet, claim now if slots available
    if (ch.claimed_slots < ch.max_slots) {
      await supabaseAdmin.from('challenge_participants').insert({
        challenge_id: challengeId,
        team_id: teamId,
        status: 'claimed'
      })
      await supabaseAdmin.from('challenges').update({ claimed_slots: ch.claimed_slots + 1 }).eq('id', challengeId)
    }
  }

  // 3. Insert quiz response
  const { error: insErr } = await supabaseAdmin.from('quiz_responses').insert({
    team_id: teamId,
    challenge_id: challengeId,
    answers: answers,
    score: score,
    time_taken_secs: timeTakenSecs
  })

  if (insErr) {
    return { success: false, error: insErr.message }
  }

  // 4. Mark participant completed
  await supabaseAdmin
    .from('challenge_participants')
    .update({ completed_at: new Date().toISOString() })
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)

  // 5. Check if all teams who claimed a spot have answered
  const { data: allParticipants } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, team_id, completed_at')
    .eq('challenge_id', challengeId)

  const claimedCount = allParticipants?.length || 0
  const completedCount = allParticipants?.filter((p: any) => p.completed_at !== null).length || 0

  let challengeConcluded = false
  let evaluationResult = null

  if (claimedCount > 0 && completedCount >= claimedCount) {
    // All claimed teams answered! Conclude immediately and transfer funds!
    challengeConcluded = true
    evaluationResult = await evaluateAndCloseQuiz(challengeId)
  }

  return {
    success: true,
    claimedCount,
    completedCount,
    challengeConcluded,
    evaluationResult
  }
}
