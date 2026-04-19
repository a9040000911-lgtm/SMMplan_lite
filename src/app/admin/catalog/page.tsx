import { adminCatalogService } from '@/services/admin/catalog.service';
import { updateMarkupAction, toggleServiceAction } from '@/actions/admin/catalog';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import {
  Card as HeroCard,
  CardContent,
  Button as HeroButton
} from "@heroui/react";
import { CatalogTable } from './client-table';
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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-sky-500" /> Каталог услуг
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Всего: {stats.totalServices} • Активных: {stats.activeServices} • Категорий: {stats.categories}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/providers">
            <HeroButton variant="secondary" className="font-medium">
              Настройка панелей
            </HeroButton>
          </Link>
          <Link href="/admin/catalog/categories">
            <HeroButton variant="primary" className="font-medium shadow-sm">
              Категории
            </HeroButton>
          </Link>
        </div>
      </div>

      {/* Markup Analytics Compact Strip using HeroUI Card */}
      <HeroCard className="shadow-sm border border-default-200">
        <CardContent className="flex flex-row flex-wrap items-center gap-x-6 gap-y-3 p-4 text-sm">
          <div className="flex items-center gap-2 pr-6 border-r border-default-200 font-semibold tabular-nums">
            <ShoppingCart className="w-4 h-4 text-default-400" /> {markupAnalytics.stats.total} Услуг
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(243,18,96,0.4)]" /> 
            <span className="text-default-500">Убыток:</span> 
            <strong className="tabular-nums">{markupAnalytics.stats.loss}</strong>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-warning" /> 
             <span className="text-default-500">Тонкая:</span> 
             <strong className="tabular-nums">{markupAnalytics.stats.thin}</strong>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-success" /> 
             <span className="text-default-500">Норма:</span> 
             <strong className="tabular-nums">{markupAnalytics.stats.normal}</strong>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-primary" /> 
             <span className="text-default-500">Высокая:</span> 
             <strong className="tabular-nums">{markupAnalytics.stats.high}</strong>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-secondary" /> 
             <span className="text-default-500">Топ:</span> 
             <strong className="tabular-nums">{markupAnalytics.stats.extreme}</strong>
          </div>
        </CardContent>
      </HeroCard>

      {markupAnalytics.stats.loss > 0 && (
        <div className="rounded-lg border border-rose-200/50 bg-rose-50/50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-rose-800 mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 
            Услуги с наценкой ниже Safety Floor (убыточные после налогов):
          </h3>
          <div className="text-sm text-slate-600 space-y-1.5 pl-3.5">
            {markupAnalytics.worstServices.slice(0, 5).map(ws => (
              <div key={ws.id}>
                &bull; <strong className="text-slate-800">{ws.name}</strong> 
                <span className="text-rose-600 font-medium ml-1">— x{ws.markup.toFixed(1)}</span> 
                <span className="text-slate-400"> (нужно мин. x{SAFETY_MULTIPLIER.toFixed(1)}) </span> 
                <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1">{ws.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exchange Rate Info */}
      <div className="text-xs text-slate-400 text-right">
        💱 Курс USD/RUB: {USD_TO_RUB.toFixed(2)} (из настроек)
      </div>

      {/* Search */}
      <HeroCard className="mb-4 shadow-sm border border-default-200">
        <CardContent className="p-4">
          <form className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="🔍 Поиск по названию или ID..."
              className="flex-1 px-4 py-2 text-sm border border-default-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-default-50"
            />
            <HeroButton type="submit" variant="primary">Найти</HeroButton>
          </form>
        </CardContent>
      </HeroCard>
      <CatalogTable services={services} />

      {/* Pagination / Table Footer */}
      {(cursor || hasMore) && (
        <div className="flex justify-between items-center bg-default-50/50 px-4 py-3 border border-default-200 mt-4 rounded-lg">
          {cursor ? (
            <Link href={`/admin/catalog?q=${encodeURIComponent(search)}`}
              className="px-3 py-1.5 text-xs font-semibold text-default-600 bg-background border border-default-300 rounded hover:bg-default-100 shadow-sm transition-all">
              ← В начало
            </Link>
          ) : <div />}
          {hasMore && nextCursor && (
            <Link href={`/admin/catalog?q=${encodeURIComponent(search)}&cursor=${nextCursor}`}
              className="px-3 py-1.5 text-xs font-semibold text-default-700 bg-background border border-default-300 rounded hover:bg-default-100 shadow-sm transition-all">
              Дальше →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
