export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';
import { sendAdminAlert } from '@/lib/notifications';
import {
  SYNC_JITTER_THRESHOLD,
  SYNC_ANOMALY_THRESHOLD,
} from '@/lib/financial-constants';

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
    const services = await db.service.findMany({
      where: { externalId: { not: null } }
    });

    const toDisable: string[] = [];
    const toUpdateLastSeen: string[] = [];
    const toUpdateRate: { id: string, rate: number, isActive: boolean }[] = [];
    const toDecreaseGuard: { id: string, dataHash: string }[] = [];

    let disabledCnt = 0;
    let jitteredCnt = 0;
    let unchangedCnt = 0;
    let updatedCnt = 0;
    const anomalies: string[] = [];

    // 1. Group operations
    for (const localService of services) {
      if (!localService.externalId) continue;

      const externalMeta = externalMap.get(localService.externalId);

      if (!externalMeta) {
        if (localService.isActive) {
          toDisable.push(localService.id);
          disabledCnt++;
        }
      } else {
        const newRate = parseFloat(externalMeta.rate);
        const oldRate = localService.rate;
        
        // ─── ANTI-JITTER ────────
        if (oldRate > 0 && newRate > 0) {
          const changePercent = Math.abs((newRate - oldRate) / oldRate);
          
          if (changePercent >= SYNC_ANOMALY_THRESHOLD) {
            const direction = newRate > oldRate ? '📈' : '📉';
            anomalies.push(
              `${direction} #${localService.numericId} "${localService.name}": $${oldRate.toFixed(4)} → $${newRate.toFixed(4)} (${(changePercent * 100).toFixed(0)}%)`
            );
          }
          
          if (changePercent < SYNC_JITTER_THRESHOLD) {
            toUpdateLastSeen.push(localService.id);
            jitteredCnt++;
            continue;
          }
        }

        // ─── AUTO-DECREASE GUARD ─────────────────────────────────────
        const isDecrease = newRate < oldRate;

        if (isDecrease) {
          toDecreaseGuard.push({ 
            id: localService.id, 
            dataHash: `pending_decrease:${newRate.toFixed(6)}` 
          });
          unchangedCnt++;
          continue;
        }

        const isIncrease = newRate > oldRate;
        if (isIncrease || localService.rate !== newRate || !localService.isActive) {
          toUpdateRate.push({ id: localService.id, rate: newRate, isActive: true });
          updatedCnt++;
        } else {
          toUpdateLastSeen.push(localService.id);
          unchangedCnt++;
        }
      }
    }

    // 2. Execute chunked mass updates
    await db.$transaction(async (tx) => {
      // Disable missing
      if (toDisable.length > 0) {
        await tx.service.updateMany({
          where: { id: { in: toDisable } },
          data: { isActive: false, lastSeenAt: null }
        });
      }

      // Update Last Seen only
      if (toUpdateLastSeen.length > 0) {
        // Chunk array to avoid SQL string limits
        for (let i = 0; i < toUpdateLastSeen.length; i += 500) {
          await tx.service.updateMany({
            where: { id: { in: toUpdateLastSeen.slice(i, i + 500) } },
            data: { lastSeenAt: new Date() }
          });
        }
      }

      // Decrease Guard (needs precise dataHash per row)
      const now = new Date();
      for (const item of toDecreaseGuard) {
        await tx.service.update({
          where: { id: item.id },
          data: { lastSeenAt: now, dataHash: item.dataHash }
        });
      }

      // Update Rate & Reactivate
      for (const item of toUpdateRate) {
        await tx.service.update({
          where: { id: item.id },
          data: { 
            rate: item.rate, 
            lastSeenAt: now, 
            dataHash: null, 
            isActive: item.isActive 
          }
        });
      }
    });

    // ─── ANOMALY ALERTS ──────────────────────────────────────────
    if (anomalies.length > 0) {
      sendAdminAlert(
        `⚡ Обнаружены аномальные изменения цен (${anomalies.length}):\n\n${anomalies.join('\n')}`,
        'WARNING'
      );
    }

    // Alert if services were disabled
    if (disabledCnt > 0) {
      sendAdminAlert(
        `Catalog Sync: ${disabledCnt} услуг деактивировано (провайдер удалил)\nОбновлено: ${updatedCnt}, Anti-Jitter: ${jitteredCnt}, Без изменений: ${unchangedCnt}`,
        'WARNING'
      );
    }

    return NextResponse.json({
      message: 'Catalog Sync Successful',
      details: {
        totalChecked: services.length,
        updatedRatesOrActivation: updatedCnt,
        disabledMissingServices: disabledCnt,
        jitteredSmallChanges: jitteredCnt,
        unchanged: unchangedCnt,
        anomaliesDetected: anomalies.length,
      }
    });

  } catch (error: any) {
    console.error(`[Worker] Catalog sync error:`, error);
    sendAdminAlert(`🔴 Catalog sync FAILED: ${error.message}`, 'CRITICAL');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

