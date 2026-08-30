'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function DisplayPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [gameConfig, setGameConfig] = useState<any>({})

  async function load() {
    const [teamsRes, buildingsRes, eventsRes, configRes] = await Promise.all([
      supabase.from('teams').select('id, name, funds, score, city:cities(name, color)').order('score', { ascending: false }),
      supabase.from('buildings').select('team_id, height, floors, building_value, structural_stability, sustainability_score'),
      supabase.from('events').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('game_config').select('*'),
    ])

    const buildMap: Record<string, any> = {}
    buildingsRes.data?.forEach((b: any) => { buildMap[b.team_id] = b })

    const enriched = (teamsRes.data || []).map((t: any) => ({
      ...t,
      building: buildMap[t.id] || null,
      score: (buildMap[t.id]?.height || 0) * 0.25 +
        (buildMap[t.id]?.building_value || 0) / 1000 * 0.25 +
        (buildMap[t.id]?.structural_stability || 100) * 0.2 +
        (buildMap[t.id]?.sustainability_score || 0) * 0.15 +
        (t.funds / 10000) * 0.15
    })).sort((a: any, b: any) => b.score - a.score)

    setEntries(enriched)
    setEvents(eventsRes.data || [])

    const config: Record<string, any> = {}
    configRes.data?.forEach((r: any) => { config[r.key] = r.value })
    setGameConfig(config)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const maxHeight = Math.max(...entries.map(e => e.building?.height || 0), 1)
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className={styles.displayPage}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>🏗️</span>
          <div>
            <div className={styles.headerTitle}>SKYSCRAPER STREET</div>
            <div className={styles.headerSub}>LIVE LEADERBOARD</div>
          </div>
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.roundBadge}>
            ROUND {gameConfig.round || 1} — {gameConfig.round_name?.replace(/"/g, '') || 'In Progress'}
          </span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.livePill}>
            <span className={styles.liveDot} />
            LIVE
          </div>
          <div className={styles.clock} suppressHydrationWarning>
            {new Date().toLocaleTimeString('en-IN')}
          </div>
        </div>
      </header>

      {/* SKYLINE */}
      <div className={styles.skylineSection}>
        <div className={styles.skyline}>
          {entries.slice(0, 12).map((entry, i) => {
            const heightPct = ((entry.building?.height || 0) / maxHeight) * 100
            const city = entry.city as any
            return (
              <div key={entry.id} className={styles.skylineCol}>
                <div className={styles.skylineRank}>#{i + 1}</div>
                <div className={styles.skylineTower} style={{
                  height: `${Math.max(heightPct, 3)}%`,
                  background: `linear-gradient(to top, ${city?.color || '#4361EE'}, ${city?.color || '#4361EE'}88)`,
                  boxShadow: i < 3 ? `0 0 30px ${city?.color || '#4361EE'}60` : 'none',
                }}>
                  <span className={styles.skylineHeightLabel}>
                    {(entry.building?.height || 0).toFixed(0)}m
                  </span>
                </div>
                <span className={styles.skylineTeamLabel}>{entry.name}</span>
              </div>
            )
          })}
        </div>
        <div className={styles.skylineGround} />
      </div>

      {/* PODIUM */}
      <div className={styles.podiumSection}>
        {top3.map((entry, i) => (
          <div key={entry.id} className={`${styles.podiumCard} ${i === 0 ? styles.podiumFirst : i === 1 ? styles.podiumSecond : styles.podiumThird}`}>
            <div className={styles.podiumMedal}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
            <div className={styles.podiumTeamName}>{entry.name}</div>
            <div className={styles.podiumCity} style={{ color: (entry.city as any)?.color }}>{(entry.city as any)?.name}</div>
            <div className={styles.podiumHeight}>{(entry.building?.height || 0).toFixed(0)}m</div>
            <div className={styles.podiumScore}>{entry.score.toFixed(1)} pts</div>
          </div>
        ))}
      </div>

      {/* REST OF RANKINGS */}
      {rest.length > 0 && (
        <div className={styles.restSection}>
          {rest.map((entry, i) => (
            <div key={entry.id} className={styles.restRow}>
              <span className={styles.restRank}>#{i + 4}</span>
              <span className={styles.restName}>{entry.name}</span>
              <span className={styles.restCity} style={{ color: (entry.city as any)?.color }}>{(entry.city as any)?.name || '—'}</span>
              <span className={styles.restHeight}>{(entry.building?.height || 0).toFixed(0)}m</span>
              <span className={styles.restScore}>{entry.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* EVENT TICKER */}
      {events.length > 0 && (
        <div className={styles.ticker}>
          <div className={styles.tickerLabel}>🚨 LIVE EVENT</div>
          <div className={styles.tickerContent}>
            <div className={styles.tickerScroll}>
              {events.map(e => `${e.title.toUpperCase()}: ${e.description}`).join('   ◆   ')}
              &nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;
              {events.map(e => `${e.title.toUpperCase()}: ${e.description}`).join('   ◆   ')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
