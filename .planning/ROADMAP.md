# Roadmap: SMMplan_lite

## Overview

SMMplan_lite is an automated, smart SMM panel optimized for high margins with no automatic failover, smart link analysis, and embedded financial control. This roadmap covers the initial Greenfield development pipeline from authentication foundations to final B2C marketing features.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation & Authentication** - Next.js setup + Magic Link Auth
- [ ] **Phase 2: Smart Ordering & Frontend** - Port Smart Analyzer, catalog integration
- [ ] **Phase 3: Order Processor & API Integrations** - YooKassa + Crypto + Providers
- [ ] **Phase 4: Financial Accounting Module** - OPEX, Taxes, Dashboards
- [ ] **Phase 5: RBAC & Enterprise Support** - Roles, Tickets, Omnichannel
- [ ] **Phase 6: Marketing & Loyalty** - Promocodes, Tiered Discounts

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Establish the basic Next.js 16 app shell, Prisma database schema, and implement automatic user generation & Magic Link login.
**Depends on**: Nothing
**Requirements**: [AUTH-01, AUTH-02, AUTH-03]
**Success Criteria** (what must be TRUE):
  1. The DB schema supports users and basic sessions.
  2. A user can request a Magic Link and successfully authenticate.
  3. Session is securely maintained.
**Plans**: TBD

### Phase 2: Smart Ordering & Frontend
**Goal**: Integrate the Smart Link Analyzer ported from D:\Smmplan and build the frontend interface for orders.
**Depends on**: Phase 1
**Requirements**: [ORD-01, ORD-02, ORD-03, ORD-04, ORD-05]
**Success Criteria** (what must be TRUE):
  1. The link analyzer correctly identifies the social network and renders available services.
  2. Prices are displayed and mathematically calculated "per 1 unit".
  3. The Mass Order block formats text properly to standard payload limits.
**Plans**: TBD

### Phase 3: Order Processor & API Integrations
**Goal**: Integrate the external APIs (payment gateways and SMM providers) with strict order state idempotency.
**Depends on**: Phase 2
**Requirements**: [CORE-01, CORE-02, CORE-03, CORE-04, CORE-05]
**Success Criteria** (what must be TRUE):
  1. Orders placed via the frontend deduct the exact correct balance.
  2. Gateway webhooks correctly top up the user's balance without adding additional commissions.
  3. API Sync Worker properly changes order statuses (including accurate Math for Partial Refunds).
**Plans**: TBD

### Phase 4: Financial Accounting Module
**Goal**: Build the deep financial calculation dashboard for administrators and set up tax deductions logic.
**Depends on**: Phase 3
**Requirements**: [FIN-01, FIN-02]
**Success Criteria** (what must be TRUE):
  1. Financial metrics (OPEX, Gross, Net, COGS) precisely reflect all database transactions.
  2. Tax thresholds deduct appropriately on the Admin metrics displays.
**Plans**: TBD

### Phase 5: RBAC & Enterprise Support
**Goal**: Restrict pages by Roles and build the Omnichannel ticketing system (Web + TG + Email) and internal CMS.
**Depends on**: Phase 3
**Requirements**: [SUP-01, SUP-02, SUP-03, SUP-04, SUP-05, SUP-06]
**Success Criteria** (what must be TRUE):
  1. The UI blocks paths for non-Admins (e.g., SEO, Investor tabs).
  2. Support staff see full order context directly inside any user's ticket UI.
  3. CMS modifies text reliably on the frontend structure.
**Plans**: TBD

### Phase 6: Marketing & Loyalty
**Goal**: Finalize growth tools including promo codes, tiered user discounts and i18n structure routing.
**Depends on**: Phase 5
**Requirements**: [MKT-01, MKT-02, MKT-03]
**Success Criteria** (what must be TRUE):
  1. Activating a promo code adds the specified limit to the checkout deduction properly.
  2. Volume buyers dynamically unlock lower prices per unit.
  3. URL router passes `[locale]` structurally.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 0/0 | Not started | - |
| 2. Smart Ordering & Frontend | 0/0 | Not started | - |
| 3. Order Processor & APIs | 0/0 | Not started | - |
| 4. Financial Accounting | 0/0 | Not started | - |
| 5. RBAC & Enterprise Support | 0/0 | Not started | - |
| 6. Marketing & Loyalty | 0/0 | Not started | - |
