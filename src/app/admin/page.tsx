'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Team, Building, Challenge, Event, City } from '@/lib/supabase/types'
import { 
  resetGame, 
  removeTeam, 
  triggerTargetedEvent, 
  createGame, 
  deleteGame, 
  deleteChallenge as deleteChallengeAction, 
  expireEvent as expireEventAction, 
  createChallenge as createChallengeAction,
  adjustTeamFunds,
  updateMarketPrice as updateMarketPriceAction,
  updateMarketStock as updateMarketStockAction,
  activateChallenge as activateChallengeAction,
  closeChallenge as closeChallengeAction,
  approveChallenge as approveChallengeAction
} from '@/app/actions/admin'
import styles from './page.module.css'

interface TeamFull extends Team {
  city: City | null
  building: Building | null
}

const DISASTER_PRESETS = [
  { title: 'Flood Warning', desc: 'Heavy rainfall floods lower floors. Construction costs +30%. Cement demand spikes.', type: 'disaster', effects: { cement_price_mult: 1.3, construction_delay: true } },
  { title: 'Earthquake Alert', desc: 'Seismic activity damages structural stability by 10 points for all affected buildings.', type: 'disaster', effects: { stability_damage: 10 } },
  { title: 'Steel Shortage', desc: 'Supply chain disruption. Steel prices surge 50%. Stock halved.', type: 'disaster', effects: { steel_price_mult: 1.5, steel_stock_cut: 0.5 } },
  { title: 'Market Boom', desc: 'Construction frenzy! All resource prices drop 20% for 5 minutes.', type: 'bonus', effects: { all_price_mult: 0.8 } },
  { title: 'Government Grant', desc: 'Selected teams receive infrastructure funding bonus.', type: 'bonus', effects: { fund_bonus: 10000 } },
  { title: 'Monsoon Season', desc: 'Heavy rains halt all construction for 3 minutes. Resources still tradeable.', type: 'disaster', effects: { construction_pause: true } },
]

export default function AdminPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamFull[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [games, setGames] = useState<any[]>([])
  const [tab, setTab] = useState<'teams'|'events'|'market'|'challenges'|'games'|'config'|'logs'>('teams')
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<any[]>([])
  const [quizResponses, setQuizResponses] = useState<any[]>([])
  const [marketFeedback, setMarketFeedback] = useState<Record<string, string>>({})

  // Event form state
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

  // Game form
  const [gTitle, setGTitle] = useState('')
  const [gDuration, setGDuration] = useState(30)

  // Challenge form
  const [cTitle, setCTitle] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cType, setCType] = useState('intellectual')
  const [cReward, setCReward] = useState(15000)
  const [cPenalty, setCPenalty] = useState(0)
  const [cSlots, setCSlots] = useState(3)
  const [cDuration, setCDuration] = useState(5)

  // Market control
  const [marketPrices, setMarketPrices] = useState<any[]>([])

  // Funds adjustment
  const [adjTeamId, setAdjTeamId] = useState('')
  const [adjAmount, setAdjAmount] = useState(0)
  const [adjStatus, setAdjStatus] = useState('')

  useEffect(() => {
    async function init() {
      // 1. Check for hardcoded admin cookie
      if (document.cookie.includes('admin_auth=632014')) {
        await loadAll()
        setLoading(false)
        setupRealtime()
        return
      }

      // 2. Fallback to Supabase auth check
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
    const ch = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_prices' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, loadAll)
      
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }

  async function loadAll() {
    const [teamsRes, buildingsRes, citiesRes, challengesRes, eventsRes, marketRes, gamesRes, partsRes, quizRes] = await Promise.all([
      supabase.from('teams').select('*, city:cities(id,name,color,slug,description,advantages,risks,starting_bonus,coordinates_x,coordinates_y,is_coastal,created_at)').order('score', { ascending: false }),
      supabase.from('buildings').select('*'),
      supabase.from('cities').select('*'),
      supabase.from('challenges').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('market_prices').select('*, resource:resources(*)'),
      supabase.from('games').select('*').order('created_at', { ascending: false }),
      supabase.from('challenge_participants').select('*, team:teams(name)'),
      (supabase as any).from('quiz_responses').select('*, team:teams(name)')
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
    setParticipants(partsRes.data || [])
    setQuizResponses(quizRes.data || [])
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
    loadAll()
  }

  async function expireEvent(id: string) {
    await expireEventAction(id)
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
    else { setCTitle(''); setCDesc(''); loadAll() }
  }

  async function activateChallenge(id: string) {
    const res = await activateChallengeAction(id)
    if (!res.success) alert(res.error)
    else loadAll()
  }

  async function closeChallenge(id: string) {
    const res = await closeChallengeAction(id)
    if (!res.success) alert(res.error)
    else loadAll()
  }

  async function adjustFunds() {
    if (!adjTeamId || adjAmount === 0) return
    setAdjStatus('Applying...')
    const res = await adjustTeamFunds(adjTeamId, adjAmount)
    if (!res.success) {
      alert(`Adjustment error: ${res.error}`)
      setAdjStatus('Failed')
    } else {
      setAdjStatus('✅ Applied!')
      setAdjAmount(0)
      await loadAll()
      setTimeout(() => setAdjStatus(''), 3000)
    }
  }

  async function updateMarketPrice(resourceId: string, price: number) {
    setMarketFeedback(prev => ({ ...prev, [`price-${resourceId}`]: 'Saving...' }))
    const res = await updateMarketPriceAction(resourceId, price)
    if (!res.success) {
      alert(`Price update failed: ${res.error}`)
      setMarketFeedback(prev => ({ ...prev, [`price-${resourceId}`]: 'Failed' }))
    } else {
      setMarketFeedback(prev => ({ ...prev, [`price-${resourceId}`]: '✅ Saved' }))
      await loadAll()
      setTimeout(() => setMarketFeedback(prev => ({ ...prev, [`price-${resourceId}`]: '' })), 2500)
    }
  }

  async function updateMarketStock(resourceId: string, stock: number) {
    setMarketFeedback(prev => ({ ...prev, [`stock-${resourceId}`]: 'Saving...' }))
    const res = await updateMarketStockAction(resourceId, stock)
    if (!res.success) {
      alert(`Stock update failed: ${res.error}`)
      setMarketFeedback(prev => ({ ...prev, [`stock-${resourceId}`]: 'Failed' }))
    } else {
      setMarketFeedback(prev => ({ ...prev, [`stock-${resourceId}`]: '✅ Saved' }))
      await loadAll()
      setTimeout(() => setMarketFeedback(prev => ({ ...prev, [`stock-${resourceId}`]: '' })), 2500)
    }
  }

  async function approveChallenge(participantId: string, teamId: string, challengeId: string, success: boolean) {
    const res = await approveChallengeAction(participantId, teamId, challengeId, success)
    if (!res.success) alert(res.error)
    else loadAll()
  }

  if (loading) return (
    <div className={styles.loading}>
      <span style={{ fontSize: '48px' }}>⚙️</span>
      <span className={styles.loadingText}>LOADING COMMAND CENTER...</span>
    </div>
  )

  const TABS = [
    { id: 'teams', label: '👥 Teams', count: teams.length },
    { id: 'events', label: '⚡ Events', count: events.filter(e=>e.status==='active').length },
    { id: 'market', label: '💰 Market', count: null },
    { id: 'challenges', label: '🏆 Challenges', count: challenges.filter(c=>c.status==='active').length },
    { id: 'games', label: '🎮 Games', count: games.length },
    { id: 'config', label: '⚙️ Config', count: null },
    { id: 'logs', label: '📜 Logs', count: null },
  ]

  return (
    <div className={styles.adminPage}>
      {/* ADMIN HEADER */}
      <header className={styles.adminHeader}>
        <div className={styles.adminBrand}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <div>
            <div className={styles.adminTitle}>ADMIN COMMAND CENTER</div>
            <div className={styles.adminSubtitle}>HIGH-RISE HUSTLE - LIVE CONTROL</div>
          </div>
        </div>
        <div className={styles.adminHeaderRight}>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </div>
          <button onClick={() => { supabase.auth.signOut(); router.push('/') }} className="game-btn game-btn-ghost game-btn-sm">Sign Out</button>
        </div>
      </header>

      {/* QUICK STATS */}
      <div className={styles.quickStats}>
        {[
          { label: 'TEAMS', value: teams.length, color: 'var(--electric-blue)' },
          { label: 'LIVE EVENTS', value: events.filter(e=>e.status==='active').length, color: 'var(--hot-pink)' },
          { label: 'ACTIVE CHALLENGES', value: challenges.filter(c=>c.status==='active').length, color: 'var(--yellow)' },
          { label: 'TALLEST TOWER', value: `${Math.max(...teams.map(t => t.building?.height || 0), 0).toFixed(0)}m`, color: 'var(--neon-lime)' },
        ].map(s => (
          <div key={s.label} className={styles.quickStat}>
            <span className={styles.qsValue} style={{ color: s.color }}>{s.value}</span>
            <span className={styles.qsLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id} id={`admin-tab-${t.id}`} className={`${styles.tabBtn} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id as any)}>
            {t.label}
            {t.count !== null && t.count > 0 && <span className={styles.tabCount}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {/* TEAMS TAB */}
        {tab === 'teams' && (
          <div className={styles.teamsTab}>
            <div className={styles.fundsAdj}>
              <h3 className={styles.subTitle}>ADJUST TEAM FUNDS</h3>
              <div className={styles.adjRow}>
                <select id="adj-team" value={adjTeamId} onChange={e=>setAdjTeamId(e.target.value)} className="game-input" style={{flex:1}}>
                  <option value="">Select team...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} (Current: ₹{t.funds.toLocaleString('en-IN')})</option>)}
                </select>
                <input id="adj-amount" type="number" value={adjAmount} onChange={e=>setAdjAmount(+e.target.value)} className="game-input" placeholder="e.g. 10000 or -5000" style={{width:'160px'}} />
                <button id="apply-adj" className="game-btn game-btn-primary" onClick={adjustFunds} disabled={!adjTeamId || adjAmount === 0}>
                  {adjStatus || 'Apply Funds'}
                </button>
                {adjStatus && <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-lime)' }}>{adjStatus}</span>}
              </div>
            </div>
            <div className={styles.teamsGrid}>
              {teams.map((team, i) => (
                <div key={team.id} className={`${styles.teamCard} game-card`}>
                  <div className={styles.teamCardTop}>
                    <div className={styles.teamRank}>#{i+1}</div>
                    <div className={styles.teamCardInfo}>
                      <span className={styles.teamCardName}>{team.name}</span>
                      <span className={styles.teamCardCity} style={{ color: (team.city as any)?.color }}>{(team.city as any)?.name || 'No city'}</span>
                    </div>
                    <span className={styles.teamFunds}>₹{team.funds.toLocaleString('en-IN')}</span>
                  </div>
                  {team.building && (
                    <div className={styles.teamBuildingStats}>
                      <span>H: {team.building.height.toFixed(0)}m</span>
                      <span>F: {team.building.floors}</span>
                      <span>V: ₹{(team.building.building_value/1000).toFixed(0)}K</span>
                      <span style={{color: team.building.structural_stability > 60 ? 'var(--status-safe)' : 'var(--status-critical)'}}>
                        S: {team.building.structural_stability.toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <button 
                    className="game-btn game-btn-danger game-btn-sm" 
                    style={{marginTop: '12px', width: '100%', justifyContent: 'center'}}
                    onClick={async () => {
                      if (confirm(`Remove team ${team.name}?`)) {
                        await removeTeam(team.id)
                        loadAll()
                      }
                    }}
                  >
                    REMOVE TEAM
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {tab === 'events' && (
          <div className={styles.eventsTab}>
            <div className={styles.presetsGrid}>
              <h3 className={styles.subTitle}>QUICK PRESETS</h3>
              <div className={styles.presetBtns}>
                {DISASTER_PRESETS.map(preset => (
                  <button
                    key={preset.title}
                    id={`preset-${preset.title.toLowerCase().replace(/\s+/g,'-')}`}
                    className={`${styles.presetBtn} ${preset.type === 'disaster' ? styles.presetDisaster : styles.presetBonus}`}
                    onClick={() => triggerPreset(preset)}
                  >
                    <span>{preset.type === 'disaster' ? '🚨' : '✅'}</span>
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.eventForm}>
              <h3 className={styles.subTitle}>CREATE CUSTOM EVENT</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>TITLE</label>
                  <input id="event-title" value={eTitle} onChange={e=>setETitle(e.target.value)} className="game-input" placeholder="Event title" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>DESCRIPTION</label>
                  <input id="event-desc" value={eDesc} onChange={e=>setEDesc(e.target.value)} className="game-input" placeholder="Describe the event" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>TYPE</label>
                  <select id="event-type" value={eType} onChange={e=>setEType(e.target.value)} className="game-input">
                    <option value="disaster">Disaster</option>
                    <option value="bonus">Bonus</option>
                    <option value="market">Market</option>
                    <option value="construction">Construction</option>
                    <option value="misc">Misc</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>SCOPE</label>
                  <select id="event-scope" value={eScope} onChange={e=>setEScope(e.target.value)} className="game-input">
                    <option value="global">Global</option>
                    <option value="city">City-specific</option>
                    <option value="team">Team-specific</option>
                  </select>
                </div>
                {eScope === 'city' && (
                  <div className={styles.formRow}>
                    <label className={styles.fLabel}>CITY</label>
                    <select id="event-city" value={eCityId} onChange={e=>setECityId(e.target.value)} className="game-input">
                      <option value="">All cities</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {eScope === 'team' && (
                  <div className={styles.formRow}>
                    <label className={styles.fLabel}>TEAM</label>
                    <select id="event-team" value={eTeamId} onChange={e=>setETeamId(e.target.value)} className="game-input">
                      <option value="">Select team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>DURATION (min)</label>
                  <input id="event-duration" type="number" min={1} value={eDuration} onChange={e=>setEDuration(+e.target.value)} className="game-input" />
                </div>
                
                <h4 style={{gridColumn: '1 / -1', marginTop: '16px', color: 'var(--hot-pink)'}}>TARGETED EFFECTS</h4>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>FUNDS CHANGE</label>
                  <input type="number" value={eFundChange} onChange={e=>setEFundChange(+e.target.value)} className="game-input" placeholder="e.g. -5000" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.fLabel}>STABILITY CHANGE</label>
                  <input type="number" value={eStabilityChange} onChange={e=>setEStabilityChange(+e.target.value)} className="game-input" placeholder="e.g. -10" />
                </div>
                <div className={styles.formRow} style={{gridColumn: '1 / -1'}}>
                  <label className={styles.fLabel}>MARKET PRICE MULTIPLIERS</label>
                  <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                    {['cement','steel','glass','timber','aluminium','copper','labour'].map(slug => (
                      <div key={slug} style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                        <span style={{fontSize:'10px', textTransform:'uppercase'}}>{slug} x</span>
                        <input 
                          type="number" step="0.1"
                          value={ePriceEffects[slug] || 1.0}
                          onChange={e => setEPriceEffects({...ePriceEffects, [slug]: +e.target.value})}
                          className="game-input"
                          style={{width:'80px', padding:'4px 8px'}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button id="trigger-event" className="game-btn game-btn-danger" onClick={triggerEvent} disabled={!eTitle}>
                🚨 TRIGGER EVENT
              </button>
            </div>

            <div className={styles.activeEvents}>
              <h3 className={styles.subTitle}>ACTIVE EVENTS</h3>
              {events.filter(e=>e.status==='active').map(ev => (
                <div key={ev.id} className={`${styles.eventRow} game-card`}>
                  <div>
                    <span className={styles.eventRowTitle}>{ev.title}</span>
                    <span className={`stat-pill ${ev.event_type === 'disaster' ? 'stat-pill-critical' : 'stat-pill-safe'}`} style={{marginLeft:'8px'}}>{ev.scope}</span>
                    <p style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{ev.description}</p>
                  </div>
                  <button id={`expire-${ev.id.slice(0,8)}`} className="game-btn game-btn-ghost game-btn-sm" onClick={() => expireEvent(ev.id)}>Expire</button>
                </div>
              ))}
              {events.filter(e=>e.status==='active').length === 0 && <p style={{color:'var(--text-muted)'}}>No active events</p>}
            </div>
          </div>
        )}

        {/* MARKET TAB */}
        {tab === 'market' && (
          <div className={styles.marketTab}>
            <h3 className={styles.subTitle}>PRICE & STOCK CONTROL</h3>
            <div className={styles.marketControlGrid}>
              {marketPrices.map((mp: any) => (
                <div key={mp.id} className={`${styles.marketControlCard} game-card`}>
                  <div className={styles.mcTop}>
                    <span style={{fontSize:'24px'}}>{mp.resource?.icon}</span>
                    <span className={styles.mcName}>{mp.resource?.name}</span>
                  </div>
                  <div className={styles.mcRow}>
                    <label className={styles.fLabel}>
                      PRICE ₹ {marketFeedback[`price-${mp.resource_id}`] && <span style={{ color: 'var(--neon-lime)' }}>{marketFeedback[`price-${mp.resource_id}`]}</span>}
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        id={`price-${mp.resource?.slug}`}
                        type="number" min={0}
                        defaultValue={mp.current_price}
                        className="game-input"
                        style={{ flex: 1 }}
                        onKeyDown={e => { if (e.key === 'Enter') updateMarketPrice(mp.resource_id, +(e.target as HTMLInputElement).value) }}
                      />
                      <button 
                        className="game-btn game-btn-primary game-btn-sm" 
                        onClick={() => {
                          const input = document.getElementById(`price-${mp.resource?.slug}`) as HTMLInputElement
                          if (input) updateMarketPrice(mp.resource_id, +input.value)
                        }}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                  <div className={styles.mcRow}>
                    <label className={styles.fLabel}>
                      STOCK {marketFeedback[`stock-${mp.resource_id}`] && <span style={{ color: 'var(--neon-lime)' }}>{marketFeedback[`stock-${mp.resource_id}`]}</span>}
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        id={`stock-${mp.resource?.slug}`}
                        type="number" min={0}
                        defaultValue={mp.stock}
                        className="game-input"
                        style={{ flex: 1 }}
                        onKeyDown={e => { if (e.key === 'Enter') updateMarketStock(mp.resource_id, +(e.target as HTMLInputElement).value) }}
                      />
                      <button 
                        className="game-btn game-btn-lime game-btn-sm" 
                        onClick={() => {
                          const input = document.getElementById(`stock-${mp.resource?.slug}`) as HTMLInputElement
                          if (input) updateMarketStock(mp.resource_id, +input.value)
                        }}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHALLENGES TAB */}
        {tab === 'challenges' && (
          <div className={styles.challengesTab}>
            <div className={styles.challengeForm}>
              <h3 className={styles.subTitle}>CREATE CHALLENGE</h3>
              <div className={styles.formGrid}>
                <div className={styles.formRow}><label className={styles.fLabel}>TITLE</label><input id="ch-title" value={cTitle} onChange={e=>setCTitle(e.target.value)} className="game-input" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>DESCRIPTION</label><input id="ch-desc" value={cDesc} onChange={e=>setCDesc(e.target.value)} className="game-input" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>TYPE</label>
                  <select id="ch-type" value={cType} onChange={e=>setCType(e.target.value)} className="game-input">
                    <option value="intellectual">Intellectual</option>
                    <option value="quickfire">Quick-Fire</option>
                    <option value="physical">Physical</option>
                    <option value="venue_mission">Venue Mission</option>
                    <option value="risk">Risk / High-Stakes</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div className={styles.formRow}><label className={styles.fLabel}>REWARD ₹</label><input id="ch-reward" type="number" value={cReward} onChange={e=>setCReward(+e.target.value)} className="game-input" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>PENALTY ₹ (risk)</label><input id="ch-penalty" type="number" value={cPenalty} onChange={e=>setCPenalty(+e.target.value)} className="game-input" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>MAX SLOTS</label><input id="ch-slots" type="number" min={1} value={cSlots} onChange={e=>setCSlots(+e.target.value)} className="game-input" /></div>
                <div className={styles.formRow}><label className={styles.fLabel}>DURATION (min)</label><input id="ch-duration" type="number" min={1} value={cDuration} onChange={e=>setCDuration(+e.target.value)} className="game-input" /></div>
              </div>
              <button id="create-challenge" className="game-btn game-btn-primary" onClick={createChallenge} disabled={!cTitle || !cDesc}>
                ⚡ CREATE CHALLENGE
              </button>
            </div>

            <div className={styles.challengeList}>
              <h3 className={styles.subTitle}>ALL CHALLENGES</h3>
              {challenges.map(ch => {
                const chParticipants = participants.filter(p => p.challenge_id === ch.id)
                const chQuiz = quizResponses.filter(q => q.challenge_id === ch.id)

                return (
                  <div key={ch.id} className={`${styles.chRow} game-card`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className={styles.chInfo}>
                        <span className={styles.chTitle}>{ch.title}</span>
                        <span className={`stat-pill ${ch.status === 'active' ? 'stat-pill-critical' : ch.status === 'closed' ? 'stat-pill-warning' : 'stat-pill-info'}`}>{ch.status}</span>
                        <span style={{fontSize:'12px',color:'var(--text-muted)'}}>
                          {ch.challenge_type.toUpperCase()} • {ch.claimed_slots}/{ch.max_slots} slots • {ch.duration_minutes}m • ₹{ch.reward_funds.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className={styles.chActions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {ch.status === 'upcoming' && <button id={`activate-ch-${ch.id.slice(0,8)}`} className="game-btn game-btn-primary game-btn-sm" onClick={() => activateChallenge(ch.id)}>Activate</button>}
                        {ch.status === 'active' && <button id={`close-ch-${ch.id.slice(0,8)}`} className="game-btn game-btn-ghost game-btn-sm" onClick={() => closeChallenge(ch.id)}>Close</button>}
                        <button 
                          className="game-btn game-btn-ghost game-btn-sm" 
                          style={{ color: 'var(--status-critical)', padding: '4px 8px' }}
                          onClick={async () => {
                            if (confirm(`Delete challenge "${ch.title}"?`)) {
                              const res = await deleteChallengeAction(ch.id)
                              if (!res.success) alert(res.error)
                              else loadAll()
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Participants and live quiz scores */}
                    {chParticipants.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', width: '100%' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          PARTICIPANTS & RESPONSES ({chParticipants.length}/{ch.max_slots}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {chParticipants.map(part => {
                            const qResp = chQuiz.find(q => q.team_id === part.team_id)
                            return (
                              <div key={part.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
                                <div>
                                  <strong>{part.team?.name || 'Team'}</strong>
                                  {qResp && (
                                    <span style={{ marginLeft: '8px', color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                      Score: {qResp.score}/5 ({qResp.time_taken_secs}s)
                                    </span>
                                  )}
                                  <span className={`stat-pill ${part.status === 'success' ? 'stat-pill-safe' : part.status === 'failed' ? 'stat-pill-critical' : 'stat-pill-info'}`} style={{ marginLeft: '8px', fontSize: '10px' }}>
                                    {part.status.toUpperCase()}
                                  </span>
                                </div>
                                {ch.status === 'active' && part.status === 'claimed' && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      className="game-btn game-btn-lime game-btn-sm" 
                                      style={{ fontSize: '11px', padding: '2px 8px' }}
                                      onClick={() => approveChallenge(part.id, part.team_id, ch.id, true)}
                                    >
                                      ✓ Award Winner (+₹{ch.reward_funds.toLocaleString('en-IN')})
                                    </button>
                                    <button 
                                      className="game-btn game-btn-ghost game-btn-sm" 
                                      style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--status-critical)' }}
                                      onClick={() => approveChallenge(part.id, part.team_id, ch.id, false)}
                                    >
                                      ✕ Fail
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'games' && (
          <div style={{color:'var(--text-secondary)',padding:'24px'}}>
            <h3 className={styles.subTitle} style={{marginBottom:'16px'}}>GAMES & ROUNDS</h3>
            <p style={{marginBottom: '24px'}}>Create a new game to generate an access code and set the round countdown timer. Teams must enter this code to unlock their dashboard.</p>
            
            <div className={styles.formRow} style={{maxWidth: '520px', marginBottom: '32px'}}>
              <label className={styles.fLabel}>GAME TITLE & DURATION</label>
              <div style={{display: 'flex', gap: '8px'}}>
                <input type="text" className="game-input" placeholder="e.g. Round 1" value={gTitle} onChange={e => setGTitle(e.target.value)} style={{ flex: 2 }} />
                <input 
                  type="number" 
                  min={1} 
                  max={240}
                  className="game-input" 
                  placeholder="Mins" 
                  value={gDuration} 
                  onChange={e => setGDuration(Math.max(1, +e.target.value))} 
                  style={{ width: '85px', textAlign: 'center' }} 
                  title="Duration in minutes"
                />
                <button 
                  className="game-btn game-btn-primary" 
                  onClick={async () => {
                    if (gTitle) { 
                      const res = await createGame(gTitle, gDuration); 
                      if (!res.success) {
                        alert(`Failed to create game: ${res.error}\n\nDid you run the SQL script to create the 'games' table?`);
                      } else {
                        setGTitle('');
                        loadAll(); 
                      }
                    }
                  }}
                  disabled={!gTitle}
                >
                  START GAME
                </button>
              </div>
            </div>

            <h3 className={styles.subTitle} style={{marginBottom:'16px'}}>GAME HISTORY</h3>
            <div className={styles.gameList} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {games.length === 0 ? <p>No games created yet.</p> : games.map(g => (
                <div key={g.id} style={{padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <h4 style={{color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      {g.title}
                      {g.status === 'active' && <span className="stat-pill stat-pill-safe">ACTIVE</span>}
                    </h4>
                    <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>{new Date(g.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '11px', letterSpacing: '0.1em', color: 'var(--text-muted)'}}>ACCESS CODE</div>
                    <div style={{fontSize: '24px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--neon-lime)', marginBottom: '8px'}}>{g.access_code}</div>
                    <button 
                      className="game-btn game-btn-ghost game-btn-sm" 
                      style={{ color: 'var(--status-critical)', padding: '4px 8px', fontSize: '12px' }}
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete "${g.title}"?`)) {
                          await deleteGame(g.id);
                          loadAll();
                        }
                      }}
                    >
                      DELETE GAME
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div style={{color:'var(--text-secondary)',padding:'24px'}}>
            <h3 className={styles.subTitle} style={{marginBottom:'16px'}}>GAME CONFIGURATION</h3>
            <div className={styles.formRow} style={{maxWidth: '300px', marginBottom: '24px'}}>
              <label className={styles.fLabel}>ROUND ACCESS CODE</label>
              <div style={{display: 'flex', gap: '8px'}}>
                <input id="admin-access-code" type="text" className="game-input" placeholder="New code" />
                <button 
                  className="game-btn game-btn-primary" 
                  onClick={async () => {
                    const code = (document.getElementById('admin-access-code') as HTMLInputElement).value
                    if (code) { await updateAccessCode(code); alert('Access code updated!') }
                  }}
                >
                  Set
                </button>
              </div>
            </div>

            <div style={{marginTop: '40px', padding: '24px', border: '2px solid var(--status-critical)', borderRadius: '4px'}}>
              <h3 style={{color: 'var(--status-critical)', marginBottom: '16px'}}>DANGER ZONE</h3>
              <p style={{marginBottom: '16px', color: 'var(--text-muted)'}}>Wipe all teams, buildings, and inventories. This action cannot be undone.</p>
              <button 
                className="game-btn game-btn-danger" 
                onClick={async () => {
                  if (confirm('ARE YOU SURE? This will permanently delete ALL TEAMS and reset the game.')) {
                    await resetGame()
                    loadAll()
                    alert('Game has been reset.')
                  }
                }}
              >
                🚨 RESET GAME (DELETE ALL TEAMS)
              </button>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div style={{color:'var(--text-secondary)',padding:'24px'}}>
            <h3 className={styles.subTitle} style={{marginBottom:'16px'}}>TRANSACTION LOGS</h3>
            <p style={{color:'var(--text-muted)',fontSize:'13px'}}>View full transaction history in the Supabase dashboard → transactions table.</p>
          </div>
        )}
      </div>
    </div>
  )
}
