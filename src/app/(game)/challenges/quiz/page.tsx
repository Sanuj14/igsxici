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

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { teamId } = useGameStore()
  
  const challengeId = searchParams.get('challengeId') || 'civil-quiz-v1'

  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      if (!teamId) return
      const { data } = await (supabase as any)
        .from('quiz_responses')
        .select('id')
        .eq('team_id', teamId)
        .eq('challenge_id', challengeId)
        .single()
      
      if (data) {
        setLocked(true)
      }
      setLoading(false)
    }
    checkStatus()
  }, [teamId, challengeId])

  useEffect(() => {
    if (loading || locked || submitted) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit(answers, 300)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, locked, submitted, answers])

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

    const timeTaken = timeTakenOverride ?? (300 - timeLeft)

    await (supabase as any).from('quiz_responses').insert({
      team_id: teamId,
      challenge_id: challengeId,
      answers: finalAnswers,
      score: calculatedScore,
      time_taken_secs: timeTaken
    })

    setScore(calculatedScore)
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Quiz...</div>
  }

  if (locked) {
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div className="game-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🔒</span>
          <h2 style={{ fontSize: '32px', color: 'var(--status-critical)', marginBottom: '16px' }}>QUIZ LOCKED</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Your team has already attempted this challenge.</p>
          <button onClick={() => router.push('/challenges')} className="game-btn game-btn-primary">
            ← BACK TO CHALLENGES
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div className="game-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', borderTop: '4px solid var(--neon-lime)' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎯</span>
          <h2 style={{ fontSize: '32px', color: 'var(--neon-lime)', marginBottom: '16px' }}>QUIZ COMPLETE!</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '24px 0' }}>
            {score} / {QUESTIONS.length}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Your responses have been recorded. Points will be awarded if this challenge affects your team funds.
          </p>
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
