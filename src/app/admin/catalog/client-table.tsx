'use client';

import { ProgressBar, Button as HeroButton } from "@heroui/react";
import { updateMarkupAction, toggleServiceAction } from '@/actions/admin/catalog';
import { TOTAL_MANDATORY_DEDUCTIONS, SAFETY_FLOOR_MARKUP, applyBeautifulRounding, USD_TO_RUB } from '@/lib/financial-constants';
import { ActionForm } from '@/components/admin/action-form';

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcSellingPrice(ratePerK: number, markup: number, usdToRub: number): number {
  return ratePerK * markup * usdToRub;
}

export function CatalogTable({ services }: { services: any[] }) {
  return (
    <div className="rounded-2xl border border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-medium text-slate-700">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 bg-slate-50/50">
              <th className="py-3.5 px-4 font-bold">ID</th>
              <th className="py-3.5 px-4 font-bold">Услуга</th>
              <th className="py-3.5 px-4 font-bold hidden md:table-cell">Категория</th>
              <th className="py-3.5 px-4 font-bold text-right hidden sm:table-cell">Закуп ($/1K)</th>
              <th className="py-3.5 px-4 font-bold">Динамика наценки</th>
              <th className="py-3.5 px-4 font-bold text-right">Итог (₽)</th>
              <th className="py-3.5 px-4 font-bold text-right hidden lg:table-cell">Лимиты</th>
              <th className="py-3.5 px-4 font-bold text-right hidden sm:table-cell">Заказы</th>
              <th className="py-3.5 px-4 font-bold text-right">Управление</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s: any) => {
              const sellingPrice = calcSellingPrice(s.rate, s.markup, USD_TO_RUB);
              const roundedPrice = applyBeautifulRounding(sellingPrice);
              const margin = ((s.markup - 1) * 100).toFixed(0);
              const isBelowSafety = s.markup < SAFETY_MULTIPLIER;

              const progressValue = Math.min((s.markup / 5) * 100, 100);
              const progressColor = isBelowSafety ? "danger" : (s.markup > 3 ? "success" : "warning");

              return (
                <tr 
                  key={s.id} 
                  className={`transition-colors even:bg-slate-50/30 group ${!s.isActive ? 'opacity-50 grayscale bg-slate-50/10' : 'hover:bg-slate-50/80'}`}
                >
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs tabular-nums text-slate-500">#{s.numericId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="max-w-[200px]">
                      <span className={`font-semibold truncate block text-xs ${!s.isActive ? 'text-slate-500' : 'text-slate-900'}`}>{s.name}</span>
                      {s.badge && (
                        <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 rounded px-1.5 py-px inline-block mt-1 mb-1">
                          {s.badge}
                        </span>
                      )}
                      {s.externalId && (
                        <div className="text-[10px] text-slate-400 mt-1">Provider ID: {s.externalId}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs text-slate-500">{s.category?.name || "Без категории"}</span>
                  </td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="font-mono text-xs tabular-nums text-slate-600">${s.rate.toFixed(4)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-4 whitespace-nowrap">
                      <ActionForm action={updateMarkupAction}>
                        <input type="hidden" name="serviceId" value={s.id} />
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            name="markup"
                            step="0.1"
                            min="1.0"
                            max="151.0"
                            defaultValue={s.markup}
                            className={`w-16 px-2 py-1.5 text-xs font-mono font-bold rounded-lg outline-none transition-all tabular-nums shadow-sm
                              ${isBelowSafety 
                                ? 'border border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500/20' 
                                : 'border border-slate-200 bg-white text-slate-700 focus:bg-slate-50 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 hover:border-slate-300'}
                            `}
                          />
                        </div>
                      </ActionForm>
                      <div className="flex flex-col gap-1.5 w-24 pt-1">
                        <ProgressBar
                          value={progressValue}
                          size="sm"
                          color={progressColor}
                          aria-label="Наценка"
                          className="bg-slate-100"
                        />
                        <span className={`text-[10px] font-medium leading-none ${isBelowSafety ? "text-red-500" : "text-slate-400"}`}>
                          {isBelowSafety ? `Пол x${SAFETY_MULTIPLIER.toFixed(1)}` : `Маржа +${margin}%`}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-xs tabular-nums">
                      <div className="font-semibold">{roundedPrice.toFixed(2)} ₽</div>
                      {roundedPrice !== sellingPrice && (
                        <div className="text-[10px] text-slate-400 mt-0.5 line-through">{sellingPrice.toFixed(2)}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right hidden lg:table-cell">
                    <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {s.minQty.toLocaleString('ru-RU')} – {s.maxQty.toLocaleString('ru-RU')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="text-xs font-medium text-slate-600 tabular-nums">
                      {s._count?.orders?.toLocaleString('ru-RU') || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <form action={toggleServiceAction}>
                      <input type="hidden" name="serviceId" value={s.id} />
                      <input type="hidden" name="isActive" value={s.isActive ? 'false' : 'true'} />
                      <button
                        type="submit"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${s.isActive ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-800'}`}
                      >
                        {s.isActive ? 'Отключить' : 'Включить'}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {services.length === 0 && (
        <div className="h-24 w-full flex items-center justify-center text-sm text-slate-500 bg-white">
          Нет услуг.
        </div>
      )}
    </div>
  );
}
