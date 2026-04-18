## Current Milestone: v3.1 (Post-MVP Enhancements)

**Goal:** Resolve technical debt from the accelerated MVP launch, finalize V2 features, and prepare for production deployment.

**Target features:**
- Resolve Next.js 16.2.4 `_global-error` framework bug (monitor Vercel tracker).
- Implement Phase 6: Financial Ledger & Escrow Quarantine UI for Support roles.
- Implement Phase 7: Deep refactoring of Settings page into sub-sections.
- E2E Testing for complete Admin flows.

## Current State: v3.0 (SHIPPED)
- **v1.0 Foundation:** Next.js 16 App Router, Prisma, JWT auth, Smart URL Matching, Integer Math, CMS, Volume Tiers, CRON queues.
- **v2.0 B2B API:** Fully working API v2 (services, add, status, balance, refill, cancel). 317 lines, production-ready.
- **v3.0 Admin Panel MVP:** 8-tab comprehensive dashboard (Orders, Clients, Catalog, Tickets, Finances, Settings, Dashboards, Refills). Strict RBAC (OWNER/ADMIN/MANAGER/SUPPORT). Features: Omni-Search, Partial Refunds, Cursor Pagination, In-place Catalog Markup, Telegram Notification Alerts, and CSV Exports.

## Archived Concepts
<details>
<summary>Archived / Future Concept Boundaries</summary>

- [Visual Telegram Bot Builder with Live Emulator] — Отложен до Волны 3. Слишком сложный UI.
- [Programmatic SEO (pSEO)] — Отложен: без реальных данных страницы будут пустыми.
- [Failover Provider Routing] — Отложен: сложная маршрутизация с разными API-форматами.
- [Email Inbound Parsing] — Telegram + Web покрывают 95% обращений.
- [CMS Blog Engine] — Отложен до Волны 2 (Tab 09).
- [Mass Mailing Engine] — Отложен до Волны 3.
- [Enterprise Webhook Subscriptions] — отложено до реальной B2B нагрузки.
- [Oauth Social Login] — юридические риски блокировок в РФ 2026.
- [Сложная геймификация (NPS, Achievements)] — утяжеляет Lite.
</details>
