'use server'

import { db } from '@/lib/db'

export async function getFunnelAnalyticsAction(days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  // Fetch group by for speed, or multiple counts
  const [
    linkPasted,
    serviceSelected,
    checkoutInitiated,
    paymentClicked
  ] = await Promise.all([
    db.analyticsEvent.count({ where: { event: 'LINK_PASTED', createdAt: { gte: cutoff } } }),
    db.analyticsEvent.count({ where: { event: 'SERVICE_SELECTED', createdAt: { gte: cutoff } } }),
    db.analyticsEvent.count({ where: { event: 'CHECKOUT_INITIATED', createdAt: { gte: cutoff } } }),
    db.analyticsEvent.count({ where: { event: 'PAYMENT_CLICKED', createdAt: { gte: cutoff } } }),
  ])

  // Optional: Top 5 Services 
  // We'll fetch all SERVICE_SELECTED events, count occurrences of each serviceName in JSON
  const serviceEvents = await db.analyticsEvent.findMany({
    where: { 
      event: 'SERVICE_SELECTED', 
      createdAt: { gte: cutoff } 
    },
    select: { metadata: true }
  })

  const countMap: Record<string, number> = {}
  
  serviceEvents.forEach(e => {
    if (e.metadata && typeof e.metadata === 'object') {
      const name = (e.metadata as any).serviceName
      if (name) {
        countMap[name] = (countMap[name] || 0) + 1
      }
    }
  })

  const topServices = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, clicks]) => ({ name, clicks }))

  return {
    funnel: {
      linkPasted,
      serviceSelected,
      checkoutInitiated,
      paymentClicked
    },
    topServices
  }
}
