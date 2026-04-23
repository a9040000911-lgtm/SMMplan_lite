export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

export async function GET(req: NextRequest) {
  try {
    // Auth check via cookie
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    const userId = payload.userId as string;

    const ticketId = req.nextUrl.searchParams.get('ticketId');
    const after = req.nextUrl.searchParams.get('after'); // ISO date — only get messages after this time

    if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 });

    // Verify access: user owns ticket OR is staff
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isStaff = ['ADMIN', 'SUPPORT'].includes(user.role);
    if (ticket.userId !== userId && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause: any = { ticketId };
    if (after) {
      whereClause.createdAt = { gt: new Date(after) };
    }

    // For clients, filter out INTERNAL notes
    if (!isStaff) {
      whereClause.sender = { not: 'INTERNAL' };
    }

    const messages = await db.ticketMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages, ticketStatus: ticket.status });
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

