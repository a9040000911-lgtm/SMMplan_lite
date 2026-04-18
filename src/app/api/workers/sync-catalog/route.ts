import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';
import { sendAdminAlert } from '@/lib/notifications';

export async function GET(request: Request) {
  // 1. Verify Authentication 
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev_secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const provider = await providerService.getDefaultProvider();
    
    // Fetch external catalog from the provider API
    const externalServices = await provider.getServices();
    
    // Create a fast lookup map: { '123': { rate: 0.50 } }
    const externalMap = new Map();
    for (const s of externalServices) {
      externalMap.set(s.service.toString(), s);
    }

    // Fetch all mapped internal services
    const internalServices = await db.service.findMany({
      where: { externalId: { not: null } }
    });

    let updatedCnt = 0;
    let disabledCnt = 0;
    let unchangedCnt = 0;

    for (const localService of internalServices) {
      if (!localService.externalId) continue;

      const externalMeta = externalMap.get(localService.externalId);

      if (!externalMeta) {
        // The provider has removed this service completely. 
        // We must safe-guard our users by neutralizing it.
        if (localService.isActive) {
          await db.service.update({
            where: { id: localService.id },
            data: { isActive: false }
          });
          disabledCnt++;
        }
      } else {
        // Provider Service Exists. Check if rate changed.
        const newRate = parseFloat(externalMeta.rate);
        
        if (localService.rate !== newRate) {
           await db.service.update({
             where: { id: localService.id },
             data: { 
               rate: newRate, 
               isActive: true // Make sure it's active if it was previously deactivated
             }
           });
           updatedCnt++;
        } else {
           // Rate is the same, but it might have been disabled previously
           if (!localService.isActive) {
             await db.service.update({
               where: { id: localService.id },
               data: { isActive: true }
             });
             updatedCnt++;
           } else {
             unchangedCnt++;
           }
        }
      }
    }

    // Alert if services were disabled
    if (disabledCnt > 0) {
      sendAdminAlert(
        `Catalog Sync: ${disabledCnt} услуг деактивировано (провайдер удалил)\nОбновлено: ${updatedCnt}, Без изменений: ${unchangedCnt}`,
        'WARNING'
      );
    }

    return NextResponse.json({
      message: 'Catalog Sync Successful',
      details: {
        totalInternalChecked: internalServices.length,
        updatedRatesOrActivation: updatedCnt,
        disabledMissingServices: disabledCnt,
        unchanged: unchangedCnt
      }
    });

  } catch (error: any) {
    console.error(`[Worker] Catalog sync error:`, error);
    sendAdminAlert(`🔴 Catalog sync FAILED: ${error.message}`, 'CRITICAL');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
