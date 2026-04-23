'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { logManualCompensation } from '@/actions/support/compensation';
import { RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ManualRefillModal({ 
  open, 
  onClose, 
  ticketId,
  supportLimitCents
}: { 
  open: boolean; 
  onClose: () => void; 
  ticketId: string;
  supportLimitCents?: number;
}) {
  const [costText, setCostText] = useState('');
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costText || !note) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('ticketId', ticketId);
        fd.set('costRub', costText);
        fd.set('note', note);
        await logManualCompensation(fd);
        setCostText('');
        setNote('');
        toast.success('Компенсация успешно списена с лимита и логирована');
        onClose();
      } catch (e: any) {
        toast.error(e.message || 'Ошибка списания лимита');
      }
    });
  };

  const limitRub = supportLimitCents !== undefined ? Math.floor(supportLimitCents / 100) : null;
  const parsedCost = parseFloat(costText) || 0;
  const remaining = limitRub !== null ? limitRub - parsedCost : null;
  const isOverLimit = remaining !== null && remaining < 0 && limitRub !== null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm shadow-2xl">
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-500" /> Ручная компенсация
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-600">✕</Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 bg-slate-50/50">
          
          {limitRub !== null && (
            <div className={`mb-6 p-3 rounded-xl border flex gap-3 text-sm transition-colors ${isOverLimit ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50/50 border-indigo-100 text-indigo-800'}`}>
               <Info className={`w-5 h-5 shrink-0 ${isOverLimit ? 'text-rose-500' : 'text-indigo-400'}`} />
               <div>
                  Ваш лимит доверия на этот месяц: <strong>{limitRub} ₽</strong>.<br/>
                  Это бюджет на спасение репутации <strong>за счет компании</strong>. Обязательно укажите где и на что сделан заказ!
               </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Фактические затраты (в рублях)</label>
               <input 
                  type="number"
                  step="0.01"
                  required
                  placeholder="Пример: 15.50" 
                  value={costText} 
                  onChange={e => setCostText(e.target.value)}
                  className={`w-full text-base border rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all bg-white ${isOverLimit ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-transparent focus:ring-indigo-500'}`}
                  autoFocus
                />
                {isOverLimit && <div className="text-xs text-rose-500 font-medium mt-1">Превышает доступный лимит!</div>}
            </div>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Где заказано и почему (Комментарий)</label>
               <textarea 
                  required
                  placeholder="Пример: VexBoost висит. Перезаказал 1000 подписчиков вручную на JAP, id #81923" 
                  value={note} 
                  onChange={e => setNote(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y bg-white leading-relaxed"
                />
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-2">
              <Button variant="outline" type="button" onClick={onClose} className="rounded-xl border-slate-200">Отмена</Button>
              <Button type="submit" disabled={isPending || isOverLimit || !costText || !note} className={`rounded-xl text-white ${isOverLimit ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isPending ? 'Запись...' : 'Списать и логировать'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
