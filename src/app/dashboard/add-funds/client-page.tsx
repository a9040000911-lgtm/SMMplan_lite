"use client";

import { useState } from "react";
import { createTopUpPaymentAction } from "@/actions/user/top-up.action";

export default function AddFundsPage() {
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopUp = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await createTopUpPaymentAction(amount);
      if (res.success && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch (e: any) {
      setError(e.message || "Ошибка при создании платежа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-slate-900">Пополнение баланса</h1>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Сумма пополнения (₽)
        </label>
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(Number(e.target.value))}
          min="100"
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        
        <button 
          onClick={handleTopUp}
          disabled={loading || amount < 100}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
        >
          {loading ? "Создаем платеж..." : `Пополнить на ${amount} ₽`}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Минимальная сумма пополнения — 100 ₽. Оплата банковскими картами через ЮKassa.
        </p>
      </div>
    </div>
  );
}
