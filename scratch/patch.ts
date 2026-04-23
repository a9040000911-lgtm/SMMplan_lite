import fs from 'fs';

let content = fs.readFileSync('src/bot/scenes/order.wizard.ts', 'utf-8');

const target = `const { initiateOrder } = await import('@/services/orders');
      await initiateOrder({
        userId: user.id, serviceId: service.id, projectId: ctx.project.id, link, qty, totalPrice,
        tgId: Number(tgId), username: ctx.from.username || undefined,
        isDripFeed, dripFeed: isDripFeed ? { runs, interval } : undefined,
        promoId
      });`;

const replacement = `const chargeCents = Math.round(totalPrice.toNumber() * 100);
      const { orderService } = await import('@/services/core/order.service');
      const { marketingService } = await import('@/services/marketing.service');

      const orderRes = await orderService.createBotOrder(user.id, {
        serviceId: service.id,
        link,
        quantity: qty,
        charge: chargeCents,
        providerCost: 0,
        runs: isDripFeed ? runs : undefined,
        interval: isDripFeed ? interval : undefined
      });

      if (!orderRes.success) {
        return ctx.editMessageText(\`❌ <b>Ошибка:</b> \${orderRes.error}\`, { parse_mode: 'HTML' });
      }

      if (promoId) {
        try {
          const promoObj = await prisma.promoCode.findUnique({ where: { id: promoId } });
          if (promoObj) await prisma.$transaction(async tx => { await marketingService.consumePromoCode(tx, promoObj.code); });
        } catch(e) {}
      }`;

content = content.replace(target.replace(/\r\n/g, '\n'), replacement);
content = content.replace(target, replacement);

fs.writeFileSync('src/bot/scenes/order.wizard.ts', content);
console.log('Patched order.wizard.ts');
