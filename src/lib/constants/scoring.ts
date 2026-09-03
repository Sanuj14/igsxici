/**
 * Master scoring formula for High-Rise Hustle.
 * Stability has been removed from the scoring system.
 * 
 * 4 Pillars (100% total weight):
 * 1. Tower Height: 30% (height * 0.30)
 * 2. Building Asset Value: 30% ((building_value / 1000) * 0.30)
 * 3. Sustainability Score: 20% (sustainability_score * 0.20)
 * 4. Treasury Funds: 20% ((funds / 10000) * 0.20)
 */
export function calculateTeamScore(
  building: {
    height?: number | null
    building_value?: number | null
    sustainability_score?: number | null
  } | null | undefined,
  funds: number = 0
): number {
  const height = Number(building?.height) || 0
  const bValue = Number(building?.building_value) || 0
  const sustainability = Number(building?.sustainability_score) || 0
  const cash = Number(funds) || 0

  return (height * 0.30) + ((bValue / 1000) * 0.30) + (sustainability * 0.20) + ((cash / 10000) * 0.20)
}
