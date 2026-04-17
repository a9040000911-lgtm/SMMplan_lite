import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyB2BKey } from '@/lib/b2b-auth';
import { marketingService } from '@/services/marketing.service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action');
    const key = formData.get('key');

    if (action !== 'services') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = await verifyB2BKey(key?.toString());
    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get all services
    const services = await db.service.findMany({
      include: { category: true }
    });

    // Calculate user's max discount
    const volumeTier = marketingService.getVolumeTier(user.totalSpent);
    const maxDiscountPercent = Math.max(user.personalDiscount, volumeTier.discountPercent);

    // Format response compliant with standard SMM Panel APIs
    const formattedServices = services.map(s => {
      // Base: rate is Cost for 1000 in nominal units (RUB)
      // Original sale price per 1000
      const originalRatePer1000 = s.rate * s.markup;
      
      // Discounted sale price
      const discountVal = (originalRatePer1000 * maxDiscountPercent) / 100;
      let finalRatePer1000 = originalRatePer1000 - discountVal;

      // Failsafe
      if (finalRatePer1000 < s.rate) {
        finalRatePer1000 = s.rate;
      }

      return {
        service: s.id,
        name: s.name,
        type: 'Default',
        category: s.category.name,
        rate: finalRatePer1000.toFixed(4),
        min: s.minQty.toString(),
        max: s.maxQty.toString(),
        dripfeed: true,
        refill: false // Could be inferred if we add refill tags
      };
    });

    return NextResponse.json(formattedServices);
  } catch (error) {
    console.error('B2B API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
