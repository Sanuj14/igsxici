import Link from 'next/link'
import styles from './page.module.css'

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoIcon}>🏗️</span>
          <span className={styles.navLogoText}>HIGH-RISE HUSTLE</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#rules">Rules</a>
          <a href="#cities">Cities</a>
          <a href="#leaderboard">Leaderboard</a>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/login" className="brutal-btn brutal-btn-white" style={{ border: '2px solid #000' }}>
            ADMIN
          </Link>
          <Link href="/login" className="brutal-btn brutal-btn-black">
            JOIN GAME →
          </Link>
        </div>
      </nav>

      {/* HERO BENTO GRID */}
      <section className={styles.heroGrid}>
        {/* Main Hero */}
        <div className={`${styles.heroMain} brutal-card block-white`}>
          <div className={styles.heroTag}>
            <span className={styles.liveDot} />
            LIVE STRATEGY EVENT
          </div>
          <h1 className={`${styles.heroTitle} text-hero`}>
            HIGH-RISE<br />
            <span className={styles.heroTitleAccent}>HUSTLE.</span>
          </h1>
          <p className={styles.heroDesc}>
            Build the tallest, most valuable skyscraper in India.
            Survive disasters. Trade with rivals. Race for limited opportunities.
            Only the smartest team wins.
          </p>
          <div className={styles.heroActions}>
            <Link href="/register" className="brutal-btn brutal-btn-primary">
              REGISTER TEAM →
            </Link>
            <Link href="/login" className="brutal-btn brutal-btn-white">
              TEAM LOGIN ↗
            </Link>
          </div>
          <div className={styles.heroSocials}>
            <span className="text-label text-muted">CONNECT WITH ME</span>
          </div>
        </div>

        {/* Pink block */}
        <div className={`${styles.heroPink} block-pink brutal-card`}>
          <div className={styles.skyscraperViz}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={styles.skyFloor} style={{
                height: `${12 + i * 4}px`,
                background: i % 2 === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
                width: `${60 + i * 8}px`
              }} />
            ))}
          </div>
          <p className={styles.pinkLabel}>BUILD TO THE SKY</p>
        </div>

        {/* Code block */}
        <div className={`${styles.heroCode} block-dark brutal-card`}>
          <div className={styles.codeHeader}>
            <span className={styles.codeDot} style={{ background: '#FF5F57' }} />
            <span className={styles.codeDot} style={{ background: '#FFBD2E' }} />
            <span className={styles.codeDot} style={{ background: '#28C840' }} />
          </div>
          <pre className={styles.codeContent}>{`> const team = {
  city: "Mumbai",
  funds: ₹85,000,
  floors: 12,
  height: "48m",
  status: "building"
}`}</pre>
        </div>

        {/* Skills row */}
        <div className={`${styles.heroSkills} block-white brutal-card`}>
          <div className={styles.skillsLabel}>
            <span className={styles.skillsTag}>RESOURCES</span>
            <span>→</span>
          </div>
          <div className={styles.skillsRow}>
            {['🏗️ Cement', '⚙️ Steel', '🪟 Glass', '🌲 Timber', '🔩 Aluminium', '🔌 Copper'].map(s => (
              <div key={s} className={styles.skillChip}>{s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className={styles.statsBar}>
        {[
          { label: 'Teams', value: '24+', color: 'var(--hot-pink)' },
          { label: 'Cities', value: '15', color: 'var(--electric-purple)' },
          { label: 'Rounds', value: '8', color: 'var(--electric-blue)' },
          { label: 'Resources', value: '6', color: 'var(--mint)' },
          { label: 'Challenge Types', value: '5', color: 'var(--yellow)' },
        ].map(stat => (
          <div key={stat.label} className={styles.statItem}>
            <span className={styles.statValue} style={{ color: stat.color }}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </section>

      {/* FEATURED — HOW IT WORKS */}
      <section className={styles.howItWorks} id="rules">
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} text-h1`}>HOW IT WORKS</h2>
          <Link href="/register" className="brutal-btn brutal-btn-lime">START PLAYING →</Link>
        </div>

        <div className={styles.stepsGrid}>
          {[
            { num: '01', title: 'CHOOSE YOUR CITY', desc: 'Pick from 15 Indian cities. Each has unique advantages, risks, and a starting bonus.', color: 'var(--hot-pink)', bg: 'block-pink' },
            { num: '02', title: 'BUY RESOURCES', desc: 'Purchase Cement, Steel, Glass and more from the live marketplace. Prices fluctuate.', color: 'var(--electric-purple)', bg: 'block-purple' },
            { num: '03', title: 'BUILD FLOORS', desc: 'Construct unlimited floors across 12 unique types. Balance height, value, stability and sustainability.', color: 'var(--electric-blue)', bg: 'block-blue' },
            { num: '04', title: 'SURVIVE DISASTERS', desc: 'Admin triggers real-time floods, earthquakes, market crashes. Adapt or lose.', color: 'var(--brutal-black)', bg: 'block-dark' },
            { num: '05', title: 'TRADE & NEGOTIATE', desc: 'Trade resources directly with rival teams. Create alliances or crush competitors.', color: 'var(--orange)', bg: 'block-white' },
            { num: '06', title: 'CLAIM CHALLENGES', desc: 'Race for limited-slot dares worth ₹15,000+. First come, first served. No exceptions.', color: 'var(--neon-lime)', bg: 'block-lime' },
          ].map(step => (
            <div key={step.num} className={`${styles.stepCard} ${step.bg} brutal-card`}>
              <span className={styles.stepNum} style={{ color: step.color }}>{step.num}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CITIES SECTION */}
      <section className={styles.citiesSection} id="cities">
        <div className={`${styles.citiesLeft} block-pink brutal-card`}>
          <h2 className={`text-h1`} style={{ color: 'white' }}>
            15 CITIES.<br />
            INFINITE<br />
            STRATEGIES.
          </h2>
          <Link href="/register" className="brutal-btn brutal-btn-black" style={{ marginTop: '24px' }}>
            PICK YOUR CITY →
          </Link>
        </div>
        <div className={styles.citiesGrid}>
          {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Kochi', 'Chandigarh'].map((city, i) => (
            <div key={city} className={`${styles.cityCard} brutal-card block-white`}>
              <span className={styles.cityDot} style={{ background: ['#FF2D78','#7B2FBE','#4361EE','#FF6B35','#06D6A0','#FFD60A','#FF9F1C','#2EC4B6','#E91E8C','#00B4D8','#52B788','#90E0EF'][i] }} />
              <span className={styles.cityName}>{city}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={`${styles.ctaSection} block-dark brutal-card`}>
        <div className={styles.ctaLeft}>
          <h2 className="text-h1" style={{ color: 'var(--neon-lime)' }}>
            LET'S BUILD<br />
            SOMETHING<br />
            AMAZING.
          </h2>
        </div>
        <div className={styles.ctaRight}>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px', maxWidth: '400px' }}>
            Register your team now and get ready for the most intense strategy experience at the event. 
            ₹85,000 starting funds. The clock is ticking.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/register" className="brutal-btn brutal-btn-lime">
              REGISTER TEAM →
            </Link>
            <Link href="/login" className="brutal-btn brutal-btn-white">
              TEAM LOGIN ↗
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.navLogoText}>© 2024 HIGH-RISE HUSTLE</span>
        </div>
        <div className={styles.footerCenter}>
          <span>© 2026 IGS × ICI. All rights reserved.</span>
        </div>
        <div className={styles.footerRight}>
          <Link href="/admin" style={{ opacity: 0.4, fontSize: '12px' }}>Admin</Link>
          <Link href="/display" style={{ opacity: 0.4, fontSize: '12px' }}>Display</Link>
        </div>
      </footer>
    </main>
  )
}
