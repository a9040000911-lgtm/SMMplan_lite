import { db } from '../src/lib/db';

async function main() {
  console.log('--- ADDING POSTGRESQL CONSTRAINTS ---');
  
  try {
    // Zero out any negative balances first
    console.log('[1/2] Zeroing out existing negative balances...');
    await db.$executeRaw`UPDATE "User" SET "balance" = 0 WHERE "balance" < 0;`;

    // Add constraint
    console.log('[2/2] Adding balance_non_negative constraint...');
    await db.$executeRaw`ALTER TABLE "User" ADD CONSTRAINT "balance_non_negative" CHECK (balance >= 0);`;
    
    console.log('✅ Constraint successfully added.');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('✅ Constraint already exists.');
    } else {
      console.error('❌ Failed to add constraint:', e);
      // Fallback: Drop constraint if it's messed up
      // await db.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "balance_non_negative";`;
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
