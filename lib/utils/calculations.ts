export function calculateRevenue(price: number, participants: number, discount = 0): number {
  const baseRevenue = price * participants
  const discountAmount = (baseRevenue * discount) / 100
  return baseRevenue - discountAmount
}

export function calculateNetRevenue(
  revenue: number,
  animator1Cost = 0,
  animator2Cost = 0,
  hostCost = 0,
  djCost = 0,
): number {
  const totalCosts = animator1Cost + animator2Cost + hostCost + djCost
  return revenue - totalCosts
}

export function calculateFOT(
  animator1: { hours: number; rate: number } | null,
  animator2: { hours: number; rate: number } | null,
  host: { hours: number; rate: number } | null,
  dj: { hours: number; rate: number } | null,
): number {
  let total = 0

  if (animator1) total += animator1.hours * animator1.rate
  if (animator2) total += animator2.hours * animator2.rate
  if (host) total += host.hours * host.rate
  if (dj) total += dj.hours * dj.rate

  return total
}

export function calculateProfitMargin(revenue: number, costs: number): number {
  if (revenue === 0) return 0
  return ((revenue - costs) / revenue) * 100
}

export function calculateAverageCheck(revenue: number, participants: number): number {
  if (participants === 0) return 0
  return revenue / participants
}

export function calculateConversionRate(completed: number, total: number): number {
  if (total === 0) return 0
  return (completed / total) * 100
}
