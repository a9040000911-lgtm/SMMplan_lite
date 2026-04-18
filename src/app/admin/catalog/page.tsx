import { adminCatalogService } from '@/services/admin/catalog.service';
import { updateMarkupAction, toggleServiceAction } from '@/actions/admin/catalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { db } from '@/lib/db';
import { TOTAL_MANDATORY_DEDUCTIONS, SAFETY_FLOOR_MARKUP, applyBeautifulRounding } from '@/lib/financial-constants';

export const dynamic = 'force-dynamic';

// Exchange rate: In Smmplan Lite we don't have GlobalSetting yet, so we use a constant.
export const USD_TO_RUB = 95;

function calcSellingPrice(ratePerK: number, markup: number, usdToRub: number): number {
  return ratePerK * markup * usdToRub;
}

// Safety floor multiplier: minimum markup that covers taxes + gateway + 100% margin
const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

type Props = {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
  }>;
};

export default async function AdminCatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.q || '';
  const cursor = params.cursor || undefined;

  const { items: services, nextCursor, hasMore } = await adminCatalogService.listServices({
    search: search || undefined,
    cursor,
    pageSize: 50,
  });

  const stats = await adminCatalogService.getCatalogStats();
  const markupAnalytics = await adminCatalogService.getMarkupAnalytics();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🛒 Каталог услуг</h1>
          <p className="text-slate-500 mt-1">
            Всего: {stats.totalServices} • Активных: {stats.activeServices} • Категорий: {stats.categories}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/providers" className="inline-flex justify-center rounded-md border border-slate-300 bg-white py-2 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Настройка панелей
          </Link>
          <Link href="/admin/catalog/categories" className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Категории
          </Link>
        </div>
      </div>

      {/* Markup Analytics Mini-Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold text-slate-800">{markupAnalytics.stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Всего</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{markupAnalytics.stats.loss}</div>
          <div className="text-[11px] text-red-600 mt-0.5">🔴 Убыток</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{markupAnalytics.stats.thin}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">⚠️ Тонкая</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <div className="text-2xl font-bold text-emerald-700">{markupAnalytics.stats.normal}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">✅ Норма</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{markupAnalytics.stats.high}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">💰 Высокая</div>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">{markupAnalytics.stats.extreme}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">🚀 Топ</div>
        </div>
      </div>

      {markupAnalytics.stats.loss > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">⚠️ Услуги с наценкой ниже Safety Floor (убыточные после налогов):</h3>
          <div className="text-xs text-red-700 space-y-1">
            {markupAnalytics.worstServices.slice(0, 5).map(ws => (
              <div key={ws.id}>• <strong>{ws.name}</strong> — x{ws.markup.toFixed(1)} (нужно мин. x{SAFETY_MULTIPLIER.toFixed(1)}) [{ws.category}]</div>
            ))}
          </div>
        </div>
      )}

      {/* Exchange Rate Info */}
      <div className="text-xs text-slate-400 text-right">
        💱 Курс USD/RUB: {USD_TO_RUB.toFixed(2)} (из настроек)
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="🔍 Поиск по названию или ID..."
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <Button type="submit">Найти</Button>
          </form>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Услуги ({services.length}{hasMore ? '+' : ''})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-3 px-2 font-medium text-slate-500">ID</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Название</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Категория</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Закуп $/1k</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Наценка</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Цена ₽/1k</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Мин–Макс</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Заказы</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Статус</th>
                  <th className="py-3 px-2 font-medium text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => {
                  const sellingPrice = calcSellingPrice(s.rate, s.markup, USD_TO_RUB);
                  const roundedPrice = applyBeautifulRounding(sellingPrice);
                  const margin = ((s.markup - 1) * 100).toFixed(0);
                  const isBelowSafety = s.markup < SAFETY_MULTIPLIER;

                  return (
                    <tr key={s.id} className={`border-b border-slate-100 hover:bg-slate-50 ${!s.isActive ? 'opacity-50' : ''} ${isBelowSafety ? 'bg-red-50/50' : ''}`}>
                      <td className="py-3 px-2 font-mono text-xs text-slate-600">
                        #{s.numericId}
                        {s.externalId && (
                          <span className="block text-[10px] text-slate-400">ext: {s.externalId}</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs max-w-[200px]">
                        <span className="font-medium truncate block">{s.name}</span>
                        <div className="flex gap-1 mt-0.5">
                          {s.isDripFeedEnabled && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">Drip</span>}
                          {s.isRefillEnabled && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">Refill</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-600">{s.category.name}</td>
                      <td className="py-3 px-2 text-xs font-mono">${s.rate.toFixed(4)}</td>
                      <td className="py-3 px-2">
                        {/* Inline markup edit form */}
                        <form action={updateMarkupAction} className="flex items-center gap-1">
                          <input type="hidden" name="serviceId" value={s.id} />
                          <input
                            type="number"
                            name="markup"
                            step="0.1"
                            min="1.0"
                            max="151.0"
                            defaultValue={s.markup}
                            className="w-16 px-1 py-0.5 text-xs border border-slate-200 rounded text-center"
                          />
                          <button
                            type="submit"
                            className="px-1.5 py-0.5 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100"
                          >
                            ✓
                          </button>
                        </form>
                        <span className={`text-[10px] ${isBelowSafety ? 'text-red-500 font-bold' : 'text-slate-400'}`}>+{margin}%{isBelowSafety ? ' ⚠️' : ''}</span>
                      </td>
                      <td className="py-3 px-2 text-xs font-semibold">
                        {roundedPrice.toFixed(2)} ₽
                        {roundedPrice !== sellingPrice && (
                          <span className="block text-[9px] text-slate-400 font-normal">({sellingPrice.toFixed(2)})</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-500">
                        {s.minQty.toLocaleString('ru-RU')} – {s.maxQty.toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3 px-2 text-xs">{s._count.orders}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {s.isActive ? 'Активна' : 'Выкл'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <form action={toggleServiceAction}>
                          <input type="hidden" name="serviceId" value={s.id} />
                          <input type="hidden" name="isActive" value={s.isActive ? 'false' : 'true'} />
                          <button
                            type="submit"
                            className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                              s.isActive
                                ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {s.isActive ? 'Выкл' : 'Вкл'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      {search ? `Ничего не найдено по "${search}"` : 'Каталог пуст'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(cursor || hasMore) && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
              {cursor ? (
                <Link href={`/admin/catalog?q=${encodeURIComponent(search)}`}
                  className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                  ← В начало
                </Link>
              ) : <div />}
              {hasMore && nextCursor && (
                <Link href={`/admin/catalog?q=${encodeURIComponent(search)}&cursor=${nextCursor}`}
                  className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                  Следующая →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
