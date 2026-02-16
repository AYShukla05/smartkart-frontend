# SmartKart Frontend

The Angular storefront for SmartKart — a multi-vendor e-commerce platform where buyers shop, sellers manage products, and admins handle categories. Built with Angular 20, Tailwind CSS, and signal-based state management.

**Live App:** https://smartkart-frontend.pages.dev
**Backend Repo:** [smartkart-backend](https://github.com/AYShukla05/smartkart-backend)
**API Docs:** https://smartkart-backend-p74d.onrender.com/api/docs/

> **Note:** The backend runs on Render's free tier and sleeps after inactivity. The first request may take up to 60 seconds to wake up — subsequent requests are fast.

---

## Try It Out

1. Open the [live app](https://smartkart-frontend.pages.dev) and register as a **Seller**
2. Create a product with images from the seller dashboard
3. Open an incognito/private window and register as a **Buyer**
4. Browse products, add to cart, and checkout
5. Switch back to the seller window — the order appears in seller orders with revenue stats updated

---

## What It Does

Three role-based experiences in one app:

- **Buyers** — Browse products (search, filter, sort), add to cart, checkout, view order history
- **Sellers** — Dashboard with revenue stats, full product CRUD with S3 image uploads, view incoming orders
- **Admins** — Manage product categories

The app handles JWT authentication with automatic token refresh, role-based route guards, and a server-synced shopping cart with optimistic UI updates.

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
For an app of this size, NgRx would be over-engineering. Angular's built-in signals provide reactive state (`signal()`, `computed()`) without the boilerplate of actions, reducers, and effects. RxJS is still used where it shines — HTTP calls, search debouncing, and token refresh queuing — but not for state management.

### Optimistic cart updates
When a buyer changes quantity or removes an item, the UI updates instantly. The API call happens in the background. If it fails, the cart rolls back to the previous state and shows an error toast. This makes the cart feel instant while keeping the server as the source of truth.

### Client-side WebP conversion
Before uploading product images to S3, the frontend converts them to WebP format using canvas. This reduces image sizes by ~30-50% without any backend processing, keeping S3 storage costs low and page loads fast.

### HTTP interceptor with refresh queuing
The auth interceptor doesn't just attach Bearer tokens — it handles 401 responses by refreshing the access token and retrying the failed request. If multiple requests fail simultaneously, they queue behind a single refresh call rather than triggering multiple refresh attempts.

### OnPush everywhere
Every component uses `ChangeDetectionStrategy.OnPush`. Combined with signals (which notify Angular of changes automatically), this means Angular only re-renders components when their inputs or signals actually change — not on every event.

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
│   └── categories/      # Category service
├── features/            # Route-level components (lazy loaded)
│   ├── auth/            # Login, Register
│   ├── home/            # Landing page
│   ├── products/        # Browse and detail views
│   ├── cart/            # Cart with checkout
│   ├── orders/          # Order history, detail, confirmation
│   ├── seller/          # Dashboard, product CRUD, orders
│   └── admin/           # Category management
├── layouts/             # Page layout wrapper
└── shared/              # Reusable components (Navbar, Pagination, Toast, ConfirmModal)
```

All components are standalone — no NgModules. Routes use `loadComponent()` for code splitting.

---

## Routing & Access Control

```
Public        /products, /products/:id, /login, /register
Buyer only    /cart, /orders, /orders/:id, /orders/success/:id
Seller only   /seller, /seller/products, /seller/products/new, /seller/products/:id/edit, /seller/orders
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

## Local Setup

```bash
git clone git@github.com:AYShukla05/smartkart-frontend.git
cd smartkart-frontend
npm install
ng serve
```

Runs at http://localhost:4200. Expects the backend at http://localhost:8000.

---

## What I'd Do Next

- **Testing** — Component tests for cart interactions, guard logic, and interceptor behavior using Angular's testing utilities
- **Accessibility** — ARIA labels on interactive elements, keyboard navigation for product grid, screen reader support for cart updates
- **Mobile UX** — Responsive hamburger nav, touch-friendly cart controls, bottom sheet for mobile filters
- **Error boundaries** — Graceful fallback UI for failed API calls instead of blank screens
