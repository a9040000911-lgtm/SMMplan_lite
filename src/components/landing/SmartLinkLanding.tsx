"use client";

import { useState, useRef, useEffect } from "react";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { getServicesByCategoryAction, PublicCategory, PublicService } from "@/actions/order/catalog";
import { checkoutAction, calculatePriceAction } from "@/actions/order/checkout";
import { PricingResult } from "@/services/marketing.service";
import { LegalFooter } from "./LegalFooter";
import { Zap, ArrowRight, Loader2, Search, CheckCircle2, ShoppingCart, Tag, Send, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatCents } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/useTrackEvent";

type ViewState = "idle" | "loading" | "results";

export function SmartLinkLanding({ initialCatalog, initialEmail }: { initialCatalog: PublicCategory[], initialEmail: string }) {
  const [inputValue, setInputValue] = useState("");
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [categories, setCategories] = useState<PublicCategory[]>(initialCatalog);
  
  // Analyzer Result
  const [analyzedPlatform, setAnalyzedPlatform] = useState<IntelligencePlatform | null>(null);
  const [suggestedCategoryIds, setSuggestedCategoryIds] = useState<string[]>([]);
  
  // Loaded Services (Lazy)
  const [services, setServices] = useState<PublicService[]>([]);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  
  // Form State
  const [quantity, setQuantity] = useState(100);
  const [emailForCheckout, setEmailForCheckout] = useState(initialEmail);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Payment calculations
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  const { track } = useTrackEvent();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount (for desktop)
  useEffect(() => {
    if (window.innerWidth > 768) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // Sync Quantity with Service minQty
  useEffect(() => {
    if (selectedService && quantity < selectedService.minQty) {
      setQuantity(selectedService.minQty);
    }
  }, [selectedService]);

  // Track Checkout Form Open
  useEffect(() => {
    if (selectedService) {
      track('CHECKOUT_INITIATED', { serviceId: selectedService.id, serviceName: selectedService.name });
    }
  }, [selectedService, track]);

  // Price Calculation
  useEffect(() => {
    if (!selectedService || quantity < 10) {
      setPricing(null);
      setIsCalculating(false);
      return;
    }
    setIsCalculating(true);
    const fetchPrice = async () => {
      const res = await calculatePriceAction(selectedService.id, quantity, "");
      if (res.success && res.data) setPricing(res.data);
      setIsCalculating(false);
    };
    const t = setTimeout(fetchPrice, 300);
    return () => clearTimeout(t);
  }, [selectedService, quantity]);

  const handleAnalyze = async () => {
    if (!inputValue || inputValue.length < 5) return;
    
    setViewState("loading");
    setSelectedService(null);
    setServices([]);
    
    const res = await analyzeUrl(inputValue.trim());
    if (res.success && res.data) {
      const p = res.data.platform;
      setAnalyzedPlatform(p);
      track('LINK_PASTED', { url: inputValue.trim(), platform: p });
      
      // Filter DB Catalog for this platform
      const allowedCategories = initialCatalog.filter(c => c.platform === p);
      
      // We take the first matched category to load its services.
      // E.g., if suggested is 'SUBSCRIBERS', we find that category.
      let targetCategoryId = allowedCategories.length > 0 ? allowedCategories[0].id : null;
      
      const suggestions = res.data.suggestedCategories || [];
      if (suggestions.length > 0) {
         // rudimentary mapping: 'SUBSCRIBERS' -> category containing 'подпис'
         const keywords: Record<string, string[]> = {
             'SUBSCRIBERS': ['подписчики', 'фолловеры'],
             'LIKES': ['лайки'],
             'VIEWS': ['просмотр'],
             'COMMENTS': ['комментари']
         };
         
         for (let sgt of suggestions) {
           const kws = keywords[sgt] || [];
           const found = allowedCategories.find(c => kws.some(kw => c.name.toLowerCase().includes(kw)));
           if (found) {
             targetCategoryId = found.id;
             break;
           }
         }
      }
      
      if (targetCategoryId) {
         setSuggestedCategoryIds([targetCategoryId]);
         const svcs = await getServicesByCategoryAction(targetCategoryId);
         setServices(svcs.map(s => ({ ...s, categoryId: targetCategoryId }))); // attach for UI
         setViewState("results");
      } else {
         // fallback to normal catalog mode if unhandled
         setViewState("results");
      }
    } else {
      setViewState("idle"); // reset if fails
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAnalyze();
  };

  const handleCheckout = async () => {
    const finalEmail = savedEmail || emailForCheckout;
    if (!finalEmail) {
      setOrderError("Введите Email для получения чека.");
      return;
    }
    if (!agreedToTerms) {
      setOrderError("Вы должны согласиться с Офертой.");
      return;
    }
    if (!selectedService) return;

    setIsOrdering(true);
    setOrderError("");
    
    track('PAYMENT_CLICKED', { serviceId: selectedService.id, quantity });
    
    const res = await checkoutAction({
      serviceId: selectedService.id, 
      link: inputValue.trim(), 
      quantity, 
      email: finalEmail, 
      gateway: "yookassa"
    });
    
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else {
      setOrderError(!res.success && res.error ? res.error : "Ошибка при оплате. Попробуйте еще раз.");
      setIsOrdering(false);
    }
  };

  const getPlatformColor = (p: IntelligencePlatform | null) => {
    switch (p) {
      case IntelligencePlatform.INSTAGRAM: return "border-l-pink-500 bg-pink-50";
      case IntelligencePlatform.TELEGRAM: return "border-l-blue-500 bg-blue-50";
      case IntelligencePlatform.VK: return "border-l-indigo-500 bg-indigo-50";
      case IntelligencePlatform.TIKTOK: return "border-l-zinc-900 bg-zinc-100";
      case IntelligencePlatform.YOUTUBE: return "border-l-red-500 bg-red-50";
      default: return "border-l-slate-400 bg-slate-50";
    }
  };

  // Render Functions
  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white antialiased">
      
      {/* ═══ ЛЕВАЯ КОЛОНКА (45%) ═══ */}
      <div className="w-full md:w-[45%] h-full flex flex-col border-r border-slate-100 bg-white relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Header */}
        <div className="px-6 md:px-10 py-6 flex-shrink-0 flex items-center justify-between">
           <a href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                SMM<span className="text-blue-600">plan</span> <span className="font-black text-slate-200">Lite</span>
              </span>
           </a>
           <a href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Войти</a>
        </div>

        {/* Dynamic Center Vertical Layout */}
        <div className={`flex flex-col px-6 md:px-10 flex-1 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${viewState === 'idle' ? 'justify-center pb-20' : 'justify-start pt-4 overflow-y-auto scrollbar-hide'}`}>
           
           {/* BIG HERO TITLE (Only in Idle) */}
           <div className={`transition-all duration-500 overflow-hidden ${viewState === 'idle' ? 'opacity-100 max-h-[200px] mb-8' : 'opacity-0 max-h-0 mb-0'}`}>
             <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
               Органический рост<br/>в 1 клик.
             </h1>
             <p className="mt-4 text-lg text-slate-500">
               Вставьте ссылку на пост или профиль, AI подберет лучшую стратегию.
             </p>
           </div>

           {/* MAIN INPUT */}
           <div className={`relative transition-all duration-500 ${viewState !== 'idle' ? 'shadow-sm' : 'shadow-2xl shadow-blue-500/5 hover:shadow-blue-500/10'} rounded-2xl md:rounded-3xl bg-white border-2 focus-within:border-blue-500 ${viewState !== 'idle' ? 'border-slate-200' : 'border-slate-100'}`}>
              <div className="flex items-center absolute left-4 md:left-5 top-0 bottom-0 pointer-events-none">
                 <Search className={`w-5 h-5 ${viewState === 'idle' ? 'text-blue-500' : 'text-slate-400'}`} />
              </div>
              <input 
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Вставьте ссылку (напр. instagram.com/p/...)"
                className="w-full bg-transparent border-none py-4 md:py-5 pl-12 md:pl-14 pr-32 md:pr-40 text-base md:text-lg text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
              <div className="absolute right-2 top-2 bottom-2">
                 <button 
                   onClick={handleAnalyze}
                   disabled={inputValue.length < 5 || viewState === 'loading'}
                   className="h-full px-4 md:px-6 bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 group"
                 >
                   <span className="hidden sm:inline">Запустить</span>
                   <span className="sm:hidden">→</span>
                   <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform hidden sm:block" />
                 </button>
              </div>
           </div>
           
           <div className={`mt-3 text-center transition-all duration-300 ${viewState === 'idle' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
             <p className="text-sm text-slate-500">Предпочитаете по-старому? <button className="text-blue-600 font-semibold hover:underline">Выбрать вручную из каталога</button></p>
           </div>

           {/* LOADING STATE */}
           {viewState === 'loading' && (
              <div className="mt-12 flex flex-col items-center justify-center text-slate-400 space-y-4">
                 <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                 <p className="text-sm font-semibold tracking-wide uppercase animate-pulse">Искусственный интеллект сканирует ссылку...</p>
                 <div className="w-48 h-1 overflow-hidden bg-slate-100 rounded-full">
                    <div className="w-1/2 h-full bg-blue-500 rounded-full animate-[progress_1s_ease-in-out_infinite]" />
                 </div>
              </div>
           )}

           {/* RESULTS STATE */}
           {(viewState === 'results' && services.length > 0) && (
             <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
               <h3 className="text-sm font-bold text-slate-900 mb-4 px-1 flex items-center gap-2 uppercase tracking-tight">
                 <Sparkles className="w-4 h-4 text-amber-500" /> Рекомендуемые услуги
               </h3>
               <div className="space-y-3">
                 {services.slice(0, 4).map((srv) => (
                   <button
                     key={srv.id}
                     onClick={() => {
                        setSelectedService(srv);
                        track('SERVICE_SELECTED', { serviceId: srv.id, serviceName: srv.name });
                     }}
                     className={`w-full text-left bg-white border outline-none rounded-2xl p-4 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 flex flex-col relative overflow-hidden group
                       ${selectedService?.id === srv.id 
                         ? `border-blue-500 ring-1 ring-blue-500 shadow-md ${getPlatformColor(analyzedPlatform)}` 
                         : `border-slate-200 hover:border-slate-300 hover:shadow-sm border-l-4 ${getPlatformColor(analyzedPlatform).split(' ')[0]}`
                       }`}
                   >
                     {/* Hot Badge if it's the 1st one */}
                     {srv.id === services[0].id && (
                       <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-1 rounded-bl-lg z-10">
                         Топ Выбор
                       </div>
                     )}

                     <div className="flex items-start justify-between">
                       <span className="font-bold text-slate-900 flex-1 leading-tight pr-4">{srv.name}</span>
                       <span className="font-black text-slate-900 bg-white shadow-sm border border-slate-100 px-2 py-1 rounded-lg text-sm tabular-nums flex-shrink-0">
                         {srv.pricePer1kRub.toFixed(1)} ₽ <span className="text-[10px] text-slate-400 font-medium">/ 1к</span>
                       </span>
                     </div>
                     <p className="text-xs text-slate-500 mt-2 line-clamp-2 pr-10">{srv.description || "Высокое качество, быстрый старт, плавная подача."}</p>
                     
                     {/* Selection Indicator */}
                     {selectedService?.id === srv.id && (
                       <div className="absolute bottom-3 right-3 text-blue-600 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-blue-100">
                          <CheckCircle2 className="w-4 h-4" />
                       </div>
                     )}
                   </button>
                 ))}
               </div>
               
               <button className="mt-5 w-full py-4 text-center text-sm font-semibold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-dashed border-slate-200">
                  Показать все услуги (Весь Каталог)
               </button>
             </div>
           )}

        </div>

        {/* LEGAL FOOTER */}
        <div className="flex-shrink-0">
           <LegalFooter />
        </div>
      </div>


      {/* ═══ ПРАВАЯ КОЛОНКА (55%) ═══ */}
      <div className={`md:flex-1 h-full bg-slate-50 relative overflow-hidden transition-transform duration-500 md:translate-y-0 ${selectedService ? 'translate-y-0 fixed inset-0 z-50 md:relative md:z-0' : 'translate-y-full absolute inset-0 z-0 hidden w-0'}`}>
         
         {/* Close button for Mobile */}
         {selectedService && (
           <button 
             onClick={() => setSelectedService(null)}
             className="md:hidden absolute top-4 right-4 z-50 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md text-slate-900"
           >
             ✕
           </button>
         )}

         {!selectedService ? (
           // DEFAULT PLACEHOLDER (MARKETING)
           <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 to-slate-50">
              <div className="w-24 h-24 bg-white shadow-2xl shadow-blue-500/10 rounded-3xl flex items-center justify-center mb-8 rotate-3 transform hover:rotate-6 transition-transform">
                <Zap className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Всё работает само.</h2>
              <p className="text-slate-500 max-w-sm mb-10 leading-relaxed">
                Отправьте ссылку на любой открытый профиль. Наш ИИ подберет безопасную скорость накрутки, чтобы рост выглядел <span className="font-semibold text-slate-900">на 100% органично</span>.
              </p>
              
              <div className="flex items-center gap-4 filter grayscale opacity-40">
                 {/* Ложные лого банков/платежек для траста согласно правилам дизайна */}
                 <div className="text-sm font-bold tracking-widest uppercase">Visa</div>
                 <div className="text-sm font-bold tracking-widest uppercase">Mastercard</div>
                 <div className="text-sm font-bold tracking-widest uppercase">YooKassa</div>
                 <div className="text-sm font-bold tracking-widest uppercase">СБП</div>
              </div>
           </div>
         ) : (
           // CHECKOUT FORM
           <div className="h-full w-full flex flex-col justify-center items-center p-6 md:p-12 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">
             <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
               
               {/* Form Header */}
               <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-20">
                    <ShoppingCart className="w-32 h-32 transform rotate-12 translate-x-10 -translate-y-10" />
                 </div>
                 <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 mb-3 uppercase tracking-wider backdrop-blur-md">
                   Оформление заказа
                 </span>
                 <h2 className="text-2xl font-bold leading-tight mb-1">{selectedService.name}</h2>
                 <p className="text-white/60 text-sm truncate max-w-[280px] font-mono">{inputValue}</p>
               </div>

               {/* Form Body */}
               <div className="p-8 space-y-6">
                 
                 {/* Quantity Input */}
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Количество</label>
                   <div className="relative">
                     <input 
                       type="number"
                       min={selectedService.minQty}
                       max={10000000}
                       value={quantity}
                       onChange={e => setQuantity(parseInt(e.target.value) || selectedService.minQty)}
                       className="block w-full rounded-xl border-slate-200 bg-slate-50 py-4 pl-4 pr-12 text-slate-900 font-bold text-lg focus:border-blue-500 focus:ring-blue-500 transition-colors"
                     />
                     <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                       <span className="text-slate-400 font-medium">шт.</span>
                     </div>
                   </div>
                   <p className="text-[11px] text-slate-400 mt-2 font-medium">Ограничения: от {selectedService.minQty} шт.</p>
                 </div>

                 {/* Email Input */}
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Email для чека и статуса</label>
                   <input 
                     type="email"
                     value={emailForCheckout}
                     onChange={e => setEmailForCheckout(e.target.value)}
                     disabled={!!savedEmail}
                     placeholder="your@email.com"
                     className="block w-full rounded-xl border-slate-200 bg-slate-50 py-4 px-4 text-slate-900 text-base focus:border-blue-500 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                   />
                 </div>

                 <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">К оплате:</span>
                    <span className="text-3xl font-black text-slate-900 tabular-nums">
                       {pricing ? formatCents(pricing.totalCents) : formatCents(selectedService.pricePer1kRub * quantity * 10)} ₽
                    </span>
                 </div>

                 {orderError && (
                   <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-4 text-sm font-medium flex items-start gap-3">
                     <AlertCircle className="w-5 h-5 flex-shrink-0" />
                     {orderError}
                   </div>
                 )}

                 <label className="flex items-start gap-3 cursor-pointer group">
                   <div className="relative flex items-start pt-0.5">
                     <input 
                       type="checkbox" 
                       checked={agreedToTerms}
                       onChange={e => setAgreedToTerms(e.target.checked)}
                       className="peer w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" 
                     />
                   </div>
                   <span className="text-xs text-slate-500 leading-relaxed font-medium">
                     Я согласен с <a href="/terms" target="_blank" className="text-blue-600 hover:underline">публичной офертой</a> и даю согласие на обработку персональных данных.
                   </span>
                 </label>

                 <button
                   onClick={handleCheckout}
                   disabled={isOrdering || isCalculating || !agreedToTerms}
                   className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-lg py-5 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                 >
                   {isOrdering ? <Loader2 className="w-6 h-6 animate-spin" /> : "Перейти к оплате"}
                 </button>

                 <div className="text-center">
                    <button onClick={() => setSelectedService(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-wider hidden md:inline-block">Вернуться к выбору</button>
                 </div>

               </div>
               
             </div>
             
             {/* Security badges below form */}
             <div className="mt-8 flex items-center gap-6 opacity-60 grayscale filter px-4">
                <div className="flex flex-col items-center gap-1">
                   <ShieldCheck className="w-6 h-6 text-slate-600" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Шифрование</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <Zap className="w-6 h-6 text-slate-600" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Авто-Старт</span>
                </div>
             </div>

           </div>
         )}
      </div>

    </div>
  );
}
