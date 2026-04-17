import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
  
  // Создаем запись в БД
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
    }
  });

  // Шифруем ID сессии в JWT
  const sessionToken = await new SignJWT({ sessionId: session.id, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
    
  (await cookies()).set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession() {
  const sessionToken = (await cookies()).get('session_token')?.value;

  if (!sessionToken) return null;

  try {
    const { payload } = await jwtVerify(sessionToken, encodedKey, {
      algorithms: ['HS256'],
    });
    
    // Опционально можно сверять с БД
    return { userId: payload.userId as string };
  } catch (err) {
    return null;
  }
}
