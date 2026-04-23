"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { checkoutAction, calculatePriceAction } from "@/actions/order/checkout";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { PricingResult } from "@/services/marketing.service";
import { getPublicCatalogAction, getServicesByCategoryAction, PublicCategory, PublicService } from "@/actions/order/catalog";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Sparkles, CheckCircle2, ChevronRight, ShoppingCart, Tag } from "lucide-react";
import { formatCents } from "@/lib/utils";

export function SmartOrderFunnel({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  
  // -- Основные стейты воронки --
  const [inputValue, setInputValue] = useState("");
  const [url, setUrl] = useState("");
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [platform, setPlatform] = useState<IntelligencePlatform | null>(null);
  const [isUrlPrivate, setIsUrlPrivate] = useState(false);
  const [dbCatalog, setDbCatalog] = useState<PublicCategory[]>([]);
  
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  
  const [servicesMap, setServicesMap] = useState<Record<string, PublicService[]>>({});
  const [loadingServices, setLoadingServices] = useState(false);
  
  const [quantity, setQuantity] = useState(100);
  const [emailForCheckout, setEmailForCheckout] = useState("");
  
  // -- Стейты UI (Feedback / Errors) --
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputHint, setInputHint] = useState(""); // Мягкие подсказки под инпутом
  const [emailPrompt, setEmailPrompt] = useState(false); // Показываем ли промпт "Сохранить почту?"
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]); // Для фильтрации
  
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // -- Загрузка каталога с сервера --
  useEffect(() => {
     getPublicCatalogAction().then(res => {
        if (res.success && res.data) {
           setDbCatalog(res.data);
        }
     });
  }, []);

  // -- Эффекты: Умный анализ инпута (ссылка vs email vs мусор) --
  useEffect(() => {
    // Сброс подсказок при пустом вводе
    if (!inputValue) {
      setInputHint("");
      setEmailPrompt(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailLike = inputValue.includes('@') && inputValue.includes('.');
    const isUrlLike = inputValue.includes('http') || inputValue.includes('www.') || inputValue.includes('t.me/') || inputValue.includes('instagram.com/');

    if (emailRegex.test(inputValue.trim())) {
      setEmailPrompt(true);
      setInputHint("");
    } else if (isEmailLike && !emailRegex.test(inputValue.trim())) {
      setInputHint("Кажется, вы вводите почту. Проверьте правильность.");
      setEmailPrompt(false);
    } else if (isUrlLike) {
      setEmailPrompt(false);
      // Если это ссылка, ждем 500мс и анализируем
      const timeoutId = setTimeout(async () => {
        setIsAnalyzing(true);
        setInputHint("Сканируем ссылку...");
        
        const res = await analyzeUrl(inputValue.trim());
        if (res.success && res.data) {
          if (res.data.platform !== IntelligencePlatform.OTHER) {
             setPlatform(res.data.platform);
             setUrl(inputValue.trim());
             setIsUrlPrivate(res.data.metadata?.isPrivate || false);
             setSuggestedCategories(res.data.suggestedCategories || []);
             setInputHint(`✅ Отлично! Найден ${res.data.platform}`);
             // Мы меняем фазу - инпут "уедет" наверх
          } else {
             setInputHint("⚠️ Платформа не распознана, но вы можете продолжить.");
             setUrl(inputValue.trim());
             setPlatform(null);
             setSuggestedCategories([]);
          }
        } else {
          setInputHint("⚠️ Не удалось проанализировать ссылку.");
        }
        setIsAnalyzing(false);
      }, 600);
      return () => clearTimeout(timeoutId);
    } else if (inputValue.length > 5) {
       setEmailPrompt(false);
       setInputHint("Пожалуйста, введите ссылку (https://...) или вашу почту для заказа.");
    }
  }, [inputValue]);

  // -- Сохранение почты --
  const handleSaveEmail = () => {
    setSavedEmail(inputValue.trim());
    setInputValue("");
    setEmailPrompt(false);
    setInputHint("✉️ Почта сохранена! Теперь вставьте ссылку на пост/профиль.");
    // Возвращаем фокус
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // -- Списки --
  const availableCategories = platform 
    ? dbCatalog.filter(c => {
         if (c.platform !== platform) return false;
         // Умный фильтр для приватных каналов
         const isCategoryPrivate = c.name.toLowerCase().includes('закрыт') || c.name.toLowerCase().includes('приват');
         if (!isUrlPrivate && isCategoryPrivate) return false; // Скрываем приватные для открытых ссылок
         
         // Фильтрация по suggestedCategories (маппинг)
         if (suggestedCategories.length > 0) {
            const hasMatch = suggestedCategories.some(suggested => {
               // Например, 'SUBSCRIBERS' -> 'подписчики', 'ЛАЙК' -> 'likes' и тд.
               const mapping: Record<string, string[]> = {
                 'SUBSCRIBERS': ['подписчики', 'участники', 'фолловеры'],
                 'LIKES': ['лайки', 'like', 'сердечк'],
                 'VIEWS': ['просмотр', 'глазок'],
                 'COMMENTS': ['комментари', 'отзыв'],
                 'REPOSTS': ['репост', 'поделиться']
               };
               const keywords = mapping[suggested] || [];
               return keywords.some(kw => c.name.toLowerCase().includes(kw));
            });
            // Если есть совпадение по ключевым словам, показываем её. Иначе скрываем.
            // Но если маппинг не сработал ни для одной категории (ошибка распознавания), то покажем все не-приватные.
            // Чтобы не усложнять, если hasMatch==false, мы скрываем, если только она не 'MIX' (если нужно).
            // Допустим, мы жестко скрываем:
            if (!hasMatch) return false;
         }
         return true;
      })
    : dbCatalog;

  const currentCategory = dbCatalog.find(c => c.id === categoryId);

  // Lazy load services when category changes
  useEffect(() => {
    if (!categoryId) return;
    if (servicesMap[categoryId]) return;

    let cancelled = false;
    setLoadingServices(true);
    getServicesByCategoryAction(categoryId).then(services => {
        if (!cancelled) {
           setServicesMap(prev => ({ ...prev, [categoryId]: services }));
           setLoadingServices(false);
           if (services.length > 0) {
               setServiceId(prev => services.some(s => s.id === prev) ? prev : services[0].id);
           }
        }
    });

    return () => { cancelled = true; };
  }, [categoryId, servicesMap]);

  const availableServices = servicesMap[categoryId] || [];
  const selectedService = availableServices.find(s => s.id === serviceId);

  // -- Обновление минимального количества при выборе услуги --
  useEffect(() => {
     if (selectedService && quantity < selectedService.minQty) {
        setQuantity(selectedService.minQty);
     }
  }, [selectedService]);

  // -- Расчет цены --
  useEffect(() => {
    if (!serviceId || quantity < 10) {
      setPricing(null);
      setIsCalculating(false);
      return;
    }
    setIsCalculating(true);
    const fetchPrice = async () => {
      const res = await calculatePriceAction(serviceId, quantity, "");
      if (res.success && res.data) setPricing(res.data);
      setIsCalculating(false);
    };
    const t = setTimeout(fetchPrice, 300);
    return () => clearTimeout(t);
  }, [serviceId, quantity]);

  // -- Оплата --
  const handleCheckout = async () => {
    const finalEmail = savedEmail || emailForCheckout;
    if (!finalEmail) {
      setOrderError("Пожалуйста, укажите Email (нужен для отправки чека и доступа).");
      return;
    }
    
    if (!serviceId || quantity < (selectedService?.minQty || 0)) return;
    
    setIsOrdering(true);
    setOrderError("");
    
    const res = await checkoutAction({
      serviceId, 
      link: url || inputValue, 
      quantity, 
      email: finalEmail, 
      gateway: "yookassa"
    });
    
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else {
      setOrderError(!res.success && res.error ? res.error : "Ошибка при оплате");
      setIsOrdering(false);
    }
  };

  // -- Phase Calculation --
  const hasValidLink = url.length > 5;
  const isPhase1 = !hasValidLink; // Огромный инпут по центру
  const isPhase2 = hasValidLink && !categoryId; // Выбор категории
  const isPhase3 = hasValidLink && categoryId && !serviceId; // Выбор услуги
  const isPhase4 = hasValidLink && serviceId; // Выливается корзина

  return (
    <div className="w-full max-w-4xl mx-auto font-sans relative pb-40">
      
      {/* Ozon-like Top Feedback Bar (если почта уже сохранена) */}
      <AnimatePresence>
        {savedEmail && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="absolute -top-16 left-0 right-0 flex items-center justify-center"
           >
             <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm font-medium text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Вы авторизованы как {savedEmail}
                <button onClick={() => setSavedEmail('')} className="ml-2 text-slate-400 hover:text-rose-500 underline text-xs">Изменить</button>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white sm:rounded-3xl sm:shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden min-h-[400px]">
        
        {/* === PHASE 1 & HEADER === */}
        <motion.div 
          layout
          className={`p-6 sm:p-10 transition-colors ${hasValidLink ? 'bg-slate-50 border-b border-slate-100 relative' : 'pt-24 sm:pt-32'}`}
        >
          <motion.div layout className="max-w-2xl mx-auto">
             
             {!hasValidLink && (
               <motion.h1 layoutId="main-title" className="text-3xl sm:text-4xl font-black text-slate-900 text-center mb-8 tracking-tight">
                 Раскрутка соцсетей <span className="text-blue-600">в 1 клик</span>
               </motion.h1>
             )}

             <motion.div layout className="relative">
                {hasValidLink && (
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ссылка для продвижения</label>
                )}
                <div className={`relative flex items-center ${isAnalyzing ? 'animate-pulse' : ''} group`}>
                   <input 
                     ref={inputRef}
                     type="text"
                     value={inputValue}
                     onChange={(e) => { setInputValue(e.target.value); if(hasValidLink) { setUrl(""); setCategoryId(""); setServiceId(""); } }}
                     placeholder="Вставьте ссылку на пост, профиль или канал..."
                     className={`w-full bg-slate-50/50 backdrop-blur-md text-slate-900 outline-none transition-all duration-300 shadow-sm hover:shadow-md hover:bg-white hover:ring-slate-900/10 ring-1 ring-slate-900/5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white placeholder-slate-400 font-medium ${hasValidLink ? 'text-lg p-5 rounded-[20px]' : 'text-xl p-6 rounded-[24px]'}`}
                     autoFocus
                   />
                   {isAnalyzing && (
                     <div className="absolute right-4 text-blue-500">
                        <Sparkles className="w-6 h-6 animate-spin" />
                     </div>
                   )}
                </div>

                {/* Подсказки и экшены */}
                <AnimatePresence mode="wait">
                  {emailPrompt && isPhase1 && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                       className="absolute mt-3 w-full bg-blue-50 border border-blue-100 rounded-xl p-4 flex sm:flex-row flex-col justify-between items-center sm:items-start gap-3 shadow-md z-10"
                     >
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><Info className="w-5 h-5"/></div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Мы распознали Email!</p>
                            <p className="text-xs text-slate-600 mt-0.5">Сохранить его для получения чека и доступа к заказам?</p>
                          </div>
                        </div>
                        <button onClick={handleSaveEmail} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg active:scale-95 transition-transform">
                          Да, запомнить
                        </button>
                     </motion.div>
                  )}
                  {inputHint && !emailPrompt && isPhase1 && (
                    <motion.p 
                      key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                      className="text-center mt-4 text-sm font-medium text-slate-500"
                    >
                      {inputHint}
                    </motion.p>
                  )}
                </AnimatePresence>
             </motion.div>
          </motion.div>
        </motion.div>

        {/* === PHASE 2: КАТЕГОРИИ (Стиль плиток Ozon) === */}
        <AnimatePresence>
           {hasValidLink && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-6 sm:p-10"
              >
                 <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      1. Что будем продвигать?
                      {categoryId && <CheckCircle2 className="text-emerald-500 w-5 h-5" />}
                    </h2>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                       {availableCategories.map(cat => {
                         const isSelected = categoryId === cat.id;
                         return (
                           <motion.button
                             key={cat.id}
                             whileHover={{ scale: 1.02, y: -2 }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => { setCategoryId(cat.id); setServiceId(""); }}
                             className={`p-5 rounded-[24px] flex flex-col items-center justify-center gap-4 text-center transition-all bg-white shadow-sm ring-1 ring-slate-900/5 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:shadow-md hover:ring-slate-900/10 hover:bg-slate-50'}`}
                           >
                              {cat.icon.startsWith('/') ? (
                                <img src={cat.icon} alt={cat.name} className="w-10 h-10 object-contain" />
                              ) : (
                                <span className="text-3xl">{cat.icon}</span>
                              )}
                              <span className={`text-sm font-semibold line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{cat.name}</span>
                           </motion.button>
                         )
                       })}
                    </div>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>

        {/* === PHASE 3: УСЛУГИ (Стиль товаров) === */}
        <AnimatePresence>
           {categoryId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 sm:px-10 pb-10"
              >
                 <div className="max-w-4xl mx-auto border-t border-slate-100 pt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                       2. Выберите тариф
                       {serviceId && <CheckCircle2 className="text-emerald-500 w-5 h-5" />}
                    </h2>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                       {availableServices.map(srv => {
                          const isSelected = serviceId === srv.id;
                          const pricePer1000 = srv.pricePer1kRub.toFixed(2);
                          
                          return (
                            <motion.button
                               key={srv.id}
                               onClick={() => setServiceId(srv.id)}
                               className={`relative p-6 rounded-[24px] text-left transition-all bg-white ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'ring-1 ring-slate-900/5 shadow-sm hover:shadow-md hover:-translate-y-1 hover:ring-slate-900/10'} group`}
                            >
                               {/* Neo-Commerce badges */}
                               {srv.badge && (
                                 <span className={`absolute top-0 right-0 font-bold tracking-wider text-[10px] px-4 py-1.5 rounded-bl-[20px] rounded-tr-[24px] uppercase ${isSelected ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-sm' : 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-sm' }`}>
                                    {srv.badge}
                                 </span>
                               )}

                               <div className="pr-12">
                                  <h3 className={`font-bold text-lg leading-tight mb-2 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{srv.name}</h3>
                                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                     <Tag className="w-4 h-4 opacity-50" />
                                     {srv.speed}
                                  </div>
                                  {srv.description && (
                                     <div className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                                        {srv.description}
                                     </div>
                                  )}
                               </div>

                               <div className="flex items-end justify-between mt-4">
                                  <div>
                                     <div className="text-xs text-slate-400 line-through decoration-rose-400 mb-0.5">{(parseFloat(pricePer1000) * 1.5).toFixed(2)} ₽</div>
                                     <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-black ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{pricePer1000} ₽</span>
                                        <span className="text-xs font-semibold text-slate-400">за 1000 шт</span>
                                     </div>
                                  </div>
                                  
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                     {isSelected ? <CheckCircle2 className="w-5 h-5"/> : <ChevronRight className="w-5 h-5" />}
                                  </div>
                               </div>
                               
                               {isSelected && <div className="absolute inset-0 ring-4 ring-blue-500/10 rounded-2xl pointer-events-none"></div>}
                            </motion.button>
                          )
                       })}
                    </div>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>
      </div>

      {/* === PHASE 4: ПЛАВАЮЩИЙ CHECKOUT (Ozon Sticky Footer) === */}
      <AnimatePresence>
         {serviceId && selectedService && (
            <motion.div
               initial={{ opacity: 0, y: 100 }}
               animate={{ opacity: 1, y: 0 }}
               className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.06)] z-50 p-5 sm:p-8"
            >
               <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6">
                  
                  {/* Параметры */}
                  <div className="w-full sm:w-auto flex-1 flex flex-col sm:flex-row items-center gap-6">
                     {/* Количество (Ozon-like Counter) */}
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Количество</label>
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                          <button onClick={() => setQuantity(Math.max(selectedService.minQty, quantity - 100))} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm rounded-lg font-bold text-xl transition-all">-</button>
                          <input 
                             type="number" 
                             value={quantity} 
                             onChange={e => setQuantity(Math.max(selectedService.minQty, parseInt(e.target.value) || 0))}
                             className="w-20 text-center font-bold text-lg bg-transparent outline-none text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button onClick={() => setQuantity(quantity + 100)} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm rounded-lg font-bold text-xl transition-all">+</button>
                        </div>
                     </div>

                     {/* Email (Если еще не указан) */}
                     {!savedEmail && (
                        <div className="w-full sm:max-w-xs">
                           <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Email для чека *</label>
                           <input 
                              type="email"
                              value={emailForCheckout}
                              onChange={e => setEmailForCheckout(e.target.value)}
                              placeholder="Ваша почта..."
                              className="w-full bg-slate-50/50 backdrop-blur-sm shadow-sm ring-1 ring-slate-900/5 px-5 h-14 rounded-[18px] text-sm font-medium outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                           />
                        </div>
                     )}
                  </div>

                  {/* Кнопка Оплаты */}
                  <div className="w-full sm:w-auto flex items-center gap-6">
                     <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-slate-500 mb-0.5">К оплате</div>
                        <div className={`text-3xl font-black text-slate-900 leading-none transition-all duration-300 ${isCalculating ? 'blur-[4px] opacity-50 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
                           {pricing ? formatCents(pricing.totalCents) : "0.00"} <span className="text-xl">₽</span>
                        </div>
                     </div>
                     
                     <button 
                        onClick={handleCheckout}
                        disabled={isOrdering || (!savedEmail && !emailForCheckout)}
                        className="bg-gradient-to-br from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-10 h-16 rounded-[20px] font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_8px_24px_rgba(0,118,255,0.25)] whitespace-nowrap text-lg"
                     >
                        {isOrdering ? (
                          <Sparkles className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" /> 
                            Оплатить
                          </>
                        )}
                     </button>
                  </div>

               </div>
               
               {/* Ошибки валидации */}
               {orderError && (
                 <div className="max-w-4xl mx-auto mt-4 text-center">
                   <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 py-2 rounded-lg">{orderError}</p>
                 </div>
               )}
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
}
