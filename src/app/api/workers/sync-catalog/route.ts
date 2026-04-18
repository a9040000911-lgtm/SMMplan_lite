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
    const internalServices = await db.service.findMany({
      where: { externalId: { not: null } }
    });

    let updatedCnt = 0;
    let disabledCnt = 0;
    let unchangedCnt = 0;
    let jitteredCnt = 0;
    const anomalies: string[] = [];

    for (const localService of internalServices) {
      if (!localService.externalId) continue;

      const externalMeta = externalMap.get(localService.externalId);

      if (!externalMeta) {
        // The provider has removed this service completely. 
        // We must safe-guard our users by neutralizing it.
        if (localService.isActive) {
          await db.service.update({
            where: { id: localService.id },
            data: { isActive: false, lastSeenAt: null }
          });
          disabledCnt++;
        }
      } else {
        // Provider Service Exists. Check if rate changed.
        const newRate = parseFloat(externalMeta.rate);
        const oldRate = localService.rate;
        
        // ─── ANTI-JITTER: Ignore rate changes smaller than 5% ────────
        // This prevents the storefront from "flickering" due to micro-fluctuations
        // in provider pricing (often caused by USD→RUB conversion noise).
        if (oldRate > 0 && newRate > 0) {
          const changePercent = Math.abs((newRate - oldRate) / oldRate);
          
          // ─── ANOMALY DETECTION: Alert on large price swings ────────
          if (changePercent >= SYNC_ANOMALY_THRESHOLD) {
            const direction = newRate > oldRate ? '📈' : '📉';
            anomalies.push(
              `${direction} #${localService.numericId} "${localService.name}": $${oldRate.toFixed(4)} → $${newRate.toFixed(4)} (${(changePercent * 100).toFixed(0)}%)`
            );
          }
          
          if (changePercent < SYNC_JITTER_THRESHOLD) {
            // Micro-change — update lastSeenAt but DO NOT change storefront rate.
            await db.service.update({
              where: { id: localService.id },
              data: { lastSeenAt: new Date() }
            });
            jitteredCnt++;
            continue;
          }
        }

        // ─── AUTO-DECREASE GUARD ─────────────────────────────────────
        // By default, prices only go UP during sync. If the provider lowers
        // their rate, we preserve our current (higher) rate to protect margins.
        // Admin can manually lower prices when they choose to.
        const isIncrease = newRate > oldRate;
        const isDecrease = newRate < oldRate;

        if (isDecrease) {
          // Provider lowered price — DON'T lower our rate automatically.
          // Just update metadata so admin can see the delta.
          await db.service.update({
            where: { id: localService.id },
            data: { 
              lastSeenAt: new Date(),
              // Store the new provider rate in dataHash field as indicator
              // that a manual review is needed
              dataHash: `pending_decrease:${newRate.toFixed(6)}`
            }
          });
          unchangedCnt++;
          continue;
        }

        if (isIncrease || localService.rate !== newRate) {
          // Price INCREASED or was never set — update to protect from selling at loss
          await db.service.update({
            where: { id: localService.id },
            data: { 
              rate: newRate, 
              lastSeenAt: new Date(),
              dataHash: null, // Clear any pending decrease
              isActive: true  // Re-activate if it was previously deactivated
            }
          });
          updatedCnt++;
        } else {
          // Rate is the same — just ensure it's active
          if (!localService.isActive) {
            await db.service.update({
              where: { id: localService.id },
              data: { isActive: true, lastSeenAt: new Date() }
            });
            updatedCnt++;
          } else {
            await db.service.update({
              where: { id: localService.id },
              data: { lastSeenAt: new Date() }
            });
            unchangedCnt++;
          }
        }
      }
    }

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
        totalInternalChecked: internalServices.length,
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
