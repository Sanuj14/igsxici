import Link from 'next/link'
import styles from './page.module.css'

export default function LandingPage() {
  return (
    <main className={`${styles.landing} grid-bg`}>
      {/* TOP NAVIGATION */}
      <header className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.navLogoBox}>
            <span style={{ fontSize: '20px' }}>🏗️</span>
          </div>
          <div>
            <span className={styles.navTitle}>HIGH-RISE HUSTLE</span>
            <span className={styles.navSub}>URBAN STRATEGY ARENA</span>
          </div>
        </div>

        <nav className={styles.navLinks}>
          <a href="#features">FEATURES</a>
          <a href="#protocol">HOW TO PLAY</a>
          <a href="#cities">CITIES</a>
          <Link href="/display" target="_blank">LIVE ARENA ↗</Link>
        </nav>

        <div className={styles.navActions}>
          <Link href="/admin/login" className="brutal-btn brutal-btn-white" style={{ padding: '8px 14px', fontSize: '11px' }}>
            ⚡ ADMIN
          </Link>
          <Link href="/login" className="brutal-btn brutal-btn-white" style={{ padding: '8px 16px', fontSize: '12px' }}>
            TEAM LOGIN
          </Link>
          <Link href="/register" className="brutal-btn brutal-btn-lime" style={{ padding: '8px 18px', fontSize: '12px' }}>
            REGISTER TEAM →
          </Link>
        </div>
      </header>

      {/* LIVE MARKET TICKER */}
      <div className={styles.tickerBar}>
        <div className={styles.tickerTag}>
          <span className={styles.pulseDot} />
          LIVE COMMODITY FEED
        </div>
        <div className="ticker-wrap" style={{ flex: 1 }}>
          <div className="ticker-content" style={{ display: 'inline-flex', gap: '32px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
            <span>🏗️ CEMENT: <strong style={{ color: 'var(--neon-lime)' }}>₹1,300 (+30% 📈)</strong></span>
            <span>⚙️ STEEL: <strong style={{ color: 'var(--neon-lime)' }}>₹4,500 (+15% 📈)</strong></span>
            <span>🪟 GLASS: <strong style={{ color: 'var(--hot-pink)' }}>₹2,100 (-12% 📉)</strong></span>
            <span>🌲 TIMBER: <strong>₹950</strong></span>
            <span>🔩 ALUMINIUM: <strong style={{ color: 'var(--neon-lime)' }}>₹3,200 (+8% 📈)</strong></span>
            <span>🔌 COPPER: <strong>₹5,800</strong></span>
            <span>🚨 ACTIVE EVENT: <strong>MONSOON SURGE IN MUMBAI</strong></span>
            <span>📝 CHALLENGE LIVE: <strong>CIVIL ENGINEERING SPEED QUIZ</strong></span>
          </div>
        </div>
      </div>

      {/* HERO BENTO GRID */}
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.heroBadge}>
            <span className={styles.badgePulse} />
            INTER-COLLEGIATE STRATEGY ARENA • 2026
          </div>
          
          <h1 className={styles.heroHeading}>
            BUILD YOUR<br />
            <span style={{ color: 'var(--neon-lime)', textShadow: '3px 3px 0 #000' }}>EMPIRE.</span><br />
            <span style={{ color: 'var(--hot-pink)' }}>SURVIVE THE MARKET.</span>
          </h1>

          <p className={styles.heroParagraph}>
            Compete across 15 Indian metropolises. Trade 6 volatile commodities on a live order book. 
            Balance architectural height with structural stability, weather urban disasters, and climb the live auditorium scoreboard.
          </p>

          <div className={styles.heroButtons}>
            <Link href="/register" className="brutal-btn brutal-btn-lime" style={{ padding: '16px 32px', fontSize: '14px', letterSpacing: '0.08em' }}>
              🏗️ REGISTER TEAM [₹85,000 STARTING BONUS] →
            </Link>
            <Link href="/login" className="brutal-btn brutal-btn-white" style={{ padding: '16px 28px', fontSize: '14px' }}>
              🎮 ENTER ACTIVE ROUND
            </Link>
          </div>

          <div className={styles.heroStatsRow}>
            <div className={styles.heroStat}>
              <span className={styles.statNumber}>15</span>
              <span className={styles.statLabel}>INDIAN CITIES</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.statNumber}>12</span>
              <span className={styles.statLabel}>FLOOR BLUEPRINTS</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.statNumber} style={{ color: 'var(--neon-lime)' }}>6+</span>
              <span className={styles.statLabel}>DYNAMIC COMMODITIES</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.statNumber} style={{ color: 'var(--hot-pink)' }}>4K</span>
              <span className={styles.statLabel}>LIVE SCOREBOARD</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE VISUALIZER CARDS */}
        <div className={styles.heroAside}>
          {/* Visual Skyscraper Card */}
          <div className={styles.towerCard}>
            <div className={styles.cardHeaderStrip} style={{ background: 'var(--hot-pink)', color: '#fff' }}>
              <span>SECTOR TOWER SIMULATION</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>LIVE</span>
            </div>
            <div className={styles.towerCanvas}>
              <div className={styles.towerStack}>
                <div className={styles.floorBlock} style={{ width: '50px', background: 'var(--hot-pink)' }}>PENTHOUSE +6m</div>
                <div className={styles.floorBlock} style={{ width: '70px', background: 'var(--neon-lime)', color: '#000' }}>OFFICE SUITE +4m</div>
                <div className={styles.floorBlock} style={{ width: '90px', background: 'var(--cyber-blue)', color: '#000' }}>COMMERCIAL +4m</div>
                <div className={styles.floorBlock} style={{ width: '110px', background: 'var(--yellow)', color: '#000' }}>RETAIL HUB +3.5m</div>
                <div className={styles.floorBlock} style={{ width: '130px', background: '#35343A', color: '#fff' }}>FOUNDATION CORE +5m</div>
              </div>
              <div className={styles.towerHeightPill}>
                HEIGHT: <strong>68 METERS</strong>
              </div>
            </div>
          </div>

          {/* Disaster Threat Card */}
          <div className={styles.threatCard}>
            <div className={styles.cardHeaderStrip} style={{ background: 'var(--deep-red)', color: '#fff' }}>
              <span>🚨 ACTIVE EMERGENCY THREAT</span>
              <span>02:15</span>
            </div>
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px', color: 'var(--hot-pink)' }}>
                MONSOON FLASH FLOOD
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Lower floors flooded. Cement trading price surged +30%. Construction temporarily halted across coastal cities.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="stat-pill stat-pill-critical">HAZARD LVL 4</span>
                <span className="stat-pill stat-pill-warning">MARKET SURGE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE GAMEPLAY PILLARS */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPre}>SYSTEM ARCHITECTURE</span>
          <h2 className={styles.sectionTitle}>THE 4 PILLARS OF HIGH-RISE HUSTLE</h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🏙️</div>
            <h3 className={styles.featureName}>15 Indian Metropolises</h3>
            <p className={styles.featureDesc}>
              Select Mumbai, Bengaluru, Delhi, Chennai, Kolkata, or 10 other cities. Each features distinct starting funds, regional material discounts, and natural disaster profiles.
            </p>
            <div className={styles.featureTag}>GEOGRAPHIC ADVANTAGE</div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📈</div>
            <h3 className={styles.featureName}>Volatile Commodity Trading</h3>
            <p className={styles.featureDesc}>
              Buy and sell Cement, Steel, Glass, Timber, Aluminium, and Copper on a real-time order book. Exploit sudden market booms and corner resources before rivals.
            </p>
            <div className={styles.featureTag}>LIVE ORDER BOOK</div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureName}>Disasters & Speed Quizzes</h3>
            <p className={styles.featureDesc}>
              Weather targeted urban disasters like earthquakes and supply chain collapses. Compete in timed 5-question civil engineering speed quizzes for massive instant cash rewards.
            </p>
            <div className={styles.featureTag}>SPEED CHALLENGES</div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🏢</div>
            <h3 className={styles.featureName}>Structural Engineering</h3>
            <p className={styles.featureDesc}>
              Balance vertical height, floor tier synergies, structural stability, and green sustainability ratings. Build high, but build strong—unstable towers can face critical penalties!
            </p>
            <div className={styles.featureTag}>PHYSICS & STABILITY</div>
          </div>
        </div>
      </section>

      {/* HOW TO PLAY PROTOCOL */}
      <section id="protocol" className={styles.protocolSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPre}>OPERATIONAL PROTOCOL</span>
          <h2 className={styles.sectionTitle}>HOW YOUR TEAM COMPETES</h2>
        </div>

        <div className={styles.protocolSteps}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>01</div>
            <h3 className={styles.stepTitle}>Register Team & Claim City</h3>
            <p className={styles.stepDesc}>Create your team account, lock in your starting metropolis on the interactive map, and receive starting cash reserves.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNum}>02</div>
            <h3 className={styles.stepTitle}>Enter Round Access Code</h3>
            <p className={styles.stepDesc}>When the admin triggers a round, enter the 6-character access code on your dashboard to unlock the active game floor.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNum}>03</div>
            <h3 className={styles.stepTitle}>Trade, Build & Quiz</h3>
            <p className={styles.stepDesc}>Purchase materials on the marketplace, construct floors tier-by-tier, and take timed challenges to boost funds.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNum}>04</div>
            <h3 className={styles.stepTitle}>Dominate the 4K Arena</h3>
            <p className={styles.stepDesc}>Watch your skyscraper rise in real-time on the main projector leaderboard. The team with the highest evaluated score wins!</p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBox}>
          <h2 className={styles.ctaTitle}>READY TO ENTER THE ARENA?</h2>
          <p className={styles.ctaSubtitle}>Register your college team now to secure your starting slot and claim ₹85,000 bonus funds.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="brutal-btn brutal-btn-lime" style={{ padding: '16px 36px', fontSize: '15px' }}>
              CREATE TEAM ACCOUNT →
            </Link>
            <Link href="/login" className="brutal-btn brutal-btn-white" style={{ padding: '16px 32px', fontSize: '15px' }}>
              TEAM SIGN IN
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span style={{ fontSize: '24px' }}>🏗️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.08em' }}>HIGH-RISE HUSTLE</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CIVIL & URBAN STRATEGY ARENA</div>
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
