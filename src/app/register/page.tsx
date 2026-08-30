'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { registerTeam } from '@/app/actions/auth'
import styles from '../login/page.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName.trim()) { setError('Team name is required'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')

    try {
      // Delegate to server action for admin-level bypass
      const result = await registerTeam(teamName.trim(), email.trim().toLowerCase(), password)

      if (!result.success) {
        setError(result.error || 'Registration failed.')
        setLoading(false)
        return
      }

      // Sign in automatically after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        // Registration succeeded but sign in failed — redirect to login
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      // Redirect to city select
      router.push('/city-select')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className={styles.authPage}>
        <div className={styles.authRight} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.authCard} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 className={styles.authTitle}>TEAM CREATED!</h2>
            <p style={{ color: 'rgba(10,10,10,0.6)', marginTop: '8px' }}>Redirecting to login...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.authPage}>
      <div className={styles.authLeft} style={{ background: 'var(--electric-purple)' }}>
        <div className={styles.authBrand}>
          <span className={styles.authBrandIcon}>🏗️</span>
          <span className={styles.authBrandName}>SKYSCRAPER ST.</span>
        </div>
        <div className={styles.authHero}>
          <h1 className={styles.authHeroTitle} style={{ color: 'var(--neon-lime)' }}>
            JOIN THE<br />RACE.
          </h1>
          <p className={styles.authHeroSub}>
            Register your team, pick your city, and start building.
            ₹85,000 starting funds await.
          </p>
        </div>
        <div className={styles.authStats}>
          {[
            { v: '₹85K', l: 'Starting Funds' },
            { v: '15', l: 'Cities' },
            { v: '8', l: 'Rounds' },
            { v: '∞', l: 'Floors' },
          ].map(s => (
            <div key={s.l} className={styles.authStat}>
              <span className={styles.authStatVal} style={{ color: 'var(--neon-lime)' }}>{s.v}</span>
              <span className={styles.authStatLab}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authCard}>
          <div className={styles.authCardHeader}>
            <h2 className={styles.authTitle}>REGISTER TEAM</h2>
            <p className={styles.authSub}>Create your team to enter the game</p>
          </div>

          <form className={styles.authForm} onSubmit={handleRegister}>
            {error && <div className={styles.authError}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>TEAM NAME</label>
              <input
                id="team-name"
                type="text"
                className="brutal-input"
                placeholder="e.g. Team Alpha"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
                maxLength={40}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>EMAIL ADDRESS</label>
              <input
                id="reg-email"
                type="email"
                className="brutal-input"
                placeholder="team@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>


            <div className={styles.formGroup}>
              <label className={styles.formLabel}>PASSWORD</label>
              <input
                id="reg-password"
                type="password"
                className="brutal-input"
                placeholder="min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>CONFIRM PASSWORD</label>
              <input
                id="reg-confirm"
                type="password"
                className="brutal-input"
                placeholder="repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="brutal-btn brutal-btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'CREATING TEAM...' : 'CREATE TEAM →'}
            </button>
          </form>

          <div className={styles.authFooter}>
            <p>Already registered? <Link href="/login" style={{ fontWeight: 700, textDecoration: 'underline' }}>Sign in here</Link></p>
          </div>
        </div>

        <Link href="/" className="brutal-btn brutal-btn-white" style={{ marginTop: '16px', alignSelf: 'flex-start' }}>
          ← BACK TO HOME
        </Link>
      </div>
    </main>
  )
}
