## Current Milestone: v3.1 (Post-MVP Enhancements)

**Goal:** Resolve technical debt from the accelerated MVP launch, finalize V2 features, and prepare for production deployment.

**Target features:**
- Implement Phase 2: Production Hardening (Docker, CI/CD, Linux Migration).
- E2E Testing for complete Admin flows (Playwright implementation).

## Current State: v3.0 (SHIPPED)
- **v1.0 Foundation:** Next.js 16 App Router, Prisma, JWT auth, Smart URL Matching, Integer Math, CMS, Volume Tiers, CRON queues.
- **v2.0 B2B API:** Fully working API v2 (services, add, status, balance, refill, cancel). 317 lines, production-ready.
- **v3.0 Admin Panel MVP & Infrastructure:** 8-tab comprehensive dashboard (Orders, Clients, Catalog, Tickets, Finance, Settings, Dashboards, Refills). Strict RBAC (OWNER/ADMIN/MANAGER/SUPPORT). Features: 
  - Omni-Search & Partial Refunds
  - Financial Ledger & Escrow Quarantine UI (Phase 6 implementation)
  - Deep Settings Sub-sections (Phase 7 implementation)
  - Next.js 16.2.4 Build Invatiant Bug Bypassed (via force-dynamic)

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
