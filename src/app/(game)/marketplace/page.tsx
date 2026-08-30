'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import styles from './page.module.css'

export default function MarketplacePage() {
  const { marketPrices, inventory, team, teamId, loadMarket, loadTeamData } = useGameStore()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [mode, setMode] = useState<Record<string, 'buy' | 'sell'>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({})

  function getInvQty(resourceId: string) {
    return inventory.find(i => i.resource_id === resourceId)?.quantity || 0
  }

  function getQty(resourceId: string) { return quantities[resourceId] || 1 }
  function getMode(resourceId: string) { return mode[resourceId] || 'buy' }

  async function handleTransaction(resourceId: string) {
    if (!teamId) return
    const qty = getQty(resourceId)
    const m = getMode(resourceId)
    setLoading(p => ({ ...p, [resourceId]: true }))
    setMessages(p => ({ ...p, [resourceId]: { text: '', ok: true } }))
    try {
      const fn = m === 'buy' ? 'purchase_resource' : 'sell_resource'
      const { data, error } = await supabase.rpc(fn, {
        p_team_id: teamId,
        p_resource_id: resourceId,
        p_quantity: qty
      })
      if (error) throw error
      const result = data as { success: boolean; error?: string; cost?: number; earned?: number }
      if (!result.success) throw new Error(result.error)
      const cost = result.cost || result.earned || 0
      setMessages(p => ({ ...p, [resourceId]: {
        text: m === 'buy' ? `Bought ${qty} units for ₹${cost.toLocaleString('en-IN')}!` : `Sold ${qty} units for ₹${cost.toLocaleString('en-IN')}!`,
        ok: true
      }}))
      await Promise.all([loadMarket(), teamId && loadTeamData(teamId)])
    } catch (e: any) {
      setMessages(p => ({ ...p, [resourceId]: { text: e.message, ok: false } }))
    } finally {
      setLoading(p => ({ ...p, [resourceId]: false }))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2">MARKETPLACE</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Buy and sell resources. Prices update in real time.</p>
        </div>
        <div className={styles.fundsDisplay}>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>YOUR FUNDS</span>
          <span className={styles.fundsValue}>₹{(team?.funds || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className={styles.resourceGrid}>
        {marketPrices.map(mp => {
          const res = mp.resource as any
          const invQty = getInvQty(mp.resource_id)
          const qty = getQty(mp.resource_id)
          const m = getMode(mp.resource_id)
          const totalCost = mp.current_price * qty
          const canAfford = (team?.funds || 0) >= totalCost
          const msg = messages[mp.resource_id]

          return (
            <div key={mp.id} className={`${styles.resourceCard} game-card`}>
              <div className={styles.resourceTop}>
                <span className={styles.resourceIcon}>{res?.icon}</span>
                <div className={styles.resourceInfo}>
                  <h3 className={styles.resourceName}>{res?.name}</h3>
                  <p className={styles.resourceDesc}>{res?.description}</p>
                </div>
              </div>

              <div className={styles.priceRow}>
                <div className={styles.priceBox}>
                  <span className={styles.priceLabel}>PRICE</span>
                  <span className={styles.priceValue}>₹{mp.current_price.toLocaleString('en-IN')}</span>
                  <span className={styles.priceUnit}>per {res?.unit_label}</span>
                </div>
                <div className={styles.stockBox}>
                  <span className={styles.priceLabel}>STOCK</span>
                  <span className={styles.stockValue} style={{ color: mp.stock < 20 ? 'var(--status-critical)' : mp.stock < 50 ? 'var(--status-warning)' : 'var(--status-safe)' }}>
                    {mp.stock}
                  </span>
                </div>
                <div className={styles.invBox}>
                  <span className={styles.priceLabel}>YOU HAVE</span>
                  <span className={styles.invValue}>{invQty}</span>
                </div>
              </div>

              {/* Mode toggle */}
              <div className={styles.modeToggle}>
                <button
                  id={`buy-mode-${res?.slug}`}
                  className={`${styles.modeBtn} ${m === 'buy' ? styles.modeBuyActive : ''}`}
                  onClick={() => setMode(p => ({ ...p, [mp.resource_id]: 'buy' }))}
                >BUY</button>
                <button
                  id={`sell-mode-${res?.slug}`}
                  className={`${styles.modeBtn} ${m === 'sell' ? styles.modeSellActive : ''}`}
                  onClick={() => setMode(p => ({ ...p, [mp.resource_id]: 'sell' }))}
                >SELL</button>
              </div>

              {/* Quantity */}
              <div className={styles.qtyRow}>
                <button className={`game-btn game-btn-ghost game-btn-sm`} onClick={() => setQuantities(p => ({ ...p, [mp.resource_id]: Math.max(1, (p[mp.resource_id] || 1) - 1) }))}>−</button>
                <input
                  id={`qty-${res?.slug}`}
                  type="number"
                  min={1}
                  max={m === 'sell' ? invQty : mp.stock}
                  value={qty}
                  onChange={e => setQuantities(p => ({ ...p, [mp.resource_id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className={`game-input ${styles.qtyInput}`}
                />
                <button className={`game-btn game-btn-ghost game-btn-sm`} onClick={() => setQuantities(p => ({ ...p, [mp.resource_id]: (p[mp.resource_id] || 1) + 1 }))}>+</button>
              </div>

              {/* Total + Action */}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>TOTAL: <strong style={{ color: m === 'buy' ? 'var(--status-critical)' : 'var(--status-safe)' }}>₹{(mp.current_price * qty).toLocaleString('en-IN')}</strong></span>
              </div>

              {msg?.text && (
                <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>
              )}

              <button
                id={`${m}-${res?.slug}`}
                className={`game-btn ${m === 'buy' ? 'game-btn-primary' : 'game-btn-lime'} ${styles.actionBtn}`}
                onClick={() => handleTransaction(mp.resource_id)}
                disabled={loading[mp.resource_id] || (m === 'buy' && !canAfford) || (m === 'buy' && qty > mp.stock) || (m === 'sell' && qty > invQty)}
              >
                {loading[mp.resource_id] ? 'Processing...' : m === 'buy' ? `BUY ${qty} ${res?.unit_label}` : `SELL ${qty} ${res?.unit_label}`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
