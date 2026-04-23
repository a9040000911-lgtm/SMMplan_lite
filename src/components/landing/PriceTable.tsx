"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicCategory } from "@/actions/order/catalog";

const PLATFORM_TABS = [
  { id: "TELEGRAM", label: "Telegram" },
  { id: "INSTAGRAM", label: "Instagram" },
  { id: "VK", label: "VK" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "YOUTUBE", label: "YouTube" },
];

const MAX_SERVICES_PER_CAT = 3;
const MAX_CATEGORIES = 5;

function CategoryBlock({ cat }: { cat: PublicCategory }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? cat.services : cat.services.slice(0, MAX_SERVICES_PER_CAT);
  const hasMore = cat.services.length > MAX_SERVICES_PER_CAT;

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
        {cat.name}
      </h3>
      <div className="space-y-2">
        {visible.map((srv) => {
          const price = (srv.rate * srv.markup).toFixed(1);
          return (
            <div
              key={srv.id}
              className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1 pr-4">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {srv.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  мин. {srv.minQty.toLocaleString("ru-RU")} •{" "}
                  {srv.badge || "Стандарт"}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold tabular-nums text-slate-900">
                  от {price} ₽
                </div>
                <div className="text-[10px] text-slate-400">за 1000</div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors px-1"
        >
          {expanded ? "Свернуть" : `Ещё ${cat.services.length - MAX_SERVICES_PER_CAT}`}
          <ChevronDown
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

export function PriceTable({ catalog }: { catalog: PublicCategory[] }) {
  const [active, setActive] = useState("TELEGRAM");
  const [showAllCats, setShowAllCats] = useState(false);

  const allCats = catalog.filter((c) => c.platform === active);
  const visibleCats = showAllCats ? allCats : allCats.slice(0, MAX_CATEGORIES);
  const hasMoreCats = allCats.length > MAX_CATEGORIES;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          Все услуги и цены
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          Прозрачные цены без скрытых комиссий
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide justify-center">
        {PLATFORM_TABS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setActive(p.id); setShowAllCats(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              active === p.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="max-w-2xl mx-auto space-y-8">
        {visibleCats.map((cat) => (
          <CategoryBlock key={cat.id} cat={cat} />
        ))}

        {hasMoreCats && (
          <div className="text-center">
            <button
              onClick={() => setShowAllCats(!showAllCats)}
              className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors inline-flex items-center gap-1"
            >
              {showAllCats
                ? "Показать основные"
                : `Показать все ${allCats.length} категорий`}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showAllCats ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        )}

        {allCats.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">
            Услуги для этой платформы скоро появятся
          </p>
        )}
      </div>
    </section>
  );
}
