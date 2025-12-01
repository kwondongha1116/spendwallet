import { api } from './client'

export type MarketIndex = {
  price: number
  change: number
  trend: number[]
}

export type MarketSummary = Record<string, MarketIndex>

export async function fetchMarketSummary(): Promise<MarketSummary> {
  const res = await api.get('/api/stocks/summary')
  return res.data.indices as MarketSummary
}

