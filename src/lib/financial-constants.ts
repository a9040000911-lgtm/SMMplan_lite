/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * 
 * ЕДИНЫЙ ИСТОЧНИК ФИНАНСОВЫХ КОНСТАНТ ПЛАТФОРМЫ
 * =============================================
 * Все налоговые ставки, комиссии и наценки определяются ТОЛЬКО здесь.
 * Любой другой файл ОБЯЗАН импортировать константы из этого модуля.
 * 
 * Правовая основа: УСН 6% + НДС 5% (спецставка), ФЗ №176-ФЗ
 * Верифицировано: апрель 2026
 */

// ═══════════════════════════════════════════════════════
// 💰 НАЛОГИ (Россия, 2026)
// ═══════════════════════════════════════════════════════

/** УСН «Доходы» — 6% с полной суммы поступления (до вычета комиссий) */
export const TAX_USN_INCOME_RATE = 0.06;

/** НДС спецставка для УСН при обороте 20–272.5 млн руб./год */
export const TAX_VAT_USN_SPECIAL_RATE = 0.05;

// ═══════════════════════════════════════════════════════
// 💳 ЭКВАЙРИНГ (Payment Gateways)
// ═══════════════════════════════════════════════════════

/** YooKassa — карты РФ (safe-константа, верхняя граница 2.8–3.5%) */
export const ACQUIRING_YOOKASSA_CARDS = 0.035;

/** Safe-константа для расчётов: максимальная комиссия шлюза */
export const ACQUIRING_SAFE_MAX = 0.035;

// ═══════════════════════════════════════════════════════
// 📊 НАЦЕНКИ (Markup)
// ═══════════════════════════════════════════════════════

/**
 * Абсолютный нижний порог защиты (Safety Floor) для ЛЮБЫХ транзакций.
 * 1.0 = 100% наценка поверх себестоимости (множитель x2).
 * Система хард-локнет любой заказ, если итоговая грязная наценка упадет ниже этого.
 */
export const SAFETY_FLOOR_MARKUP = 1.0;

/** Максимальный множитель наценки (x151 = 15000%) */
export const MAX_MARKUP_MULTIPLIER = 151.0;

/** L-07: Максимальная суммарная скидка (Loyalty + Promo) в процентах.
 *  Предотвращает стекинг до 50–60% и продажу ниже себестоимости. */
export const MAX_TOTAL_DISCOUNT = 30;

// ═══════════════════════════════════════════════════════
// 🌐 ВАЛЮТА
// ═══════════════════════════════════════════════════════

/** Внутренний курс для конвертации закупочных цен провайдеров (временно константа до внедрения GlobalSettings) */
export const USD_TO_RUB = 95;

/** Буфер на банковский спред при конвертации USD → RUB */
export const CURRENCY_SPREAD_BUFFER = 0.03;

// ═══════════════════════════════════════════════════════
// 📐 SYNC ENGINE
// ═══════════════════════════════════════════════════════

/** Anti-Jitter: порог минимального изменения цены при синхронизации.
 *  Изменения < 5% от текущей цены игнорируются для стабильности витрины. */
export const SYNC_JITTER_THRESHOLD = 0.05;

/** Anomaly Detector: изменение rate > 20% считается аномалией и генерирует алерт */
export const SYNC_ANOMALY_THRESHOLD = 0.20;

// ═══════════════════════════════════════════════════════
// 🪜 PRICING LADDER (Лестница наценок по умолчанию)
// ═══════════════════════════════════════════════════════

export interface LadderLevel {
  /** Верхняя граница закупочной цены (RUB/1000) для этого уровня */
  threshold: number;
  /** Множитель наценки */
  multiplier: number;
  /** Фиксированная надбавка в RUB (для micro-услуг) */
  fixedMarkup: number;
}

/**
 * Лестница наценок v1 для Smmplan Lite.
 * Адаптивная: дешёвые услуги получают высокий множитель,
 * дорогие — умеренный. fixedMarkup = 0 для простоты на старте.
 * 
 * cost (RUB/1k) → multiplier → Пример ($0.01 → 0.95₽ по курсу 95)
 * < 1₽           → x50       → 50₽ (вместо 3₽ при flat x3)
 * 1–10₽          → x11       → 110₽ максимум
 * 10–50₽         → x8        → 400₽ максимум
 * 50–150₽        → x6        → 900₽ максимум
 * > 150₽         → x4        → масштабируемо
 */
export const DEFAULT_PRICING_LADDER: LadderLevel[] = [
  { threshold: 1,        multiplier: 50, fixedMarkup: 0 },
  { threshold: 10,       multiplier: 11, fixedMarkup: 0 },
  { threshold: 50,       multiplier: 8,  fixedMarkup: 0 },
  { threshold: 150,      multiplier: 6,  fixedMarkup: 0 },
  { threshold: Infinity, multiplier: 4,  fixedMarkup: 0 },
];

// ═══════════════════════════════════════════════════════
// 🧮 ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ
// ═══════════════════════════════════════════════════════

/** Суммарные налоги с выручки (УСН + НДС спецставка) */
export const TOTAL_TAX_FROM_REVENUE = TAX_USN_INCOME_RATE + TAX_VAT_USN_SPECIAL_RATE; // 0.11

/** Суммарные обязательные отчисления с выручки (Налоги + Эквайринг) */
export const TOTAL_MANDATORY_DEDUCTIONS = TOTAL_TAX_FROM_REVENUE + ACQUIRING_SAFE_MAX; // 0.145

/**
 * Вычисляет минимальную розничную цену, гарантирующую покрытие налогов,
 * эквайринга и целевую маржу поверх себестоимости провайдера.
 * 
 * Формула: SafetyPrice = Cost × (1 + SAFETY_FLOOR_MARKUP) / (1 − TOTAL_MANDATORY_DEDUCTIONS)
 * При defaults: cost × 2.0 / 0.855 ≈ cost × 2.34
 * 
 * @param providerCostCents — себестоимость провайдера в ЦЕНТАХ
 * @returns минимальная допустимая розничная цена в ЦЕНТАХ
 */
export function calculateSafetyFloorCents(providerCostCents: number): number {
  if (providerCostCents <= 0) return 0;
  const safetyCents = (providerCostCents * (1 + SAFETY_FLOOR_MARKUP)) / (1 - TOTAL_MANDATORY_DEDUCTIONS);
  return Math.ceil(safetyCents); // Округляем вверх до целого цента
}

/**
 * Применяет Pricing Ladder к закупочной цене.
 * Находит подходящий уровень и возвращает розничную цену.
 * 
 * @param providerCostRubPer1000 — цена провайдера в RUB за 1000 (float)
 * @param ladder — лестница наценок (по умолчанию DEFAULT_PRICING_LADDER)
 * @returns розничная цена в RUB за 1000
 */
export function applyPricingLadder(
  providerCostRubPer1000: number,
  ladder: LadderLevel[] = DEFAULT_PRICING_LADDER
): number {
  if (providerCostRubPer1000 <= 0) return 0;
  
  const level = ladder.find(l => providerCostRubPer1000 < l.threshold) || ladder[ladder.length - 1];
  const rawPrice = providerCostRubPer1000 * level.multiplier + level.fixedMarkup;
  
  // Добавляем буфер платежного шлюза
  const withGateway = rawPrice * (1 + ACQUIRING_SAFE_MAX);
  
  return withGateway;
}

/**
 * Психологическое округление розничных цен.
 * Для цен < 1000₽/1000 — округляем до кратного 10 вверх.
 * Для цен ≥ 1000₽/1000 — округляем до кратного 100 вверх.
 * 
 * @param priceRubPer1000 — цена в RUB за 1000
 * @returns красиво округлённая цена
 */
export function applyBeautifulRounding(priceRubPer1000: number): number {
  if (priceRubPer1000 <= 0) return 0;
  
  if (priceRubPer1000 < 1000) {
    return Math.ceil(priceRubPer1000 / 10) * 10;
  }
  return Math.ceil(priceRubPer1000 / 100) * 100;
}
