# Roadmap: SMMplan_lite

## Overview

SMMplan_lite is an automated, smart SMM panel optimized for high margins with no automatic failover, smart link analysis, and embedded financial control. 
**Current Development Focus:** v2.0 Extensions & Integration (B2B API & i18n).

## Phases

- [x] **v1.0 Milestone History:**
  - Archived: [v1.0 ROADMAP](./milestones/v1.0-ROADMAP.md) | [v1.0 REQUIREMENTS](./milestones/v1.0-REQUIREMENTS.md)

- [ ] **Phase 1: B2B Reseller API Gateway**
- [ ] **Phase 2: Global Architecture (i18n)**

## Phase Details

### Phase 1: B2B Reseller API Gateway
**Goal**: Build public API endpoints allowing third-party panels to buy directly from Smmplan_lite using user balances.
**Depends on**: v1.0 Core
**Requirements**: [B2B-01, B2B-02, B2B-03, B2B-04]
**Success Criteria**:
  1. User can generate an API key from frontend.
  2. External system can post to `/api/v1/order` and successfully deduct balance in cents.
  3. API Service mapping returns a properly formatted JSON compatible with PerfectPanel specs.
**Plans**: TBD

### Phase 2: Global Architecture (i18n)
**Goal**: Restructure App Router rendering limits and extend database models to support multi-language clients.
**Depends on**: Phase 1
**Requirements**: [I18N-01, I18N-02, I18N-03]
**Success Criteria**:
  1. Visiting `/en/catalog` displays english descriptions cleanly.
  2. Session/Cookies strictly save language preference.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. B2B Reseller API Gateway | 0/1 | Not started | - |
| 2. Global Architecture (i18n) | 0/1 | Not started | - |
