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
    <main className={styles.authPage}>
      <div className={styles.authLeft} style={{ background: 'var(--brutal-black)' }}>
        <div className={styles.authBrand}>
          <span className={styles.authBrandIcon}>🚨</span>
          <span className={styles.authBrandName}>ADMINISTRATOR</span>
        </div>
        <div className={styles.authHero}>
          <h1 className={styles.authHeroTitle} style={{ color: 'var(--hot-pink)' }}>COMMAND<br />CENTER.</h1>
          <p className={styles.authHeroSub}>Authorized personnel only. Access the game control dashboard.</p>
        </div>
      </div>
      <div className={styles.authRight}>
        <div className={styles.authCard}>
          <div className={styles.authCardHeader}>
            <h2 className={styles.authTitle}>ADMIN LOGIN</h2>
            <p className={styles.authSub}>Enter admin credentials</p>
          </div>
          <form className={styles.authForm} onSubmit={handleLogin}>
            {error && <div className={styles.authError}>{error}</div>}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>EMAIL ADDRESS</label>
              <input
                type="email"
                className="brutal-input"
                placeholder="admin@vit.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>PASSCODE</label>
              <input
                type="password"
                className="brutal-input"
                placeholder="Enter 6-digit passcode"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="brutal-btn brutal-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              ACCESS TERMINAL →
            </button>
          </form>
          <div className={styles.authFooter}>
            <Link href="/" className="brutal-btn brutal-btn-white" style={{marginTop:'16px', alignSelf:'flex-start'}}>← BACK TO HOME</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
