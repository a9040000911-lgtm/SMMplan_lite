import { db } from './db';
import { User } from '@prisma/client';

export async function verifyB2BKey(key?: string | null): Promise<User | null> {
  if (!key || key.length < 10) return null;

  try {
    const user = await db.user.findUnique({
      where: { apiKey: key }
    });

    return user;
  } catch (error) {
    console.error('B2B Auth Error:', error);
    return null;
  }
}
