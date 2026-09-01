'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import type { FloorType } from '@/lib/supabase/types'
import styles from './page.module.css'

export default function BuildPage() {
  const { team, building, inventory, events, teamId, loadTeamData } = useGameStore()
  const [floorTypes, setFloorTypes] = useState<FloorType[]>([])
  const [selected, setSelected] = useState<FloorType | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null)

  const activeDisasters = events.filter(e => e.status === 'active')
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
    supabase.from('floor_types').select('*').order('tier').then(({ data }) => setFloorTypes(data || []))
  }, [])

  function getInvQty(slug: string) {
    return inventory.find(i => (i.resource as any)?.slug === slug)?.quantity || 0
  }

  function canBuild(ft: FloorType): { ok: boolean; reason?: string } {
    for (const ev of activeDisasters) {
      const eff = (ev.effects as any) || {}
      const rem = ev.end_at ? Math.max(0, Math.floor((new Date(ev.end_at).getTime() - Date.now()) / 1000)) : 0
      const remStr = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`

      // 1. General construction pause
      if (eff.construction_pause || eff.construction_delay) {
        return { ok: false, reason: `🚨 Construction halted by ${ev.title} (${remStr} remaining)` }
      }

      // 2. Coastal Cyclone pause (only for coastal cities)
      if (eff.coastal_pause && (team as any)?.city?.is_coastal) {
        return { ok: false, reason: `🌊 Coastal Cyclone: Construction paused in coastal cities (${remStr} remaining)` }
      }

      // 3. Aviation height cap (Zoning Law Changes)
      if (eff.max_height_cap && (building?.height || 0) >= eff.max_height_cap) {
        return { ok: false, reason: `✈️ Aviation Restriction: No building permitted above ${eff.max_height_cap}m (${remStr} remaining)` }
      }

      // 4. Central Bank freeze (Cash cannot be spent)
      if (eff.bank_freeze && ft.cash_cost > 0) {
        return { ok: false, reason: `🏦 Central Bank Freeze: Cash transactions locked (${remStr} remaining). Barter resources instead!` }
      }
    }

    if (!team || team.funds < ft.cash_cost) return { ok: false, reason: `Need ₹${ft.cash_cost.toLocaleString('en-IN')} (you have ₹${team?.funds.toLocaleString('en-IN')})` }
    const reqs = ft.resource_requirements as Record<string, number>
    for (const [slug, qty] of Object.entries(reqs)) {
      const have = getInvQty(slug)
      if (have < qty) return { ok: false, reason: `Need ${qty} ${slug} (you have ${have})` }
    }
    return { ok: true }
  }

  async function handleBuild() {
    if (!selected || !teamId) return
    setLoading(true)
    setResult(null)
    try {
      const { data, error } = await supabase.rpc('build_floor', {
        p_team_id: teamId,
        p_floor_type_id: selected.id
      })
      if (error) throw error
      const res = data as { success: boolean; error?: string; height_gain?: number }
      if (!res.success) throw new Error(res.error)
      setResult({ text: `✅ ${selected.name} built! +${res.height_gain}m height`, ok: true })
      setSelected(null)
      await loadTeamData(teamId)
    } catch (e: any) {
      setResult({ text: e.message, ok: false })
    } finally {
      setLoading(false)
    }
  }

  const tierGroups = [1, 2, 3].map(tier => ({
    tier,
    label: tier === 1 ? 'FOUNDATION' : tier === 2 ? 'MID-RISE' : 'SKYSCRAPER',
    floors: floorTypes.filter(f => f.tier === tier)
  }))

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2">CONSTRUCTION</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a floor type to build. Resources are consumed immediately.</p>
        </div>
        {building && (
          <div className={styles.buildingStats}>
            <div className={styles.bStat}><span className={styles.bStatLab}>HEIGHT</span><span className={styles.bStatVal} style={{color:'var(--neon-lime)'}}>{building.height.toFixed(0)}m</span></div>
            <div className={styles.bStat}><span className={styles.bStatLab}>FLOORS</span><span className={styles.bStatVal} style={{color:'var(--electric-blue)'}}>{building.floors}</span></div>
            <div className={styles.bStat}><span className={styles.bStatLab}>VALUE</span><span className={styles.bStatVal} style={{color:'var(--yellow)'}}>₹{building.building_value.toLocaleString('en-IN')}</span></div>
          </div>
        )}
      </div>

      {activeDisaster && disasterRemaining > 0 && (
        <div style={{
          background: 'rgba(255,0,85,0.15)',
          border: '3px solid #ff0055',
          boxShadow: '0 0 35px rgba(255,0,85,0.4)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '28px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '44px', display: 'block', marginBottom: '8px' }}>🚨</span>
          <h2 style={{ color: '#ff0055', fontSize: '22px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
            CONSTRUCTION TEMPORARILY HALTED: {activeDisaster.title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '15px' }}>
            {activeDisaster.description}
          </p>
          <div style={{ 
            display: 'inline-block', 
            background: '#000', 
            color: '#ff0055', 
            border: '2px solid #ff0055', 
            padding: '8px 24px', 
            borderRadius: '8px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '22px',
            fontWeight: 800
          }}>
            RESUMING IN: {Math.floor(disasterRemaining / 60)}:{String(disasterRemaining % 60).padStart(2, '0')}
          </div>
        </div>
      )}

      {result && (
        <div className={`${styles.resultMsg} ${result.ok ? styles.resultOk : styles.resultErr}`}>{result.text}</div>
      )}

      {selected && (
        <div className={`${styles.buildConfirm} game-card game-card-glow-lime`}>
          <div className={styles.confirmTop}>
            <span style={{ fontSize: '32px' }}>{selected.icon}</span>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{selected.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{selected.description}</p>
            </div>
          </div>
          <div className={styles.confirmStats}>
            <div className={styles.cStat}><span className={styles.cStatLab}>+HEIGHT</span><span className={styles.cStatVal} style={{color:'var(--neon-lime)'}}>+{selected.height_gain}m</span></div>
            <div className={styles.cStat}><span className={styles.cStatLab}>+VALUE</span><span className={styles.cStatVal} style={{color:'var(--yellow)'}}>+₹{selected.building_value_gain.toLocaleString('en-IN')}</span></div>
            <div className={styles.cStat}><span className={styles.cStatLab}>STABILITY</span><span className={styles.cStatVal} style={{color: selected.stability_effect >= 0 ? 'var(--status-safe)' : 'var(--status-critical)'}}>{selected.stability_effect >= 0 ? '+' : ''}{selected.stability_effect}</span></div>
            <div className={styles.cStat}><span className={styles.cStatLab}>ECO</span><span className={styles.cStatVal} style={{color: selected.sustainability_effect >= 0 ? 'var(--mint)' : 'var(--status-warning)'}}>{selected.sustainability_effect >= 0 ? '+' : ''}{selected.sustainability_effect}</span></div>
          </div>
          <div className={styles.confirmReqs}>
            <span className={styles.reqLabel}>REQUIRES:</span>
            <div className={styles.reqList}>
              {selected.cash_cost > 0 && (
                <span className={`${styles.reqItem} ${team && team.funds >= selected.cash_cost ? styles.reqOk : styles.reqFail}`}>
                  💰 ₹{selected.cash_cost.toLocaleString('en-IN')} (have ₹{(team?.funds || 0).toLocaleString('en-IN')})
                </span>
              )}
              {Object.entries(selected.resource_requirements as Record<string, number>).map(([slug, qty]) => {
                const have = getInvQty(slug)
                return (
                  <span key={slug} className={`${styles.reqItem} ${have >= qty ? styles.reqOk : styles.reqFail}`}>
                    {slug}: {qty} (have: {have})
                  </span>
                )
              })}
            </div>
          </div>
          <div className={styles.confirmActions}>
            <button className="game-btn game-btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
            <button
              id="confirm-build"
              className="game-btn game-btn-primary game-btn-lg"
              onClick={handleBuild}
              disabled={loading || !canBuild(selected).ok}
            >
              {loading ? 'Building...' : `🔨 BUILD ${selected.name.toUpperCase()}`}
            </button>
          </div>
          {!canBuild(selected).ok && (
            <div className={styles.cantBuild}>{canBuild(selected).reason}</div>
          )}
        </div>
      )}

      {tierGroups.map(group => (
        <div key={group.tier} className={styles.tierSection}>
          <div className={styles.tierHeader}>
            <span className={styles.tierBadge} style={{ background: group.tier === 1 ? 'var(--electric-blue)' : group.tier === 2 ? 'var(--electric-purple)' : 'var(--hot-pink)' }}>TIER {group.tier}</span>
            <h2 className={styles.tierTitle}>{group.label}</h2>
          </div>
          <div className={styles.floorGrid}>
            {group.floors.map(ft => {
              const buildCheck = canBuild(ft)
              const isSelected = selected?.id === ft.id
              return (
                <button
                  key={ft.id}
                  id={`floor-${ft.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`${styles.floorCard} ${isSelected ? styles.floorCardSelected : ''} ${!buildCheck.ok ? styles.floorCardDisabled : ''}`}
                  onClick={() => setSelected(ft)}
                >
                  <span className={styles.floorIcon}>{ft.icon}</span>
                  <h3 className={styles.floorName}>{ft.name}</h3>
                  <div className={styles.floorQuickStats}>
                    <span style={{color:'var(--neon-lime)'}}>+{ft.height_gain}m</span>
                    <span style={{color:'var(--yellow)'}}>₹{ft.building_value_gain.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={styles.floorCost}>Cost: ₹{ft.cash_cost.toLocaleString('en-IN')}</div>
                  {!buildCheck.ok && <div className={styles.floorLocked}>🔒 {buildCheck.reason}</div>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
