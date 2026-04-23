"use client";

import { Copy, Gift, Users, CreditCard } from "lucide-react";
import { useState } from "react";

export function ReferralUi({ 
  referralLink, 
  referralsCount, 
  earnedRub 
}: { 
  referralLink: string; 
  referralsCount: number; 
  earnedRub: number;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) {}
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-500 mb-1">Ваша ссылка</p>
            <button onClick={copyToClipboard} className="w-full text-left font-mono text-sm font-semibold text-zinc-900 hover:text-blue-600 transition-colors flex items-center justify-between group gap-2">
               <span className="truncate">{referralLink.split('?ref=')[1] || referralLink}</span>
               {copied ? (
                 <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded flex-shrink-0">Ок!</span>
               ) : (
                 <Copy className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 flex-shrink-0" />
               )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Приглашено друзей</p>
            <p className="text-2xl font-bold text-zinc-900">{referralsCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Заработано</p>
            <p className="text-2xl font-bold text-emerald-600">{earnedRub.toFixed(2)} ₽</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 flex items-center gap-2 bg-slate-50/50">
           <Gift className="w-5 h-5 text-indigo-500" />
           <h3 className="font-bold text-lg text-zinc-900">Как это работает?</h3>
        </div>
        <div className="p-6 text-zinc-600 space-y-4">
           <p className="flex gap-3"><span className="font-bold text-indigo-500">1.</span> <span>Скопируйте вашу уникальную ссылку и отправьте друзьям или разместите у себя в блоге.</span></p>
           <p className="flex gap-3"><span className="font-bold text-indigo-500">2.</span> <span>Когда пользователь регистрируется по вашей ссылке (или оформляет заказ без регистрации), он закрепляется за вами навсегда.</span></p>
           <p className="flex gap-3"><span className="font-bold text-indigo-500">3.</span> <span>Вы получаете <strong>до 15%</strong> с каждого пополнения баланса или покупки привлеченного пользователя на свой партнерский счет.</span></p>
        </div>
      </div>
    </div>
  );
}
