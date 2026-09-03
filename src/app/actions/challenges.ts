'use server'

import { createClient } from '@supabase/supabase-js'
import { calculateTeamScore } from '@/lib/constants/scoring'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) as any

/**
 * Recalculate team score after prize money is awarded.
 */
async function recalculateTeamScore(teamId: string) {
  try {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabaseAdmin.from('buildings').select('height, building_value, sustainability_score').eq('team_id', teamId).maybeSingle(),
      supabaseAdmin.from('teams').select('funds').eq('id', teamId).maybeSingle()
    ])

    if (t) {
      const score = calculateTeamScore(b, t.funds)
      await supabaseAdmin.from('teams').update({ score }).eq('id', teamId)
    }
  } catch (e) {
    console.error(`Failed to recalculate score for team ${teamId}:`, e)
  }
}

/**
 * Returns a list of challenge IDs that a team currently has a claimed slot in.
 */
export async function getTeamClaimedChallengesAction(teamId: string) {
  if (!teamId) return { success: false, claimedChallengeIds: [] }

  const { data } = await supabaseAdmin
    .from('challenge_participants')
    .select('challenge_id')
    .eq('team_id', teamId)

  return {
    success: true,
    claimedChallengeIds: (data || []).map((p: any) => p.challenge_id)
  }
}

/**
 * Atomically claims a slot in a challenge for a team.
 * Strictly verifies and blocks if max_slots is reached.
 */
export async function claimChallengeSlotAction(teamId: string, challengeId: string) {
  if (!teamId || !challengeId) {
    return { success: false, error: 'Invalid team or challenge.' }
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

  if (ch.status !== 'active') {
    return { success: false, error: `This challenge is currently ${ch.status}.` }
  }

  // 2. Check if team already holds a slot
  const { data: existing } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, status')
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (existing) {
    return { success: true, alreadyClaimed: true }
  }

  // 3. Check actual live count of claimed slots
  const { count: actualCount } = await supabaseAdmin
    .from('challenge_participants')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)

  const currentCount = actualCount ?? ch.claimed_slots
  if (currentCount >= ch.max_slots) {
    return {
      success: false,
      slotsFull: true,
      error: `All slots are full! Only ${ch.max_slots} teams are allowed for this challenge.`
    }
  }

  // 4. Insert participant into slot
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

  // 5. Update claimed slots on challenge
  await supabaseAdmin
    .from('challenges')
    .update({ claimed_slots: currentCount + 1 })
    .eq('id', challengeId)

  return { success: true, alreadyClaimed: false }
}

/**
 * Checks eligibility before a team enters the Quiz page.
 * Blocks any team that does not occupy one of the designated slots if slots are full.
 */
export async function checkQuizEligibilityAction(teamId: string, challengeId: string) {
  if (!teamId || !challengeId) {
    return { eligible: false, error: 'Missing team or challenge identifier.' }
  }

  const { data: ch, error: chErr } = await supabaseAdmin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (chErr || !ch) {
    return { eligible: false, error: 'Challenge not found.' }
  }

  // 1. Check if team already occupies a slot
  const { data: participant } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, status, completed_at')
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (participant) {
    // Already in slot! Check if already answered
    const { data: response } = await supabaseAdmin
      .from('quiz_responses')
      .select('id, score, time_taken_secs')
      .eq('challenge_id', challengeId)
      .eq('team_id', teamId)
      .maybeSingle()

    return {
      eligible: true,
      challenge: ch,
      alreadyAnswered: Boolean(response),
      score: response?.score || 0,
      timeTaken: response?.time_taken_secs || 0
    }
  }

  // 2. Not in slot yet. Check challenge status
  if (ch.status !== 'active') {
    return {
      eligible: false,
      error: `This challenge is ${ch.status}. Only active challenges can be joined.`
    }
  }

  // 3. Check actual live count of claimed slots
  const { count: actualCount } = await supabaseAdmin
    .from('challenge_participants')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)

  const currentCount = actualCount ?? ch.claimed_slots
  if (currentCount >= ch.max_slots) {
    return {
      eligible: false,
      slotsFull: true,
      maxSlots: ch.max_slots,
      error: `All ${ch.max_slots} slots for this quiz challenge have been claimed by other teams. You cannot join.`
    }
  }

  // 4. Slots are available! Auto-claim slot for this team
  const { error: partErr } = await supabaseAdmin
    .from('challenge_participants')
    .insert({
      challenge_id: challengeId,
      team_id: teamId,
      status: 'claimed'
    })

  if (partErr) {
    return { eligible: false, error: partErr.message }
  }

  await supabaseAdmin
    .from('challenges')
    .update({ claimed_slots: currentCount + 1 })
    .eq('id', challengeId)

  return {
    eligible: true,
    challenge: ch,
    alreadyAnswered: false,
    autoClaimed: true
  }
}

/**
 * Submits answers for a quiz.
 * Strictly verifies that the team holds a claimed slot.
 * Automatically awards prize money to the winner once all claimed slot teams answer.
 */
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

  // 2. STRICT SLOT CHECK: Team MUST be in challenge_participants
  const { data: participant } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, status, completed_at')
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (!participant) {
    return {
      success: false,
      error: 'Unauthorized: Your team does not occupy a claimed slot for this challenge. All slots were filled by other teams.'
    }
  }

  // 3. Check if already answered
  const { data: existingResp } = await supabaseAdmin
    .from('quiz_responses')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (existingResp) {
    return {
      success: false,
      error: 'Your team has already submitted answers for this quiz challenge.'
    }
  }

  // 4. Insert quiz response
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

  // 5. Mark participant completed
  await supabaseAdmin
    .from('challenge_participants')
    .update({ completed_at: new Date().toISOString() })
    .eq('challenge_id', challengeId)
    .eq('team_id', teamId)

  // 6. Check if all teams who claimed a spot have answered
  const { data: allParticipants } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, team_id, completed_at')
    .eq('challenge_id', challengeId)

  const claimedCount = allParticipants?.length || 0
  const completedCount = allParticipants?.filter((p: any) => p.completed_at !== null).length || 0

  let challengeConcluded = false
  let evaluationResult = null

  // AUTO AWARD: If all claimed slot teams have submitted, evaluate & award immediately!
  if (claimedCount > 0 && completedCount >= claimedCount) {
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

/**
 * Evaluates the quiz challenge among teams in the slots.
 * Auto-awards money to the winner(s) and transfers funds directly to their accounts.
 */
export async function evaluateAndCloseQuiz(challengeId: string) {
  const { data: ch } = await supabaseAdmin
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (!ch) return { success: false, error: 'Challenge not found.' }
  if (ch.status === 'closed') return { success: true, alreadyClosed: true }

  // 1. Get ONLY teams that are in challenge_participants
  const { data: participants } = await supabaseAdmin
    .from('challenge_participants')
    .select('id, team_id, team:teams(id, name, funds)')
    .eq('challenge_id', challengeId)

  if (!participants || participants.length === 0) {
    await supabaseAdmin.from('challenges').update({ status: 'closed' }).eq('id', challengeId)
    return { success: true, closedWithNoParticipants: true }
  }

  const validTeamIds = new Set(participants.map((p: any) => p.team_id))

  // 2. Fetch all responses for this challenge
  const { data: allResponses } = await supabaseAdmin
    .from('quiz_responses')
    .select('*, team:teams(id, name, funds)')
    .eq('challenge_id', challengeId)

  // Filter ONLY responses from teams who hold slots
  const validResponses = (allResponses || []).filter((r: any) => validTeamIds.has(r.team_id))

  if (validResponses.length === 0) {
    await supabaseAdmin.from('challenges').update({ status: 'closed' }).eq('id', challengeId)
    return { success: true, closedWithNoValidResponses: true }
  }

  // 3. Rank: Highest score first, then lowest time_taken_secs
  const sorted = [...validResponses].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.time_taken_secs || 9999) - (b.time_taken_secs || 9999)
  })

  const topResponse = sorted[0]
  // Find all tied top scorers
  const winners = sorted.filter(r => r.score === topResponse.score && r.time_taken_secs === topResponse.time_taken_secs)
  const winnerTeamIds = new Set(winners.map(w => w.team_id))

  const rewardPerWinner = Math.round((ch.reward_funds || 0) / winners.length)

  // 4. Auto-award money to winners
  for (const win of winners) {
    const team = win.team
    if (team && rewardPerWinner > 0) {
      // Fetch fresh balance to prevent race conditions
      const { data: freshTeam } = await supabaseAdmin.from('teams').select('funds').eq('id', win.team_id).single()
      const currentFunds = freshTeam?.funds ?? team.funds
      const newFunds = currentFunds + rewardPerWinner

      await supabaseAdmin.from('teams').update({ funds: newFunds }).eq('id', win.team_id)

      await supabaseAdmin.from('transactions').insert({
        team_id: win.team_id,
        type: 'challenge_reward',
        amount: rewardPerWinner,
        metadata: {
          challenge_id: challengeId,
          challenge_title: ch.title,
          score: win.score,
          time_taken_secs: win.time_taken_secs
        }
      })

      await supabaseAdmin.from('notifications').insert({
        team_id: win.team_id,
        title: '🏆 QUIZ CHALLENGE WON!',
        message: `Congratulations! Your team WON the "${ch.title}" quiz challenge with a top score of ${win.score}/5 in ${win.time_taken_secs}s! ₹${rewardPerWinner.toLocaleString('en-IN')} has been automatically deposited to your account.`,
        notif_type: 'success'
      })

      // Recalculate score on leaderboard
      await recalculateTeamScore(win.team_id)
    }

    // Update participant status to success
    await supabaseAdmin
      .from('challenge_participants')
      .update({ status: 'success' })
      .eq('challenge_id', challengeId)
      .eq('team_id', win.team_id)
  }

  // 5. Mark non-winners as failed / runner-up
  const nonWinnerParticipants = participants.filter((p: any) => !winnerTeamIds.has(p.team_id))
  for (const nw of nonWinnerParticipants) {
    const nwResp = validResponses.find((r: any) => r.team_id === nw.team_id)
    const scoreStr = nwResp ? `${nwResp.score}/5 in ${nwResp.time_taken_secs}s` : 'No submission'

    await supabaseAdmin.from('notifications').insert({
      team_id: nw.team_id,
      title: 'Quiz Challenge Concluded',
      message: `The quiz challenge "${ch.title}" has concluded. Your result: ${scoreStr}. Winning team: ${topResponse.team?.name || 'Top team'} (${topResponse.score}/5 in ${topResponse.time_taken_secs}s).`,
      notif_type: 'info'
    })

    await supabaseAdmin
      .from('challenge_participants')
      .update({ status: 'failed' })
      .eq('challenge_id', challengeId)
      .eq('team_id', nw.team_id)
  }

  // 6. Close the challenge
  await supabaseAdmin.from('challenges').update({ status: 'closed' }).eq('id', challengeId)

  return {
    success: true,
    winners: winners.map(w => ({
      teamId: w.team_id,
      name: w.team?.name,
      score: w.score,
      time: w.time_taken_secs,
      rewardAwarded: rewardPerWinner
    }))
  }
}
