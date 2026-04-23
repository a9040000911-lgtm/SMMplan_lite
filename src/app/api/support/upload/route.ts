import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const token = req.cookies.get('session_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    const userId = payload.userId as string;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ticketId = formData.get('ticketId') as string | null;

    if (!file || !ticketId) {
      return new NextResponse('Missing file or ticketId', { status: 400 });
    }

    // 3. Size and type validation
    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse('File too large (max 5MB)', { status: 400 });
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return new NextResponse('Unsupported file type', { status: 400 });
    }

    // 4. Access control: verify user owns ticket or is staff
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return new NextResponse('Ticket not found', { status: 404 });

    const isStaff = ['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role);
    if (ticket.userId !== userId && !isStaff) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 5. Save the file locally
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const relativePath = `tickets/${ticket.id}/${hash}.${ext}`;
    const absolutePath = path.join(process.cwd(), 'private', 'uploads', ...relativePath.split('/'));

    // Ensure directory exists
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    // Save
    await fs.writeFile(absolutePath, buffer);

    // 6. Return response
    let mediaType = 'file';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type === 'application/pdf') mediaType = 'document';

    return NextResponse.json({
      mediaUrl: relativePath,
      mediaType: mediaType,
      fileName: file.name
    });

  } catch (error) {
    console.error('File upload error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
