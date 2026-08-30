-- ============================================================
-- SKYSCRAPER STREET — Complete Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  color           TEXT NOT NULL DEFAULT '#4361EE',
  coordinates_x   NUMERIC NOT NULL DEFAULT 50,
  coordinates_y   NUMERIC NOT NULL DEFAULT 50,
  is_coastal      BOOLEAN NOT NULL DEFAULT false,
  starting_bonus  INTEGER NOT NULL DEFAULT 0,
  advantages      TEXT[] NOT NULL DEFAULT '{}',
  risks           TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  city_id         UUID REFERENCES cities(id),
  funds           INTEGER NOT NULL DEFAULT 85000,
  score           NUMERIC NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'team' CHECK (role IN ('admin', 'team')),
  team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
  display_name    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buildings (one per team)
CREATE TABLE IF NOT EXISTS buildings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id               UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  floors                INTEGER NOT NULL DEFAULT 0,
  height                NUMERIC NOT NULL DEFAULT 0,
  building_value        INTEGER NOT NULL DEFAULT 0,
  structural_stability  NUMERIC NOT NULL DEFAULT 100,
  sustainability_score  NUMERIC NOT NULL DEFAULT 0,
  floor_history         JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Floor types (12 types across 3 tiers)
CREATE TABLE IF NOT EXISTS floor_types (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL UNIQUE,
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT NOT NULL DEFAULT '',
  icon                  TEXT NOT NULL DEFAULT '🏢',
  tier                  INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1,2,3)),
  height_gain           NUMERIC NOT NULL DEFAULT 5,
  building_value_gain   INTEGER NOT NULL DEFAULT 5000,
  stability_effect      NUMERIC NOT NULL DEFAULT 0,
  sustainability_effect NUMERIC NOT NULL DEFAULT 0,
  cash_cost             INTEGER NOT NULL DEFAULT 10000,
  resource_requirements JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '📦',
  unit_label  TEXT NOT NULL DEFAULT 'units',
  base_price  INTEGER NOT NULL DEFAULT 1000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Market prices (one row per resource, updated in real-time)
CREATE TABLE IF NOT EXISTS market_prices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id   UUID NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  current_price INTEGER NOT NULL DEFAULT 1000,
  stock         INTEGER NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team inventory
CREATE TABLE IF NOT EXISTS team_inventory (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE(team_id, resource_id)
);

-- Events (admin-triggered)
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_type  TEXT NOT NULL DEFAULT 'misc' CHECK (event_type IN ('disaster','bonus','market','construction','misc')),
  scope       TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','city','team')),
  city_id     UUID REFERENCES cities(id),
  team_id     UUID REFERENCES teams(id),
  effects     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired')),
  end_at      TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Games (Active Rounds)
CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Games (Track joined games)
CREATE TABLE IF NOT EXISTS team_games (
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, game_id)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  challenge_type    TEXT NOT NULL DEFAULT 'intellectual' CHECK (challenge_type IN ('intellectual','quickfire','physical','venue_mission','risk')),
  reward_funds      INTEGER NOT NULL DEFAULT 15000,
  penalty_funds     INTEGER NOT NULL DEFAULT 0,
  max_slots         INTEGER NOT NULL DEFAULT 3,
  claimed_slots     INTEGER NOT NULL DEFAULT 0,
  duration_minutes  INTEGER NOT NULL DEFAULT 5,
  status            TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','closed')),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','success','failed')),
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  UNIQUE(challenge_id, team_id)
);

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  to_team_id        UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  offer_funds       INTEGER NOT NULL DEFAULT 0,
  request_funds     INTEGER NOT NULL DEFAULT 0,
  offer_resources   JSONB NOT NULL DEFAULT '{}',
  request_resources JSONB NOT NULL DEFAULT '{}',
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at      TIMESTAMPTZ
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  notif_type  TEXT NOT NULL DEFAULT 'info' CHECK (notif_type IN ('info','success','warning','disaster')),
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions (audit log)
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  amount      INTEGER NOT NULL DEFAULT 0,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game config (key-value store)
CREATE TABLE IF NOT EXISTS game_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE cities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config          ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: get current user's team_id
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Cities: everyone can read
CREATE POLICY "cities_read" ON cities FOR SELECT USING (true);
CREATE POLICY "cities_admin" ON cities FOR ALL USING (get_my_role() = 'admin');

-- Teams: everyone reads; admin writes; own team can update city selection
CREATE POLICY "teams_read"     ON teams FOR SELECT USING (true);
CREATE POLICY "teams_admin"    ON teams FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "teams_own_city" ON teams FOR UPDATE USING (id = get_my_team_id());

-- User profiles: own profile; admin sees all
CREATE POLICY "profiles_own"   ON user_profiles FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE USING (id = auth.uid() OR get_my_role() = 'admin');

-- Buildings: everyone reads; admin all
CREATE POLICY "buildings_read"  ON buildings FOR SELECT USING (true);
CREATE POLICY "buildings_admin" ON buildings FOR ALL USING (get_my_role() = 'admin');

-- Floor types: everyone reads
CREATE POLICY "floor_types_read" ON floor_types FOR SELECT USING (true);
CREATE POLICY "floor_types_admin" ON floor_types FOR ALL USING (get_my_role() = 'admin');

-- Resources & market: everyone reads; admin writes
CREATE POLICY "resources_read"  ON resources FOR SELECT USING (true);
CREATE POLICY "resources_admin" ON resources FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "market_read"     ON market_prices FOR SELECT USING (true);
CREATE POLICY "market_admin"    ON market_prices FOR ALL USING (get_my_role() = 'admin');

-- Inventory: own team reads; admin reads all
CREATE POLICY "inventory_own"   ON team_inventory FOR SELECT USING (team_id = get_my_team_id() OR get_my_role() = 'admin');
CREATE POLICY "inventory_admin" ON team_inventory FOR ALL USING (get_my_role() = 'admin');

-- Events: everyone reads; admin writes
CREATE POLICY "events_read"  ON events FOR SELECT USING (true);
CREATE POLICY "events_admin" ON events FOR ALL USING (get_my_role() = 'admin');

-- Challenges: everyone reads; admin writes
CREATE POLICY "challenges_read"  ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_admin" ON challenges FOR ALL USING (get_my_role() = 'admin');

-- Challenge participants: own team + admin
CREATE POLICY "cp_own"   ON challenge_participants FOR SELECT USING (team_id = get_my_team_id() OR get_my_role() = 'admin');
CREATE POLICY "cp_insert" ON challenge_participants FOR INSERT WITH CHECK (team_id = get_my_team_id());
CREATE POLICY "cp_admin"  ON challenge_participants FOR ALL USING (get_my_role() = 'admin');

-- Trades: own team sees own trades
CREATE POLICY "trades_own"   ON trades FOR SELECT USING (from_team_id = get_my_team_id() OR to_team_id = get_my_team_id() OR get_my_role() = 'admin');
CREATE POLICY "trades_insert" ON trades FOR INSERT WITH CHECK (from_team_id = get_my_team_id());
CREATE POLICY "trades_update" ON trades FOR UPDATE USING (to_team_id = get_my_team_id() OR get_my_role() = 'admin');

-- Notifications: own team
CREATE POLICY "notifs_own"   ON notifications FOR SELECT USING (team_id = get_my_team_id() OR get_my_role() = 'admin');
CREATE POLICY "notifs_update" ON notifications FOR UPDATE USING (team_id = get_my_team_id());
CREATE POLICY "notifs_admin"  ON notifications FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- Transactions: own team reads; admin all
CREATE POLICY "tx_own"   ON transactions FOR SELECT USING (team_id = get_my_team_id() OR get_my_role() = 'admin');
CREATE POLICY "tx_admin" ON transactions FOR ALL USING (get_my_role() = 'admin');

-- Game config: everyone reads; admin writes
CREATE POLICY "config_read"  ON game_config FOR SELECT USING (true);
CREATE POLICY "config_admin" ON game_config FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'team'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPC FUNCTIONS (atomic game operations)
-- ============================================================

-- Purchase resource from marketplace
CREATE OR REPLACE FUNCTION purchase_resource(
  p_team_id    UUID,
  p_resource_id UUID,
  p_quantity    INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_price   INTEGER;
  v_stock   INTEGER;
  v_funds   INTEGER;
  v_cost    INTEGER;
BEGIN
  -- Lock market row
  SELECT current_price, stock INTO v_price, v_stock
  FROM market_prices WHERE resource_id = p_resource_id FOR UPDATE;

  IF v_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough stock. Only ' || v_stock || ' available.');
  END IF;

  v_cost := v_price * p_quantity;

  -- Lock team row
  SELECT funds INTO v_funds FROM teams WHERE id = p_team_id FOR UPDATE;

  IF v_funds < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds. Need ₹' || v_cost || ', have ₹' || v_funds || '.');
  END IF;

  -- Deduct funds
  UPDATE teams SET funds = funds - v_cost, updated_at = NOW() WHERE id = p_team_id;

  -- Reduce stock
  UPDATE market_prices SET stock = stock - p_quantity, updated_at = NOW() WHERE resource_id = p_resource_id;

  -- Add to inventory
  INSERT INTO team_inventory (team_id, resource_id, quantity)
  VALUES (p_team_id, p_resource_id, p_quantity)
  ON CONFLICT (team_id, resource_id) DO UPDATE
  SET quantity = team_inventory.quantity + p_quantity;

  -- Log transaction
  INSERT INTO transactions (team_id, type, amount, metadata)
  VALUES (p_team_id, 'purchase', -v_cost, jsonb_build_object('resource_id', p_resource_id, 'quantity', p_quantity, 'unit_price', v_price));

  RETURN jsonb_build_object('success', true, 'cost', v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sell resource back to marketplace
CREATE OR REPLACE FUNCTION sell_resource(
  p_team_id     UUID,
  p_resource_id  UUID,
  p_quantity     INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_price   INTEGER;
  v_inv_qty INTEGER;
  v_earned  INTEGER;
BEGIN
  SELECT quantity INTO v_inv_qty
  FROM team_inventory WHERE team_id = p_team_id AND resource_id = p_resource_id FOR UPDATE;

  IF v_inv_qty IS NULL OR v_inv_qty < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough inventory. You have ' || COALESCE(v_inv_qty,0) || '.');
  END IF;

  SELECT current_price INTO v_price FROM market_prices WHERE resource_id = p_resource_id;
  v_earned := ROUND(v_price * p_quantity * 0.9); -- 10% sell penalty

  -- Deduct inventory
  UPDATE team_inventory SET quantity = quantity - p_quantity WHERE team_id = p_team_id AND resource_id = p_resource_id;

  -- Add funds
  UPDATE teams SET funds = funds + v_earned, updated_at = NOW() WHERE id = p_team_id;

  -- Restore market stock
  UPDATE market_prices SET stock = stock + p_quantity, updated_at = NOW() WHERE resource_id = p_resource_id;

  -- Log
  INSERT INTO transactions (team_id, type, amount, metadata)
  VALUES (p_team_id, 'sale', v_earned, jsonb_build_object('resource_id', p_resource_id, 'quantity', p_quantity));

  RETURN jsonb_build_object('success', true, 'earned', v_earned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Build a floor
CREATE OR REPLACE FUNCTION build_floor(
  p_team_id      UUID,
  p_floor_type_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_ft      floor_types%ROWTYPE;
  v_funds   INTEGER;
  v_reqs    JSONB;
  v_key     TEXT;
  v_needed  INTEGER;
  v_have    INTEGER;
  v_res_id  UUID;
  v_building buildings%ROWTYPE;
BEGIN
  -- Get floor type
  SELECT * INTO v_ft FROM floor_types WHERE id = p_floor_type_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Floor type not found.');
  END IF;

  -- Check funds
  SELECT funds INTO v_funds FROM teams WHERE id = p_team_id FOR UPDATE;
  IF v_funds < v_ft.cash_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds. Need ₹' || v_ft.cash_cost || '.');
  END IF;

  -- Check all resource requirements
  v_reqs := v_ft.resource_requirements;
  FOR v_key IN SELECT jsonb_object_keys(v_reqs) LOOP
    v_needed := (v_reqs->>v_key)::INTEGER;
    SELECT r.id INTO v_res_id FROM resources r WHERE r.slug = v_key;
    IF v_res_id IS NULL THEN CONTINUE; END IF;
    SELECT COALESCE(quantity, 0) INTO v_have FROM team_inventory WHERE team_id = p_team_id AND resource_id = v_res_id;
    IF v_have < v_needed THEN
      RETURN jsonb_build_object('success', false, 'error', 'Need ' || v_needed || ' ' || v_key || ' (you have ' || v_have || ').');
    END IF;
  END LOOP;

  -- Deduct cash
  UPDATE teams SET funds = funds - v_ft.cash_cost, updated_at = NOW() WHERE id = p_team_id;

  -- Consume resources
  FOR v_key IN SELECT jsonb_object_keys(v_reqs) LOOP
    v_needed := (v_reqs->>v_key)::INTEGER;
    SELECT r.id INTO v_res_id FROM resources r WHERE r.slug = v_key;
    IF v_res_id IS NULL THEN CONTINUE; END IF;
    UPDATE team_inventory SET quantity = quantity - v_needed WHERE team_id = p_team_id AND resource_id = v_res_id;
  END LOOP;

  -- Update or create building
  SELECT * INTO v_building FROM buildings WHERE team_id = p_team_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO buildings (team_id, floors, height, building_value, structural_stability, sustainability_score, floor_history)
    VALUES (p_team_id, 1, v_ft.height_gain,
            v_ft.building_value_gain,
            LEAST(100, GREATEST(0, 100 + v_ft.stability_effect)),
            GREATEST(0, v_ft.sustainability_effect),
            jsonb_build_array(jsonb_build_object('floor_name', v_ft.name, 'floor_type_id', v_ft.id, 'height', v_ft.height_gain, 'built_at', NOW())));
  ELSE
    UPDATE buildings SET
      floors               = floors + 1,
      height               = height + v_ft.height_gain,
      building_value       = building_value + v_ft.building_value_gain,
      structural_stability = LEAST(100, GREATEST(0, structural_stability + v_ft.stability_effect)),
      sustainability_score = LEAST(100, GREATEST(0, sustainability_score + v_ft.sustainability_effect)),
      floor_history        = floor_history || jsonb_build_array(jsonb_build_object('floor_name', v_ft.name, 'floor_type_id', v_ft.id, 'height', v_ft.height_gain, 'built_at', NOW())),
      updated_at           = NOW()
    WHERE team_id = p_team_id;
  END IF;

  -- Update team score
  UPDATE teams SET
    score = (SELECT height * 0.25 + building_value::NUMERIC/1000 * 0.25 + structural_stability * 0.2 + sustainability_score * 0.15 + funds::NUMERIC/10000 * 0.15 FROM buildings WHERE team_id = p_team_id),
    updated_at = NOW()
  WHERE id = p_team_id;

  -- Log
  INSERT INTO transactions (team_id, type, amount, metadata)
  VALUES (p_team_id, 'build', -v_ft.cash_cost, jsonb_build_object('floor_type', v_ft.name, 'height_gain', v_ft.height_gain));

  -- Notify team
  INSERT INTO notifications (team_id, title, message, notif_type)
  VALUES (p_team_id, '🏗️ Floor Built!', v_ft.name || ' added (+' || v_ft.height_gain || 'm height, +₹' || v_ft.building_value_gain || ' value)', 'success');

  RETURN jsonb_build_object('success', true, 'height_gain', v_ft.height_gain, 'value_gain', v_ft.building_value_gain);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim a challenge slot
CREATE OR REPLACE FUNCTION claim_challenge_slot(
  p_team_id      UUID,
  p_challenge_id  UUID
)
RETURNS JSONB AS $$
DECLARE
  v_ch challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_ch FROM challenges WHERE id = p_challenge_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found.');
  END IF;
  IF v_ch.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is not active.');
  END IF;
  IF v_ch.claimed_slots >= v_ch.max_slots THEN
    RETURN jsonb_build_object('success', false, 'error', 'All slots are taken!');
  END IF;

  -- Check not already claimed
  IF EXISTS (SELECT 1 FROM challenge_participants WHERE challenge_id = p_challenge_id AND team_id = p_team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your team already claimed a slot.');
  END IF;

  -- Claim slot
  INSERT INTO challenge_participants (challenge_id, team_id, status)
  VALUES (p_challenge_id, p_team_id, 'claimed');

  UPDATE challenges SET claimed_slots = claimed_slots + 1 WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED DATA
-- ============================================================

-- 6 Resources
INSERT INTO resources (name, slug, description, icon, unit_label, base_price) VALUES
  ('Cement',    'cement',    'Essential for all foundation and structural work',     '🏗️', 'bags',  800),
  ('Steel',     'steel',     'High-strength rebar and structural beams',            '⚙️', 'tons',  2500),
  ('Glass',     'glass',     'Premium architectural glass panels',                  '🪟', 'panes', 1800),
  ('Timber',    'timber',    'Sustainably sourced hardwood for interiors',          '🌲', 'planks',600),
  ('Aluminium', 'aluminium', 'Lightweight cladding and window frames',              '🔩', 'sheets',1200),
  ('Copper',    'copper',    'Electrical wiring and plumbing infrastructure',       '🔌', 'coils', 3000),
  ('Labour',    'labour',    'Skilled workers required for construction',           '👷', 'workers', 5000)
ON CONFLICT (slug) DO NOTHING;

-- Market prices for each resource
INSERT INTO market_prices (resource_id, current_price, stock)
SELECT id, base_price, 200 FROM resources
ON CONFLICT (resource_id) DO NOTHING;

-- 12 Floor types across 3 tiers
INSERT INTO floor_types (name, slug, description, icon, tier, height_gain, building_value_gain, stability_effect, sustainability_effect, cash_cost, resource_requirements) VALUES
  -- TIER 1: FOUNDATION
  ('Concrete Podium',    'concrete-podium',    'A solid reinforced concrete base level',               '🧱', 1, 4,  8000,  5,   0,  5000,  '{"cement": 5, "steel": 2}'),
  ('Parking Basement',   'parking-basement',   'Underground parking with structural support',           '🅿️', 1, 3,  6000,  8,   -5, 8000,  '{"cement": 8, "steel": 3}'),
  ('Retail Podium',      'retail-podium',      'Commercial retail space at ground level',               '🛍️', 1, 5,  12000, 3,   2,  12000, '{"cement": 4, "glass": 3, "timber": 2}'),
  ('Utility Floor',      'utility-floor',      'Mechanical and electrical services floor',              '🔧', 1, 3,  5000,  6,   3,  7000,  '{"steel": 2, "copper": 2}'),

  -- TIER 2: MID-RISE
  ('Office Floor',       'office-floor',       'Open-plan corporate office space',                     '💼', 2, 5,  15000, 0,   5,  18000, '{"cement": 3, "glass": 4, "aluminium": 2}'),
  ('Residential Floor',  'residential-floor',  'Modern apartments with premium interiors',              '🏠', 2, 5,  14000, -2,  8,  15000, '{"cement": 3, "timber": 4, "copper": 1}'),
  ('Hotel Floor',        'hotel-floor',        'Luxury hotel suites with high-end finishes',           '🏨', 2, 5,  20000, -3,  6,  22000, '{"glass": 5, "timber": 3, "aluminium": 2}'),
  ('Sky Garden',         'sky-garden',         'Rooftop green terrace with urban farming',             '🌿', 2, 4,  18000, 2,   20, 20000, '{"timber": 6, "copper": 2, "steel": 1}'),

  -- TIER 3: SKYSCRAPER
  ('Executive Penthouse', 'executive-penthouse', 'Ultra-luxury penthouse suite with panoramic views', '👑', 3, 8,  35000, -5,  10, 40000, '{"glass": 8, "aluminium": 4, "timber": 3, "copper": 2}'),
  ('Helipad',             'helipad',             'Rooftop helicopter landing pad',                    '🚁', 3, 6,  28000, 10,  0,  35000, '{"steel": 6, "aluminium": 4, "copper": 2}'),
  ('Solar Crown',         'solar-crown',         'Solar panel array — generates passive income',       '☀️', 3, 7,  30000, 0,   25, 38000, '{"aluminium": 6, "copper": 4, "glass": 3}'),
  ('Sky Observatory',     'sky-observatory',     'Public observation deck and luxury restaurant',     '🔭', 3, 9,  40000, -8,  12, 45000, '{"glass": 10, "steel": 4, "aluminium": 3, "timber": 2}')
ON CONFLICT (slug) DO NOTHING;

-- 15 Indian Cities
INSERT INTO cities (name, slug, description, color, coordinates_x, coordinates_y, is_coastal, starting_bonus, advantages, risks) VALUES
  ('Mumbai',     'mumbai',     'Financial capital. High-value land, coastal breeze, premium resources.',   '#FF2D78', 18, 62, true,  10000, ARRAY['Finance hub bonus','Coastal trade access','Premium market prices'], ARRAY['Flood risk','High land cost','Cyclone exposure']),
  ('Delhi',      'delhi',      'Political powerhouse. Government contracts, infrastructure grants.',        '#7B2FBE', 47, 28, false, 8000,  ARRAY['Govt contract bonus','Large market','Infrastructure subsidies'], ARRAY['Pollution penalty','Extreme heat summers','Smog events']),
  ('Bangalore',  'bangalore',  'Tech capital. IT floor bonuses, sustainability incentives.',               '#4361EE', 42, 72, false, 9000,  ARRAY['Tech floor bonus','Startup grants','Green building rebates'], ARRAY['Traffic penalty','Water scarcity','High labour cost']),
  ('Chennai',    'chennai',    'Industrial hub. Steel and cement discounts, port access.',                 '#FF6B35', 48, 76, true,  7000,  ARRAY['Port logistics bonus','Steel discount 10%','Industrial subsidies'], ARRAY['Cyclone risk','Heat stress penalty','Water shortage']),
  ('Kolkata',    'kolkata',    'Cultural capital. Heritage bonuses, lower land costs.',                    '#06D6A0', 65, 42, false, 6000,  ARRAY['Heritage floor bonus','Low land cost','River trade route'], ARRAY['Flood risk','Aging infrastructure','Monsoon delays']),
  ('Hyderabad',  'hyderabad',  'Pearl city. Pharma and biotech bonuses, twin-city advantage.',             '#FFD60A', 43, 65, false, 8500,  ARRAY['Pharma sector bonus','Twin-city market','IT hub access'], ARRAY['Water scarcity','Political uncertainty','Earthquake-prone']),
  ('Pune',       'pune',       'Education hub. Research bonuses, skilled workforce discount.',             '#E91E8C', 35, 63, false, 7500,  ARRAY['Research grant','Skilled workforce','Manufacturing proximity'], ARRAY['Traffic congestion','Land price spike','Water stress']),
  ('Ahmedabad',  'ahmedabad',  'Textile capital. Manufacturing discounts, diamond trade access.',          '#2EC4B6', 28, 45, false, 6500,  ARRAY['Manufacturing discount','Textile bonus','Diamond market access'], ARRAY['Earthquake zone','Summer heat wave','Water scarcity']),
  ('Jaipur',     'jaipur',     'Pink city. Tourism multiplier, heritage architecture bonuses.',            '#FF9F1C', 38, 35, false, 5500,  ARRAY['Tourism multiplier','Heritage bonus','Rajasthan craft access'], ARRAY['Desert heat penalty','Water scarcity','Limited resources']),
  ('Surat',      'surat',      'Diamond city. Trade surplus, textile manufacturing, river access.',        '#00B4D8', 25, 52, false, 7000,  ARRAY['Diamond trade bonus','Textile surplus','River logistics'], ARRAY['Flood zone','Labour migration','Monsoon disruption']),
  ('Kochi',      'kochi',      'Queen of the Arabian Sea. Spice trade, backwater tourism, port city.',    '#52B788', 38, 85, true,  8000,  ARRAY['Spice trade bonus','Tourism income','Port city discount'], ARRAY['Cyclone prone','Saline corrosion','High humidity']),
  ('Chandigarh', 'chandigarh', 'Planned city. Clean infrastructure, admin bonuses, zero land disputes.',  '#90E0EF', 42, 18, false, 6000,  ARRAY['Clean city bonus','Admin efficiency','No land disputes'], ARRAY['Limited growth','Cold winters','Remote market']),
  ('Bhopal',     'bhopal',     'City of lakes. Water access bonus, central location, lower costs.',       '#9B5DE5', 40, 50, false, 5000,  ARRAY['Water access bonus','Central logistics','Lower land cost'], ARRAY['Industrial pollution','Limited market','Landlocked']),
  ('Visakhapatnam', 'visakhapatnam', 'Port city. Navy presence, steel plant proximity, coastal trade.',   '#F15BB5', 55, 65, true,  7500,  ARRAY['Steel plant nearby','Naval bonus','Port trade access'], ARRAY['Cyclone exposure','Saltwater corrosion','Heat stress']),
  ('Indore',     'indore',     'Cleanest city. Hygiene bonus, smart city grants, food processing hub.',   '#FEE440', 35, 52, false, 5500,  ARRAY['Smart city grant','Hygiene bonus','Food processing hub'], ARRAY['Water scarcity','Limited port','Landlocked market'])
ON CONFLICT (slug) DO NOTHING;

-- Game config defaults
INSERT INTO game_config (key, value) VALUES
  ('round',              '1'),
  ('round_name',         '"Round 1 — Foundation"'),
  ('marketplace_enabled', 'true'),
  ('construction_paused', 'false'),
  ('trading_enabled',     'true'),
  ('starting_funds',      '85000'),
  ('access_code',         '"GAME2026"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- REALTIME (enable for live updates)
-- ============================================================
-- Run these in the Supabase dashboard under Database > Replication
-- Or uncomment if your Supabase version supports it via SQL:

-- ALTER PUBLICATION supabase_realtime ADD TABLE teams;
-- ALTER PUBLICATION supabase_realtime ADD TABLE buildings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE market_prices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
-- ALTER PUBLICATION supabase_realtime ADD TABLE trades;
