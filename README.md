# SmartKart Frontend

![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8_strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-41_passing-brightgreen)
![Deployment](https://img.shields.io/badge/deployed-Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white)

The Angular storefront for SmartKart - a multi-vendor e-commerce platform where buyers shop, sellers manage products, and admins handle categories, with two AI-powered chat assistants built on top. Built with Angular 20, Tailwind CSS, and signal-based state management.

**Live App:** https://smartkart-frontend.pages.dev
**Backend Repo:** [smartkart-backend](https://github.com/AYShukla05/smartkart-backend)
**API Docs:** https://smartkart-backend-p74d.onrender.com/api/docs/

> **Note:** The backend runs on Render's free tier and sleeps after inactivity. The first request may take up to 60 seconds to wake up - subsequent requests are fast.

---

### Contents

[Try It Out](#try-it-out) · [What It Does](#what-it-does) · [AI Features](#ai-features) · [Tech Stack](#tech-stack) · [Architecture Decisions](#architecture-decisions) · [Project Structure](#project-structure) · [Routing & Access Control](#routing--access-control) · [State Management](#state-management) · [Testing](#testing) · [Local Setup](#local-setup)

---

## Highlights

- **Three role-based experiences in one app** - buyer, seller, admin - fully standalone components (no NgModules), routed with lazy `loadComponent()` code splitting
- **Two AI chat surfaces**, not bolted-on widgets: a streaming description generator wired directly into the seller's product form, and multi-turn assistants with independently confirmable propose/confirm cards for every AI-suggested change
- **Signals + `OnPush` everywhere** for synchronous UI state, RxJS reserved for what it's actually good at (HTTP, debouncing, refresh-token queuing) - not used as a state-management framework by default
- **41 passing tests** and a clean `tsc --noEmit` under strict TypeScript

---

## Try It Out

1. Open the [live app](https://smartkart-frontend.pages.dev) and register as a **Seller**
2. Create a product with images from the seller dashboard
3. Open an incognito/private window and register as a **Buyer**
4. Browse products, add to cart, and checkout
5. Switch back to the seller window - the order appears in seller orders with revenue stats updated

---

## What It Does

Three role-based experiences in one app:

- **Buyers** - Browse products (search, filter, sort), add to cart, checkout, view order history, chat with an order assistant
- **Sellers** - Dashboard with revenue stats, full product CRUD with S3 image uploads, view incoming orders, chat with a catalog assistant that can propose stock/price/listing changes
- **Admins** - Manage product categories

The app handles JWT authentication with automatic token refresh, role-based route guards, and a server-synced shopping cart with optimistic UI updates.

---

## AI Features

**AI-Assisted Description Generator** - a full listing in seconds, live in the seller's own form.
- Title, description, bullets, and SEO keywords streamed straight into the textarea as the model writes them (Server-Sent Events over `fetch`, since the request is a POST)
- Undo, redo, and discard switch instantly between original and generated text - entirely client-side, no extra API calls

**Semantic Search with Confidence-Aware Results** - surfaces the right products from an everyday description, then shows buyers exactly how confident each match really is.
- "protect my phone screen from cracking" surfaces the right screen-protector products despite not sharing a single word with them
- Confident and weaker "related" matches render as two visually distinct groups, not one undifferentiated list
- A padded fallback set (used when too few results are confident) shows in full on one page instead of paginated - splitting a small fixed-size set serves no purpose

**AI Seller Assistant** - a chat interface for a seller's own catalog, backed by a backend tool-calling agent.
- Chat-bubble shell, deliberately visual-only conversational framing on top of what was originally a strictly single-turn backend - later given genuine multi-turn memory (below)
- Confirm cards render per proposed change (stock/price update, activate/deactivate, create listing), each with its own Confirm / Cancel / Applying… / Confirmed / Error state - a single message proposing two changes renders two independently resolvable cards
- Escape-first Markdown renderer (`core/ai/markdown.util.ts`) turns the model's `**bold**` / lists / code into real HTML without ever trusting unescaped model output
- Conversation memory (last 5 messages) with a "New chat" reset, plus a UI note disclosing the memory limit so a long gap between messages doesn't silently drop context

**Conversational Order Assistant** - a full multi-turn chat for buyers, at `/assistant`.
- Answers order-status and order-history questions, and takes open-ended product questions through the same semantic search used on the storefront
- Genuinely carries `conversation_id` across every message in the session (unlike the seller assistant's original single-turn design) - resets to a fresh conversation on page load, no cross-session persistence
- Reuses the seller assistant's Markdown renderer and confirm-card patterns rather than duplicating them

---

## Tech Stack

| Layer | Technology | Why This Choice |
|---|---|---|
| Framework | Angular 20 | Standalone components, built-in signals, strong typing |
| Language | TypeScript 5.8 (strict) | Strict null checks, no implicit any |
| Styling | Tailwind CSS 4 | Utility-first, no custom CSS framework to maintain |
| State | Angular Signals + RxJS | Signals for UI state (simple, synchronous), RxJS for async flows (API calls, debouncing) |
| Deployment | Cloudflare Pages | Free, global CDN, SPA routing support |

---

## Architecture Decisions

### Signals over NgRx
For an app of this size, NgRx would be over-engineering. Angular's built-in signals provide reactive state (`signal()`, `computed()`) without the boilerplate of actions, reducers, and effects. RxJS is still used where it shines - HTTP calls, search debouncing, and token refresh queuing - but not for state management.

### Optimistic cart updates
When a buyer changes quantity or removes an item, the UI updates instantly. The API call happens in the background. If it fails, the cart rolls back to the previous state and shows an error toast. This makes the cart feel instant while keeping the server as the source of truth.

### Client-side WebP conversion
Before uploading product images to S3, the frontend converts them to WebP format using canvas. This reduces image sizes by ~30-50% without any backend processing, keeping S3 storage costs low and page loads fast.

### HTTP interceptor with refresh queuing
The auth interceptor doesn't just attach Bearer tokens - it handles 401 responses by refreshing the access token and retrying the failed request. If multiple requests fail simultaneously, they queue behind a single refresh call rather than triggering multiple refresh attempts.

### OnPush everywhere
Every component uses `ChangeDetectionStrategy.OnPush`. Combined with signals (which notify Angular of changes automatically), this means Angular only re-renders components when their inputs or signals actually change - not on every event.

### Streaming via `fetch`, not `HttpClient`
The description generator streams Server-Sent Events from a POST endpoint. Angular's `HttpClient` doesn't expose a streaming response body for POST requests, so this one call goes through the native `fetch` API instead, reading the stream chunk by chunk directly into the textarea.

### Propose/confirm cards as their own state machine
Each pending AI-proposed change (`PendingActionEntry`) carries its own `id`, `status`, and `error`, independent of the chat message it rendered from. This is what lets one message with two proposed changes show two cards that confirm, cancel, or error independently instead of the whole message being one atomic unit.

---

## Project Structure

```
src/app/
├── core/                # Singleton services, guards, interceptors
│   ├── api/             # Generic HTTP wrapper
│   ├── auth/            # Auth service, guards, JWT interceptor
│   ├── cart/            # Cart service (optimistic updates)
│   ├── products/        # Product service, S3 image utilities
│   ├── orders/          # Order service (buyer + seller)
│   ├── categories/      # Category service
│   └── ai/              # Seller/buyer assistant services, shared Markdown renderer
├── features/            # Route-level components (lazy loaded)
│   ├── auth/            # Login, Register
│   ├── home/            # Landing page
│   ├── products/        # Browse and detail views
│   ├── cart/            # Cart with checkout
│   ├── orders/          # Order history, detail, confirmation
│   ├── seller/          # Dashboard, product CRUD, orders, AI assistant chat
│   ├── assistant/       # Buyer order assistant chat (/assistant)
│   └── admin/           # Category management
├── layouts/             # Page layout wrapper
└── shared/              # Reusable components (Navbar, Pagination, Toast, ConfirmModal)
```

All components are standalone - no NgModules. Routes use `loadComponent()` for code splitting.

---

## Routing & Access Control

```
Public        /products, /products/:id, /login, /register
Buyer only    /cart, /orders, /orders/:id, /orders/success/:id, /assistant
Seller only   /seller, /seller/products, /seller/products/new, /seller/products/:id/edit, /seller/orders, /seller/assistant
Admin only    /admin/categories
```

Four `CanActivateFn` guards (`guestGuard`, `buyerGuard`, `sellerGuard`, `adminGuard`) enforce access. Guards convert auth signals to observables, wait for initialization, then route or redirect.

---

## State Management

```typescript
// Signals for synchronous reactive state
private readonly _items = signal<CartItem[]>([]);
readonly items = this._items.asReadonly();
readonly itemCount = computed(() =>
  this._items().reduce((sum, item) => sum + item.quantity, 0)
);

// RxJS for async operations
this.searchSubject.pipe(
  debounceTime(300),
  distinctUntilChanged()
).subscribe(term => this.loadProducts(term));
```

| What | How |
|---|---|
| Auth state, cart, toasts | Signals (`signal()`, `computed()`) |
| API calls | RxJS Observables |
| Search input | `Subject` + `debounceTime(300)` |
| Token refresh | `BehaviorSubject` queue |

---

## Testing

**41 tests passing** (`ng test`), plus a clean `tsc --noEmit` run under strict mode. Coverage includes auth state and token-refresh behavior, guard redirects, cart optimistic-update rollback, and the shared Markdown renderer's HTML-escaping (verified against raw `**bold**`/list input before it's ever inserted into the DOM).

---

## Local Setup

```bash
git clone git@github.com:AYShukla05/smartkart-frontend.git
cd smartkart-frontend
npm install
ng serve
```

Runs at http://localhost:4200. Expects the backend at http://localhost:8000.

