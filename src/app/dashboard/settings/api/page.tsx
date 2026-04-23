export const dynamic = "force-dynamic";
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import ApiKeyManager from './ApiKeyManager';

export const metadata = {
  title: 'API Settings | Smmplan',
};

export default async function ApiSettingsPage() {
  const session = await verifySession();
  if (!session) redirect('/auth');

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { apiKey: true }
  });

  if (!user) redirect('/auth');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">B2B Reseller API</h2>
          <p className="mt-1 text-sm text-slate-500">
            Используйте API-ключ для интеграции Smmplan со сторонними магазинами или автоматизации заказов.
          </p>
        </div>
        
        <div className="p-6">
          <ApiKeyManager currentKey={user.apiKey} />
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900">API Documentation</h3>
        </div>
        <div className="p-6 prose prose-sm prose-slate max-w-none">
          <p>Base URL: <code>https://yourdomain.com/api/v1</code></p>
          <p>Все запросы (POST) должны передавать параметры как <code>application/x-www-form-urlencoded</code> или <code>application/json</code> и содержать параметр <code>key</code> с вашим API-ключом.</p>
          <h4>/services</h4>
          <p>Возвращает список всех доступных услуг с вашими персональными ценами.</p>
          <h4>/order</h4>
          <p>Оформление заказа. Параметры: <code>action=add</code>, <code>service</code>, <code>link</code>, <code>quantity</code>.</p>
          <h4>/status</h4>
          <p>Статус заказа. Параметры: <code>action=status</code>, <code>order</code> (id заказа).</p>
        </div>
      </div>
    </div>
  );
}
