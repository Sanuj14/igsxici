export interface EventPreset {
  id: string
  title: string
  icon: string
  duration: number
  type: string
  desc: string
  effectSummary: string
  effects: Record<string, any>
}

export const EVENT_PRESETS: EventPreset[] = [
  {
    id: 'power-grid-failure',
    title: 'Power Grid Failure',
    icon: '⚡',
    duration: 4,
    type: 'disaster',
    desc: 'A massive blackout plunges the entire region into darkness.',
    effectSummary: 'Live marketplace offline for 4 mins; only team-to-team bartering permitted.',
    effects: { marketplace_offline: true }
  },
  {
    id: 'coastal-cyclone',
    title: 'Coastal Cyclone',
    icon: '🌊',
    duration: 5,
    type: 'disaster',
    desc: 'High winds batter coastal cities (Mumbai, Chennai, Kolkata, Kochi, Visakhapatnam, Surat).',
    effectSummary: 'Glass prices rise by 50%; construction paused for 5 mins in coastal cities.',
    effects: { price_effects: { glass: 1.5 }, coastal_pause: true }
  },
  {
    id: 'cement-cartel-monopoly',
    title: 'Cement Cartel Monopoly',
    icon: '🏗️',
    duration: 5,
    type: 'disaster',
    desc: 'Cement suppliers collude to artificially inflate prices.',
    effectSummary: 'Cement base price increases by ₹400 / unit (+50%).',
    effects: { price_effects: { cement: 1.5 } }
  },
  {
    id: 'central-bank-freeze',
    title: 'Central Bank Freeze',
    icon: '🏦',
    duration: 5,
    type: 'disaster',
    desc: 'The bank halts transactions due to a suspected cyber attack.',
    effectSummary: 'Virtual funds frozen for 5 mins; all construction must be funded via resource bartering.',
    effects: { bank_freeze: true, marketplace_offline: true }
  },
  {
    id: 'severe-earthquake',
    title: 'Severe Earthquake',
    icon: '🌋',
    duration: 3,
    type: 'disaster',
    desc: 'A major seismic event shakes the foundation of all towers.',
    effectSummary: 'Marketplace offline for 3 mins; tower stability damaged by 10 points.',
    effects: { marketplace_offline: true, stability_change: -10 }
  },
  {
    id: 'tech-boom-inflation',
    title: 'Tech Boom Inflation',
    icon: '📈',
    duration: 5,
    type: 'disaster',
    desc: 'A surge in investors raises property values but limits materials.',
    effectSummary: 'Glass and Steel prices increase by 25%.',
    effects: { price_effects: { glass: 1.25, steel: 1.25 } }
  },
  {
    id: 'zoning-law-changes',
    title: 'Zoning Law Changes',
    icon: '✈️',
    duration: 7,
    type: 'disaster',
    desc: 'Sudden aviation height restrictions are temporarily enforced.',
    effectSummary: 'No team can build above 150 meters for the next 7 minutes.',
    effects: { max_height_cap: 150 }
  },
  {
    id: 'flash-flood',
    title: 'Flash Flood',
    icon: '🌧️',
    duration: 5,
    type: 'disaster',
    desc: 'Sudden heavy rains inundate city streets and worksites.',
    effectSummary: '10% of unspent Cement inventory is washed away; Cement marketplace price spikes by 30%.',
    effects: { price_effects: { cement: 1.3 }, inventory_pct_cut: { cement: 0.10 } }
  },
  {
    id: 'supply-chain-sabotage',
    title: 'Supply Chain Sabotage',
    icon: '🚛',
    duration: 3,
    type: 'disaster',
    desc: 'A rogue competitor disrupts the transport of raw materials.',
    effectSummary: 'All pending marketplace purchases are offline / delayed for 3 minutes.',
    effects: { marketplace_offline: true }
  },
  {
    id: 'extreme-heatwave',
    title: 'Extreme Heatwave',
    icon: '☀️',
    duration: 10,
    type: 'disaster',
    desc: 'Dangerous temperatures halt daytime manual labor.',
    effectSummary: 'Labour costs double (2x) for 10 mins; Sustainability drops 5% for non-green buildings.',
    effects: { price_effects: { labour: 2.0 }, heatwave_sustainability_drop: true }
  },
  {
    id: 'global-steel-shortage',
    title: 'Global Steel Shortage',
    icon: '⚙️',
    duration: 8,
    type: 'disaster',
    desc: 'International supply chain issues cause a massive steel deficit.',
    effectSummary: 'Steel prices skyrocket by 70%; market steel stock emptied (barter only for 8 mins).',
    effects: { price_effects: { steel: 1.7 }, steel_stock_zero: true }
  },
  {
    id: 'site-accident',
    title: 'Major Site Accident',
    icon: '🚧',
    duration: 3,
    type: 'disaster',
    desc: 'A severe structural failure halts worksite operations for mandatory inspections.',
    effectSummary: 'All construction paused for 3 minutes; ₹5,000 regulatory safety penalty.',
    effects: { construction_pause: true, fund_change: -5000 }
  }
]
