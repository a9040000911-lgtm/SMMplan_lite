"use client";

import { useState, useEffect } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { checkoutAction, calculatePriceAction } from "@/actions/order/checkout";
import type { PricingResult } from "@/services/marketing.service";
import type { PublicCategory } from "@/actions/order/catalog";
import {
  Send,
  Instagram,
  Youtube,
  Music2,
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronDown,
  Minus,
  Plus,
  Loader2,
  ArrowRight,
  X,
  Check,
} from "lucide-react";

/* ─────────── Platform config ─────────── */
const PLATFORMS = [
  { id: "TELEGRAM", name: "Telegram", icon: Send, color: "#229ED9" },
  { id: "INSTAGRAM", name: "Instagram", icon: Instagram, color: "#E1306C" },
  { id: "VK", name: "VK", icon: Music2, color: "#0077FF" },
  { id: "TIKTOK", name: "TikTok", icon: Music2, color: "#010101" },
  { id: "YOUTUBE", name: "YouTube", icon: Youtube, color: "#FF0000" },
];

/* ─────────── Component ─────────── */
export function HeroCalculator({
  initialCatalog,
  initialEmail = "",
}: {
  initialCatalog: PublicCategory[];
  initialEmail?: string;
}) {
  const defaultPlatform = "TELEGRAM";
  const defaultCats = initialCatalog.filter((c) => c.platform === defaultPlatform);
  const defaultCategoryId = defaultCats.length > 0 ? defaultCats[0].id : "";
  const defaultServiceId = defaultCats.length > 0 && defaultCats[0].services.length > 0 ? defaultCats[0].services[0].id : "";

  // State
  const [platform, setPlatform] = useState(defaultPlatform);
  const [link, setLink] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "analyzing" | "ok" | "manual">("idle");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [serviceId, setServiceId] = useState(defaultServiceId);
  const [qty, setQty] = useState(1000);
  const [email, setEmail] = useState(initialEmail);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  // Derived
  const cats = initialCatalog.filter((c) => c.platform === platform);
  const activeCat = initialCatalog.find((c) => c.id === categoryId);
  const services = activeCat?.services ?? [];
  const activeSrv = services.find((s) => s.id === serviceId);



  // ── Clamp quantity
  useEffect(() => {
    if (activeSrv && qty < activeSrv.minQty) setQty(activeSrv.minQty);
  }, [activeSrv, qty]);

  // ── Price calc (debounced)
  useEffect(() => {
    if (!serviceId || qty < 1) { setPricing(null); return; }
    const t = setTimeout(async () => {
      const r = await calculatePriceAction(serviceId, qty);
      if (r.success && r.data) setPricing(r.data);
    }, 250);
    return () => clearTimeout(t);
  }, [serviceId, qty]);

  // ── Smart link detection
  useEffect(() => {
    if (!link || link.length < 6) { setLinkStatus("idle"); return; }
    const hasScheme = /https?:\/\/|t\.me\/|instagram\.com|vk\.com|tiktok\.com|youtube\.com/.test(link);
    if (!hasScheme) return;
    setLinkStatus("analyzing");
    const t = setTimeout(async () => {
      const r = await analyzeUrl(link.trim());
      if (r.success && r.data && r.data.platform !== "OTHER") {
        setPlatform(r.data.platform as string);
        setLinkStatus("ok");
      } else {
        setLinkStatus("manual");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [link]);

  // ── Checkout
  const doCheckout = async () => {
    if (!email || !serviceId) return;
    setBusy(true); setError("");
    const r = await checkoutAction({
      serviceId, link: link || `https://${platform.toLowerCase()}.example`,
      quantity: qty, email, gateway: "yookassa",
    });
    if (r.success && r.data?.paymentUrl) {
      window.location.href = r.data.paymentUrl;
    } else {
      setError(!r.success && r.error ? r.error : "Ошибка"); setBusy(false);
    }
  };

  const fallbackPriceCents = activeSrv ? Math.round(activeSrv.rate * activeSrv.markup * qty * 100) / 1000 : 0;
  const priceRub = pricing ? (pricing.totalCents / 100).toFixed(0) : (fallbackPriceCents / 100).toFixed(0);
  const oldPriceRub = pricing && pricing.discountPercent > 0
    ? (pricing.originalTotalCents / 100).toFixed(0) : null;

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 -z-10" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-12 md:pt-16 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-10 lg:gap-16 items-start">

            {/* ═══ LEFT: Offer copy ═══ */}
            <div className="order-2 lg:order-1 flex flex-col justify-center">
              <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 rounded-full px-3 py-1 text-xs font-medium w-fit mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                Автоматический подбор услуг по ссылке
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Результат с{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  гарантией
                </span>
                .
                <br />
                Запуск за 4 секунды.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-500 leading-relaxed max-w-lg">
                Подписчики, просмотры, реакции для{" "}
                <strong className="text-slate-700">Telegram, Instagram, VK, TikTok, YouTube</strong>.
                Плавная подача. Без регистрации.
              </p>

              {/* Trust pills */}
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { icon: Zap, text: "Старт за 4 сек", color: "text-amber-500" },
                  { icon: ShieldCheck, text: "Гарантия от отписок", color: "text-emerald-500" },
                  { icon: Send, text: "Без регистрации", color: "text-blue-500" },
                ].map((t) => (
                  <div key={t.text} className="flex items-center gap-2 bg-white border border-slate-100 shadow-sm rounded-xl px-3.5 py-2">
                    <t.icon className={`w-4 h-4 ${t.color}`} />
                    <span className="text-sm font-medium text-slate-700">{t.text}</span>
                  </div>
                ))}
              </div>

              {/* Social proof numbers */}
              <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm">
                {[
                  { val: "2M+", label: "Заказов" },
                  { val: "50K+", label: "Клиентов" },
                  { val: "99%", label: "В срок" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">{s.val}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ RIGHT: Calculator card ═══ */}
            <div className="order-1 lg:order-2">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-5 sm:p-6">

                {/* ── Platform tabs ── */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    const active = platform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPlatform(p.id);
                          const firstCat = initialCatalog.find((c) => c.platform === p.id);
                          if (firstCat) {
                            setCategoryId(firstCat.id);
                            setServiceId(firstCat.services.length > 0 ? firstCat.services[0].id : "");
                          } else {
                            setCategoryId("");
                            setServiceId("");
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                          active
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline sm:inline">{p.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Link input ── */}
                <div className="mt-4 relative">
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="Вставьте ссылку (необязательно)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {linkStatus === "analyzing" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                    {linkStatus === "ok" && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                </div>
                {linkStatus === "ok" && (
                  <p className="text-[11px] text-emerald-600 mt-1.5 px-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Платформа определена автоматически
                  </p>
                )}

                {/* ── Category select ── */}
                {cats.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Тип услуги
                    </div>
                    <select
                      value={categoryId}
                      onChange={(e) => { 
                        const newCatId = e.target.value;
                        setCategoryId(newCatId); 
                        const newCat = initialCatalog.find(c => c.id === newCatId);
                        setServiceId(newCat && newCat.services.length > 0 ? newCat.services[0].id : "");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                    >
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}


                {/* ── Service cards ── */}
                {services.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Тариф
                    </div>
                    <div className="space-y-1.5">
                      {(showAllServices ? services : services.slice(0, 3)).map((srv, i) => {
                        const price = (srv.rate * srv.markup).toFixed(1);
                        const sel = serviceId === srv.id;
                        return (
                          <button
                            key={srv.id}
                            onClick={() => setServiceId(srv.id)}
                            className={`w-full text-left rounded-xl p-3 transition-all border ${
                              sel
                                ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20"
                                : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-800 truncate pr-2">
                                  {srv.name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {srv.badge && (
                                    <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 rounded px-1.5 py-px">
                                      {srv.badge}
                                    </span>
                                  )}
                                  {i === 0 && (
                                    <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded px-1.5 py-px">
                                      Популярный
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold tabular-nums text-slate-900">
                                  {price} ₽
                                </div>
                                <div className="text-[10px] text-slate-400">за 1000</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {services.length > 3 && (
                      <button
                        onClick={() => setShowAllServices(!showAllServices)}
                        className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1 hover:text-blue-700"
                      >
                        {showAllServices ? "Свернуть" : `Ещё ${services.length - 3} тарифов`}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showAllServices ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                )}

                {/* ── Quantity ── */}
                {activeSrv && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Количество
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(Math.max(activeSrv.minQty, qty - 100))}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-4 h-4 text-slate-600" />
                      </button>
                      <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(Math.max(activeSrv.minQty, parseInt(e.target.value) || 0))}
                        className="flex-1 text-center bg-slate-50 border border-slate-200 rounded-xl h-10 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setQty(qty + 100)}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 px-1">
                      мин. {activeSrv.minQty.toLocaleString("ru-RU")}
                    </div>
                  </div>
                )}

                {/* ── Email ── */}
                {activeSrv && (
                  <div className="mt-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email для чека и доступа"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                )}

                {/* ── Price + CTA ── */}
                {activeSrv && (
                  <div className="mt-5">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        {oldPriceRub && (
                          <div className="text-xs text-slate-400 line-through mb-0.5">{oldPriceRub} ₽</div>
                        )}
                        <span className="text-3xl font-extrabold tabular-nums text-slate-900">
                          {priceRub}
                        </span>
                        <span className="text-lg font-bold text-slate-400 ml-1">₽</span>
                      </div>
                      {pricing && pricing.discountPercent > 0 && (
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg px-2 py-1">
                          −{pricing.discountPercent}%
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setConfirm(true)}
                      disabled={busy || !email}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      {busy ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Обработка...</>
                      ) : (
                        <>Оформить заказ <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>

                    {error && (
                      <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
                    )}

                    <p className="text-[10px] text-slate-400 text-center mt-3">
                      Безопасная оплата через ЮKassa • Никаких скрытых комиссий
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ Confirmation Bottom Sheet ═══ */}
      {confirm && activeSrv && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          onClick={() => setConfirm(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={() => setConfirm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-5">Подтверждение заказа</h3>

            <div className="space-y-3">
              {[
                { lab: "Услуга", val: activeSrv.name },
                { lab: "Количество", val: qty.toLocaleString("ru-RU") },
                { lab: "Email", val: email },
                ...(link ? [{ lab: "Ссылка", val: link }] : []),
              ].map((r) => (
                <div key={r.lab} className="flex justify-between text-sm">
                  <span className="text-slate-400">{r.lab}</span>
                  <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">{r.val}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
                <span className="font-bold text-slate-900">Итого</span>
                <span className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {priceRub} <span className="text-base text-slate-400">₽</span>
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => { setConfirm(false); doCheckout(); }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all"
              >
                Оплатить {priceRub} ₽
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
