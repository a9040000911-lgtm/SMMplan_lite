'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminUserService } from '@/services/admin/user.service';
import { escrowService } from '@/services/admin/escrow.service';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { updateBalanceSchema, userIdSchema, entryIdSchema } from '@/validators/admin.validators';

const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];
const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

async function requireStaff() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !STAFF_ROLES.includes(user.role)) throw new Error('Forbidden');
  return { session, user };
}

export async function updateBalanceAction(formData: FormData) {
  const { user: admin } = await requireStaff();
  const payload = Object.fromEntries(formData.entries());
  const parsed = updateBalanceSchema.safeParse(payload);
  
  if (!parsed.success) {
    throw new Error('userId, amount (копейки) и reason обязательны');
  }

  const { userId, amount, reason } = parsed.data;

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';

  await escrowService.evaluateBalanceAdjustment(
    userId,
    amount,
    reason.trim(),
    admin
  );

  auditAdmin({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'UPDATE_BALANCE_REQUEST',
    target: userId,
    targetType: 'USER',
    newValue: { amountCents: amount, reason: reason.trim() },
    ipAddress
  });

  revalidatePath('/admin/clients');
}

export async function banUserAction(formData: FormData) {
  const { user: admin } = await requireStaff();
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing userId');
  
  const { userId } = parsed.data;

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';

  await adminUserService.banUser(userId, {
    id: admin.id,
    email: admin.email,
  });

  auditAdmin({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'BAN_USER',
    target: userId,
    targetType: 'USER',
    ipAddress
  });

  revalidatePath('/admin/clients');
}

export async function unbanUserAction(formData: FormData) {
  const { user: admin } = await requireStaff();
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing userId');
  
  const { userId } = parsed.data;

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';

  await adminUserService.unbanUser(userId, {
    id: admin.id,
    email: admin.email,
  });

  auditAdmin({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'UNBAN_USER',
    target: userId,
    targetType: 'USER',
    ipAddress
  });

  revalidatePath('/admin/clients');
}

/**
 * Login-As: creates a temporary session for the target user.
 * Critical security action — always writes to AdminAuditLog.
 */
export async function loginAsAction(formData: FormData) {
  const { user: admin } = await requireStaff();
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing userId');
  
  const { userId } = parsed.data;

  // Only OWNER and ADMIN can impersonate
  if (!['OWNER', 'ADMIN'].includes(admin.role)) {
    throw new Error('Только Владелец и Админ могут входить как клиент');
  }

  const targetUser = await db.user.findUniqueOrThrow({ where: { id: userId } });

  // Create impersonation session (1 hour)
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

  const impersonationSession = await db.session.create({
    data: { userId: targetUser.id, expiresAt },
  });

  const sessionToken = await new SignJWT({
    sessionId: impersonationSession.id,
    userId: targetUser.id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encodedKey);

  (await cookies()).set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  // CRITICAL: Audit this action
  auditAdmin({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'LOGIN_AS_USER',
    target: userId,
    targetType: 'USER',
    newValue: { targetEmail: targetUser.email, sessionExpires: expiresAt.toISOString() },
  });

  // Redirect happens on client via revalidation
  revalidatePath('/dashboard/new-order');
}

export async function approveQuarantineAction(formData: FormData) {
  const { user: admin } = await requireStaff();
  const parsed = entryIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing entryId');
  const { entryId } = parsed.data;

  if (!['OWNER', 'ADMIN'].includes(admin.role)) {
    throw new Error('Только Владелец может модерировать карантин');
  }

  await escrowService.resolveQuarantine(entryId, 'APPROVE', admin);
  revalidatePath('/admin/finance');
}

export async function rejectQuarantineAction(formData: FormData) {
  const { user: admin } = await requireStaff();
  const parsed = entryIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing entryId');
  const { entryId } = parsed.data;

  if (!['OWNER', 'ADMIN'].includes(admin.role)) {
    throw new Error('Только Владелец может модерировать карантин');
  }

  await escrowService.resolveQuarantine(entryId, 'REJECT', admin);
  revalidatePath('/admin/finance');
}
