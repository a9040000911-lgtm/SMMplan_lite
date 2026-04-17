# SMMplan_lite

## What This Is

SMMplan_lite — это инновационная, легковесная и полностью автоматизированная SMM-панель для перепродажи услуг. Главное отличие продукта: «умная витрина», где клиент просто вставляет ссылку, а система с помощью парсера сама определяет соцсеть (пользователю не нужно выбирать соцсеть вручную, но он всё равно выбирает категорию услуг и саму услугу). Включает в себя автоматическую регистрацию, мощную RBAC-систему ролей, встроенную бухгалтерию, тикетную платформу Enterprise-уровня и полное покрытие налогов и комиссий за счет высокой (>300%) маржи.

## Core Value

Бесшовный и моментальный опыт покупки (Smart URL Matching) для пользователя и абсолютная финансовая прозрачность (Бухгалтерский модуль, предотвращение двойных возвратов, парциальные возвраты) для владельца.

## Current State: v1.0 (SHIPPED)
- **Foundation & Core:** Next.js 16 App Router perfectly integrated with Prisma and SQLite. Magic Link stateless JWT authentication deployed.
- **Smart Analytics:** Smart URL Matching seamlessly identifies links and provides precise internal service catalogs. UI dynamically calculates complex unit metrics.
- **Financial Gateway:** Full-width internal integer math (Cents) blocks mathematical drift. Transactions locked against race-conditions (`db.$transaction()`).
- **Support & CMS:** Omnichannel support tickets with macro capabilities. Safe HTML Tiptap headless CMS for static pages.
- **Marketing:** Volume tier tracking and margin-capped promo-codes guarantee profitability margins.
- **Background Integrity:** Autonomous CRON queues for pushing Best-Effort PENDING orders and pulling Partial Refunds directly into client user balances safely.

## Next Milestone Goals (v2.0)
- Planning B2B Extensibility Modules.
- Integration of multi-lingual capabilities (Deferred from v1).

<details>
<summary>Archived Concept Boundaries</summary>

- [Oauth Social Login (Google/Telegram)] — юридические и технические риски блокировок на территории РФ в 2026 году.
- [Automated API Failover] — автоматическое переключение провайдеров на лету отключается из-за нестабильности (используем только отмену заказов).
- [Сложная геймификация (NPS, Achievements, VIP Guardian)] — утяжеляют систему "Lite", отключены для ускорения и простоты.
- [Telegram Bot для заказов] — Telegram будет использоваться исключительно как интерфейс для Support-тикетов, а не для каталога.
</details>

## Context

Проект строится как "облегченная" и более умная версия энтерпрайз-проекта из папки `D:\Smmplan`.
Запуск предполагается на собственном Ubuntu-сервере в Docker-окружении (монорепозиторий или микросервисы в контейнерах). Интеграция UI будет производиться с учетом современного стека, рефакторинга адаптивности из старого проекта с применением инструментов вроде Stitch MCP. Валюта проекта — исключительно RUB, наценки — от 300%.

## Constraints

- **[Tech Stack]**: Next.js 16.0.10, React 19.0.0, Tailwind CSS 4.0.0, ESLint 10.0.0 (Flat Config), TypeScript 5.7+ — строгий стандарт по глобальным User Rules.
- **[Deployment]**: Docker на Ubuntu VPS — выбранный пользователем подход деплоя инфраструктуры.
- **[Currency]**: Строго RUB во всех расчетах — упрощение биллинга и интерфейса.
- **[Data Integrity]**: Предотвращение Race Conditions — недопустим "двойной возврат средств" (Admin refund + API Provider Refund). Идемпотентность статуса заказа обязательна.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Цена за 1 штуку, а не 1000 | Удобство восприятия клиентом, возможность скрыть гигантскую маржу за низкими абсолютными цифрами (копейками) | — Pending |
| Отказ от Failover | Упрощение State Machine обработки заказов и повышение стабильности БД. | — Pending |
| Комиссии берет на себя система | "Чистый" UX для клиента при пополнении, конверсия в платеж выше. | — Pending |

---
*Last updated: 2026-04-16 after project initialization.*
