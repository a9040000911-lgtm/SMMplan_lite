import fs from 'fs';

let content = fs.readFileSync('src/bot/scenes/order.wizard.ts', 'utf-8');

const target1 = `import { UnifiedPaymentService } from '@/services/payments/unified-payment.service';`;
const replace1 = `import { UnifiedPaymentService } from '@/services/financial/unified-payment.service';`;

const target2 = `      if (res.success && res.confirmationUrl) {
        await prisma.transaction.create({
          data: {
            projectId: ctx.project.id, userId: user.id, amount: amountToPay, type: 'DEPOSIT', provider: 'YOOKASSA', externalId: res.paymentId, status: 'PENDING',
            metadata: { serviceId: service.id, qty, link, isAutoOrder: true }
          }
        });
        await ctx.editMessageText(\`💳 <b>НЕДОСТАТОЧНО СРЕДСТВ</b>\\n────────────────────\\nСтоимость: <b>\${formatAmount(totalPrice)}₽</b>\\nВаш баланс: <b>\${formatAmount(user.balance)}₽</b>\\n\\n🚀 <b>Для запуска необходимо доплатить: \${formatAmount(amountToPay)}₽</b>\\n\\n<i>Нажмите кнопку ниже. Сразу после оплаты заказ будет запущен автоматически.</i>\`, {
          parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('💳 ОПЛАТИТЬ И ЗАПУСТИТЬ', res.confirmationUrl)], [Markup.button.callback('❌ ОТМЕНА', 'cancel_wizard')]])
        });`;

const replace2 = `      if (res.success && res.confirmationUrl) {
        await ctx.editMessageText(\`💳 <b>НЕДОСТАТОЧНО СРЕДСТВ</b>\\n────────────────────\\nСтоимость: <b>\${formatAmount(totalPrice)}₽</b>\\nВаш баланс: <b>\${formatAmount(user.balance)}₽</b>\\n\\n🚀 <b>Для запуска необходимо доплатить: \${formatAmount(amountToPay)}₽</b>\\n\\n<i>Нажмите кнопку ниже для пополнения баланса. После оплаты повторите процесс заказа.</i>\`, {
          parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('💳 ПОПОЛНИТЬ БАЛАНС', res.confirmationUrl)], [Markup.button.callback('❌ ОТМЕНА', 'cancel_wizard')]])
        });`;

content = content.replace(target1, replace1);
content = content.replace(target2.replace(/\\r\\n/g, '\\n'), replace2);
content = content.replace(target2, replace2);

fs.writeFileSync('src/bot/scenes/order.wizard.ts', content);

let depContent = fs.readFileSync('src/bot/scenes/deposit.wizard.ts', 'utf-8');
depContent = depContent.replace(target1, replace1);
fs.writeFileSync('src/bot/scenes/deposit.wizard.ts', depContent);

let handlerContent = fs.readFileSync('src/bot/handlers/order.handler.ts', 'utf-8');
handlerContent = handlerContent.replace(target1, replace1);
fs.writeFileSync('src/bot/handlers/order.handler.ts', handlerContent);

console.log('Bot payment handlers patched!');
