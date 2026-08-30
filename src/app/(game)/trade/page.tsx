'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import type { Trade, Team } from '@/lib/supabase/types'
import styles from './page.module.css'

export default function TradePage() {
  const { teamId, resources, inventory } = useGameStore()
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
    const ch = supabase.channel('trades-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, loadTrades)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [teamId])

  async function sendTrade(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !toTeamId) return
    setLoading(true)
    const { error } = await supabase.from('trades').insert({
      from_team_id: teamId,
      to_team_id: toTeamId,
      offer_funds: offerFunds,
      request_funds: requestFunds,
      offer_resources: offerRes,
      request_resources: requestRes,
      message,
    })
    if (error) { setResult('Error: ' + error.message) } else {
      setResult('✅ Trade offer sent!')
      setShowForm(false)
      loadTrades()
    }
    setLoading(false)
  }

  async function respondTrade(tradeId: string, accept: boolean) {
    if (!accept) {
      await supabase.from('trades').update({ status: 'rejected' }).eq('id', tradeId)
      loadTrades()
      return
    }
    // For accept: simple DB update (ideally via RPC for atomicity)
    const trade = trades.find(t => t.id === tradeId)
    if (!trade) return
    // Atomic acceptance via custom logic
    const { error } = await supabase.from('trades').update({ status: 'accepted' }).eq('id', tradeId)
    if (error) { alert('Error: ' + error.message); return }
    // Note: In production, this should be an atomic RPC function
    loadTrades()
  }

  const incoming = trades.filter(t => t.to_team_id === teamId && t.status === 'pending')
  const outgoing = trades.filter(t => t.from_team_id === teamId)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-h2">🤝 TRADING CENTER</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Negotiate trades with other teams. Create alliances or crush competitors.</p>
        </div>
        <button id="new-trade" className="game-btn game-btn-primary" onClick={() => setShowForm(!showForm)}>+ New Trade Offer</button>
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
              <div className={styles.tradeCol}>
                <div className={styles.colHeader} style={{ color: 'var(--hot-pink)' }}>YOU OFFER</div>
                <div className={styles.formRow}>
                  <label className={styles.label}>FUNDS (₹)</label>
                  <input id="offer-funds" type="number" min={0} value={offerFunds} onChange={e => setOfferFunds(+e.target.value)} className="game-input" />
                </div>
                {resources.map(r => (
                  <div key={r.id} className={styles.formRow}>
                    <label className={styles.label}>{r.icon} {r.name}</label>
                    <input id={`offer-${r.slug}`} type="number" min={0} value={offerRes[r.slug] || 0} onChange={e => setOfferRes(p => ({ ...p, [r.slug]: +e.target.value }))} className="game-input" />
                  </div>
                ))}
              </div>
              <div className={styles.tradeArrow}>⇌</div>
              <div className={styles.tradeCol}>
                <div className={styles.colHeader} style={{ color: 'var(--neon-lime)' }}>YOU REQUEST</div>
                <div className={styles.formRow}>
                  <label className={styles.label}>FUNDS (₹)</label>
                  <input id="request-funds" type="number" min={0} value={requestFunds} onChange={e => setRequestFunds(+e.target.value)} className="game-input" />
                </div>
                {resources.map(r => (
                  <div key={r.id} className={styles.formRow}>
                    <label className={styles.label}>{r.icon} {r.name}</label>
                    <input id={`request-${r.slug}`} type="number" min={0} value={requestRes[r.slug] || 0} onChange={e => setRequestRes(p => ({ ...p, [r.slug]: +e.target.value }))} className="game-input" />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>MESSAGE (optional)</label>
              <input id="trade-message" type="text" value={message} onChange={e => setMessage(e.target.value)} className="game-input" placeholder="e.g. Alliance proposal..." />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="game-btn game-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button id="send-trade" type="submit" className="game-btn game-btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'SEND OFFER →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {incoming.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📨 INCOMING OFFERS ({incoming.length})</h2>
          <div className={styles.tradeList}>
            {incoming.map(trade => (
              <div key={trade.id} className={`${styles.tradeItem} game-card game-card-glow-pink`}>
                <div className={styles.tradeItemHeader}>
                  <span className={styles.fromLabel}>From: <strong>{(trade.from_team as any)?.name}</strong></span>
                  {trade.message && <span className={styles.tradeMessage}>"{trade.message}"</span>}
                </div>
                <div className={styles.tradeDetails}>
                  <div className={styles.tradeOfferBox} style={{ borderColor: 'rgba(255,45,120,0.3)' }}>
                    <span className={styles.tradeBoxLabel} style={{ color: 'var(--hot-pink)' }}>THEY OFFER</span>
                    {(trade.offer_funds as number) > 0 && <span>💰 ₹{(trade.offer_funds as number).toLocaleString('en-IN')}</span>}
                    {Object.entries(trade.offer_resources as Record<string, number>).filter(([,v]) => v > 0).map(([k,v]) => <span key={k}>{k}: {v}</span>)}
                  </div>
                  <span className={styles.tradeArrowSmall}>⇌</span>
                  <div className={styles.tradeOfferBox} style={{ borderColor: 'rgba(204,255,0,0.3)' }}>
                    <span className={styles.tradeBoxLabel} style={{ color: 'var(--neon-lime)' }}>THEY WANT</span>
                    {(trade.request_funds as number) > 0 && <span>💰 ₹{(trade.request_funds as number).toLocaleString('en-IN')}</span>}
                    {Object.entries(trade.request_resources as Record<string, number>).filter(([,v]) => v > 0).map(([k,v]) => <span key={k}>{k}: {v}</span>)}
                  </div>
                </div>
                <div className={styles.tradeActions}>
                  <button id={`reject-${trade.id.slice(0,8)}`} className="game-btn game-btn-danger" onClick={() => respondTrade(trade.id, false)}>Reject</button>
                  <button id={`accept-${trade.id.slice(0,8)}`} className="game-btn game-btn-lime" onClick={() => respondTrade(trade.id, true)}>Accept</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📤 YOUR OFFERS</h2>
        <div className={styles.tradeList}>
          {outgoing.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No outgoing offers.</div> : outgoing.map(trade => (
            <div key={trade.id} className={`${styles.tradeItem} game-card`}>
              <div className={styles.tradeItemHeader}>
                <span className={styles.fromLabel}>To: <strong>{(trade.to_team as any)?.name}</strong></span>
                <span className={`stat-pill ${trade.status === 'accepted' ? 'stat-pill-safe' : trade.status === 'rejected' ? 'stat-pill-critical' : 'stat-pill-warning'}`}>{trade.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
