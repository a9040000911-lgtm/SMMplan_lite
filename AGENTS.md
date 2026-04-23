# AGENTS.md — Smmplan Lite AI Developer Contract
# Этот файл — единый источник правды для ЛЮБОГО AI-ассистента (Cursor, Claude Code, Gemini, Copilot).
# Все AI-генерируемые изменения ОБЯЗАНЫ соблюдать эти правила.

## Stack
- **Framework**: Next.js 16.0.10 (App Router, Turbopack)
- **UI**: React 19.0.0
- **Styling**: Tailwind CSS 4.0.0 (`@theme` directive в `globals.css`, CSS-first config)
- **Component Library**: HeroUI v3 (dot notation API: `<Table.Header>`, `<Table.Column>`)
- **ORM**: Prisma 5 (PostgreSQL)
- **Language**: TypeScript 5.7+ (strict mode)
- **AI Model**: `gemini-3-flash-preview` или `gemini-3-flash` (ТОЛЬКО эти модели)
- **Linting**: ESLint 10 (Flat Config — `eslint.config.mjs`)
- **Testing**: Vitest 4

## Architecture Rules

### Server/Client Boundary
- Server Components по умолчанию. `'use client'` только при необходимости (hooks, browser APIs).
- Server Actions в `src/actions/` с обязательным `requireAdmin()` guard.
- НИКОГДА не ставить `"use server"` в Page Components — это вызывает crash.

### Design System (CRITICAL)
- **НИКОГДА** не используй inline цвета: `text-white`, `bg-black`, `text-blue-500`.
- **ВСЕГДА** используй semantic tokens из `globals.css`: `text-foreground`, `bg-background`, `bg-card`, `text-primary`, `text-muted-foreground`.
- **НИКОГДА** не добавляй `1px solid` borders между строками таблиц. Используй тональный контраст.
- Все цвета определены в `@theme` блоке `src/app/globals.css`.
- Компоненты максимум 150 строк. Декомпозируй на sub-components.
- Все интерактивные элементы: `transition-all duration-200`.

### Code Editing
- **ПРЕДПОЧИТАЙ** `search-replace` (`multi_replace_file_content`) вместо полной перезаписи файлов.
- **НИКОГДА** не переписывай файл целиком, если нужно изменить < 20 строк.
- Batch независимые операции в параллельные tool calls.

### Debugging
- **СНАЧАЛА** читай ошибки build/runtime, **ПОТОМ** правь код.
- Не гадай — проверяй логи и типы.

### File Structure
```
src/
├── actions/       # Server Actions (requireAdmin guard)
├── app/           # Pages & Layouts (App Router)
├── components/    # React Components
│   ├── admin/     # Admin panel components
│   └── client/    # Client-facing components
├── lib/           # Shared utilities (prisma client, auth)
├── services/      # Business logic services
├── types/         # TypeScript type definitions
└── utils/         # Pure utility functions
```

### Component Conventions
- HeroUI v3 dot notation: `<Table.Header>`, `<Dropdown.Menu>`, `<Modal.Content>`
- Кнопки: используй `variant` prop — не inline стили
- Таблицы: `<Table aria-label="...">` — aria-label обязателен
- Формы: `useActionState()` (React 19) вместо устаревшего `useFormState`

### Import Aliases
- `@/` → `src/`
- Пример: `import { prisma } from '@/lib/prisma'`

## Forbidden Patterns
- ❌ `"use server"` в файлах страниц (`page.tsx`)
- ❌ `forwardRef` (удалён в React 19 — используй прямой `ref` prop)
- ❌ `useFormState` (заменён на `useActionState`)
- ❌ `text-black`, `bg-white` как inline значения
- ❌ Файлы > 300 строк без декомпозиции
- ❌ `any` тип без обоснования в комментарии
- ❌ `console.log` в production коде (используй `console.error` для ошибок)
