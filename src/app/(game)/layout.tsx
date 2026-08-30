'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import { joinGame } from '@/app/actions/admin'
import styles from './layout.module.css'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { team, building, notifications, setUser, loadTeamData, loadMarket, loadEvents, loadChallenges, loadConfig, addNotification, updateTeamFunds, updateBuilding, updateMarketPrice } = useGameStore()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const { theme, setTheme } = useTheme()

  // Game Lock State
  const [activeGame, setActiveGame] = useState<any>(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, team_id')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/login'); return }
      if (profile.role === 'admin') { router.push('/admin'); return }
      if (!profile.team_id) { router.push('/register'); return }

      setUser(user.id, 'team', profile.team_id)
      await Promise.all([
        loadTeamData(profile.team_id),
        loadMarket(),
        loadEvents(),
        loadChallenges(),
        loadConfig(),
      ])

      // Check city selection
      const { data: teamData } = await supabase.from('teams').select('city_id').eq('id', profile.team_id).single()
      if (!teamData?.city_id && !pathname.includes('city-select')) {
        router.push('/city-select')
        return
      }

      // Check Active Game & Team Join status
      const { data: gameData } = await supabase.from('games').select('*').eq('status', 'active').single()
      if (gameData) {
        setActiveGame(gameData)
        const { data: teamGame } = await supabase.from('team_games').select('*').eq('team_id', profile.team_id).eq('game_id', gameData.id).single()
        if (teamGame) {
          setHasJoined(true)
        }
      }

      setCheckingAuth(false)

      // Real-time subscriptions
      const channel = supabase.channel(`team-${profile.team_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${profile.team_id}` },
          payload => { if (payload.new) updateTeamFunds((payload.new as any).funds) })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings', filter: `team_id=eq.${profile.team_id}` },
          payload => { if (payload.new) updateBuilding(payload.new as any) })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_prices' },
          payload => { if (payload.new) { const p = payload.new as any; updateMarketPrice(p.resource_id, p.current_price, p.stock) } })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `team_id=eq.${profile.team_id}` },
          payload => { if (payload.new) addNotification(payload.new as any) })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleJoinGame(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    setJoining(true)
    const res = await joinGame(joinCode, team!.id)
    if (res.success) {
      setHasJoined(true)
    } else {
      setJoinError(res.error || 'Invalid code.')
    }
    setJoining(false)
  }

  if (checkingAuth) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <span className={styles.loadingIcon}>🏗️</span>
          <span className={styles.loadingText}>LOADING GAME...</span>
          <div className={styles.loadingBar}>
            <div className={styles.loadingBarFill} />
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/dashboard', label: 'DASHBOARD', icon: '🏗️' },
    { href: '/marketplace', label: 'MARKET', icon: '💰' },
    { href: '/build', label: 'BUILD', icon: '🔨' },
    { href: '/trade', label: 'TRADE', icon: '🤝' },
    { href: '/challenges', label: 'CHALLENGES', icon: '⚡' },
    { href: '/leaderboard', label: 'LEADERBOARD', icon: '🏆' },
  ]

  return (
    <div className={styles.gameLayout}>
      {/* Game Lock Overlay */}
      {activeGame && !hasJoined && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(10,10,10,0.95)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="game-card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '40px', zIndex: 10000 }}>
            <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>🎮</span>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--hot-pink)', marginBottom: '8px', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              {activeGame.title} IS ACTIVE
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
              Enter the access code provided by the administrator to join this round.
            </p>
            <form onSubmit={handleJoinGame} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {joinError && <div style={{ color: 'var(--status-critical)', fontSize: '13px', background: 'rgba(255,45,120,0.1)', padding: '8px' }}>{joinError}</div>}
              <input 
                type="text" 
                className="game-input" 
                placeholder="Access Code" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value)} 
                required 
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '0.2em', textTransform: 'uppercase' }}
              />
              <button type="submit" className="game-btn game-btn-primary" style={{ justifyContent: 'center', width: '100%' }} disabled={joining}>
                {joining ? 'VERIFYING...' : 'JOIN GAME →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.sidebarBrand}>
            <span className={styles.sidebarBrandIcon}>🏗️</span>
            <span className={styles.sidebarBrandText}>SKYSCRAPER<br />STREET</span>
          </Link>
        </div>

        {/* Team info */}
        {team && (
          <div className={styles.sidebarTeam}>
            <div className={styles.teamAvatar}>{team.name.charAt(0).toUpperCase()}</div>
            <div className={styles.teamInfo}>
              <span className={styles.teamName}>{team.name}</span>
              <span className={styles.teamFunds}>₹{team.funds.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* Tower mini viz */}
        {building && building.floors > 0 && (
          <div className={styles.sidebarTower}>
            <div className={styles.sidebarTowerViz}>
              {[...Array(Math.min(building.floors, 8))].map((_, i) => (
                <div key={i} className={styles.sidebarTowerFloor} style={{
                  width: `${50 + (i * 6)}%`,
                  background: `hsl(${200 + i * 15}, 70%, ${40 + i * 3}%)`
                }} />
              ))}
              {building.floors > 8 && <span className={styles.sidebarTowerMore}>+{building.floors - 8} more</span>}
            </div>
            <span className={styles.sidebarTowerHeight}>{building.height.toFixed(0)}m</span>
          </div>
        )}

        {/* Nav */}
        <nav className={styles.sidebarNav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
            >
              <span className={styles.navItemIcon}>{item.icon}</span>
              <span className={styles.navItemLabel}>{item.label}</span>
              {item.href === '/challenges' && unreadCount > 0 && (
                <span className={styles.navBadge}>{unreadCount}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleSignOut} className={`game-btn game-btn-ghost ${styles.signOutBtn}`} id="sign-out">
            🚪 SIGN OUT
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className={styles.gameMain}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            {building && (
              <div className={styles.topStats}>
                <div className={styles.topStat}>
                  <span className={styles.topStatLabel}>HEIGHT</span>
                  <span className={styles.topStatValue} style={{color:'var(--neon-lime)'}}>{building.height.toFixed(0)}m</span>
                </div>
                <div className={styles.topStat}>
                  <span className={styles.topStatLabel}>FLOORS</span>
                  <span className={styles.topStatValue} style={{color:'var(--electric-blue)'}}>{building.floors}</span>
                </div>
                <div className={styles.topStat}>
                  <span className={styles.topStatLabel}>STABILITY</span>
                  <span className={styles.topStatValue} style={{color: building.structural_stability > 60 ? 'var(--status-safe)' : building.structural_stability > 30 ? 'var(--status-warning)' : 'var(--status-critical)'}}>{building.structural_stability.toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.topBarRight}>
            {team && (
              <div className={styles.topStat} style={{marginRight: '16px'}}>
                <span className={styles.topStatLabel}>FUNDS</span>
                <span className={styles.topStatValue} style={{color:'var(--yellow)'}}>₹{team.funds.toLocaleString('en-IN')}</span>
              </div>
            )}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="game-btn game-btn-ghost game-btn-icon"
              title="Toggle Theme"
              style={{marginRight: '12px'}}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link href="/leaderboard" className={`game-btn game-btn-ghost game-btn-sm`}>🏆 Leaderboard</Link>
            <div className={styles.notifBell} onClick={() => {}}>
              🔔
              {unreadCount > 0 && <span className={styles.notifCount}>{unreadCount}</span>}
            </div>
          </div>
        </header>
        <main className={styles.gameContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
