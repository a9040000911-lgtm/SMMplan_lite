"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Как оформить заказ?",
    a: "Выберите платформу, тип услуги и количество. Укажите email для получения чека и доступа к заказам. Оплатите удобным способом — заказ запустится автоматически.",
  },
  {
    q: "Нужна ли регистрация?",
    a: "Нет. Просто укажите email — мы автоматически создадим аккаунт. Все заказы будут доступны по этому email в личном кабинете.",
  },
  {
    q: "Какие способы оплаты доступны?",
    a: "Банковские карты (Visa, MasterCard, МИР), СБП, электронные кошельки и криптовалюта (через CryptoBot).",
  },
  {
    q: "Безопасна ли накрутка для аккаунта?",
    a: "Да. Мы используем плавную подачу (Drip-Feed) — подписчики приходят постепенно, имитируя естественный рост. Это безопасно для вашего аккаунта.",
  },
  {
    q: "Что если будут отписки?",
    a: "На услуги с гарантией мы предоставляем бесплатную замену в течение гарантийного периода. Система автоматически отслеживает отписки.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-16 md:py-20">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          Частые вопросы
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          Всё, что нужно знать перед заказом
        </p>
      </div>

      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-colors"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-5 py-4 flex justify-between items-center gap-4"
            >
              <span className="text-sm font-medium text-slate-800">
                {item.q}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-4 -mt-1">
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
