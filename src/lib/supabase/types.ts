export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          advantages: string[]
          risks: string[]
          starting_bonus: number
          coordinates_x: number
          coordinates_y: number
          is_coastal: boolean
          color: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cities']['Insert']>
      }
      teams: {
        Row: {
          id: string
          name: string
          city_id: string | null
          funds: number
          score: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at' | 'score'>
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string
          role: 'admin' | 'team'
          team_id: string | null
          display_name: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      resources: {
        Row: {
          id: string
          name: string
          slug: string
          base_price: number
          unit_label: string
          description: string | null
          icon: string
          color: string
        }
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['resources']['Insert']>
      }
      market_prices: {
        Row: {
          id: string
          resource_id: string
          current_price: number
          stock: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['market_prices']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['market_prices']['Insert']>
      }
      team_inventory: {
        Row: {
          team_id: string
          resource_id: string
          quantity: number
        }
        Insert: Database['public']['Tables']['team_inventory']['Row']
        Update: Partial<Database['public']['Tables']['team_inventory']['Row']>
      }
      floor_types: {
        Row: {
          id: string
          name: string
          description: string | null
          height_gain: number
          building_value_gain: number
          stability_effect: number
          sustainability_effect: number
          resource_requirements: Json
          cash_cost: number
          tier: number
          icon: string
        }
        Insert: Omit<Database['public']['Tables']['floor_types']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['floor_types']['Insert']>
      }
      buildings: {
        Row: {
          id: string
          team_id: string
          height: number
          floors: number
          building_value: number
          structural_stability: number
          sustainability_score: number
          floor_history: Json
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['buildings']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['buildings']['Insert']>
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_type: 'disaster' | 'bonus' | 'market' | 'construction' | 'misc'
          scope: 'global' | 'city' | 'team'
          city_id: string | null
          team_id: string | null
          status: 'active' | 'expired'
          effects: Json
          start_at: string
          end_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      challenges: {
        Row: {
          id: string
          title: string
          description: string
          challenge_type: 'intellectual' | 'quickfire' | 'physical' | 'venue_mission' | 'risk'
          reward_funds: number
          reward_resources: Json
          penalty_funds: number
          max_slots: number
          claimed_slots: number
          duration_minutes: number
          status: 'upcoming' | 'active' | 'closed'
          is_secret: boolean
          target_city_id: string | null
          created_by: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['challenges']['Row'], 'id' | 'claimed_slots' | 'created_at'>
        Update: Partial<Database['public']['Tables']['challenges']['Insert']>
      }
      challenge_participants: {
        Row: {
          id: string
          challenge_id: string
          team_id: string
          status: 'claimed' | 'success' | 'failed'
          claimed_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['challenge_participants']['Row'], 'id' | 'claimed_at'>
        Update: Partial<Database['public']['Tables']['challenge_participants']['Insert']>
      }
      trades: {
        Row: {
          id: string
          from_team_id: string
          to_team_id: string
          offer_resources: Json
          offer_funds: number
          request_resources: Json
          request_funds: number
          status: 'pending' | 'accepted' | 'rejected' | 'expired'
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['trades']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          team_id: string
          type: string
          amount: number
          resource_changes: Json
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: never
      }
      notifications: {
        Row: {
          id: string
          team_id: string
          title: string
          message: string
          notif_type: 'info' | 'warning' | 'disaster' | 'challenge' | 'trade' | 'success' | 'admin'
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'read'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      game_config: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['game_config']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['game_config']['Insert']>
      }
    }
    Functions: {
      purchase_resource: {
        Args: { p_team_id: string; p_resource_id: string; p_quantity: number }
        Returns: Json
      }
      sell_resource: {
        Args: { p_team_id: string; p_resource_id: string; p_quantity: number }
        Returns: Json
      }
      build_floor: {
        Args: { p_team_id: string; p_floor_type_id: string }
        Returns: Json
      }
      claim_challenge_slot: {
        Args: { p_team_id: string; p_challenge_id: string }
        Returns: Json
      }
      calculate_score: {
        Args: { p_team_id: string }
        Returns: number
      }
      get_my_role: { Args: Record<never, never>; Returns: string }
      get_my_team_id: { Args: Record<never, never>; Returns: string }
    }
  }
}

export type City = Database['public']['Tables']['cities']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Resource = Database['public']['Tables']['resources']['Row']
export type MarketPrice = Database['public']['Tables']['market_prices']['Row']
export type TeamInventory = Database['public']['Tables']['team_inventory']['Row']
export type FloorType = Database['public']['Tables']['floor_types']['Row']
export type Building = Database['public']['Tables']['buildings']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Challenge = Database['public']['Tables']['challenges']['Row']
export type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row']
export type Trade = Database['public']['Tables']['trades']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type GameConfig = Database['public']['Tables']['game_config']['Row']
