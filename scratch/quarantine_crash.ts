import { db } from '../src/lib/db';
import { adminEscrowService, escrowService } from '../src/services/admin/escrow.service';

async function testQuarantineCrash() {
    console.log('--- START NON-ATOMIC QUARANTINE CRASH TEST ---');

    // Setup an admin and target user
    const adminUser = await db.user.create({ data: { email: 'q_admin_' + Date.now() + '@test.com', role: 'OWNER' } });
    const targetUser = await db.user.create({ 
        data: { email: 'q_target_' + Date.now() + '@test.com', balance: 0, quarantineBalance: 1000 } 
    });

    const entry = await db.ledgerEntry.create({
        data: {
            adminId: adminUser.id,
            userId: targetUser.id,
            amount: 1000,
            status: 'QUARANTINE',
            reason: 'Test Limbo'
        }
    });

    console.log(`[Before] Entry Status: QUARANTINE, User Balance: ${targetUser.balance}, Quarantine: ${targetUser.quarantineBalance}`);

    // We will hook db.user.findUniqueOrThrow to simulate a crash immediately AFTER updateMany
    const originalFindUnique = db.user.findUniqueOrThrow;
    (db.user as any).findUniqueOrThrow = async function(args: any) {
        throw new Error('SIMULATED CRASH: Node Process Died / Network Timeout before $transaction!');
    };

    try {
        await escrowService.resolveQuarantine(entry.id, 'APPROVE', { id: adminUser.id, email: 'admin@test.com' });
    } catch (e: any) {
        console.log(`[Caught Crash] ${e.message}`);
    }

    // Restore mock just in case
    (db.user as any).findUniqueOrThrow = originalFindUnique;

    // Verify DB State
    const stuckEntry = await db.ledgerEntry.findUnique({ where: { id: entry.id } });
    const stuckUser = await db.user.findUnique({ where: { id: targetUser.id } });

    console.log(`[After] Entry Status: ${stuckEntry?.status}, User Balance: ${stuckUser?.balance}, Quarantine: ${stuckUser?.quarantineBalance}`);
    
    if (stuckEntry?.status === 'APPROVE' && stuckUser?.balance === 0) {
        console.log('--- EXPLOIT/BUG CONFIRMED: Quarantine Transaction is NOT ATOMIC. User funds are in LIMBO! ---');
    }
}

testQuarantineCrash().then(() => process.exit(0)).catch(console.error);
