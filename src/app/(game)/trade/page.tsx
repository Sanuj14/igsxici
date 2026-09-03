'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import type { Trade, Team } from '@/lib/supabase/types'
import styles from './page.module.css'
import { createTradeOfferAction, respondTradeAction } from '@/app/actions/trade'

export default function TradePage() {
  const { teamId, team, resources, inventory, loadTeamData } = useGameStore()
  const [trades, setTrades] = useState<(Trade & { from_team: Team; to_team: Team })[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [showForm, setShowForm] = useState(false)
  const [toTeamId, setToTeamId] = useState('')
  const [offerFunds, setOfferFunds] = useState(0)
  const [requestFunds, setRequestFunds] = useState(0)
  const [offerRes, setOfferRes] = useState<Record<string, number>>({})
  const [requestRes, setRequestRes] = useState<Record<string, number>>({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  async function loadTrades() {
    if (!teamId) return
    const { data } = await supabase
      .from('trades')
      .select('*, from_team:teams!from_team_id(id,name), to_team:teams!to_team_id(id,name)')
      .or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`)
      .order('created_at', { ascending: false })
    setTrades((data as any) || [])
  }

  useEffect(() => {
    if (!teamId) return
    loadTrades()
    supabase.from('teams').select('id,name').neq('id', teamId).then(({ data }) => setTeams(data || []))

    // Realtime subscription for trade updates & inventory updates
    const ch = supabase.channel(`trades-page-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        loadTrades()
        loadTeamData(teamId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_inventory', filter: `team_id=eq.${teamId}` }, () => {
        loadTeamData(teamId)
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [teamId])

  async function sendTrade(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !toTeamId) return

    setLoading(true)
    setResult('')

    try {
      const res = await createTradeOfferAction(
        teamId,
        toTeamId,
        offerFunds,
        requestFunds,
        offerRes,
        requestRes,
        message
      )

      if (!res.success) {
        setResult(`❌ ${res.error}`)
      } else {
        setResult('✅ Trade offer sent successfully! Recipient has been notified.')
        setShowForm(false)
        setOfferFunds(0)
        setRequestFunds(0)
        setOfferRes({})
        setRequestRes({})
        setMessage('')
        await Promise.all([loadTrades(), loadTeamData(teamId)])
      }
    } catch (err: any) {
      setResult(`❌ ${err.message || 'Failed to send trade.'}`)
    } finally {
      setLoading(false)
    }
  }

  async function respondTrade(tradeId: string, accept: boolean) {
    if (!teamId) return
    setLoading(true)
    try {
      const res = await respondTradeAction(tradeId, teamId, accept)
      if (!res.success) {
        alert(res.error)
      } else {
        setResult(accept ? '✅ Trade accepted! Funds and materials transferred.' : 'Trade declined.')
        await Promise.all([
          loadTrades(),
          loadTeamData(teamId)
        ])
      }
    } catch (err: any) {
      alert('Trade error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const incoming = trades.filter(t => t.to_team_id === teamId && t.status === 'pending')
  const outgoing = trades.filter(t => t.from_team_id === teamId)
  const history = trades.filter(t => t.to_team_id === teamId && t.status !== 'pending')

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2">🤝 TRADING CENTER</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Negotiate trades with other teams. Trade commodities, barters, and cash in real time.
          </p>
        </div>
        <button id="new-trade" className="game-btn game-btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Close Form' : '+ New Trade Offer'}
        </button>
      </div>

      {result && <div className={styles.resultMsg}>{result}</div>}

      {showForm && (
        <div className={`${styles.tradeForm} game-card game-card-glow-blue`}>
          <h2 className="text-h4" style={{ marginBottom: '16px' }}>CREATE TRADE OFFER</h2>
          <form onSubmit={sendTrade} className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>SEND TO TEAM</label>
              <select id="trade-to-team" value={toTeamId} onChange={e => setToTeamId(e.target.value)} className="game-input" required>
                <option value="">Select team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className={styles.tradeColumns}>
              {/* SENDER OFFERS */}
              <div className={styles.tradeCol}>
                <div className={styles.colHeader} style={{ color: 'var(--hot-pink)' }}>
                  YOU OFFER (YOUR ITEMS)
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>
                    FUNDS (₹) <span style={{ color: 'var(--yellow)', fontSize: '11px', fontWeight: 600 }}>({(team?.funds || 0).toLocaleString('en-IN')} available)</span>
                  </label>
                  <input
                    id="offer-funds"
                    type="number"
                    min={0}
                    max={team?.funds || 0}
                    value={offerFunds}
                    onChange={e => setOfferFunds(Math.max(0, +e.target.value))}
                    className="game-input"
                  />
                </div>
                {resources.map(r => {
                  const inv = inventory.find(i => i.resource_id === r.id)?.quantity || 0
                  return (
                    <div key={r.id} className={styles.formRow}>
                      <label className={styles.label}>
                        {r.icon} {r.name} <span style={{ color: inv > 0 ? 'var(--neon-lime)' : 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>({inv} available)</span>
                      </label>
                      <input
                        id={`offer-${r.slug}`}
                        type="number"
                        min={0}
                        max={inv}
                        value={offerRes[r.slug] || 0}
                        onChange={e => {
                          const val = Math.max(0, +e.target.value)
                          setOfferRes(p => ({ ...p, [r.slug]: val }))
                        }}
                        className="game-input"
                      />
                    </div>
                  )
                })}
              </div>

              <div className={styles.tradeArrow}>⇌</div>

              {/* SENDER REQUESTS */}
              <div className={styles.tradeCol}>
                <div className={styles.colHeader} style={{ color: 'var(--neon-lime)' }}>
                  YOU REQUEST (FROM THEM)
                </div>
                <div className={styles.formRow}>
                  <label className={styles.label}>FUNDS (₹)</label>
                  <input
                    id="request-funds"
                    type="number"
                    min={0}
                    value={requestFunds}
                    onChange={e => setRequestFunds(Math.max(0, +e.target.value))}
                    className="game-input"
                  />
                </div>
                {resources.map(r => (
                  <div key={r.id} className={styles.formRow}>
                    <label className={styles.label}>{r.icon} {r.name}</label>
                    <input
                      id={`request-${r.slug}`}
                      type="number"
                      min={0}
                      value={requestRes[r.slug] || 0}
                      onChange={e => {
                        const val = Math.max(0, +e.target.value)
                        setRequestRes(p => ({ ...p, [r.slug]: val }))
                      }}
                      className="game-input"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>MESSAGE (optional)</label>
              <input
                id="trade-message"
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="game-input"
                placeholder="e.g. 2 cement for 2 glass deal..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="game-btn game-btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button id="send-trade" type="submit" className="game-btn game-btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'SEND OFFER →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INCOMING OFFERS */}
      {incoming.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📨 INCOMING OFFERS ({incoming.length})</h2>
          <div className={styles.tradeList}>
            {incoming.map(trade => (
              <div key={trade.id} className={`${styles.tradeItem} game-card game-card-glow-pink`}>
                <div className={styles.tradeItemHeader}>
                  <span className={styles.fromLabel}>From: <strong>{(trade.from_team as any)?.name}</strong></span>
                  {trade.message && <span className={styles.tradeMessage}>&quot;{trade.message}&quot;</span>}
                </div>
                <div className={styles.tradeDetails}>
                  <div className={styles.tradeOfferBox} style={{ borderColor: 'rgba(255,45,120,0.3)' }}>
                    <span className={styles.tradeBoxLabel} style={{ color: 'var(--hot-pink)' }}>THEY OFFER</span>
                    {(trade.offer_funds as number) > 0 && <span>💰 ₹{(trade.offer_funds as number).toLocaleString('en-IN')}</span>}
                    {Object.entries(trade.offer_resources as Record<string, number>).filter(([, v]) => v > 0).map(([k, v]) => (
                      <span key={k} style={{ textTransform: 'capitalize' }}>📦 {k}: {v}</span>
                    ))}
                    {(trade.offer_funds as number) <= 0 && Object.entries(trade.offer_resources || {}).filter(([, v]) => v > 0).length === 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>Nothing</span>
                    )}
                  </div>
                  <span className={styles.tradeArrowSmall}>⇌</span>
                  <div className={styles.tradeOfferBox} style={{ borderColor: 'rgba(204,255,0,0.3)' }}>
                    <span className={styles.tradeBoxLabel} style={{ color: 'var(--neon-lime)' }}>THEY WANT FROM YOU</span>
                    {(trade.request_funds as number) > 0 && <span>💰 ₹{(trade.request_funds as number).toLocaleString('en-IN')}</span>}
                    {Object.entries(trade.request_resources as Record<string, number>).filter(([, v]) => v > 0).map(([k, v]) => (
                      <span key={k} style={{ textTransform: 'capitalize' }}>📦 {k}: {v}</span>
                    ))}
                    {(trade.request_funds as number) <= 0 && Object.entries(trade.request_resources || {}).filter(([, v]) => v > 0).length === 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>Nothing</span>
                    )}
                  </div>
                </div>
                <div className={styles.tradeActions}>
                  <button
                    id={`reject-${trade.id.slice(0, 8)}`}
                    className="game-btn game-btn-danger"
                    disabled={loading}
                    onClick={() => respondTrade(trade.id, false)}
                  >
                    Reject
                  </button>
                  <button
                    id={`accept-${trade.id.slice(0, 8)}`}
                    className="game-btn game-btn-lime"
                    disabled={loading}
                    onClick={() => respondTrade(trade.id, true)}
                  >
                    Accept Trade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OUTGOING OFFERS */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📤 YOUR OUTGOING OFFERS ({outgoing.length})</h2>
        <div className={styles.tradeList}>
          {outgoing.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No outgoing offers sent yet.</div>
          ) : (
            outgoing.map(trade => (
              <div key={trade.id} className={`${styles.tradeItem} game-card`}>
                <div className={styles.tradeItemHeader}>
                  <span className={styles.fromLabel}>To: <strong>{(trade.to_team as any)?.name}</strong></span>
                  <span className={`stat-pill ${trade.status === 'accepted' ? 'stat-pill-safe' : trade.status === 'rejected' ? 'stat-pill-critical' : 'stat-pill-warning'}`}>
                    {trade.status.toUpperCase()}
                  </span>
                </div>
                <div className={styles.tradeDetails} style={{ marginTop: '8px' }}>
                  <div className={styles.tradeOfferBox} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <span className={styles.tradeBoxLabel} style={{ color: 'var(--hot-pink)' }}>YOU OFFERED</span>
                    {(trade.offer_funds as number) > 0 && <span>💰 ₹{(trade.offer_funds as number).toLocaleString('en-IN')}</span>}
                    {Object.entries(trade.offer_resources as Record<string, number>).filter(([, v]) => v > 0).map(([k, v]) => (
                      <span key={k} style={{ textTransform: 'capitalize' }}>📦 {k}: {v}</span>
                    ))}
                  </div>
                  <span className={styles.tradeArrowSmall}>⇌</span>
                  <div className={styles.tradeOfferBox} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <span className={styles.tradeBoxLabel} style={{ color: 'var(--neon-lime)' }}>YOU REQUESTED</span>
                    {(trade.request_funds as number) > 0 && <span>💰 ₹{(trade.request_funds as number).toLocaleString('en-IN')}</span>}
                    {Object.entries(trade.request_resources as Record<string, number>).filter(([, v]) => v > 0).map(([k, v]) => (
                      <span key={k} style={{ textTransform: 'capitalize' }}>📦 {k}: {v}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
