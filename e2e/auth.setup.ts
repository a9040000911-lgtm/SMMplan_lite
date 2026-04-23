import { test as setup, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Initialize Prisma to find an OWNER user
  const prisma = new PrismaClient();
  
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });

    if (!adminUser) {
      throw new Error('No OWNER user found in database. Please seed the database first.');
    }

    const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
    const encodedKey = new TextEncoder().encode(secretKey);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create session in DB matching the production logic
    const session = await prisma.session.create({
      data: {
        userId: adminUser.id,
        expiresAt,
      }
    });

    // Encrypt the session as JWT
    const sessionToken = await new SignJWT({ sessionId: session.id, userId: adminUser.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(encodedKey);

    // Set cookie on context directly
    await page.context().addCookies([{
      name: 'session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(expiresAt.getTime() / 1000)
    }]);

    // Ensure directory exists
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save storage state containing the cookie
    await page.context().storageState({ path: authFile });
    
  } finally {
    await prisma.$disconnect();
  }
});
