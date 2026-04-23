"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function LegalFooter() {
  const [cookieConsent, setCookieConsent] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) setCookieConsent(false);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "true");
    setCookieConsent(true);
  };

  return (
    <>
      <footer className="mt-auto relative z-10 p-6 md:p-8 bg-zinc-50 border-t border-zinc-200 text-zinc-500 shadow-inner">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
          <div className="flex flex-col gap-2 max-w-2xl text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded text-xs">
                18+
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Информация не является публичной офертой (ст. 437 ГК РФ)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
               В соответствии с ФЗ-38 и ФЗ-152, продолжая использование сайта, вы даете согласие на обработку персональных данных.
               Сервис не является частью Instagram™, Telegram™ или других упомянутых сервисов. Все торговые марки использованы исключительно в целях идентификации (информационных целях).
            </p>
          </div>

          <div className="flex gap-4 text-xs font-medium uppercase tracking-wide flex-wrap justify-center">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors underline underline-offset-4">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors underline underline-offset-4">Пользовательское соглашение</Link>
          </div>
        </div>
      </footer>

      {!cookieConsent && (
        <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:w-[400px] bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl z-50 text-slate-300">
          <p className="text-sm mb-4">
            Мы используем файлы cookie. Это помогает сайту работать лучше.
          </p>
          <div className="flex gap-2">
            <button
              onClick={acceptCookies}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-sm transition-colors flex-1"
            >
              Принять
            </button>
          </div>
        </div>
      )}
    </>
  );
}
