'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import type { Team, Building, Challenge, Event, City } from '@/lib/supabase/types'
import { resetGame, removeTeam, triggerTargetedEvent, createGame, deleteGame, deleteChallenge as deleteChallengeAction, expireEvent as expireEventAction, createChallenge as createChallengeAction } from '@/app/actions/admin'
import styles from './page.module.css'

interface TeamFull extends Team {
  city: City | null
  building: Building | null
}

const DISASTER_PRESETS = [
  { title: 'Monsoon Flash Flood', desc: 'Heavy rainfall floods lower floors. Cement demand surges +30%. Construction temporarily delayed.', type: 'disaster', effects: { cement_price_mult: 1.3, construction_delay: true } },
  { title: 'Earthquake Tremor', desc: 'Seismic activity damages structural stability by 10 points across target metropolises.', type: 'disaster', effects: { stability_damage: 10 } },
  { title: 'Supply Chain Embargo', desc: 'Steel and Aluminium prices surge 50%. Material stock halved.', type: 'disaster', effects: { steel_price_mult: 1.5, aluminium_price_mult: 1.5 } },
  { title: 'Material Subsidies', desc: 'Urban ministry stimulus! All resource prices drop 20% for 5 minutes.', type: 'bonus', effects: { all_price_mult: 0.8 } },
  { title: 'Municipal Grant', desc: 'Active construction syndicates receive ₹10,000 cash grant.', type: 'bonus', effects: { fund_bonus: 10000 } },
  { title: 'Severe Cyclone', desc: 'Coastal metropolises halted. All active building projects paused.', type: 'disaster', effects: { construction_pause: true } },
]

export default function AdminPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamFull[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [games, setGames] = useState<any[]>([])
  const [marketPrices, setMarketPrices] = useState<any[]>([])
  const [tab, setTab] = useState<'dashboard'|'teams'|'events'|'market'|'challenges'|'games'|'config'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'info'|'event'|'market'|'system' }>>([
    { id: '1', time: '14:22:01', text: 'Market Update: CEMENT price surged +10% to ₹1,300.', type: 'market' },
    { id: '2', time: '14:21:45', text: 'DISASTER TRIGGERED: Earthquake in Mumbai region.', type: 'event' },
    { id: '3', time: '14:20:00', text: 'HIGH-RISE HUSTLE TERMINAL INITIALIZED. Root online.', type: 'system' }
  ])

  // Event form
  const [eTitle, setETitle] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eType, setEType] = useState('disaster')
  const [eScope, setEScope] = useState('global')
  const [eCityId, setECityId] = useState('')
  const [eTeamId, setETeamId] = useState('')
  const [eDuration, setEDuration] = useState(5)
  const [eFundChange, setEFundChange] = useState(0)
  const [eStabilityChange, setEStabilityChange] = useState(0)
  const [ePriceEffects, setEPriceEffects] = useState<Record<string,number>>({
    cement: 1.0, steel: 1.0, glass: 1.0, timber: 1.0, aluminium: 1.0, copper: 1.0, labour: 1.0
  })

  // Game session form
  const [gTitle, setGTitle] = useState('Round 1: Foundation Sprint')
  const [gDuration, setGDuration] = useState(45)

  // Challenge form
  const [cTitle, setCTitle] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cType, setCType] = useState('intellectual')
  const [cReward, setCReward] = useState(15000)
  const [cPenalty, setCPenalty] = useState(0)
  const [cSlots, setCSlots] = useState(3)
  const [cDuration, setCDuration] = useState(5)

  // Funds adjustment
  const [adjTeamId, setAdjTeamId] = useState('')
  const [adjAmount, setAdjAmount] = useState(0)

  useEffect(() => {
    async function init() {
      if (document.cookie.includes('admin_auth=632014')) {
        await loadAll()
        setLoading(false)
        setupRealtime()
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return }
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }
      await loadAll()
      setLoading(false)
      setupRealtime()
    }
    init()
  }, [])

  function setupRealtime() {
    const ch = supabase.channel('admin-terminal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_prices' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }

  function addLog(text: string, type: 'info'|'event'|'market'|'system' = 'info') {
    const time = new Date().toLocaleTimeString('en-GB')
    setLogs(prev => [{ id: Math.random().toString(), time, text, type }, ...prev.slice(0, 19)])
  }

  async function loadAll() {
    const [teamsRes, buildingsRes, citiesRes, challengesRes, eventsRes, marketRes, gamesRes] = await Promise.all([
      supabase.from('teams').select('*, city:cities(id,name,color,slug,description,advantages,risks,starting_bonus,coordinates_x,coordinates_y,is_coastal,created_at)').order('score', { ascending: false }),
      supabase.from('buildings').select('*'),
      supabase.from('cities').select('*'),
      supabase.from('challenges').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('market_prices').select('*, resource:resources(*)'),
      supabase.from('games').select('*').order('created_at', { ascending: false }),
    ])
    const buildMap: Record<string, Building> = {}
    buildingsRes.data?.forEach((b: any) => { buildMap[b.team_id] = b })
    const teamsFull = (teamsRes.data || []).map(t => ({
      ...t,
      building: buildMap[t.id] || null
    })) as TeamFull[]

    setTeams(teamsFull)
    setCities(citiesRes.data || [])
    setChallenges(challengesRes.data || [])
    setEvents(eventsRes.data || [])
    setMarketPrices(marketRes.data || [])
    setGames(gamesRes.data || [])
  }

  async function handleLaunchRound() {
    if (!gTitle) return
    const res = await createGame(gTitle, gDuration)
    if (!res.success) {
      alert(`Failed to launch round: ${res.error}`)
    } else {
      addLog(`ROUND LAUNCHED: "${gTitle}" (Duration: ${gDuration}m). Stock reset to 1000.`, 'system')
      loadAll()
    }
  }

  async function triggerEvent() {
    const effectsData: any = {
      fund_change: eFundChange,
      stability_change: eStabilityChange,
    }
    const finalPriceEffects: Record<string, number> = {}
    for (const [slug, val] of Object.entries(ePriceEffects)) {
      if (val !== 1.0) finalPriceEffects[slug] = val
    }
    if (Object.keys(finalPriceEffects).length > 0) {
      effectsData.price_effects = finalPriceEffects
    }
    
    const res = await triggerTargetedEvent({
      title: eTitle, description: eDesc, event_type: eType,
      scope: eScope, city_id: eCityId, team_id: eTeamId, duration: eDuration
    }, effectsData)

    if (!res.success) alert(res.error)
    else { 
      addLog(`DISASTER TRIGGERED: ${eTitle} (${eScope})`, 'event')
      setETitle(''); setEDesc(''); 
      setEFundChange(0); setEStabilityChange(0);
      setEPriceEffects({cement: 1.0, steel: 1.0, glass: 1.0, timber: 1.0, aluminium: 1.0, copper: 1.0, labour: 1.0})
      loadAll() 
    }
  }

  async function triggerPreset(preset: typeof DISASTER_PRESETS[0]) {
    await supabase.from('events').insert({
      title: preset.title, description: preset.desc,
      event_type: preset.type as any, scope: 'global',
      effects: preset.effects, status: 'active',
      end_at: new Date(Date.now() + 5 * 60000).toISOString()
    })
    addLog(`PRESET ACTIVATED: ${preset.title}`, 'event')
    loadAll()
  }

  async function expireEvent(id: string) {
    await expireEventAction(id)
    addLog(`Event expired manually: ID ${id.slice(0, 8)}`, 'info')
    loadAll()
  }

  async function quickBumpPrice(resourceId: string, currentPrice: number, multiplier: number) {
    const newPrice = Math.max(10, Math.round(currentPrice * multiplier))
    await supabase.from('market_prices').update({ current_price: newPrice, updated_at: new Date().toISOString() }).eq('resource_id', resourceId)
    addLog(`Market Adjusted: Resource ${resourceId.slice(0, 6)} set to ₹${newPrice}`, 'market')
    loadAll()
  }

  async function createChallenge() {
    const res = await createChallengeAction({
      title: cTitle, description: cDesc,
      challenge_type: cType,
      reward_funds: cReward, penalty_funds: cPenalty,
      max_slots: cSlots, duration_minutes: cDuration,
    })
    if (!res.success) alert(res.error)
    else { 
      addLog(`CHALLENGE DEPLOYED: "${cTitle}" (₹${cReward})`, 'system')
      setCTitle(''); setCDesc(''); loadAll() 
    }
  }

  async function adjustFunds() {
    if (!adjTeamId || adjAmount === 0) return
    const team = teams.find(t => t.id === adjTeamId)
    if (!team) return
    await supabase.from('teams').update({ funds: team.funds + adjAmount }).eq('id', adjTeamId)
    await supabase.from('transactions').insert({ team_id: adjTeamId, type: 'admin_adjustment', amount: adjAmount, metadata: { reason: 'Admin manual adjustment' } })
    addLog(`Funds Adjusted: ${team.name} ${adjAmount > 0 ? '+' : ''}₹${adjAmount}`, 'system')
    setAdjAmount(0)
    loadAll()
  }

  if (loading) return (
    <div className={styles.loading}>
      <span style={{ fontSize: '48px' }}>⚙️</span>
      <span className={styles.loadingText}>INITIALIZING ADMIN TERMINAL...</span>
    </div>
  )

  const activeGame = games.find(g => g.status === 'active') || games[0]
  const activeEventsCount = events.filter(e => e.status === 'active').length

  return (
    <div className={styles.adminPage}>
      {/* SIDEBAR NAVIGATION RAIL */}
      <aside className={styles.sidebarRail}>
        <div className={styles.railBrand} onClick={() => setTab('dashboard')} title="Master Dashboard">
          🏢
        </div>
        <nav className={styles.railNav}>
          <button className={`${styles.railBtn} ${tab === 'dashboard' ? styles.railBtnActive : ''}`} onClick={() => setTab('dashboard')} title="Master Terminal">
            📊
          </button>
          <button className={`${styles.railBtn} ${tab === 'games' ? styles.railBtnActive : ''}`} onClick={() => setTab('games')} title="Rounds & Sessions">
            🚀
          </button>
          <button className={`${styles.railBtn} ${tab === 'events' ? styles.railBtnActive : ''}`} onClick={() => setTab('events')} title="Disaster Engine">
            🚨
          </button>
          <button className={`${styles.railBtn} ${tab === 'market' ? styles.railBtnActive : ''}`} onClick={() => setTab('market')} title="Commodity Market">
            📈
          </button>
          <button className={`${styles.railBtn} ${tab === 'challenges' ? styles.railBtnActive : ''}`} onClick={() => setTab('challenges')} title="Speed Challenges">
            ⚡
          </button>
          <button className={`${styles.railBtn} ${tab === 'teams' ? styles.railBtnActive : ''}`} onClick={() => setTab('teams')} title="Teams Ledger">
            👥
          </button>
        </nav>
        <div className={styles.railFooter}>
          <button className={`${styles.railBtn} ${tab === 'config' ? styles.railBtnActive : ''}`} onClick={() => setTab('config')} title="Danger Zone / Wipe">
            ⚙️
          </button>
          <button 
            className={styles.railBtn} 
            style={{ color: 'var(--hot-pink)' }}
            onClick={() => { document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; supabase.auth.signOut(); router.push('/') }} 
            title="Exit Terminal"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className={styles.mainContainer}>
        {/* TOP APP BAR */}
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.terminalTitle}>Admin Terminal</h1>
            <span className={styles.rootBadge}>ROOT ACCESS</span>
          </div>

          <div className={styles.headerCenterPill}>
            <div className={styles.activeRoundTag}>
              <span>●</span>
              <span>{activeGame?.title ? activeGame.title.toUpperCase() : 'ROUND 1 — READY'}</span>
            </div>
            <div className={styles.codeDivider} />
            <span className={styles.accessCodeReadout}>
              CODE: <strong style={{ color: 'var(--neon-lime)' }}>[{activeGame?.access_code || 'A9X4K2'}]</strong>
            </span>
            <div className={styles.codeDivider} />
            <div className={styles.timerReadout}>
              <span>⏳</span>
              <span>{activeGame?.duration_minutes ? `${activeGame.duration_minutes}:00` : '45:00'}</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.operatorDetails}>
              <span className={styles.operatorEmail}>OPERATOR: igs@vit.ac.in</span>
              <span className={styles.operatorPasscode}>PASSCODE: [632014]</span>
            </div>
            <div className={styles.operatorAvatar}>
              IGS
            </div>
          </div>
        </header>

        {/* TAB 1: MASTER DASHBOARD VIEW */}
        {tab === 'dashboard' && (
          <main className={styles.mainGrid}>
            {/* LEFT COLUMN: ACTIVE ROUNDS, SESSION ENGINE, DISASTERS, MARKET TILES */}
            <div className={styles.leftCol}>
              {/* 3 ACTIVE ROUND CARDS ROW */}
              <div className={styles.roundCardsRow}>
                {/* Card 1: Setup */}
                <div className={styles.roundBannerCard} style={{ background: '#FFD60A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={styles.roundCardTag}>ROUND 1 ACTIVE</span>
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>⭐</span>
                  </div>
                  <h3 className={styles.roundCardTitle}>City Foundation & Resource Allocation</h3>
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#000', fontWeight: 800 }}>
                      <span>Time Remaining</span>
                      <span>{activeGame?.duration_minutes || 45}m</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{ width: '65%', height: '100%', background: '#000' }} />
                    </div>
                  </div>
                </div>

                {/* Card 2: Trading Phase */}
                <div className={styles.roundBannerCard} style={{ background: '#CCFF00' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={styles.roundCardTag}>MARKET ACTIVE</span>
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>📈</span>
                  </div>
                  <h3 className={styles.roundCardTitle}>Commodity Trading & Building Sprint</h3>
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#000', fontWeight: 800 }}>
                      <span>Market Stock</span>
                      <span>1000 Units Each</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{ width: '90%', height: '100%', background: '#000' }} />
                    </div>
                  </div>
                </div>

                {/* Card 3: Crisis Phase */}
                <div className={styles.roundBannerCard} style={{ background: '#00E5FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={styles.roundCardTag}>CRISIS ENGINE</span>
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>⚡</span>
                  </div>
                  <h3 className={styles.roundCardTitle}>Targeted Disasters & Speed Quizzes</h3>
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#000', fontWeight: 800 }}>
                      <span>Active Events</span>
                      <span>{activeEventsCount} Live</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
                      <div style={{ width: `${Math.min(100, activeEventsCount * 30)}%`, height: '100%', background: '#000' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SPLIT ROW: SESSION CONTROL & DISASTER GENERATOR */}
              <div className={styles.splitSection}>
                {/* Session Control */}
                <section className={styles.neoCard}>
                  <header className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Session Control</h2>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyber-blue)' }}>ROUND ORCHESTRATOR</span>
                  </header>
                  <div className={styles.formBody}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Round Title</label>
                      <input className={styles.neoInput} value={gTitle} onChange={e => setGTitle(e.target.value)} placeholder="e.g. Round 1: Foundation" />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Duration (Minutes)</span>
                        <span style={{ color: 'var(--neon-lime)' }}>{gDuration} mins</span>
                      </label>
                      <input 
                        type="range" min={10} max={120} value={gDuration} 
                        onChange={e => setGDuration(+e.target.value)} 
                        style={{ accentColor: 'var(--cyber-blue)', cursor: 'pointer' }} 
                      />
                    </div>
                    <button className="brutal-btn brutal-btn-lime" style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', padding: '12px' }} onClick={handleLaunchRound}>
                      🚀 LAUNCH ROUND & RESET STOCK
                    </button>
                  </div>
                </section>

                {/* Disaster Generator */}
                <section className={styles.neoCard}>
                  <header className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Disaster Generator</h2>
                    <span style={{ color: 'var(--hot-pink)', fontSize: '14px' }}>⚠️</span>
                  </header>
                  <div className={styles.formBody}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Target Metropolis</label>
                      <select className={styles.neoInput} value={eCityId} onChange={e => { setECityId(e.target.value); setEScope(e.target.value ? 'city' : 'global') }}>
                        <option value="">Global (All 15 Cities)</option>
                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Quick Shock Presets</label>
                      <div style={{ display: 'grid', gridTo: '1fr', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {DISASTER_PRESETS.slice(0, 4).map(p => (
                          <button key={p.title} className="brutal-btn brutal-btn-white" style={{ fontSize: '10px', padding: '6px' }} onClick={() => triggerPreset(p)}>
                            {p.title.split(' ')[0]} 🚨
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Active Disasters Mini List */}
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #333', paddingTop: '8px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--hot-pink)', fontWeight: 800, marginBottom: '4px' }}>
                        ACTIVE DISASTERS ({events.filter(e => e.status === 'active').length})
                      </div>
                      {events.filter(e => e.status === 'active').slice(0, 2).map(ev => (
                        <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', padding: '4px 8px', border: '1px solid var(--hot-pink)', borderRadius: '4px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--hot-pink)' }}>{ev.title}</span>
                          <button onClick={() => expireEvent(ev.id)} style={{ color: '#fff', fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* COMMODITY MARKET BOARD */}
              <section className={styles.marketBoardCard}>
                <header className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Commodity Market Board</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--neon-lime)' }}>LIVE BUMP / SHOCK</span>
                </header>
                <div className={styles.marketTilesGrid}>
                  {marketPrices.slice(0, 6).map((mp: any) => {
                    const res = mp.resource
                    return (
                      <div key={mp.id} className={styles.marketTile}>
                        <div className={styles.marketTileTop}>
                          <span className={styles.resourceTitle}>{res?.name}</span>
                          <span className={styles.trendBadge} style={{ background: 'var(--neon-lime)', color: '#000' }}>STOCK: {mp.stock}</span>
                        </div>
                        <div className={styles.tilePriceRow}>
                          <span className={styles.tilePrice}>₹{mp.current_price.toLocaleString('en-IN')}</span>
                          <span className={styles.tileStock}>per {res?.unit_label}</span>
                        </div>
                        <div className={styles.tileBtnRow}>
                          <button className={styles.tileMiniBtn} onClick={() => quickBumpPrice(mp.resource_id, mp.current_price, 1.1)}>↑ 10%</button>
                          <button className={styles.tileMiniBtn} onClick={() => quickBumpPrice(mp.resource_id, mp.current_price, 0.9)}>↓ 10%</button>
                          <button className={`${styles.tileMiniBtn} ${styles.btnCrash}`} onClick={() => quickBumpPrice(mp.resource_id, mp.current_price, 0.5)}>CRASH</button>
                          <button className={`${styles.tileMiniBtn} ${styles.btnSurge}`} onClick={() => quickBumpPrice(mp.resource_id, mp.current_price, 1.5)}>SURGE</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: TEAM LEADERBOARD LEDGER & TERMINAL AUDIT LOG */}
            <div className={styles.rightCol}>
              {/* Leaderboard Panel */}
              <section className={`${styles.neoCard} ${styles.leaderboardPanel}`}>
                <header className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Team Leaderboard</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: '#FFD60A', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                    {teams.length} TEAMS
                  </span>
                </header>
                <div className={styles.teamListScroll}>
                  {teams.map((team, idx) => (
                    <div key={team.id} className={styles.teamRow}>
                      <div className={`${styles.teamRankCircle} ${idx === 0 ? styles.teamRankFirst : ''}`}>
                        {idx + 1}
                      </div>
                      <div className={styles.teamRowInfo}>
                        <div className={styles.teamRowName}>{team.name}</div>
                        <div className={styles.teamRowScore}>
                          H: {team.building?.height.toFixed(0) || 0}m • F: {team.building?.floors || 0}
                        </div>
                      </div>
                      <div className={styles.teamRowFunds}>
                        ₹{(team.funds / 1000).toFixed(0)}K
                      </div>
                    </div>
                  ))}
                  {teams.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No teams registered yet.</p>}
                </div>
                <div style={{ padding: '10px 14px', borderTop: '1px solid #333', background: '#1F1F25' }}>
                  <button className="brutal-btn brutal-btn-white" style={{ width: '100%', justifyContent: 'center', fontSize: '11px', padding: '8px' }} onClick={() => setTab('teams')}>
                    VIEW FULL TEAMS LEDGER →
                  </button>
                </div>
              </section>

              {/* Terminal Audit Log */}
              <section className={`${styles.neoCard} ${styles.auditLogPanel}`}>
                <header className={styles.cardHeader} style={{ background: '#1F1F25' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em' }}>TERMINAL AUDIT LOG</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neon-lime)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-lime)' }} />
                    LIVE
                  </span>
                </header>
                <div className={styles.logBody}>
                  {logs.map(log => (
                    <div key={log.id}>
                      <span style={{ color: log.type === 'market' ? 'var(--cyber-blue)' : log.type === 'event' ? 'var(--hot-pink)' : 'var(--neon-lime)', marginRight: '6px' }}>
                        [{log.time}]
                      </span>
                      <span style={{ color: '#fff' }}>{log.text}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>
        )}

        {/* TAB 2: TEAMS MANAGEMENT VIEW */}
        {tab === 'teams' && (
          <div className={styles.fullViewWrapper}>
            <div className={styles.fundsAdj}>
              <h3 className={styles.cardTitle}>ADJUST TEAM FUNDS / GRANT BONUSES</h3>
              <div className={styles.adjRow}>
                <select value={adjTeamId} onChange={e => setAdjTeamId(e.target.value)} className="brutal-input" style={{ flex: 1 }}>
                  <option value="">Select team...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} (₹{t.funds.toLocaleString('en-IN')})</option>)}
                </select>
                <input type="number" value={adjAmount} onChange={e => setAdjAmount(+e.target.value)} className="brutal-input" placeholder="e.g. 10000 or -5000" style={{ width: '180px' }} />
                <button className="brutal-btn brutal-btn-lime" onClick={adjustFunds}>Apply Adjustment</button>
              </div>
            </div>

            <div className={styles.teamsGrid}>
              {teams.map((team, i) => (
                <div key={team.id} className={styles.neoCard} style={{ padding: '16px', gap: '10px' }}>
                  <div className={styles.teamCardTop}>
                    <div className={styles.teamRank}>#{i + 1}</div>
                    <div className={styles.teamCardInfo}>
                      <span className={styles.teamCardName}>{team.name}</span>
                      <span className={styles.teamCardCity} style={{ color: (team.city as any)?.color }}>{(team.city as any)?.name || 'No city'}</span>
                    </div>
                    <span className={styles.teamFunds}>₹{team.funds.toLocaleString('en-IN')}</span>
                  </div>
                  {team.building && (
                    <div className={styles.teamBuildingStats}>
                      <span>HEIGHT: {team.building.height.toFixed(0)}m</span>
                      <span>FLOORS: {team.building.floors}</span>
                      <span style={{ color: team.building.structural_stability > 60 ? 'var(--status-safe)' : 'var(--status-critical)' }}>
                        STABILITY: {team.building.structural_stability.toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <button 
                    className="brutal-btn brutal-btn-white" 
                    style={{ color: 'var(--hot-pink)', marginTop: '8px', fontSize: '11px', padding: '8px' }}
                    onClick={async () => {
                      if (confirm(`Remove team ${team.name}?`)) {
                        await removeTeam(team.id)
                        loadAll()
                      }
                    }}
                  >
                    DISQUALIFY / REMOVE TEAM
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DISASTER & EVENTS FULL VIEW */}
        {tab === 'events' && (
          <div className={styles.fullViewWrapper}>
            <div className={styles.eventForm}>
              <h3 className={styles.cardTitle}>CUSTOM TARGETED DISASTER GENERATOR</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>EVENT TITLE</label>
                  <input value={eTitle} onChange={e => setETitle(e.target.value)} className="brutal-input" placeholder="e.g. Seismic Shockwave" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>DESCRIPTION</label>
                  <input value={eDesc} onChange={e => setEDesc(e.target.value)} className="brutal-input" placeholder="Damage description" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>SCOPE</label>
                  <select value={eScope} onChange={e => setEScope(e.target.value)} className="brutal-input">
                    <option value="global">Global (All Cities)</option>
                    <option value="city">City-Specific</option>
                  </select>
                </div>
                {eScope === 'city' && (
                  <div className={styles.formRow}>
                    <label className={styles.fLabel}>METROPOLIS</label>
                    <select value={eCityId} onChange={e => setECityId(e.target.value)} className="brutal-input">
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className={styles.formRow} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.fLabel}>PRICE MULTIPLIERS (1.0 = Normal, 1.5 = +50%, 0.8 = -20%)</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['cement', 'steel', 'glass', 'timber', 'aluminium', 'copper'].map(slug => (
                      <div key={slug} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>{slug}</span>
                        <input 
                          type="number" step="0.1"
                          value={ePriceEffects[slug] || 1.0}
                          onChange={e => setEPriceEffects({ ...ePriceEffects, [slug]: +e.target.value })}
                          className="brutal-input"
                          style={{ width: '80px', padding: '6px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="brutal-btn brutal-btn-lime" style={{ marginTop: '16px' }} onClick={triggerEvent} disabled={!eTitle}>
                🚨 TRIGGER TARGETED EVENT NOW
              </button>
            </div>

            <div className={styles.activeEvents}>
              <h3 className={styles.cardTitle}>ACTIVE DISASTERS ({events.filter(e => e.status === 'active').length})</h3>
              {events.filter(e => e.status === 'active').map(ev => (
                <div key={ev.id} className={styles.neoCard} style={{ padding: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--hot-pink)', fontSize: '16px' }}>{ev.title}</span>
                    <span className="stat-pill stat-pill-critical" style={{ marginLeft: '8px' }}>{ev.scope.toUpperCase()}</span>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{ev.description}</p>
                  </div>
                  <button className="brutal-btn brutal-btn-white" style={{ fontSize: '11px', padding: '8px 14px' }} onClick={() => expireEvent(ev.id)}>
                    EXPIRE EVENT ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MARKET TAB */}
        {tab === 'market' && (
          <div className={styles.fullViewWrapper}>
            <h3 className={styles.cardTitle}>REAL-TIME PRICE & STOCK EDITOR</h3>
            <div className={styles.marketControlGrid}>
              {marketPrices.map((mp: any) => (
                <div key={mp.id} className={styles.neoCard} style={{ padding: '16px', gap: '10px' }}>
                  <div className={styles.mcTop}>
                    <span style={{ fontSize: '24px' }}>{mp.resource?.icon}</span>
                    <span className={styles.mcName}>{mp.resource?.name}</span>
                  </div>
                  <div className={styles.mcRow}>
                    <label className={styles.fLabel}>CURRENT PRICE ₹</label>
                    <input
                      type="number" min={0}
                      defaultValue={mp.current_price}
                      className="brutal-input"
                      onBlur={e => {
                        supabase.from('market_prices').update({ current_price: +e.target.value, updated_at: new Date().toISOString() }).eq('resource_id', mp.resource_id).then(loadAll)
                      }}
                    />
                  </div>
                  <div className={styles.mcRow}>
                    <label className={styles.fLabel}>AVAILABLE STOCK</label>
                    <input
                      type="number" min={0}
                      defaultValue={mp.stock}
                      className="brutal-input"
                      onBlur={e => {
                        supabase.from('market_prices').update({ stock: +e.target.value }).eq('resource_id', mp.resource_id).then(loadAll)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CHALLENGES & SPEED QUIZZES */}
        {tab === 'challenges' && (
          <div className={styles.fullViewWrapper}>
            <div className={styles.challengeForm}>
              <h3 className={styles.cardTitle}>CREATE SPEED CHALLENGE / CIVIL QUIZ</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}><label className={styles.fLabel}>TITLE</label><input value={cTitle} onChange={e => setCTitle(e.target.value)} className="brutal-input" placeholder="e.g. Structural Shear Force Quiz" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>DESCRIPTION</label><input value={cDesc} onChange={e => setCDesc(e.target.value)} className="brutal-input" placeholder="5 timed multiple-choice questions" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>REWARD ₹</label><input type="number" value={cReward} onChange={e => setCReward(+e.target.value)} className="brutal-input" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>MAX TEAM SLOTS</label><input type="number" min={1} value={cSlots} onChange={e => setCSlots(+e.target.value)} className="brutal-input" /></div>
              </div>
              <button className="brutal-btn brutal-btn-lime" style={{ marginTop: '16px' }} onClick={createChallenge} disabled={!cTitle || !cDesc}>
                ⚡ DEPLOY CHALLENGE
              </button>
            </div>

            <div className={styles.challengeList}>
              <h3 className={styles.cardTitle}>ACTIVE CHALLENGES</h3>
              {challenges.map(ch => (
                <div key={ch.id} className={styles.neoCard} style={{ padding: '14px 18px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#fff', fontSize: '15px' }}>{ch.title}</span>
                    <span className="stat-pill stat-pill-safe" style={{ marginLeft: '8px' }}>{ch.status.toUpperCase()}</span>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {ch.claimed_slots}/{ch.max_slots} slots claimed • Reward: ₹{ch.reward_funds.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button 
                    className="brutal-btn brutal-btn-white" 
                    style={{ color: 'var(--hot-pink)', fontSize: '11px', padding: '6px 12px' }}
                    onClick={async () => {
                      if (confirm(`Delete challenge "${ch.title}"?`)) {
                        await deleteChallengeAction(ch.id)
                        loadAll()
                      }
                    }}
                  >
                    DELETE ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: GAMES & ROUNDS */}
        {tab === 'games' && (
          <div className={styles.fullViewWrapper}>
            <h3 className={styles.cardTitle}>ROUND ORCHESTRATION & ACCESS CODES</h3>
            <div className={styles.gameList} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {games.map(g => (
                <div key={g.id} className={styles.neoCard} style={{ padding: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {g.title}
                      {g.status === 'active' && <span className="stat-pill stat-pill-safe">ACTIVE</span>}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created: {new Date(g.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>ACCESS CODE</div>
                    <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--neon-lime)' }}>{g.access_code}</div>
                    <button 
                      className="brutal-btn brutal-btn-white" 
                      style={{ color: 'var(--hot-pink)', fontSize: '10px', padding: '4px 8px', marginTop: '6px' }}
                      onClick={async () => {
                        if (confirm(`Delete round "${g.title}"?`)) {
                          await deleteGame(g.id)
                          loadAll()
                        }
                      }}
                    >
                      DELETE ROUND
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: CONFIG & DANGER ZONE */}
        {tab === 'config' && (
          <div className={styles.fullViewWrapper}>
            <div className={styles.neoCard} style={{ padding: '32px', borderColor: 'var(--hot-pink)', maxWidth: '640px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--hot-pink)', fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
                🚨 DANGER ZONE
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                Permanently purge all registered teams, reset all tower buildings, clear inventories, and reset commodity prices back to base values.
              </p>
              <button 
                className="brutal-btn brutal-btn-white" 
                style={{ background: 'var(--hot-pink)', color: '#fff', borderColor: '#000', padding: '16px 24px', fontSize: '14px' }}
                onClick={async () => {
                  if (confirm('CRITICAL ACTION: Are you sure you want to completely WIPE all teams and reset the game state?')) {
                    await resetGame()
                    addLog('SYSTEM WIPED: All teams deleted & game state reset.', 'system')
                    loadAll()
                    alert('Game has been reset.')
                  }
                }}
              >
                🚨 WIPE ALL TEAMS & RESET GAME STATE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
