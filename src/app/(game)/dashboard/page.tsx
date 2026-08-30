'use client'
import { useGameStore } from '@/store/gameStore'
import styles from './page.module.css'
import Link from 'next/link'

export default function DashboardPage() {
  const { team, building, inventory, events, notifications, marketPrices } = useGameStore()

  const unreadNotifs = notifications.filter(n => !n.read)
  const activeEvents = events.filter(e => e.status === 'active')

  const stabilityColor = building
    ? building.structural_stability > 60
      ? 'var(--status-safe)'
      : building.structural_stability > 30
        ? 'var(--status-warning)'
        : 'var(--status-critical)'
    : 'var(--text-muted)'

  return (
    <div className={styles.dashboard}>
      {/* PAGE HEADER */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={`text-h2 ${styles.pageTitle}`}>TEAM DASHBOARD</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {team?.name} — Real-time command center
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/build" className="game-btn game-btn-primary">🔨 BUILD FLOOR</Link>
          <Link href="/marketplace" className="game-btn game-btn-blue">💰 BUY RESOURCES</Link>
        </div>
      </div>

      {/* STATS ROW */}
      <div className={styles.statsRow}>
        {[
          { label: 'FUNDS', value: `₹${(team?.funds || 0).toLocaleString('en-IN')}`, icon: '💰', color: 'var(--yellow)', glow: 'game-card-glow-lime' },
          { label: 'HEIGHT', value: `${(building?.height || 0).toFixed(0)}m`, icon: '📐', color: 'var(--neon-lime)', glow: 'game-card-glow-lime' },
          { label: 'FLOORS', value: building?.floors || 0, icon: '🏢', color: 'var(--electric-blue)', glow: 'game-card-glow-blue' },
          { label: 'BUILDING VALUE', value: `₹${(building?.building_value || 0).toLocaleString('en-IN')}`, icon: '🏆', color: 'var(--hot-pink)', glow: 'game-card-glow-pink' },
        ].map(stat => (
          <div key={stat.label} className={`${styles.statCard} game-card ${stat.glow}`}>
            <span className={styles.statIcon}>{stat.icon}</span>
            <div>
              <div className={styles.statValue} style={{ color: stat.color }}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className={styles.mainGrid}>
        {/* Tower Visualization */}
        <div className={`${styles.towerCard} game-card game-card-glow-lime`}>
          <div className={styles.cardHeader}>
            <h2 className="text-h4">🏗️ YOUR TOWER</h2>
            <Link href="/build" className="game-btn game-btn-lime game-btn-sm">Build Floor</Link>
          </div>
          <div className={styles.towerViz}>
            {building && building.floors > 0 ? (
              <div className={styles.towerBuilding}>
                <div className={styles.towerScrollWrap}>
                  <div className={styles.towerFloors}>
                    {((building.floor_history as any[]) || []).map((floor: any, i: number, arr: any[]) => {
                      // Color shifts from blue (bottom) to purple (mid) to pink (top)
                      const progress = i / Math.max(arr.length - 1, 1)
                      const hue = 200 + progress * 160
                      const sat = 55 + progress * 20
                      const lit = 32 + progress * 18
                      // Width narrows as building gets taller (perspective taper)
                      const width = Math.max(40, 90 - progress * 40)
                      return (
                        <div
                          key={i}
                          className={styles.towerFloor}
                          style={{
                            width: `${width}%`,
                            background: `hsl(${hue}, ${sat}%, ${lit}%)`,
                          }}
                          title={`Floor ${i + 1}: ${floor.floor_name || 'Unknown'}`}
                        >
                          <span className={styles.towerFloorLabel}>
                            {arr.length - i}. {floor.floor_name || 'Floor'}
                          </span>
                        </div>
                      )
                    }).reverse()}
                  </div>
                </div>
                <div className={styles.towerGround} />
              </div>
            ) : (
              <div className={styles.towerEmpty}>
                <span style={{ fontSize: '48px' }}>🏗️</span>
                <p>No floors yet. Start building!</p>
                <Link href="/build" className="game-btn game-btn-primary">Build First Floor</Link>
              </div>
            )}
          </div>
          {/* Stats below tower */}
          {building && (
            <div className={styles.towerStats}>
              <div className={styles.towerStatItem}>
                <span className={styles.towerStatLabel}>STABILITY</span>
                <div className="progress-bar" style={{ flex: 1, margin: '0 8px' }}>
                  <div className={`progress-bar-fill ${building.structural_stability > 60 ? 'progress-green' : building.structural_stability > 30 ? 'progress-yellow' : 'progress-red'}`}
                    style={{ width: `${building.structural_stability}%` }} />
                </div>
                <span style={{ color: stabilityColor, fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                  {building.structural_stability.toFixed(0)}%
                </span>
              </div>
              <div className={styles.towerStatItem}>
                <span className={styles.towerStatLabel}>SUSTAINABILITY</span>
                <div className="progress-bar" style={{ flex: 1, margin: '0 8px' }}>
                  <div className="progress-bar-fill progress-lime" style={{ width: `${Math.min(100, building.sustainability_score)}%` }} />
                </div>
                <span style={{ color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                  {building.sustainability_score.toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          {/* Active Events */}
          <div className={`${styles.eventsCard} game-card ${activeEvents.some(e => e.event_type === 'disaster') ? 'game-card-glow-red' : ''}`}>
            <div className={styles.cardHeader}>
              <h2 className="text-h4">
                {activeEvents.some(e => e.event_type === 'disaster') ? '🚨 ACTIVE DISASTERS' : '📡 LIVE EVENTS'}
              </h2>
              <span className={`stat-pill ${activeEvents.length > 0 ? 'stat-pill-critical' : 'stat-pill-safe'}`}>
                {activeEvents.length} active
              </span>
            </div>
            <div className={styles.eventsList}>
              {activeEvents.length === 0 ? (
                <div className={styles.emptyState}>
                  <span>✅ No active events</span>
                  <p>The city is calm... for now.</p>
                </div>
              ) : activeEvents.map(event => (
                <div key={event.id} className={`${styles.eventItem} ${event.event_type === 'disaster' ? styles.eventDisaster : event.event_type === 'bonus' ? styles.eventBonus : styles.eventMisc}`}>
                  <div className={styles.eventTop}>
                    <span className={styles.eventTitle}>{event.title}</span>
                    <span className={`stat-pill ${event.event_type === 'disaster' ? 'stat-pill-critical' : 'stat-pill-safe'}`}>
                      {event.scope}
                    </span>
                  </div>
                  <p className={styles.eventDesc}>{event.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory */}
          <div className={`${styles.inventoryCard} game-card`}>
            <div className={styles.cardHeader}>
              <h2 className="text-h4">📦 INVENTORY</h2>
              <Link href="/marketplace" className="game-btn game-btn-ghost game-btn-sm">Buy More</Link>
            </div>
            <div className={styles.inventoryGrid}>
              {inventory.length === 0 ? (
                <div className={styles.emptyState} style={{ gridColumn: '1/-1' }}>
                  <span>No resources yet</span>
                  <Link href="/marketplace" className="game-btn game-btn-blue game-btn-sm">Go to Marketplace</Link>
                </div>
              ) : inventory.filter(i => i.quantity > 0).map(item => (
                <div key={item.resource_id} className={styles.inventoryItem}>
                  <span className={styles.inventoryIcon}>{(item.resource as any)?.icon || '📦'}</span>
                  <div className={styles.inventoryInfo}>
                    <span className={styles.inventoryName}>{(item.resource as any)?.name}</span>
                    <span className={styles.inventoryQty}>{item.quantity} {(item.resource as any)?.unit_label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className={`${styles.notifCard} game-card`}>
            <div className={styles.cardHeader}>
              <h2 className="text-h4">🔔 NOTIFICATIONS</h2>
              {unreadNotifs.length > 0 && (
                <span className="stat-pill stat-pill-warning">{unreadNotifs.length} new</span>
              )}
            </div>
            <div className={styles.notifList}>
              {notifications.slice(0, 8).length === 0 ? (
                <div className={styles.emptyState}><span>No notifications</span></div>
              ) : notifications.slice(0, 8).map(notif => (
                <div key={notif.id} className={`${styles.notifItem} ${!notif.read ? styles.notifUnread : ''}`}>
                  <span className={`notif-dot notif-dot-${notif.notif_type === 'disaster' ? 'disaster' : notif.notif_type === 'success' ? 'success' : 'info'}`} />
                  <div className={styles.notifContent}>
                    <span className={styles.notifTitle}>{notif.title}</span>
                    <span className={styles.notifMsg}>{notif.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
