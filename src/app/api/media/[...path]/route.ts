import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'audio/ogg',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Auth check
    const token = req.cookies.get('session_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    const userId = payload.userId as string;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { path: pathSegments } = await params;
    const relativePath = pathSegments.join('/');

    // Security: prevent path traversal
    if (relativePath.includes('..') || relativePath.includes('~')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Access control: if path starts with "tickets/{ticketId}/", verify user owns ticket or is staff
    const ticketMatch = relativePath.match(/^tickets\/([^/]+)\//);
    if (ticketMatch) {
      const ticketId = ticketMatch[1];
      const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return new NextResponse('Not Found', { status: 404 });

      const isStaff = ['ADMIN', 'SUPPORT'].includes(user.role);
      if (ticket.userId !== userId && !isStaff) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const filePath = path.join(process.cwd(), 'private', 'uploads', relativePath);

    try {
      const file = await fs.readFile(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const contentType = MIME_MAP[ext] || 'application/octet-stream';

      return new NextResponse(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
        }
      });
    } catch {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
