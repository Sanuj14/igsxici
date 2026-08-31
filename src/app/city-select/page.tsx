'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { City } from '@/lib/supabase/types'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import styles from './page.module.css'

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

const CITY_COORDS: Record<string, [number, number]> = {
  mumbai: [72.8777, 19.0760],
  delhi: [77.2090, 28.6139],
  bangalore: [77.5946, 12.9716],
  chennai: [80.2707, 13.0827],
  kolkata: [88.3639, 22.5726],
  hyderabad: [78.4867, 17.3850],
  pune: [73.8567, 18.5204],
  ahmedabad: [72.5714, 23.0225],
  jaipur: [75.7873, 26.9124],
  surat: [72.8311, 21.1702],
  kochi: [76.2673, 9.9312],
  chandigarh: [76.7794, 30.7333],
  bhopal: [77.4126, 23.2599],
  visakhapatnam: [83.2185, 17.6868],
  indore: [75.8577, 22.7196]
}

export default function CitySelectPage() {
  const router = useRouter()
  const [cities, setCities] = useState<City[]>([])
  const [selected, setSelected] = useState<City | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('user_profiles').select('team_id').eq('id', user.id).single()
      if (!profile?.team_id) { router.push('/register'); return }
      setTeamId(profile.team_id)
      const { data } = await supabase.from('cities').select('*').order('name')
      setCities(data || [])
    }
    load()
  }, [])

  async function confirmCity() {
    if (!selected || !teamId) return
    setLoading(true)
    const { error: err } = await supabase.from('teams').update({
      city_id: selected.id,
      funds: 85000 + selected.starting_bonus
    }).eq('id', teamId)
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <main className={`${styles.page} grid-bg`}>
      <header className={styles.topNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--neon-lime)', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 #000' }}>
            <span>🗺️</span>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', letterSpacing: '0.04em' }}>HIGH-RISE HUSTLE</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>PHASE 01: METROPOLIS DEPLOYMENT</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: '#14141E', border: '2px solid #000', padding: '6px 14px', color: 'var(--neon-lime)' }}>
          STARTING TREASURY: <strong>₹85,000 + BONUS</strong>
        </div>
      </header>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>SELECT YOUR METROPOLIS</h1>
          <p className={styles.subtitle}>
            Your city dictates your strategic advantages, starting bonus funds, and local market vulnerabilities. This deployment is permanent for the round.
          </p>
        </div>

        {selected && (
          <div className={styles.selectedPreview}>
            <div className={styles.selectedCity} style={{ borderColor: selected.color || 'var(--neon-lime)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0A0A0F', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className={styles.selectedDot} style={{ background: selected.color }} />
                  <h2 className={styles.selectedName}>{selected.name.toUpperCase()}</h2>
                </div>
                {selected.is_coastal && (
                  <span className="stat-pill stat-pill-info">🌊 COASTAL HUB</span>
                )}
              </div>

              <p className={styles.selectedDesc}>{selected.description}</p>

              <div className={styles.selectedBonus}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700 }}>STARTING LIQUID CAPITAL:</span>
                <strong style={{ color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)', fontSize: '18px' }}>
                  ₹{(85000 + selected.starting_bonus).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className={styles.selectedTags}>
                <div className={styles.tagsGroup}>
                  <span className={styles.tagLabel} style={{ color: 'var(--status-safe)' }}>✅ REGIONAL ADVANTAGES</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selected.advantages.map(a => <span key={a} className={`${styles.tag} ${styles.tagGreen}`}>{a}</span>)}
                  </div>
                </div>
                <div className={styles.tagsGroup}>
                  <span className={styles.tagLabel} style={{ color: 'var(--status-critical)' }}>⚠️ DISASTER VULNERABILITIES</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selected.risks.map(r => <span key={r} className={`${styles.tag} ${styles.tagRed}`}>{r}</span>)}
                  </div>
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button
                id="confirm-city"
                className="brutal-btn brutal-btn-lime"
                style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '14px', fontSize: '14px', letterSpacing: '0.08em' }}
                onClick={confirmCity}
                disabled={loading}
              >
                {loading ? 'DEPLOYING SQUAD...' : `LOCK IN ${selected.name.toUpperCase()} & COMMENCE →`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive React Simple Map */}
      <div className={styles.mapContainer}>
        <div className={styles.mapTitle}>SELECT FROM THE MAP</div>
        <div className={styles.indiaMap} style={{ background: 'var(--brutal-black)', borderRadius: '14px', border: 'var(--brutal-border)', overflow: 'hidden' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 1200, center: [80, 22] }}
            width={800}
            height={800}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies
                  .filter(geo => geo.properties.name === 'India' || geo.properties.name === 'Sri Lanka' || geo.properties.name === 'Nepal' || geo.properties.name === 'Bhutan' || geo.properties.name === 'Bangladesh')
                  .map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={geo.properties.name === 'India' ? '#1A1A1A' : '#111111'}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
              }
            </Geographies>
            {cities.map((city) => (
              <Marker key={city.id} coordinates={CITY_COORDS[city.slug] || [city.coordinates_x, city.coordinates_y]} onClick={() => setSelected(city)}>
                <circle r={selected?.id === city.id ? 8 : 4} fill={city.color} stroke="#0A0A0A" strokeWidth={2} style={{ cursor: 'pointer', transition: 'all 0.2s' }} />
                <text
                  textAnchor="middle"
                  y={selected?.id === city.id ? -15 : -10}
                  style={{ fontFamily: "var(--font-mono)", fontSize: selected?.id === city.id ? '16px' : '10px', fill: selected?.id === city.id ? city.color : '#fff', fontWeight: 700, pointerEvents: 'none', transition: 'all 0.2s' }}
                >
                  {city.name}
                </text>
              </Marker>
            ))}
          </ComposableMap>
        </div>
      </div>

      {/* City Cards Grid */}
      <div className={styles.citiesGrid}>
        {cities.map(city => (
          <button
            key={city.id}
            id={`city-card-${city.slug}`}
            className={`${styles.cityCard} ${selected?.id === city.id ? styles.cityCardActive : ''}`}
            style={{ '--city-color': city.color } as any}
            onClick={() => setSelected(city)}
          >
            <div className={styles.cityCardTop}>
              <div className={styles.cityCardDot} style={{ background: city.color }} />
              <span className={styles.cityCardName}>{city.name}</span>
              {city.is_coastal && <span className={styles.coastalBadge}>🌊 Coastal</span>}
            </div>
            <div className={styles.cityCardBonus}>
              +₹{city.starting_bonus.toLocaleString('en-IN')} bonus
            </div>
            <div className={styles.cityCardAdvantages}>
              {city.advantages.slice(0, 2).map(a => <span key={a} className={styles.advTag}>{a}</span>)}
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
