export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, metadata, sessionId } = body;

    if (!event) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    // Save to database, but don't await the result heavily to remain non-blocking (fire and forget handled mostly by client, but we will await to ensure it's written)
    await db.analyticsEvent.create({
      data: {
        event,
        metadata: metadata || undefined,
        sessionId: sessionId || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log analytics event:', error);
    // Don't fail the client, this is stealth telemetry
    return NextResponse.json({ success: false });
  }
}

