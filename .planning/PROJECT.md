## Current Milestone: v2.0 Extensions & Integration

**Goal:** Transform SMMplan_lite from a standalone frontend B2C portal into a scalable B2B architecture via external API accessibility, and prepare global expansion via i18n.

**Target features:**
- B2B Reseller API capabilities (so other panels can buy from us).
- Multilingual localization framework (RU/EN).

## Current State: v1.0 (SHIPPED)
- **Foundation & Core:** Next.js 16 App Router perfectly integrated with Prisma and SQLite. Magic Link stateless JWT authentication deployed.
- **Smart Analytics:** Smart URL Matching seamlessly identifies links and provides precise internal service catalogs. UI dynamically calculates complex unit metrics.
- **Financial Gateway:** Full-width internal integer math (Cents) blocks mathematical drift. Transactions locked against race-conditions (`db.$transaction()`).
- **Support & CMS:** Omnichannel support tickets with macro capabilities. Safe HTML Tiptap headless CMS for static pages.
- **Marketing:** Volume tier tracking and margin-capped promo-codes guarantee profitability margins.
- **Background Integrity:** Autonomous CRON queues for pushing Best-Effort PENDING orders and pulling Partial Refunds directly into client user balances safely.

## Next Milestone Goals (v3.0)
- Advanced Analytics Dashboards (Churn prediction, advanced cohorts).
- Enterprise Webhook Subscriptions.

<details>
<summary>Archived Concept Boundaries</summary>

- [Oauth Social Login (Google/Telegram)] — юридические и технические риски блокировок на территории РФ в 2026 году.
- [Automated API Failover] — автоматическое переключение провайдеров на лету отключается из-за нестабильности (используем только отмену заказов).
- [Сложная геймификация (NPS, Achievements, VIP Guardian)] — утяжеляют систему "Lite", отключены для ускорения и простоты.
- [Telegram Bot для заказов] — Telegram будет использоваться исключительно как интерфейс для Support-тикетов, а не для каталога.
</details>
