import fs from 'fs';

let content = fs.readFileSync('src/services/financial/payment.service.ts', 'utf-8');

const oldLogic = `        if (!payment) {
          // Payment record might not exist yet (webhook arrived before checkout finished)
          // Create it and try to match later
          await tx.payment.create({
            data: {
              gatewayId,
              userId,
              amount,
              currency: 'RUB',
              status: 'SUCCEEDED'
            }
          });
          console.warn(\`[Payment] Created orphan payment \${gatewayId} — no linked order\`);
          return;
        }

        // Amount underpayment guard
        if (payment.amount > amount) {
          console.error(\`[Payment] Amount underpayment exploit attempt for \${gatewayId}: expected \${payment.amount}, got \${amount}\`);
          throw new Error('PAYMENT_AMOUNT_MISMATCH: Underpayment detected. Order rejected.');
        }

        // Atomic update with status check (Postgres row lock)
        const updatedPayment = await tx.payment.updateMany({
          where: { 
            id: payment.id,
            status: 'PENDING' // Concurrent webhooks will fail this where clause
          },
          data: { 
            status: 'SUCCEEDED',
            gatewayId, // Ensure gatewayId is saved
            amount: amount // Update to actual amount received
          }
        });

        // Idempotency: if count is 0, another webhook already succeeded
        if (updatedPayment.count === 0) {
          console.log(\`[Payment] \${gatewayId} already processed (atomic idempotency hit)\`);
          return;
        }

        // Award Referral Commission on successful new fund influx
        try {
          const { LoyaltyService } = require('@/services/users/loyalty.service');
          await LoyaltyService.awardCommission(tx, payment.userId, amount);
        } catch (e) {
          console.error(\`[PaymentService] Failed to award commission for payment \${payment.id}:\`, e);
        }

        // Activate linked order (AWAITING_PAYMENT → PENDING)
        if (payment.orderId) {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId }
          });

          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: 'PENDING' }
            });
            console.log(\`[Payment] Order \${payment.orderId} activated → PENDING\`);

            // Track user spending for loyalty tiers based on ACTUAL amount paid
            await tx.user.update({
              where: { id: payment.userId },
              data: { totalSpent: { increment: amount } }
            });
          }
        }`;

const newLogic = `        // 1. Process or Create Payment atomically via Upsert to prevent orphaned double-creation
        const currentPayment = payment
          ? await tx.payment.findUnique({ where: { id: payment.id } })
          : await tx.payment.findUnique({ where: { gatewayId } });

        if (currentPayment && currentPayment.status === 'SUCCEEDED') {
          console.log(\`[Payment] \${gatewayId} already processed (atomic idempotency hit)\`);
          return;
        }

        if (currentPayment && currentPayment.amount > amount) {
          console.error(\`[Payment] Amount underpayment exploit attempt for \${gatewayId}: expected \${currentPayment.amount}, got \${amount}\`);
          throw new Error('PAYMENT_AMOUNT_MISMATCH: Underpayment detected. Order rejected.');
        }

        let processedPaymentId = '';
        let isOrderPayment = false;
        let linkedOrderId = '';

        if (currentPayment) {
          const updated = await tx.payment.updateMany({
            where: { id: currentPayment.id, status: 'PENDING' },
            data: { status: 'SUCCEEDED', gatewayId, amount }
          });
          if (updated.count === 0) return; // DB lock idempotency
          processedPaymentId = currentPayment.id;
          isOrderPayment = !!currentPayment.orderId;
          linkedOrderId = currentPayment.orderId || '';
        } else {
          // Direct deposit via webhook (no pre-existing internal ID)
          try {
            const newPay = await tx.payment.create({
              data: { gatewayId, userId, amount, currency: 'RUB', gateway: gatewayType, status: 'SUCCEEDED' }
            });
            processedPaymentId = newPay.id;
          } catch (e: any) {
            // Prisma Unique Constraint Failure (P2002) - hit by race condition webhook
            if (e.code === 'P2002') return;
            throw e;
          }
        }

        // Award Referral Commission on successful new fund influx
        try {
          const { LoyaltyService } = require('@/services/users/loyalty.service');
          await LoyaltyService.awardCommission(tx, userId, amount);
        } catch (e) {
          console.error(\`[PaymentService] Failed to award commission for payment \${processedPaymentId}:\`, e);
        }

        // Assign funds locally
        if (isOrderPayment && linkedOrderId) {
          // Activate linked order
          const order = await tx.order.findUnique({ where: { id: linkedOrderId } });
          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: linkedOrderId },
              data: { status: 'PENDING' }
            });
            await tx.user.update({
              where: { id: userId },
              data: { totalSpent: { increment: amount } }
            });
          }
        } else {
          // Direct top-up (Deposit) - Increment User Balance securely!
          await tx.user.update({
            where: { id: userId },
            data: { 
              balance: { increment: amount },
              totalSpent: { increment: amount }
            }
          });
          
          await tx.ledgerEntry.create({
            data: {
              userId,
              amount: amount,
              reason: \`Пополнение баланса через \${gatewayType}\`,
              status: 'APPROVED'
            }
          });
        }`;

content = content.replace(oldLogic.replace(/\r\n/g, '\\n'), newLogic);
content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/services/financial/payment.service.ts', content);
console.log('Patched payment.service.ts!');
