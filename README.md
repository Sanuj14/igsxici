<div align="center">
  <img src="https://img.shields.io/badge/Status-Live-success?style=for-the-badge&logoColor=white&color=28C840" alt="Status" />
  <img src="https://img.shields.io/badge/Framework-Next.js_14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Database-Supabase-black?style=for-the-badge&logo=supabase&color=3ECF8E" alt="Supabase" />
</div>

<br />

<div align="center">
  <h1 style="font-size: 3rem; margin-bottom: 0;">🏗️ HIGH-RISE HUSTLE</h1>
  <p><strong>A Real-time Strategy Construction Event for IGS × ICI</strong></p>
</div>

<hr />

## 🚨 The Premise
Welcome to **High-rise Hustle**. Your team has been given ₹85,000, a plot in a major Indian city, and a dream. The goal? **Build the tallest, most structurally sound skyscraper in the country.** 

But this isn't just about stacking floors. The market is constantly crashing, earthquakes are unpredictable, and other teams are actively competing for the same limited resources. **Can you survive the chaos?**

## 🔥 Features
* **Real-time Live Market:** Prices of Cement, Steel, Glass, Timber, Aluminium, and Copper fluctuate in real-time based on supply, demand, and admin-triggered events.
* **Dynamic Disasters & Events:** From monsoon floods in Mumbai to tech booms in Bangalore, random events alter the game state instantly via WebSockets.
* **Structural Engineering Engine:** Every floor built requires precise resource combinations. Building too high with cheap materials drastically lowers your structural stability.
* **God-mode Admin Control:** The Admin Dashboard lets organizers trigger targeted earthquakes, give team bailouts, inflate the market, and monitor all players on a live leaderboard.
* **Neo-Brutalist UI:** A sleek, high-contrast, lightning-fast dashboard built for high-pressure decision making.

## 🛠️ Tech Stack
* **Frontend:** Next.js 14 (App Router), React, TypeScript
* **Styling:** Custom CSS Modules (Neo-Brutalist Design)
* **Backend / Database:** Supabase (PostgreSQL)
* **Real-time Engine:** Supabase Realtime (WebSockets)
* **State Management:** Zustand
* **Mapping:** React Simple Maps & TopoJSON

## 🚀 Quick Start (Local Setup)

1. **Clone the repo**
   ```bash
   git clone https://github.com/Sanuj14/igsxici.git
   cd igsxici
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to access the game!

## 🎮 How to Play (For Teams)
1. Register your team and pick a city. Choose wisely—coastal cities have trade advantages but high disaster risks!
2. Wait for the Admin to share the **Access Code** and start the round.
3. Buy resources from the **Live Market**. Buy low, sell high.
4. Go to the **Build** tab and start constructing floors. Keep an eye on your Stability and Sustainability scores.
5. The team with the highest final **Building Value** wins.

<hr />

<div align="center">
  <p>Built with ❤️ for <b>IGS × ICI</b></p>
</div>
