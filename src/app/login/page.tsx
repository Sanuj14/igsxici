'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      // Get profile to determine redirect
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, team_id')
        .eq('id', data.user.id)
        .single()
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else if (!profile?.team_id) {
        router.push('/register')
      } else {
        // Check if city selected
        const { data: team } = await supabase
          .from('teams')
          .select('city_id')
          .eq('id', profile.team_id)
          .single()
        if (!team?.city_id) {
          router.push('/city-select')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`${styles.authPage} grid-bg`}>
      <div className={styles.authLeft}>
        <div className={styles.authBrand}>
          <span className={styles.authBrandIcon}>🏗️</span>
          <span className={styles.authBrandName}>HIGH-RISE HUSTLE</span>
        </div>
        <div className={styles.authHero}>
          <h1 className={styles.authHeroTitle}>BUILD YOUR<br />EMPIRE.</h1>
          <p className={styles.authHeroSub}>Sign in to access your team command center and start building.</p>
        </div>
        <div className={styles.authStats}>
          {[{v:'15', l:'Metropolises'},{v:'12', l:'Floor Types'},{v:'6', l:'Commodities'},{v:'∞', l:'Strategies'}].map(s=>(
            <div key={s.l} className={styles.authStat}>
              <span className={styles.authStatVal}>{s.v}</span>
              <span className={styles.authStatLab}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.authRight}>
        <div className={styles.authCard}>
          <div className={styles.authCardHeader}>
            <h2 className={styles.authTitle}>TEAM LOGIN</h2>
            <p className={styles.authSub}>Enter team credentials to access round</p>
          </div>
          <form className={styles.authForm} onSubmit={handleLogin}>
            {error && <div className={styles.authError}>{error}</div>}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>EMAIL ADDRESS</label>
              <input
                id="email"
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
                id="password"
                type="password"
                className="brutal-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              className="brutal-btn brutal-btn-lime"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '14px' }}
              disabled={loading}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>
          <div className={styles.authFooter}>
            <p>Don&apos;t have a team? <Link href="/register">Register here</Link></p>
            <p style={{marginTop:'10px', fontSize:'13px'}}>Admin? <Link href="/admin/login">Admin Console</Link></p>
          </div>
        </div>
        <Link href="/" className="brutal-btn brutal-btn-white" style={{marginTop:'20px', alignSelf:'center'}}>← BACK TO HOME</Link>
      </div>
    </main>
  )
}
