'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useGameStore } from '@/store/gameStore'
import { EVENT_PRESETS } from '@/app/actions/admin'
import styles from './page.module.css'

export default function EventsPage() {
  const { events, team, loadEvents } = useGameStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const activeEvents = (events || []).filter(e => e && e.status === 'active')
  const pastEvents = (events || []).filter(e => e && e.status !== 'active')

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2">🚨 DISASTERS & CITY CRISES</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Real-time emergency monitoring, environmental hazards, and economic shocks.
          </p>
        </div>
        <div className={styles.headerStats}>
          <span className={`stat-pill ${activeEvents.length > 0 ? 'stat-pill-critical' : 'stat-pill-safe'}`}>
            {activeEvents.length > 0 ? `🔴 ${activeEvents.length} CRISES LIVE` : '🟢 CITY STATUS NORMAL'}
          </span>
        </div>
      </div>

      {/* ACTIVE EVENTS */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>🔴 ACTIVE CRISES & EMERGENCIES</div>
        
        {activeEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🛡️</span>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>No Active Crises</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: 0 }}>
              The city is calm. All construction and marketplace transactions are operating normally. Watch this channel for sudden disaster alerts.
            </p>
          </div>
        ) : (
          <div className={styles.liveGrid}>
            {activeEvents.map(ev => {
              const rem = ev.end_at ? Math.max(0, Math.floor((new Date(ev.end_at).getTime() - now) / 1000)) : 0
              const remMin = Math.floor(rem / 60)
              const remSec = String(rem % 60).padStart(2, '0')
              const eff = (ev.effects as any) || {}
              const isCoastalTeam = Boolean((team as any)?.city?.is_coastal)

              // Check team specific impact
              let impactType = 'safe'
              let impactMsg = 'Your team is operating under standard safety conditions.'

              if (eff.coastal_pause) {
                if (isCoastalTeam) {
                  impactType = 'warning'
                  impactMsg = `⚠️ ALERT: Your city (${(team as any)?.city?.name || 'Coastal'}) is in the cyclone path! Floor construction is frozen for the duration.`
                } else {
                  impactMsg = `✅ Your city is inland — you are shielded from coastal winds and can continue building.`
                }
              } else if (eff.marketplace_offline) {
                impactType = 'warning'
                impactMsg = `🔌 Marketplace is offline! Use the Inter-Team Trading floor to barter for materials.`
              } else if (eff.bank_freeze) {
                impactType = 'warning'
                impactMsg = `🏦 Virtual cash spending is temporarily frozen! Construction requires direct resource bartering.`
              } else if (eff.max_height_cap) {
                impactType = 'warning'
                impactMsg = `✈️ Aviation Restriction: No tower can exceed ${eff.max_height_cap}m while this restriction is active.`
              }

              return (
                <div key={ev.id} className={`${styles.liveCard} game-card`}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>
                      <span>🚨</span>
                      <span>{ev.title}</span>
                      <span className="stat-pill stat-pill-info" style={{ fontSize: '11px' }}>
                        {(ev.scope || 'global').toUpperCase()}
                      </span>
                    </div>
                    <span className="stat-pill stat-pill-critical" style={{ fontSize: '13px', padding: '6px 12px', fontWeight: 700 }}>
                      ⏱️ {remMin}:{remSec} REMAINING
                    </span>
                  </div>

                  <p className={styles.cardDesc}>{ev.description}</p>

                  <div className={styles.effectBox}>
                    <strong>⚡ In-Game Effect:</strong> {eff.effectSummary || 'Real-time hazard effects active across markets and construction.'}
                  </div>

                  <div className={`${styles.teamImpactBox} ${impactType === 'warning' ? styles.impactWarning : styles.impactSafe}`}>
                    {impactMsg}
                  </div>

                  {eff.marketplace_offline && (
                    <div style={{ marginTop: '16px' }}>
                      <Link href="/trade" className="game-btn game-btn-lime game-btn-sm">
                        🤝 GO TO TRADE FLOOR TO BARTER →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DISASTER INTEL: 12 KNOWN EVENT HAZARDS */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>📋 CITY DISASTER & HAZARD DIRECTORY (12 HAZARDS)</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
          Study known city hazards to anticipate commodity shocks, prepare barter reserves, and protect your structural stability.
        </p>

        <div className={styles.presetsGrid}>
          {EVENT_PRESETS.map(preset => {
            const isLive = activeEvents.some(ae => (ae.effects as any)?.preset_id === preset.id || ae.title === preset.title)
            return (
              <div 
                key={preset.id} 
                className={`${styles.presetCard} game-card`} 
                style={{ border: isLive ? '2px solid var(--hot-pink)' : '1px solid var(--border-subtle)' }}
              >
                <div>
                  <div className={styles.presetHeader}>
                    <div className={styles.presetTitle}>
                      <span>{preset.icon}</span>
                      <span>{preset.title}</span>
                    </div>
                    <span className={`stat-pill ${isLive ? 'stat-pill-critical' : 'stat-pill-info'}`} style={{ fontSize: '10px' }}>
                      {isLive ? '🔴 LIVE' : `${preset.duration}m`}
                    </span>
                  </div>
                  <p className={styles.presetDesc}>{preset.desc}</p>
                </div>
                <div className={styles.presetEffect}>
                  ⚡ {preset.effectSummary}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PAST CRISIS HISTORY */}
      {pastEvents.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>📜 CRISIS HISTORY LOG</div>
          <div className={styles.historyList}>
            {pastEvents.slice(0, 10).map(pe => (
              <div key={pe.id} className={`${styles.historyItem} game-card`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <strong style={{ color: '#fff' }}>{pe.title}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                      {pe.description}
                    </span>
                  </div>
                </div>
                <span className="stat-pill stat-pill-ghost" style={{ fontSize: '10px' }}>
                  CONCLUDED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
