'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import { claimChallengeSlotAction, getTeamClaimedChallengesAction } from '@/app/actions/challenges'
import styles from './page.module.css'

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  intellectual: { label: 'Intellectual', color: 'var(--electric-blue)', icon: '🧠' },
  quickfire: { label: 'Quick-Fire', color: 'var(--yellow)', icon: '⚡' },
  physical: { label: 'Physical', color: 'var(--orange)', icon: '💪' },
  venue_mission: { label: 'Venue Mission', color: 'var(--mint)', icon: '📍' },
  risk: { label: 'High Risk', color: 'var(--hot-pink)', icon: '🎲' },
  quiz: { label: 'Civil Quiz', color: 'var(--neon-lime)', icon: '📝' },
}

export default function ChallengesPage() {
  const router = useRouter()
  const { challenges, teamId, loadChallenges } = useGameStore()
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({})
  const [claimedMap, setClaimedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadClaimed() {
      if (!teamId) return
      const res = await getTeamClaimedChallengesAction(teamId)
      if (res.success && res.claimedChallengeIds) {
        const map: Record<string, boolean> = {}
        res.claimedChallengeIds.forEach((id: string) => { map[id] = true })
        setClaimedMap(map)
      }
    }
    loadClaimed()
  }, [teamId, challenges])

  async function claimSlot(challengeId: string) {
    if (!teamId) return
    setLoading(p => ({ ...p, [challengeId]: true }))
    try {
      const res = await claimChallengeSlotAction(teamId, challengeId)
      if (!res.success) throw new Error(res.error)
      setClaimedMap(p => ({ ...p, [challengeId]: true }))
      setMessages(p => ({ ...p, [challengeId]: { text: '✅ Slot claimed! Complete the challenge to earn your reward.', ok: true } }))
      await loadChallenges()
    } catch (e: any) {
      setMessages(p => ({ ...p, [challengeId]: { text: e.message, ok: false } }))
    } finally {
      setLoading(p => ({ ...p, [challengeId]: false }))
    }
  }

  async function handleClaimAndQuiz(challengeId: string) {
    if (!teamId) return
    setLoading(p => ({ ...p, [challengeId]: true }))
    try {
      const res = await claimChallengeSlotAction(teamId, challengeId)
      if (!res.success) {
        setMessages(p => ({ ...p, [challengeId]: { text: `❌ ${res.error}`, ok: false } }))
        setLoading(p => ({ ...p, [challengeId]: false }))
        alert(`❌ ${res.error}`)
        return
      }
      setClaimedMap(p => ({ ...p, [challengeId]: true }))
      await loadChallenges()
      router.push(`/challenges/quiz?challengeId=${challengeId}`)
    } catch (e: any) {
      setMessages(p => ({ ...p, [challengeId]: { text: e.message, ok: false } }))
      setLoading(p => ({ ...p, [challengeId]: false }))
      alert(`❌ ${e.message}`)
    }
  }

  const active = challenges.filter(c => c.status === 'active')
  const upcoming = challenges.filter(c => c.status === 'upcoming')

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2">⚡ CHALLENGE CENTER</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Race to claim limited slots. First come, first served — no exceptions.</p>
        </div>
        <div className={styles.headerStats}>
          <span className="stat-pill stat-pill-critical">{active.length} LIVE</span>
          <span className="stat-pill stat-pill-info">{upcoming.length} UPCOMING</span>
        </div>
      </div>

      {active.length === 0 && upcoming.length === 0 ? (
        <div className={styles.emptyState}>
          <span style={{ fontSize: '64px' }}>⏳</span>
          <h2>No challenges active</h2>
          <p>The admin will release challenges during the event. Stay alert!</p>
        </div>
      ) : null}

      {active.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>🔴 LIVE NOW — CLAIM IMMEDIATELY</div>
          <div className={styles.challengeGrid}>
            {active.map(challenge => {
              const cfg = TYPE_CONFIG[challenge.challenge_type] || TYPE_CONFIG.intellectual
              const slotsLeft = Math.max(0, challenge.max_slots - challenge.claimed_slots)
              const msg = messages[challenge.id]
              const hasClaimed = claimedMap[challenge.id]

              return (
                <div key={challenge.id} className={`${styles.challengeCard} game-card game-card-glow-pink`}>
                  <div className={styles.challengeTop}>
                    <div className={styles.challengeType} style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}50`, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </div>
                    <div className={styles.slotsBar}>
                      <span className={styles.slotsLeft} style={{ color: slotsLeft === 0 ? 'var(--status-critical)' : slotsLeft <= 2 ? 'var(--status-warning)' : 'var(--status-safe)' }}>
                        {slotsLeft}/{challenge.max_slots} slots left
                      </span>
                    </div>
                  </div>
                  <h3 className={styles.challengeTitle}>{challenge.title}</h3>
                  <p className={styles.challengeDesc}>{challenge.description}</p>
                  <div className={styles.challengeRewards}>
                    {challenge.reward_funds > 0 && (
                      <span className={styles.rewardBadge} style={{ background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.3)', color: 'var(--yellow)' }}>
                        💰 +₹{challenge.reward_funds.toLocaleString('en-IN')}
                      </span>
                    )}
                    {challenge.penalty_funds > 0 && (
                      <span className={styles.rewardBadge} style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: 'var(--hot-pink)' }}>
                        ⚠️ Risk: -₹{challenge.penalty_funds.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className={styles.rewardBadge} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      ⏱️ {challenge.duration_minutes}min
                    </span>
                  </div>
                  {/* Slot progress */}
                  <div>
                    <div className={`progress-bar`}>
                      <div className={`progress-bar-fill ${slotsLeft === 0 ? 'progress-red' : 'progress-green'}`}
                        style={{ width: `${Math.min(100, (challenge.claimed_slots / challenge.max_slots) * 100)}%` }} />
                    </div>
                  </div>
                  {msg?.text && (
                    <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>
                  )}
                  {challenge.challenge_type === 'quiz' ? (
                    hasClaimed ? (
                      <Link
                        href={`/challenges/quiz?challengeId=${challenge.id}`}
                        className={`game-btn game-btn-lime ${styles.claimBtn}`}
                        style={{ textAlign: 'center', justifyContent: 'center' }}
                      >
                        📝 ENTER / CONTINUE QUIZ →
                      </Link>
                    ) : slotsLeft > 0 ? (
                      <button
                        className={`game-btn game-btn-lime ${styles.claimBtn}`}
                        style={{ textAlign: 'center', justifyContent: 'center' }}
                        onClick={() => handleClaimAndQuiz(challenge.id)}
                        disabled={loading[challenge.id]}
                      >
                        {loading[challenge.id] ? 'Entering...' : `📝 CLAIM SPOT & START QUIZ (${slotsLeft} left)`}
                      </button>
                    ) : (
                      <button
                        className={`game-btn game-btn-ghost ${styles.claimBtn}`}
                        style={{ color: 'var(--status-critical)', borderColor: 'rgba(255,45,120,0.4)', opacity: 0.8 }}
                        onClick={() => alert(`All ${challenge.max_slots} slots are full! Only ${challenge.max_slots} teams were permitted for this challenge.`)}
                      >
                        🔒 All {challenge.max_slots} Slots Taken
                      </button>
                    )
                  ) : (
                    <button
                      id={`claim-${challenge.id.slice(0, 8)}`}
                      className={`game-btn ${slotsLeft === 0 && !hasClaimed ? 'game-btn-ghost' : 'game-btn-primary'} ${styles.claimBtn}`}
                      onClick={() => claimSlot(challenge.id)}
                      disabled={loading[challenge.id] || (slotsLeft === 0 && !hasClaimed) || hasClaimed}
                    >
                      {loading[challenge.id] ? 'Claiming...' : hasClaimed ? '✅ Slot Claimed' : slotsLeft === 0 ? `🔒 All ${challenge.max_slots} Slots Taken` : `CLAIM SLOT (${slotsLeft} left)`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel} style={{ opacity: 0.7 }}>⏳ UPCOMING</div>
          <div className={styles.challengeGrid}>
            {upcoming.map(challenge => {
              const cfg = TYPE_CONFIG[challenge.challenge_type] || TYPE_CONFIG.intellectual
              return (
                <div key={challenge.id} className={`${styles.challengeCard} ${styles.challengeUpcoming} game-card`}>
                  <div className={styles.challengeType} style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, color: cfg.color, width: 'fit-content' }}>
                    {cfg.icon} {cfg.label}
                  </div>
                  <h3 className={styles.challengeTitle} style={{ opacity: 0.6 }}>{challenge.title}</h3>
                  <div className={styles.upcomingBadge}>⏳ AWAITING ADMIN ACTIVATION</div>
                  <div className={styles.challengeRewards}>
                    {challenge.reward_funds > 0 && (
                      <span className={styles.rewardBadge} style={{ background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.3)', color: 'var(--yellow)' }}>💰 +₹{challenge.reward_funds.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
