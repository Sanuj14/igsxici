'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../../login/page.module.css'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    if (email === 'igs@vit.ac.in' && passcode === '632014') {
      // Set a simple cookie for admin access
      document.cookie = "admin_auth=632014; path=/; max-age=86400"
      router.push('/admin')
    } else {
      setError('Invalid admin credentials.')
    }
  }

  return (
    <main className={`${styles.authPage} grid-bg`}>
      <div className={styles.authLeft}>
        <div className={styles.authBrand}>
          <span className={styles.authBrandIcon}>🚨</span>
          <span className={styles.authBrandName}>ADMINISTRATOR CONSOLE</span>
        </div>
        <div className={styles.authHero}>
          <h1 className={styles.authHeroTitle} style={{ color: 'var(--hot-pink)' }}>
            COMMAND<br />CENTER.
          </h1>
          <p className={styles.authHeroSub}>Authorized personnel only. Access live game orchestration, market shocks, and scoring.</p>
        </div>
        <div className={styles.authStats}>
          <div className={styles.authStat}>
            <span className={styles.authStatVal} style={{ color: 'var(--neon-lime)' }}>LIVE</span>
            <span className={styles.authStatLab}>SYSTEM STATUS</span>
          </div>
          <div className={styles.authStat}>
            <span className={styles.authStatVal}>ROOT</span>
            <span className={styles.authStatLab}>SECURITY LVL</span>
          </div>
        </div>
      </div>
      <div className={styles.authRight}>
        <div className={styles.authCard}>
          <div className={styles.authCardHeader}>
            <h2 className={styles.authTitle}>ADMIN CONSOLE LOGIN</h2>
            <p className={styles.authSub}>Enter authorized operator credentials</p>
          </div>
          <form className={styles.authForm} onSubmit={handleLogin}>
            {error && <div className={styles.authError}>{error}</div>}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>OPERATOR EMAIL</label>
              <input
                type="email"
                className="brutal-input"
                placeholder="igs@vit.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>SECURITY PASSCODE</label>
              <input
                type="password"
                className="brutal-input"
                placeholder="Enter 6-digit passcode"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="brutal-btn brutal-btn-lime" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '14px' }}>
              ACCESS CONSOLE →
            </button>
          </form>
          <div className={styles.authFooter}>
            <Link href="/" className="brutal-btn brutal-btn-white" style={{ marginTop: '16px', alignSelf: 'center' }}>
              ← BACK TO HOME
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
