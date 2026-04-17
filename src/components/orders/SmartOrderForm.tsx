"use client";

import { useState, useEffect } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { DripFeedSettings } from "@/components/orders/DripFeedSettings";

// Эти моки будут заменены запросами в БД
const MOCK_CATEGORIES = [
  { id: "c1", name: "YouTube Views", platform: IntelligencePlatform.YOUTUBE },
  { id: "c2", name: "Instagram Likes", platform: IntelligencePlatform.INSTAGRAM },
  { id: "c3", name: "Instagram Followers", platform: IntelligencePlatform.INSTAGRAM },
];

const MOCK_SERVICES = [
  { id: "s1", categoryId: "c1", name: "High Retention Views", rate: 2.50, minQty: 1000, markup: 3.0 },
  { id: "s2", categoryId: "c2", name: "Real Likes", rate: 0.50, minQty: 100, markup: 3.0 },
  { id: "s3", categoryId: "c3", name: "Fast Followers", rate: 4.00, minQty: 50, markup: 3.0 },
];

export function SmartOrderForm() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<IntelligencePlatform | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Debounced Analysis
  useEffect(() => {
    if (!url || url.length < 5) return;
    
    const timeoutId = setTimeout(async () => {
      setIsAnalyzing(true);
      const res = await analyzeUrl(url);
      if (res.success && res.data) {
        setPlatform(res.data.platform !== IntelligencePlatform.OTHER ? res.data.platform : null);
        // Сбрасываем выбранные услуги при смене платформы
        setCategoryId("");
        setServiceId("");
      }
      setIsAnalyzing(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [url]);

  const availableCategories = platform 
    ? MOCK_CATEGORIES.filter(c => c.platform === platform)
    : MOCK_CATEGORIES;

  const availableServices = categoryId 
    ? MOCK_SERVICES.filter(s => s.categoryId === categoryId)
    : [];

  const selectedService = MOCK_SERVICES.find(s => s.id === serviceId);

  // Расчет: (Rate / 1000) * Qty * Markup
  const finalPrice = selectedService 
    ? Math.ceil((selectedService.rate / 1000) * quantity * selectedService.markup * 100) / 100 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Ссылка на пост или профиль</label>
        <div className="flex gap-2">
          <input 
            type="url" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-2" 
            placeholder="Например, https://instagram.com/p/..." 
          />
          {isAnalyzing && <span className="text-zinc-500 self-center text-sm animate-pulse">Анализ...</span>}
        </div>
      </div>

      {!platform && url.length > 5 && !isAnalyzing && (
         <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200">
           ⚠️ Платформа не распознана. Пожалуйста, выберите категорию вручную.
         </div>
      )}

      {platform && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm border border-emerald-200 font-medium">
          ✅ Определена соцсеть: {platform}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Категория</label>
          <select 
            className="w-full rounded-xl border border-zinc-300 px-4 py-2"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setServiceId(""); // Reset service on category change
            }}
          >
            <option value="">Выберите категорию...</option>
            {availableCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Услуга</label>
          <select 
            className="w-full rounded-xl border border-zinc-300 px-4 py-2 disabled:bg-zinc-100"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            disabled={!categoryId}
          >
            <option value="">Выберите услугу...</option>
            {availableServices.map(s => (
              <option key={s.id} value={s.id}>{s.name} (~{s.rate * s.markup}₽ за 1000)</option>
            ))}
          </select>
        </div>
      </div>

      {selectedService && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Количество</label>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={selectedService.minQty}
              className="w-full rounded-xl border border-zinc-300 px-4 py-2" 
            />
            <p className="text-xs text-zinc-500 mt-1">Минимум: {selectedService.minQty}</p>
          </div>

          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 flex justify-between items-center">
             <div className="text-zinc-600">Итого к оплате:</div>
             <div className="text-3xl font-bold text-zinc-900">{finalPrice} ₽</div>
          </div>

          <DripFeedSettings />
        </>
      )}

      <button 
        disabled={!selectedService || quantity < (selectedService?.minQty || 0)}
        className="w-full py-4 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors"
      >
        Заказать
      </button>
    </div>
  );
}
