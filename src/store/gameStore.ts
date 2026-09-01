import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { Team, Building, TeamInventory, MarketPrice, Resource, Notification, Event, Challenge, City, GameConfig } from '@/lib/supabase/types'

interface GameState {
  // Auth
  userId: string | null
  userRole: 'admin' | 'team' | null
  teamId: string | null

  // Team
  team: Team | null
  building: Building | null
  inventory: (TeamInventory & { resource: Resource })[]

  // Market
  marketPrices: (MarketPrice & { resource: Resource })[]
  resources: Resource[]

  // Game
  events: Event[]
  challenges: Challenge[]
  notifications: Notification[]
  cities: City[]
  gameConfig: Record<string, any>

  // UI
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (userId: string, role: 'admin' | 'team', teamId: string | null) => void
  loadTeamData: (teamId: string) => Promise<void>
  loadMarket: () => Promise<void>
  loadEvents: () => Promise<void>
  loadChallenges: () => Promise<void>
  loadCities: () => Promise<void>
  loadConfig: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  addNotification: (notif: Notification) => void
  updateTeamFunds: (funds: number) => void
  updateBuilding: (building: Building) => void
  updateMarketPrice: (resourceId: string, price: number, stock: number) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  userId: null,
  userRole: null,
  teamId: null,
  team: null,
  building: null,
  inventory: [],
  marketPrices: [],
  resources: [],
  events: [],
  challenges: [],
  notifications: [],
  cities: [],
  gameConfig: {},
  isLoading: false,
  error: null,

  setUser: (userId, role, teamId) => set({ userId, userRole: role, teamId }),

  loadTeamData: async (teamId) => {
    set({ isLoading: true })
    try {
      const [teamRes, buildingRes, inventoryRes, notifRes] = await Promise.all([
        supabase.from('teams').select('*, city:cities(*)').eq('id', teamId).single(),
        supabase.from('buildings').select('*').eq('team_id', teamId).single(),
        supabase.from('team_inventory').select('*, resource:resources(*)').eq('team_id', teamId),
        supabase.from('notifications').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(50),
      ])
      set({
        team: teamRes.data,
        building: buildingRes.data,
        inventory: (inventoryRes.data as any) || [],
        notifications: notifRes.data || [],
        isLoading: false,
      })
    } catch (e: any) {
      set({ error: e.message, isLoading: false })
    }
  },

  loadMarket: async () => {
    const { data: prices } = await supabase
      .from('market_prices')
      .select('*, resource:resources(*)')
    const { data: resources } = await supabase.from('resources').select('*')
    set({ marketPrices: (prices as any) || [], resources: resources || [] })
  },

  loadEvents: async () => {
    // Only load events from the current active game's time window
    const { data: activeGame } = await supabase
      .from('games')
      .select('created_at')
      .eq('status', 'active')
      .single()

    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (activeGame) {
      query = query.gte('created_at', activeGame.created_at)
    }

    const { data } = await query
    set({ events: data || [] })
  },

  loadChallenges: async () => {
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .in('status', ['active', 'upcoming'])
      .order('created_at', { ascending: false })
    set({ challenges: data || [] })
  },

  loadCities: async () => {
    const { data } = await supabase.from('cities').select('*').order('name')
    set({ cities: data || [] })
  },

  loadConfig: async () => {
    const { data } = await supabase.from('game_config').select('*')
    if (data) {
      const config: Record<string, any> = {}
      data.forEach(row => { config[row.key] = row.value })
      set({ gameConfig: config })
    }
  },

  markNotificationRead: async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }))
  },

  addNotification: (notif) => {
    set(state => ({ notifications: [notif, ...state.notifications] }))
  },

  updateTeamFunds: (funds) => {
    set(state => ({ team: state.team ? { ...state.team, funds } : null }))
  },

  updateBuilding: (building) => set({ building }),

  updateMarketPrice: (resourceId, price, stock) => {
    set(state => ({
      marketPrices: state.marketPrices.map(mp =>
        mp.resource_id === resourceId ? { ...mp, current_price: price, stock } : mp
      )
    }))
  },

  setError: (error) => set({ error }),

  reset: () => set({
    userId: null, userRole: null, teamId: null,
    team: null, building: null, inventory: [],
    marketPrices: [], resources: [], events: [],
    challenges: [], notifications: [], cities: [],
    gameConfig: {}, isLoading: false, error: null,
  }),
}))
