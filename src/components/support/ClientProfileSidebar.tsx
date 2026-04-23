'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, User, ShoppingCart, CreditCard, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type OrderSummary = {
  id: string;
  status: string;
  quantity: number;
  charge: number;
  createdAt: string;
  service: { name: string };
};

type PaymentSummary = {
  id: string;
  amount: number;
  status: string;
  gateway: string;
  createdAt: string;
};

export type ClientProfileData = {
  id: string;
  email: string;
  balance: number;
  totalSpent: number;
  createdAt: string;
  orders: OrderSummary[];
  payments: PaymentSummary[];
};

const ORDER_STATUS_MAP: Record<string, { label: string, color: string }> = {
  IN_PROGRESS: { label: 'В работе', color: 'text-indigo-600 bg-indigo-50' },
  PENDING: { label: 'Ожидание', color: 'text-amber-600 bg-amber-50' },
  COMPLETED: { label: 'Выполнен', color: 'text-emerald-600 bg-emerald-50' },
  CANCELED: { label: 'Отменен', color: 'text-slate-500 bg-slate-50' },
  ERROR: { label: 'Ошибка', color: 'text-rose-600 bg-rose-50' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string, color: string }> = {
  SUCCEEDED: { label: 'Успешно', color: 'text-emerald-600 bg-emerald-50' },
  PENDING: { label: 'Ожидание', color: 'text-amber-600 bg-amber-50' },
  CANCELED: { label: 'Отмена', color: 'text-slate-500 bg-slate-50' },
};

export default function ClientProfileSidebar({ user }: { user: ClientProfileData }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="h-full flex items-center justify-center shrink-0 border-l border-slate-200 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-xl w-12 transition-all">
         <button 
           onClick={() => setIsOpen(true)}
           className="w-8 h-8 rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors"
           title="Показать профиль клиента"
         >
           <ChevronLeft className="w-5 h-5" />
         </button>
      </div>
    );
  }

  return (
    <Card className="w-[340px] shrink-0 h-full bg-white border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col relative transition-all animate-in slide-in-from-right-8 duration-300">
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
        title="Скрыть панель"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Шапка профиля */}
      <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 text-xl font-bold uppercase">
          {user.email.substring(0, 2)}
        </div>
        <h3 className="font-bold text-slate-900 mb-1 truncate w-full px-2" title={user.email}>{user.email}</h3>
        <p className="text-xs text-slate-500 mb-4">Регистрация: {new Date(user.createdAt).toLocaleDateString('ru-RU')}</p>
        
        <div className="flex w-full gap-2">
          <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
             <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Баланс</div>
             <div className="font-bold text-emerald-600">{(user.balance / 100).toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
             <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Всего (LTV)</div>
             <div className="font-bold text-slate-700">{(user.totalSpent / 100).toLocaleString('ru-RU')} ₽</div>
          </div>
        </div>

        <Link href={`/admin/users/${user.id}`} className="mt-4 w-full">
          <Button variant="outline" className="w-full text-xs h-8 gap-2 border-slate-200">
            <User className="w-3 h-3" /> В профиль клиента
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Последние заказы */}
        <div>
           <div className="flex items-center justify-between mb-3 px-1">
             <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
               <ShoppingCart className="w-3.5 h-3.5" /> Заказы (последние 3)
             </h4>
           </div>
           
           <div className="space-y-2">
             {user.orders.map(order => {
               const st = ORDER_STATUS_MAP[order.status] || { label: order.status, color: 'text-slate-500 bg-slate-50' };
               return (
                 <div key={order.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                   <div className="flex justify-between items-start">
                     <span className="text-[10px] font-mono text-slate-400">#{order.id.slice(-6)}</span>
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${st.color}`}>
                       {st.label}
                     </span>
                   </div>
                   <div className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight">
                     {order.service.name}
                   </div>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-[10px] text-slate-500">{order.quantity} шт.</span>
                     <span className="text-[10px] font-bold text-slate-700">{(order.charge / 100).toLocaleString('ru-RU')} ₽</span>
                   </div>
                 </div>
               );
             })}
             {user.orders.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Нет заказов</div>}
           </div>

           {user.orders.length > 0 && (
             <Link href={`/admin/orders?userId=${user.id}`} className="block mt-2 text-[11px] text-center font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
               Смотреть все заказы →
             </Link>
           )}
        </div>

        {/* Последние транзакции */}
        <div>
           <div className="flex items-center justify-between mb-3 px-1">
             <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
               <CreditCard className="w-3.5 h-3.5" /> Транзакции
             </h4>
           </div>
           
           <div className="space-y-2">
             {user.payments.map(payment => {
               const st = PAYMENT_STATUS_MAP[payment.status] || { label: payment.status, color: 'text-slate-500 bg-slate-50' };
               return (
                 <div key={payment.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
                   <div>
                     <div className="text-xs font-bold text-slate-800">
                       {(payment.amount / 100).toLocaleString('ru-RU')} {payment.gateway === 'cryptobot' ? 'USDT' : '₽'}
                     </div>
                     <div className="text-[10px] text-slate-400 mt-0.5 capitalize">{payment.gateway.replace('yookassa', 'Ru Карта')}</div>
                   </div>
                   <div className="text-right">
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${st.color}`}>
                       {st.label}
                     </span>
                     <div className="text-[9px] text-slate-400 mt-1">
                       {new Date(payment.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                     </div>
                   </div>
                 </div>
               );
             })}
             {user.payments.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Нет пополнений</div>}
           </div>
        </div>

      </div>
    </Card>
  );
}
