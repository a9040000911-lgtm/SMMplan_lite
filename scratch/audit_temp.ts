import { db } from '../src/lib/db';
import { paymentService } from '../src/services/financial/payment.service';

async function runAudit() {
  console.log('\\n--- СТАРТ ТЕСТА ВАЛИДАЦИИ (OWASP V7.3) ---');
  try {
     const user = await db.user.create({ data: { email: 'fin_test_' + Date.now() + '@test.com' } });
     
     // Симуляция Payload от YooKassa без Zod (строка "abc")
     const mockPayload = {
        event: 'payment.succeeded',
        object: {
           id: 'gateway_123' + Date.now(),
           amount: { value: 'abc' },
           metadata: { userId: user.id }
        }
     };
     
     const gatewayId = mockPayload.object.id;
     const amount = Math.round(parseFloat(mockPayload.object.amount?.value || '0') * 100);
     console.log('Вычисленная сумма (amount) перед БД:', amount);
     
     // Вызываем confirmPayment напрямую (DevSandbox режим)
     const res = await paymentService.confirmPayment(gatewayId, amount, mockPayload.object.metadata.userId, true, 'yookassa');
     console.log('Результат сервиса:', res);
  } catch (e: any) {
     console.log('КРИТИЧЕСКАЯ ОШИБКА ПРОЦЕССА:', e.message);
  }
}

runAudit().then(() => process.exit(0)).catch(console.error);
