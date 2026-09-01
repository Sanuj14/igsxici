'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'

const QUESTIONS = [
  {
    id: 1,
    text: "What does RCC stand for in construction?",
    options: [
      { id: 'A', text: "Reinforced Cement Concrete" },
      { id: 'B', text: "Raw Calcium Compound" },
      { id: 'C', text: "Rigid Carbon Composite" },
      { id: 'D', text: "Refined Clay Cement" }
    ],
    correctId: 'A'
  },
  {
    id: 2,
    text: "Which structural system uses a triangular arrangement for strength?",
    options: [
      { id: 'A', text: "Shell structure" },
      { id: 'B', text: "Truss" },
      { id: 'C', text: "Arch" },
      { id: 'D', text: "Cantilever" }
    ],
    correctId: 'B'
  },
  {
    id: 3,
    text: "What is the minimum grade of concrete used for RCC work as per IS code?",
    options: [
      { id: 'A', text: "M10" },
      { id: 'B', text: "M15" },
      { id: 'C', text: "M20" },
      { id: 'D', text: "M25" }
    ],
    correctId: 'C'
  },
  {
    id: 4,
    text: "The ratio of water to cement in a concrete mix is known as:",
    options: [
      { id: 'A', text: "Mix ratio" },
      { id: 'B', text: "Water-cement ratio" },
      { id: 'C', text: "Slump ratio" },
      { id: 'D', text: "Hydration factor" }
    ],
    correctId: 'B'
  },
  {
    id: 5,
    text: "Which foundation type is used when soil bearing capacity is very low?",
    options: [
      { id: 'A', text: "Strip foundation" },
      { id: 'B', text: "Raft foundation" },
      { id: 'C', text: "Isolated footing" },
      { id: 'D', text: "Pile foundation" }
    ],
    correctId: 'B'
  }
]

import { submitQuizResponseAction } from '@/app/actions/challenges'

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { teamId, loadTeamData } = useGameStore()
  
  const challengeId = searchParams.get('challengeId') || 'civil-quiz-v1'

  const [challenge, setChallenge] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [totalDurationSecs, setTotalDurationSecs] = useState(60)
  const [timeLeft, setTimeLeft] = useState(60)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [subResult, setSubResult] = useState<any>(null)

  useEffect(() => {
    async function checkStatus() {
      if (!teamId) return

      // 1. Fetch challenge details
      const { data: ch } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single()

      if (ch) {
        setChallenge(ch)
        const durSecs = Math.max(10, (ch.duration_minutes || 1) * 60)
        setTotalDurationSecs(durSecs)

        if (ch.expires_at) {
          const rem = Math.max(0, Math.floor((new Date(ch.expires_at).getTime() - Date.now()) / 1000))
          setTimeLeft(Math.min(durSecs, rem > 0 ? rem : durSecs))
        } else {
          setTimeLeft(durSecs)
        }
      }

      // 2. Check if team already answered
      const { data: resp } = await (supabase as any)
        .from('quiz_responses')
        .select('*')
        .eq('team_id', teamId)
        .eq('challenge_id', challengeId)
        .single()
      
      if (resp) {
        setLocked(true)
        setScore(resp.score)
      }
      setLoading(false)
    }
    checkStatus()

    // Realtime challenge status updates
    const ch = supabase.channel(`quiz-${challengeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges', filter: `id=eq.${challengeId}` },
        payload => { if (payload.new) setChallenge(payload.new) })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [teamId, challengeId])

  useEffect(() => {
    if (loading || locked || submitted) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit(answers, totalDurationSecs)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, locked, submitted, answers, totalDurationSecs])

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [QUESTIONS[currentQuestionIdx].id]: optionId
    }))
  }

  const handleNext = () => {
    if (currentQuestionIdx < QUESTIONS.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1)
    }
  }

  const handleSubmit = async (finalAnswers: Record<number, string> = answers, timeTakenOverride?: number) => {
    if (!teamId || submitting) return
    setSubmitting(true)
    
    let calculatedScore = 0
    QUESTIONS.forEach(q => {
      if (finalAnswers[q.id] === q.correctId) {
        calculatedScore += 1
      }
    })

    const timeTaken = timeTakenOverride ?? Math.max(1, totalDurationSecs - timeLeft)

    try {
      const res = await submitQuizResponseAction(challengeId, teamId, finalAnswers, calculatedScore, timeTaken)
      setSubResult(res)
      setScore(calculatedScore)
      setSubmitted(true)
      if (teamId) await loadTeamData(teamId)
    } catch (e: any) {
      console.error('Quiz submit error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Loading Quiz...</div>
  }

  if (locked) {
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div className="game-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🔒</span>
          <h2 style={{ fontSize: '32px', color: 'var(--neon-lime)', marginBottom: '16px' }}>QUIZ ATTEMPTED</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Your team scored <strong>{score} / {QUESTIONS.length}</strong> on this challenge.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
            {challenge?.status === 'closed' 
              ? 'This challenge has concluded and rewards have been distributed!' 
              : 'Results and reward distributions are calculated as soon as all participating teams submit.'}
          </p>
          <button onClick={() => router.push('/challenges')} className="game-btn game-btn-primary">
            ← BACK TO CHALLENGES
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    const isWinner = subResult?.evaluationResult?.winners?.some((w: any) => w.teamId === teamId)
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div className="game-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', borderTop: '4px solid var(--neon-lime)' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>
            {subResult?.challengeConcluded ? (isWinner ? '🏆' : '🎯') : '⏳'}
          </span>
          <h2 style={{ fontSize: '32px', color: 'var(--neon-lime)', marginBottom: '16px' }}>
            {subResult?.challengeConcluded ? (isWinner ? 'CHALLENGE WON!' : 'QUIZ CONCLUDED!') : 'QUIZ SUBMITTED!'}
          </h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '16px 0', color: '#fff' }}>
            {score} / {QUESTIONS.length}
          </div>

          {subResult?.challengeConcluded ? (
            <div style={{ background: 'rgba(204,255,0,0.1)', border: '1px solid var(--neon-lime)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              {isWinner ? (
                <p style={{ color: 'var(--neon-lime)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
                  🎉 CONGRATULATIONS! Your team won the reward of ₹{(challenge?.reward_funds || 0).toLocaleString('en-IN')}! It has been deposited into your account.
                </p>
              ) : (
                <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                  All claimed teams have answered. Winning team: <strong>{subResult?.evaluationResult?.winners?.[0]?.name || 'Top team'}</strong>.
                </p>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Waiting for other claimed teams ({subResult?.completedCount || 1} / {subResult?.claimedCount || 1} submitted). 
                Once all teams answer, winner funds are immediately deposited!
              </p>
            </div>
          )}

          <button onClick={() => router.push('/challenges')} className="game-btn game-btn-primary">
            ← BACK TO CHALLENGES
          </button>
        </div>
      </div>
    )
  }

  const q = QUESTIONS[currentQuestionIdx]
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isLowTime = timeLeft < 60

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: 0, textTransform: 'uppercase' }}>Civil Engineering Quiz</h1>
        <div style={{
          fontSize: '24px', 
          fontWeight: 'bold',
          fontFamily: 'var(--font-mono)',
          color: isLowTime ? 'var(--status-critical)' : 'var(--hot-pink)',
          animation: isLowTime ? 'pulse 1s infinite' : 'none',
          padding: '8px 16px',
          border: `2px solid ${isLowTime ? 'var(--status-critical)' : 'var(--hot-pink)'}`,
          background: 'rgba(0,0,0,0.5)'
        }}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="game-card" style={{ marginBottom: '24px', padding: '32px' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
          QUESTION {currentQuestionIdx + 1} OF {QUESTIONS.length}
        </div>
        <h2 style={{ fontSize: '24px', lineHeight: '1.4', marginBottom: '32px' }}>{q.text}</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {q.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 24px',
                background: answers[q.id] === opt.id ? 'var(--electric-blue)' : 'rgba(255,255,255,0.05)',
                color: answers[q.id] === opt.id ? 'black' : 'white',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '18px',
                fontWeight: answers[q.id] === opt.id ? 'bold' : 'normal',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-sans)'
              }}
            >
              <span style={{ 
                marginRight: '16px', 
                opacity: answers[q.id] === opt.id ? 1 : 0.5,
                fontWeight: 'bold'
              }}>
                {opt.id}.
              </span>
              {opt.text}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={handlePrev} 
          disabled={currentQuestionIdx === 0}
          className="game-btn game-btn-ghost"
          style={{ opacity: currentQuestionIdx === 0 ? 0.3 : 1 }}
        >
          ← PREVIOUS
        </button>

        {currentQuestionIdx === QUESTIONS.length - 1 ? (
          <button 
            onClick={() => handleSubmit(answers)} 
            className="game-btn game-btn-primary"
            style={{ background: 'var(--hot-pink)', color: 'white', borderColor: 'var(--hot-pink)' }}
            disabled={submitting || Object.keys(answers).length < QUESTIONS.length}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT QUIZ'}
          </button>
        ) : (
          <button 
            onClick={handleNext} 
            className="game-btn game-btn-primary"
          >
            NEXT →
          </button>
        )}
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuizContent />
    </Suspense>
  )
}
