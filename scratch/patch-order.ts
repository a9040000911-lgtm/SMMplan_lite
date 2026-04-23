import fs from 'fs';

let content = fs.readFileSync('src/services/admin/order.service.ts', 'utf-8');

const target = `      return { orderNumericId: order.numericId, oldStatus: order.status, oldError: order.error, charge: order.charge };
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });
      // ... (rest is the same inside the transaction context)
      // I can't just replace the bottom, I will just replace the bottom lines.`;

const replace = `      return { orderNumericId: order.numericId, oldStatus: order.status, oldError: order.error, charge: order.charge };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_RESTART',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.oldStatus, error: result.oldError },
      newValue: { status: 'PENDING', reChargeCents: result.charge },
    });

    return { orderNumericId: result.orderNumericId };
  }`;

content = content.replace(target, replace);
fs.writeFileSync('src/services/admin/order.service.ts', content);
console.log('Fixed order.service.ts');
