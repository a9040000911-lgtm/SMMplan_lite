'use client';

import { Table, ProgressBar, Button as HeroButton } from "@heroui/react";
import { updateMarkupAction, toggleServiceAction } from '@/actions/admin/catalog';
import { TOTAL_MANDATORY_DEDUCTIONS, SAFETY_FLOOR_MARKUP, applyBeautifulRounding } from '@/lib/financial-constants';

const USD_TO_RUB = 95;
const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcSellingPrice(ratePerK: number, markup: number, usdToRub: number): number {
  return ratePerK * markup * usdToRub;
}

export function CatalogTable({ services }: { services: any[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Каталог услуг"
          className="shadow-sm border border-default-200 overflow-hidden"
        >
          <Table.Header>
            <Table.Column>ID</Table.Column>
            <Table.Column>УСЛУГА</Table.Column>
            <Table.Column className="hidden md:table-cell">КАТЕГОРИЯ</Table.Column>
            <Table.Column className="text-right hidden sm:table-cell">ЗАКУП ($/1K)</Table.Column>
            <Table.Column>ДИНАМИКА НАЦЕНКИ</Table.Column>
            <Table.Column className="text-right">ИТОГ (₽)</Table.Column>
            <Table.Column className="text-right hidden lg:table-cell">ЛИМИТЫ</Table.Column>
            <Table.Column className="text-right hidden sm:table-cell">ЗАКАЗЫ</Table.Column>
            <Table.Column className="text-right">УПРАВЛЕНИЕ</Table.Column>
          </Table.Header>
          <Table.Body>
            {services.map((s: any) => {
              const sellingPrice = calcSellingPrice(s.rate, s.markup, USD_TO_RUB);
              const roundedPrice = applyBeautifulRounding(sellingPrice);
              const margin = ((s.markup - 1) * 100).toFixed(0);
              const isBelowSafety = s.markup < SAFETY_MULTIPLIER;

              const progressValue = Math.min((s.markup / 5) * 100, 100);
              const progressColor = isBelowSafety ? "danger" : (s.markup > 3 ? "success" : "warning");

              return (
                <Table.Row key={s.id} className={`transition-colors ${!s.isActive ? 'opacity-60 bg-default-50' : 'bg-background hover:bg-slate-50/50'}`}>
                  <Table.Cell>
                    <span className="font-mono text-xs tabular-nums text-default-500">#{s.numericId}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="max-w-[200px]">
                      <span className={`font-semibold truncate block text-xs ${!s.isActive ? 'text-default-500' : 'text-foreground'}`}>{s.name}</span>
                      {s.externalId && (
                        <div className="text-[10px] text-default-400 mt-1">Provider ID: {s.externalId}</div>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="hidden md:table-cell">
                    <span className="text-xs text-default-500">{s.category?.name || "Без категории"}</span>
                  </Table.Cell>
                  <Table.Cell className="hidden sm:table-cell">
                    <span className="font-mono text-xs tabular-nums text-default-600">${s.rate.toFixed(4)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-start gap-4 whitespace-nowrap">
                      <form action={updateMarkupAction}>
                        <input type="hidden" name="serviceId" value={s.id} />
                        <input
                          type="number"
                          name="markup"
                          step="0.1"
                          min="1.0"
                          max="151.0"
                          defaultValue={s.markup}
                          className={`w-16 px-1.5 py-1 text-xs font-mono border rounded outline-none transition-colors tabular-nums
                            ${isBelowSafety ? 'border-danger-300 bg-danger-50 text-danger-900' : 'border-default-200 bg-transparent focus:border-primary'}
                          `}
                        />
                      </form>
                      <div className="flex flex-col gap-1.5 w-24 pt-1">
                        <ProgressBar
                          value={progressValue}
                          size="sm"
                          color={progressColor}
                          aria-label="Наценка"
                          className="bg-default-100"
                        />
                        <span className={`text-[10px] font-medium leading-none ${isBelowSafety ? "text-danger" : "text-default-400"}`}>
                          {isBelowSafety ? `Пол x${SAFETY_MULTIPLIER.toFixed(1)}` : `Маржа +${margin}%`}
                        </span>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="text-xs text-right tabular-nums">
                      <div className="font-semibold">{roundedPrice.toFixed(2)} ₽</div>
                      {roundedPrice !== sellingPrice && (
                        <div className="text-[10px] text-default-400 mt-0.5 line-through decoration-default-300">{sellingPrice.toFixed(2)}</div>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="hidden lg:table-cell">
                    <span className="text-xs text-default-500 tabular-nums whitespace-nowrap">
                      {s.minQty.toLocaleString('ru-RU')} – {s.maxQty.toLocaleString('ru-RU')}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="hidden sm:table-cell">
                    <span className="text-xs font-medium text-default-600 tabular-nums">
                      {s._count?.orders?.toLocaleString('ru-RU') || 0}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <form action={toggleServiceAction}>
                      <input type="hidden" name="serviceId" value={s.id} />
                      <input type="hidden" name="isActive" value={s.isActive ? 'false' : 'true'} />
                      <HeroButton
                        type="submit"
                        size="sm"
                        variant={s.isActive ? "outline" : "secondary"}
                        className="text-[11px] font-semibold"
                      >
                        {s.isActive ? 'Отключить' : 'Включить'}
                      </HeroButton>
                    </form>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
