import { Header } from "@/components/landing/Header";
import { HeroCalculator } from "@/components/landing/HeroCalculator";
import { FAQ } from "@/components/landing/FAQ";
import { PriceTable } from "@/components/landing/PriceTable";
import { getPublicCatalogAction } from "@/actions/order/catalog";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  Waves,
  ShieldCheck,
  Brain,
  Crown,
  ArrowRight,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalogResult, session] = await Promise.all([
    getPublicCatalogAction(),
    verifySession(),
  ]);
  const catalog =
    catalogResult.success && catalogResult.data ? catalogResult.data : [];

  let defaultEmail = "";
  if (session?.userId) {
    const u = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (u) defaultEmail = u.email;
  }

  return (
    <main className="min-h-screen bg-white antialiased">
      <Header />

      {/* ═══ Hero + Calculator ═══ */}
      <HeroCalculator initialCatalog={catalog} initialEmail={defaultEmail} />

      {/* ═══ How it works ═══ */}
      <section id="how" className="bg-slate-50/80 border-y border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              Как это работает
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Три простых шага до результата
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                num: "01",
                title: "Выберите услугу",
                desc: "Укажите платформу и тип. Или просто вставьте ссылку — система определит всё сама.",
                gradient: "from-blue-500 to-indigo-500",
              },
              {
                num: "02",
                title: "Оформите заказ",
                desc: "Укажите количество и email. Оплатите удобным способом. Регистрация не нужна.",
                gradient: "from-indigo-500 to-violet-500",
              },
              {
                num: "03",
                title: "Получите результат",
                desc: "Запуск за 4 секунды. Плавная подача для естественного роста аудитории.",
                gradient: "from-violet-500 to-purple-500",
              },
            ].map((s) => (
              <div
                key={s.num}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} text-white text-sm font-bold mb-4`}
                >
                  {s.num}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Why us ═══ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            Почему выбирают нас
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            Технологии, которые работают за вас
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Waves,
              title: "Плавный рост",
              desc: "Drip-Feed подача — подписчики приходят постепенно, неотличимо от органики.",
              color: "bg-blue-50 text-blue-600",
            },
            {
              icon: ShieldCheck,
              title: "Гарантия от отписок",
              desc: "Бесплатная замена при отписках в течение гарантийного периода.",
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              icon: Brain,
              title: "AI-подбор услуг",
              desc: "Вставьте ссылку — система определит платформу и подберёт оптимальный пакет.",
              color: "bg-violet-50 text-violet-600",
            },
            {
              icon: Crown,
              title: "Программа лояльности",
              desc: "Чем больше заказов — тем ниже цены. До 15% скидки для постоянных.",
              color: "bg-amber-50 text-amber-600",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ Prices ═══ */}
      <div className="bg-slate-50/80 border-y border-slate-100">
        <PriceTable catalog={catalog} />
      </div>

      {/* ═══ FAQ ═══ */}
      <FAQ />

      {/* ═══ Final CTA ═══ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12 md:py-16">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl shadow-blue-500/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Готовы начать?
          </h2>
          <p className="text-blue-100 text-sm mb-6">
            Первый заказ со скидкой — промокод{" "}
            <span className="font-mono font-bold bg-white/20 rounded px-1.5 py-0.5">
              START10
            </span>
          </p>
          <a
            href="#top"
            className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-shadow"
          >
            Оформить заказ <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">
                  SMMplan <span className="text-blue-600">Lite</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Сервис продвижения в социальных сетях.
                <br />
                Быстро, безопасно, с гарантией.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Навигация
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#how" className="hover:text-blue-600 transition-colors">Как это работает</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Цены</a></li>
                <li><a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a></li>
                <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Личный кабинет</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Информация
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="/terms" className="hover:text-blue-600 transition-colors">Оферта</a></li>
                <li><a href="/privacy" className="hover:text-blue-600 transition-colors">Политика конфиденциальности</a></li>
                <li>support@smmplan.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-8 pt-6 text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} SMMplan. Все права защищены.
          </div>
        </div>
      </footer>
    </main>
  );
}
