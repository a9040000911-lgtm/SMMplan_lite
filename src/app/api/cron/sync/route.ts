import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';

// To ensure Vercel Cron or External Cron doesn't timeout, we use Edge Runtime or just maxDuration
export const maxDuration = 60; // 60 seconds

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch active providers
    const providers = await providerService.getActiveProviders();
    if (providers.length === 0) {
      return NextResponse.json({ status: 'Skipped - No active providers' }, { status: 200 });
    }

    let processedCount = 0;

    // 2. Loop through each provider (usually just Vexboost)
    for (const provider of providers) {
      const providerInstance = providerService.getProviderInstance(provider);

      // Find unresolved orders assigned to this provider ID based on externalId
      // To simplify for lite: any order with externalId that is IN_PROGRESS or PENDING
      const processingOrders = await db.order.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          externalId: { not: null }
        },
        take: 100 // Process in chunks to prevent provider rate limits
      });

      if (processingOrders.length === 0) continue;

      const externalIds = processingOrders.map(o => o.externalId as string);

      // 3. Bulk fetch statuses
      // In Smmplan we used to use batch endpoints. We'll simulate fetching all at once.
      const providerInstanceDefault = await providerService.getDefaultProvider();
      
      // Group by external ID to minimize DB queries later
      const statuses = await providerInstanceDefault.getStatuses(externalIds);

      // 4. Update orders safely
      for (const order of processingOrders) {
        const extId = order.externalId as string;
        const newStatusData = statuses[extId];

        if (!newStatusData) continue; // Provider didn't return info for this ID

        // Standardize status format (Completed, Partial, Canceled, Processing, Pending)
        const providerStatus = newStatusData.status.toUpperCase();
        
        let mappedStatus = order.status;
        if (providerStatus === 'COMPLETED') mappedStatus = 'COMPLETED';
        if (providerStatus === 'PARTIAL') mappedStatus = 'PARTIAL';
        if (providerStatus === 'CANCELED') mappedStatus = 'CANCELED';
        if (providerStatus === 'PROCESSING' || providerStatus === 'IN PROGRESS') mappedStatus = 'IN_PROGRESS';

        // Check if anything actually changed
        if (mappedStatus !== order.status || newStatusData.remains !== order.remains) {
          
          await db.$transaction(async (tx) => {
            // Update order state
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: mappedStatus,
                remains: newStatusData.remains,
                error: newStatusData.error
              }
            });

            // Refund logic if order was CANCELED or PARTIAL
            if (mappedStatus === 'CANCELED' || mappedStatus === 'PARTIAL') {
              // Calculate refund amount based on remains and original cost
              const originalQty = order.quantity;
              const remainingQty = newStatusData.remains;
              
              if (originalQty > 0 && remainingQty > 0) {
                // If quantity was 1000 and charge was 500, and remains is 100
                // We refund: (100 / 1000) * 500 = 50
                const refundAmount = Math.round((remainingQty / originalQty) * order.charge);
                
                await tx.user.update({
                  where: { id: order.userId },
                  data: { balance: { increment: refundAmount } }
                });
              }
            }
          });
          
          processedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, processedOrders: processedCount }, { status: 200 });
  } catch (error: any) {
    console.error('Cron sync error:', error.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
