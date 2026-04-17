"use client";

import { useState, useEffect } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { checkoutAction, calculatePriceAction } from "@/actions/order/checkout";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { DripFeedSettings } from "@/components/orders/DripFeedSettings";
import { PricingResult } from "@/services/marketing.service";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<IntelligencePlatform | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [promoCode, setPromoCode] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  const [pricing, setPricing] = useState<PricingResult | null>(null);

  // Drip-Feed state
  const [dripEnabled, setDripEnabled] = useState(false);
  const [runs, setRuns] = useState(2);
  const [interval, setInterval] = useState(60);

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

  // Live Pricing Calculation
  useEffect(() => {
    if (!serviceId || quantity < 10) return;
    const fetchPrice = async () => {
      const res = await calculatePriceAction(serviceId, quantity, promoCode);
      if (res.success && res.data) {
        setPricing(res.data);
      } else {
        setPricing(null);
      }
    };
    const t = setTimeout(fetchPrice, 300);
    return () => clearTimeout(t);
  }, [serviceId, quantity, promoCode]);

  const selectedService = MOCK_SERVICES.find(s => s.id === serviceId);

  const handleCheckout = async () => {
    if (!serviceId || quantity < (selectedService?.minQty || 0)) return;
    setIsOrdering(true);
    setOrderError("");
    
    const finalRuns = dripEnabled ? runs : undefined;
    const finalInterval = dripEnabled ? interval : undefined;

    const res = await checkoutAction(serviceId, url, quantity, promoCode, finalRuns, finalInterval);
    if (res.success) {
      router.push("/dashboard/orders"); // Example redirect
    } else {
      if (res.error === "Unauthorized") {
        router.push("/login?callbackUrl=/");
      } else {
        setOrderError(res.error || "Ошибка при создании заказа");
      }
    }
    setIsOrdering(false);
  };

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

          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 space-y-4">
             <div>
               <label className="block text-sm font-medium mb-2">Промокод (необязательно)</label>
               <input 
                 type="text" 
                 value={promoCode}
                 onChange={(e) => setPromoCode(e.target.value)}
                 className="w-full rounded-xl border border-zinc-300 px-4 py-2 uppercase" 
                 placeholder="PROMO2026" 
               />
             </div>
             
             <div className="flex justify-between items-center pt-2">
               <div className="text-zinc-600">
                 Итого к оплате:
                 {pricing && pricing.discountPercent > 0 && (
                   <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                     Скидка -{pricing.discountPercent}% ({pricing.tier})
                   </span>
                 )}
               </div>
               <div className="text-3xl font-bold text-zinc-900">
                 {pricing ? (pricing.totalCents / 100).toFixed(2) : "0.00"} ₽
                 {pricing && pricing.discountPercent > 0 && (
                   <div className="text-sm line-through text-zinc-400 absolute right-8 -mt-1 opacity-70">
                     {(pricing.originalTotalCents / 100).toFixed(2)} ₽
                   </div>
                 )}
               </div>
             </div>
          </div>

          <DripFeedSettings 
            enabled={dripEnabled}
            setEnabled={setDripEnabled}
            runs={runs}
            setRuns={setRuns}
            interval={interval}
            setInterval={setInterval}
          />
        </>
      )}

      {orderError && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm border border-red-200">
          ❌ {orderError}
        </div>
      )}

      <button 
        onClick={handleCheckout}
        disabled={!selectedService || quantity < (selectedService?.minQty || 0) || isOrdering}
        className="w-full py-4 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors"
      >
        {isOrdering ? "Обработка..." : "Заказать"}
      </button>
    </div>
  );
}
