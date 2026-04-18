import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';

beforeAll(() => {
  // Provide test encryption key so EncryptionService doesn't fail
  process.env.APP_ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
  
  // Mock external fetch to avoid real network requests to YooKassa/CryptoBot
  vi.stubGlobal('fetch', vi.fn());

  // Mock Next.js Cache invalidation methods to prevent 'static generation store missing' errors natively
  vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn()
  }));
});

beforeEach(async () => {
    // Clean test database for each test to achieve perfect isolation
    try {
      const tablenames = await db.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
      `;
      
      const tables = tablenames
          .map(({ tablename }) => `"${tablename}"`)
          .join(', ');

      if (tables.length > 0) {
        await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      }
    } catch (error) {
      console.error('[Test Setup] Failed to run truncate cascade on test db:', error);
    }
});

afterAll(async () => {
  await db.$disconnect();
});
