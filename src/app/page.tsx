import Link from 'next/link'
import styles from './page.module.css'

export default function LandingPage() {
  return (
    <main className={`${styles.landing} grid-bg`}>
      {/* STITCH TOP APP BAR */}
      <header className={styles.topAppBar}>
        <div className={styles.topBrand}>
          <div className={styles.brandIconBox}>
            <span style={{ fontSize: '22px' }}>🏢</span>
          </div>
          <div>
            <h1 className={styles.brandTitle}>HIGH-RISE HUSTLE</h1>
          </div>
        </div>

        <nav className={styles.navMenu}>
          <a href="#features" className={styles.navLink}>FEATURES</a>
          <a href="#protocol" className={styles.navLink}>RULES & PROTOCOL</a>
          <a href="#cities" className={styles.navLink}>METROPOLISES</a>
        </nav>

        <div className={styles.topActions}>
          <Link href="/display" target="_blank" className={styles.btnStats}>
            📊 LIVE ARENA
          </Link>
          <Link href="/admin/login" className={styles.btnAdmin}>
            ⚡ ADMIN
          </Link>
          <Link href="/login" className={styles.btnWhite}>
            TEAM SIGN IN
          </Link>
          <Link href="/register" className={styles.btnPrimary}>
            REGISTER TEAM →
          </Link>
        </div>
      </header>

      {/* STITCH MARKET TICKER HEADER */}
      <div className={styles.tickerHeader}>
        <div className={styles.tickerBadge}>
          MARKET TICKER
        </div>
        <div className="ticker-wrap" style={{ flex: 1 }}>
          <div className="ticker-content" style={{ display: 'inline-flex', gap: '36px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
            <span><span style={{ color: 'var(--text-secondary)' }}>CMNT</span> ₹1,300 <strong style={{ color: 'var(--neon-lime)' }}>▲ +30.0%</strong></span>
            <span><span style={{ color: 'var(--text-secondary)' }}>STEL</span> ₹4,500 <strong style={{ color: 'var(--neon-lime)' }}>▲ +15.2%</strong></span>
            <span><span style={{ color: 'var(--text-secondary)' }}>GLASS</span> ₹2,100 <strong style={{ color: 'var(--hot-pink)' }}>▼ -12.4%</strong></span>
            <span><span style={{ color: 'var(--text-secondary)' }}>LMBR</span> ₹950 <strong style={{ color: 'var(--neon-lime)' }}>▲ +0.8%</strong></span>
            <span><span style={{ color: 'var(--text-secondary)' }}>ALUM</span> ₹3,200 <strong style={{ color: 'var(--neon-lime)' }}>▲ +8.0%</strong></span>
            <span><span style={{ color: 'var(--text-secondary)' }}>COPR</span> ₹5,800 <span style={{ color: 'var(--text-muted)' }}>- 0.0%</span></span>
            <span>🚨 <strong style={{ color: 'var(--hot-pink)' }}>DISASTER DETECTED:</strong> MONSOON FLASH FLOOD IN MUMBAI (CONSTRUCTION HALTED)</span>
            <span>⚡ <strong style={{ color: 'var(--neon-lime)' }}>CHALLENGE ACTIVE:</strong> CIVIL ENGINEERING SPEED QUIZ (₹15,000 REWARD)</span>
          </div>
        </div>
      </div>

      {/* HERO BENTO SECTION */}
      <section className={styles.heroSection}>
        {/* Main Left Command Block */}
        <div className={styles.heroCard}>
          <div className={styles.heroTag}>
            <span className={styles.tagPulse} />
            INTER-COLLEGIATE STRATEGY ARENA • SEASON 2026
          </div>

          <h2 className={styles.heroTitle}>
            BUILD YOUR<br />
            <span className={styles.titleLime}>EMPIRE.</span><br />
            <span className={styles.titlePink}>SURVIVE THE MARKET.</span>
          </h2>

          <p className={styles.heroDescription}>
            Deploy your syndicate across 15 Indian Metropolises. Trade volatile commodities on a live order book. 
            Balance architectural height with structural physics, adapt to live urban disasters, and conquer the 4K projector scoreboard.
          </p>

          <div className={styles.heroBtnRow}>
            <Link href="/register" className={styles.heroBtnPrimary}>
              🏗️ REGISTER TEAM [₹85,000 STARTING FUNDS] →
            </Link>
            <Link href="/login" className={styles.heroBtnSecondary}>
              🎮 ENTER ACTIVE ROUND
            </Link>
          </div>

          {/* 4 HUD Stat Metric Blocks matching Stitch */}
          <div className={styles.hudStatsGrid}>
            <div className={styles.hudStatBox}>
              <div className={styles.hudStatHeader}>
                <span>OP_FUNDS</span>
                <span>💰</span>
              </div>
              <div className={styles.hudStatVal} style={{ color: 'var(--neon-lime)' }}>₹85K</div>
              <div className={styles.hudStatBar}><div style={{ width: '85%', background: 'var(--neon-lime)', height: '100%' }} /></div>
            </div>

            <div className={styles.hudStatBox}>
              <div className={styles.hudStatHeader}>
                <span>TOWER_HEIGHT</span>
                <span>📐</span>
              </div>
              <div className={styles.hudStatVal} style={{ color: 'var(--cyber-blue)' }}>300m+</div>
              <div className={styles.hudStatBar}><div style={{ width: '70%', background: 'var(--cyber-blue)', height: '100%' }} /></div>
            </div>

            <div className={styles.hudStatBox}>
              <div className={styles.hudStatHeader}>
                <span>METROPOLISES</span>
                <span>🏙️</span>
              </div>
              <div className={styles.hudStatVal} style={{ color: 'var(--hot-pink)' }}>15</div>
              <div className={styles.hudStatBar}><div style={{ width: '100%', background: 'var(--hot-pink)', height: '100%' }} /></div>
            </div>

            <div className={styles.hudStatBox}>
              <div className={styles.hudStatHeader}>
                <span>COMMODITIES</span>
                <span>📦</span>
              </div>
              <div className={styles.hudStatVal} style={{ color: 'var(--yellow)' }}>6 LIVE</div>
              <div className={styles.hudStatBar}><div style={{ width: '90%', background: 'var(--yellow)', height: '100%' }} /></div>
            </div>
          </div>
        </div>

        {/* Right Aside Visualizer & Disaster Cards */}
        <div className={styles.heroAside}>
          {/* Tower Simulator Card */}
          <div className={styles.asideCard}>
            <div className={styles.asideCardHeader} style={{ background: 'var(--primary-container)', color: '#000' }}>
              <span>SECTOR TOWER SIMULATION</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>LIVE</span>
            </div>
            <div className={styles.towerCanvas}>
              <div className={styles.towerStack}>
                <div className={styles.floorBlock} style={{ width: '45%', background: 'var(--hot-pink)', color: '#fff' }}>LVL 5: PENTHOUSE</div>
                <div className={styles.floorBlock} style={{ width: '65%', background: 'var(--neon-lime)', color: '#000' }}>LVL 4: LUXURY SUITE</div>
                <div className={styles.floorBlock} style={{ width: '80%', background: 'var(--cyber-blue)', color: '#000' }}>LVL 3: COMMERCIAL</div>
                <div className={styles.floorBlock} style={{ width: '95%', background: 'var(--yellow)', color: '#000' }}>LVL 2: RETAIL HUB</div>
                <div className={styles.floorBlock} style={{ width: '100%', background: '#35343A', color: '#fff' }}>LVL 1: CORE FOUNDATION</div>
              </div>
              <div className={styles.towerMetricsRow}>
                <div>ELEVATION: <strong style={{ color: 'var(--neon-lime)' }}>72 METERS</strong></div>
                <div>STABILITY: <strong style={{ color: 'var(--status-safe)' }}>94%</strong></div>
              </div>
            </div>
          </div>

          {/* Active Emergency Alert Card */}
          <div className={styles.asideCard}>
            <div className={styles.asideCardHeader} style={{ background: 'var(--secondary-container)', color: '#fff' }}>
              <span>🚨 ACTIVE EMERGENCY THREAT</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>02:45</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: 'var(--hot-pink)' }}>
                MONSOON FLASH FLOOD DETECTED
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Sector structural integrity compromised. Cement market surge +30%. Construction temporarily halted across coastal metropolises.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="stat-pill stat-pill-critical">HAZARD LVL 4</span>
                <span className="stat-pill stat-pill-warning">PRICE SURGE</span>
                <span className="stat-pill stat-pill-info">HALT ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE 4 GAMEPLAY PILLARS */}
      <section id="features" className={styles.sectionContainer}>
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionPre}>SYSTEM ARCHITECTURE</span>
          <h2 className={styles.sectionTitle}>THE 4 PILLARS OF HIGH-RISE HUSTLE</h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.cardStrip} style={{ background: 'var(--primary-container)', color: '#000' }}>
              01 // GEOGRAPHY
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <span style={{ fontSize: '32px' }}>🏙️</span>
              <h3 className={styles.featureName}>15 Indian Metropolises</h3>
              <p className={styles.featureDesc}>
                Select Mumbai, Bengaluru, Delhi, Chennai, Kolkata, or 10 other cities. Each features distinct starting bonus funds, coastal shipping discounts, and natural disaster profiles.
              </p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.cardStrip} style={{ background: 'var(--secondary-container)', color: '#fff' }}>
              02 // COMMODITIES
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <span style={{ fontSize: '32px' }}>📈</span>
              <h3 className={styles.featureName}>Volatile Commodity Trading</h3>
              <p className={styles.featureDesc}>
                Trade Cement, Steel, Glass, Timber, Aluminium, and Copper on a real-time order book. Exploit sudden price surges and corner resources before rivals.
              </p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.cardStrip} style={{ background: 'var(--tertiary-container)', color: '#000' }}>
              03 // DISASTERS & QUIZZES
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <span style={{ fontSize: '32px' }}>⚡</span>
              <h3 className={styles.featureName}>Disasters & Speed Quizzes</h3>
              <p className={styles.featureDesc}>
                Weather targeted urban disasters like earthquakes and supply chain collapses. Compete in timed 5-question civil engineering speed quizzes for instant ₹15,000 cash prizes.
              </p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.cardStrip} style={{ background: '#35343A', color: '#fff' }}>
              04 // ENGINEERING
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <span style={{ fontSize: '32px' }}>🏢</span>
              <h3 className={styles.featureName}>Structural Engineering</h3>
              <p className={styles.featureDesc}>
                Balance vertical height, floor tier synergies, structural stability %, and green sustainability ratings. Build high, but build strong—unstable towers can face penalties!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW TO PLAY PROTOCOL */}
      <section id="protocol" className={styles.sectionContainer}>
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionPre}>OPERATIONAL PROTOCOL</span>
          <h2 className={styles.sectionTitle}>HOW YOUR TEAM COMPETES</h2>
        </div>

        <div className={styles.protocolGrid}>
          <div className={styles.protocolCard}>
            <div className={styles.protocolNumber}>01</div>
            <h3 className={styles.protocolTitle}>Register & Deploy City</h3>
            <p className={styles.protocolDesc}>Create your squad account, lock in your starting metropolis on the interactive vector map, and claim starting liquid treasury.</p>
          </div>

          <div className={styles.protocolCard}>
            <div className={styles.protocolNumber}>02</div>
            <h3 className={styles.protocolTitle}>Enter Round Access Code</h3>
            <p className={styles.protocolDesc}>When the admin launches a round, enter the 6-character access code on your command center to unlock the active floor.</p>
          </div>

          <div className={styles.protocolCard}>
            <div className={styles.protocolNumber}>03</div>
            <h3 className={styles.protocolTitle}>Trade, Build & Quiz</h3>
            <p className={styles.protocolDesc}>Purchase materials on the live exchange, construct blueprint floors tier-by-tier, and take timed challenges for cash bonuses.</p>
          </div>

          <div className={styles.protocolCard}>
            <div className={styles.protocolNumber}>04</div>
            <h3 className={styles.protocolTitle}>Dominate the 4K Arena</h3>
            <p className={styles.protocolDesc}>Watch your skyscraper rise in real-time on the main projector leaderboard. The squad with the highest evaluated score wins!</p>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className={styles.ctaWrapper}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>READY TO ENTER THE ARENA?</h2>
          <p className={styles.ctaSubtitle}>Register your college team now to secure your starting slot and claim ₹85,000 bonus funds.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className={styles.heroBtnPrimary}>
              CREATE TEAM ACCOUNT →
            </Link>
            <Link href="/login" className={styles.heroBtnSecondary}>
              TEAM SIGN IN
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span style={{ fontSize: '24px' }}>🏗️</span>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '0.04em' }}>HIGH-RISE HUSTLE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>URBAN CIVIL STRATEGY ARENA</div>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            POWERED BY IGS X ICI • ALL RIGHTS RESERVED 2026
          </div>
        </div>
      </footer>
    </main>
  )
}
