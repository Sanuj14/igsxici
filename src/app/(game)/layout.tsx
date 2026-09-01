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

  // No Active Game State
  const [noActiveGame, setNoActiveGame] = useState(false)
  const [pastGames, setPastGames] = useState<any[]>([])

  // Alert Overlays
  const [eventAlert, setEventAlert] = useState<any | null>(null)
  const [challengeAlert, setChallengeAlert] = useState<any | null>(null)

  const { events } = useGameStore()
  const activeDisasters = events.filter(e => e.status === 'active' && (e.event_type === 'disaster' || (e.effects as any)?.construction_pause || (e.effects as any)?.construction_delay))
  const activeDisaster = activeDisasters[0] || null
  const [disasterRemaining, setDisasterRemaining] = useState(0)

  useEffect(() => {
    if (!activeDisaster || !activeDisaster.end_at) {
      setDisasterRemaining(0)
      return
    }
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((new Date(activeDisaster.end_at).getTime() - Date.now()) / 1000))
      setDisasterRemaining(diff)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [activeDisaster])

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
        .single() as any

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
        setNoActiveGame(false)
        const { data: teamGame } = await supabase.from('team_games').select('*').eq('team_id', profile.team_id).eq('game_id', gameData.id).single()
        if (teamGame) {
          setHasJoined(true)
        }
      } else {
        setNoActiveGame(true)
        const { data: past } = await supabase.from('games').select('title, created_at').eq('status', 'finished').order('created_at', { ascending: false }).limit(5)
        if (past) setPastGames(past)
      }

      setCheckingAuth(false)

      // Fast auto-refresh polling every 3 seconds for live dashboard updates
      const refreshInterval = setInterval(async () => {
        try {
          // 1. Sync game status
          const { data: gData } = await supabase.from('games').select('*').eq('status', 'active').single()
          if (gData) {
            setActiveGame(gData)
            setNoActiveGame(false)
            const { data: tg } = await supabase.from('team_games').select('*').eq('team_id', profile.team_id).eq('game_id', gData.id).single()
            if (tg) setHasJoined(true)
          } else {
            setActiveGame(null)
            setHasJoined(false)
            setNoActiveGame(true)
          }

          // 2. Refresh store data
          await Promise.all([
            loadTeamData(profile.team_id),
            loadEvents(),
            loadChallenges(),
            loadMarket(),
          ])
        } catch (e) {
          // ignore transient poll errors
        }
      }, 3000)

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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' },
          payload => {
            if (payload.new) {
              const ev = payload.new as any
              if (ev.status === 'active') {
                setEventAlert(ev)
                setTimeout(() => setEventAlert(null), 8000)
              }
              loadEvents()
            }
          })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' },
          () => { loadEvents() })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' },
          payload => {
            if (payload.new) {
              setChallengeAlert(payload.new)
              loadChallenges()
            }
          })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'challenges' },
          () => { loadChallenges() })

      channel.subscribe()

      return () => {
        clearInterval(refreshInterval)
        supabase.removeChannel(channel)
      }
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
    { href: '/events', label: 'EVENTS', icon: '🚨' },
    { href: '/challenges', label: 'CHALLENGES', icon: '⚡' },
    { href: '/leaderboard', label: 'LEADERBOARD', icon: '🏆' },
  ]

  return (
    <div className={styles.gameLayout}>
      {/* Event Alert Overlay */}
      {eventAlert !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 9998, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
        }}>
          <div className="game-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px', position: 'relative' }}>
            <button onClick={() => setEventAlert(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              {eventAlert.event_type === 'disaster' ? '🚨' : eventAlert.event_type === 'bonus' ? '✅' : '📊'}
            </div>
            <div style={{ fontSize: '12px', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              {eventAlert.scope === 'global' ? '🌍 GLOBAL EVENT' : eventAlert.scope === 'city' ? '🏙️ CITY EVENT' : '🎯 EVENT'}
            </div>
            <h2 style={{ fontSize: '32px', color: 'var(--hot-pink)', textTransform: 'uppercase', marginBottom: '16px' }}>{eventAlert.title}</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>{eventAlert.description}</p>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>Auto-dismissing in 7 seconds…</div>
          </div>
        </div>
      )}

      {/* Challenge Alert Overlay */}
      {challengeAlert !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 9998, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="game-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡</div>
            <h2 style={{ fontSize: '32px', color: 'var(--neon-lime)', textTransform: 'uppercase', marginBottom: '16px' }}>NEW CHALLENGE: {challengeAlert.title}</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '30px' }}>{challengeAlert.description}</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => setChallengeAlert(null)} className="game-btn game-btn-ghost">DISMISS</button>
              <button onClick={() => { setChallengeAlert(null); router.push('/challenges') }} className="game-btn game-btn-primary">JOIN CHALLENGE →</button>
            </div>
          </div>
        </div>
      )}

      {/* No Active Game Lobby */}
      {noActiveGame && !hasJoined && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'var(--bg-dark)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          {team && (
            <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{team.name}</div>
              <div style={{ color: 'var(--yellow)' }}>₹{team.funds.toLocaleString('en-IN')}</div>
            </div>
          )}
          <div className="game-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '64px', marginBottom: '16px', display: 'block' }}>🏗️</span>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              WAITING FOR ROUND TO START
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '16px' }}>
              The admin hasn't started a game yet. Hang tight!
            </p>
            
            {pastGames.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '32px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Past Games</h3>
                {pastGames.map((pg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: 'white' }}>{pg.title}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(pg.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => window.location.reload()} className="game-btn game-btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
              REFRESH STATUS
            </button>
          </div>
        </div>
      )}

      {/* Game Lock Overlay */}
      {activeGame && !hasJoined && !noActiveGame && (
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
            <span className={styles.sidebarBrandText}>HIGH-RISE<br />HUSTLE</span>
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
              {item.href === '/events' && events.filter(e => e && e.status === 'active').length > 0 && (
                <span className={styles.navBadge} style={{ background: 'var(--hot-pink)' }}>
                  {events.filter(e => e && e.status === 'active').length}
                </span>
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
        {/* Active Disaster Flashing Banner */}
        {activeDisaster && disasterRemaining > 0 && (
          <div style={{
            background: 'linear-gradient(90deg, #ff0055, #ff3300, #ff0055)',
            color: 'white',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 800,
            fontSize: '14px',
            letterSpacing: '0.04em',
            boxShadow: '0 4px 20px rgba(255,0,85,0.4)',
            borderBottom: '2px solid white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🚨</span>
              <span>CITY EMERGENCY: {activeDisaster.title.toUpperCase()} — {activeDisaster.description}</span>
            </div>
            <div style={{ 
              background: '#000', 
              color: '#ff0055', 
              border: '2px solid #ff0055', 
              padding: '6px 14px', 
              borderRadius: '6px', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '15px',
              fontWeight: 800,
              whiteSpace: 'nowrap'
            }}>
              CONSTRUCTION HALTED: {Math.floor(disasterRemaining / 60)}:{String(disasterRemaining % 60).padStart(2, '0')}
            </div>
          </div>
        )}

        <main className={styles.gameContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
