'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import styles from './page.module.css'

interface LeaderboardEntry {
  id: string
  name: string
  city: { name: string; color: string } | null
  funds: number
  score: number
  building: {
    height: number
    floors: number
    building_value: number
    structural_stability: number
    sustainability_score: number
  } | null
}

export default function LeaderboardPage() {
  const { teamId } = useGameStore()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, funds, score, city:cities(name, color)')
      .order('score', { ascending: false })

    if (!teams) return

    const teamIds = teams.map(t => t.id)
    const { data: buildings } = await supabase
      .from('buildings')
      .select('team_id, height, floors, building_value, structural_stability, sustainability_score')
      .in('team_id', teamIds)

    const buildingMap: Record<string, any> = {}
    buildings?.forEach(b => { buildingMap[b.team_id] = b })

    const enriched: LeaderboardEntry[] = teams.map((t: any) => ({
      ...t,
      building: buildingMap[t.id] || null
    }))

    // Recalculate score locally for display
    enriched.sort((a, b) => {
      const scoreA = (a.building?.height || 0) * 0.25 + (a.building?.building_value || 0) / 1000 * 0.25 + (a.building?.structural_stability || 0) * 0.2 + (a.building?.sustainability_score || 0) * 0.15 + (a.funds / 10000) * 0.15
      const scoreB = (b.building?.height || 0) * 0.25 + (b.building?.building_value || 0) / 1000 * 0.25 + (b.building?.structural_stability || 0) * 0.2 + (b.building?.sustainability_score || 0) * 0.15 + (b.funds / 10000) * 0.15
      return scoreB - scoreA
    })

    setEntries(enriched)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      load()
    }, 15000)

    const channel = supabase.channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, load)
      .subscribe()
    return () => { 
      clearInterval(interval)
      supabase.removeChannel(channel) 
    }
  }, [])

  const maxHeight = Math.max(...entries.map(e => e.building?.height || 0), 1)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            🏆 LEADERBOARD 
            <span style={{ fontSize: '12px', background: 'var(--status-safe)', color: 'black', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>LIVE</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Live rankings. Updates in real time.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={load} className="game-btn game-btn-primary">🔄 REFRESH</button>
          <a href="/display" target="_blank" className="game-btn game-btn-ghost" id="open-display">📺 Display Mode</a>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading rankings...</div>
      ) : (
        <>
          {/* Skyline Visualization */}
          <div className={`${styles.skylineCard} game-card`}>
            <h2 className="text-h4" style={{ marginBottom: '16px' }}>CITY SKYLINE</h2>
            <div className={styles.skyline}>
              {entries.slice(0, 10).map((entry, i) => {
                const heightPct = ((entry.building?.height || 0) / maxHeight) * 100
                const city = entry.city as any
                return (
                  <div key={entry.id} className={styles.skylineBuilding}>
                    <div className={styles.skylineTower} style={{
                      height: `${Math.max(heightPct, 5)}%`,
                      background: city?.color || 'var(--electric-blue)',
                      boxShadow: entry.id === teamId ? `0 0 20px ${city?.color || 'var(--electric-blue)'}` : 'none',
                      border: entry.id === teamId ? `2px solid ${city?.color || 'white'}` : 'none',
                    }}>
                      <span className={styles.skylineHeight}>{(entry.building?.height || 0).toFixed(0)}m</span>
                    </div>
                    <span className={styles.skylineLabel}>{entry.name.slice(0, 8)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rankings Table */}
          <div className={`${styles.rankTable} game-card`}>
            <div className={styles.tableHeader}>
              <span className={styles.thRank}>RANK</span>
              <span className={styles.thTeam}>TEAM</span>
              <span className={styles.thCity}>CITY</span>
              <span className={styles.thHeight}>HEIGHT</span>
              <span className={styles.thFloors}>FLOORS</span>
              <span className={styles.thValue}>VALUE</span>
              <span className={styles.thStability}>STABILITY</span>
              <span className={styles.thFunds}>FUNDS</span>
              <span className={styles.thScore}>SCORE</span>
            </div>
            {entries.map((entry, i) => {
              const isMe = entry.id === teamId
              const city = entry.city as any
              const score = (entry.building?.height || 0) * 0.25 + (entry.building?.building_value || 0) / 1000 * 0.25 + (entry.building?.structural_stability || 0) * 0.2 + (entry.building?.sustainability_score || 0) * 0.15 + (entry.funds / 10000) * 0.15
              return (
                <div key={entry.id} className={`${styles.tableRow} ${isMe ? styles.tableRowMe : ''} ${i === 0 ? styles.tableRowFirst : ''}`}>
                  <span className={styles.tdRank}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className={styles.tdTeam}>
                    {entry.name} {isMe && <span className={styles.youBadge}>YOU</span>}
                  </span>
                  <span className={styles.tdCity}>
                    <span className={styles.cityDot} style={{ background: city?.color || 'white' }} />
                    {city?.name || '—'}
                  </span>
                  <span className={styles.tdHeight} style={{ color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {(entry.building?.height || 0).toFixed(0)}m
                  </span>
                  <span className={styles.tdFloors} style={{ fontFamily: 'var(--font-mono)' }}>{entry.building?.floors || 0}</span>
                  <span className={styles.tdValue} style={{ color: 'var(--yellow)', fontFamily: 'var(--font-mono)' }}>₹{((entry.building?.building_value || 0) / 1000).toFixed(0)}K</span>
                  <span className={styles.tdStability}>
                    <div className="progress-bar" style={{ width: '60px', display: 'inline-flex' }}>
                      <div className={`progress-bar-fill ${(entry.building?.structural_stability || 100) > 60 ? 'progress-green' : 'progress-red'}`}
                        style={{ width: `${entry.building?.structural_stability || 100}%` }} />
                    </div>
                  </span>
                  <span className={styles.tdFunds} style={{ fontFamily: 'var(--font-mono)' }}>₹{(entry.funds / 1000).toFixed(0)}K</span>
                  <span className={styles.tdScore} style={{ color: 'var(--hot-pink)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {score.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
