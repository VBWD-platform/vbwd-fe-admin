# VBWD Frontend — Admin App

Vue 3 administration backoffice for the VBWD SaaS platform. Provides full control over plans, categories, users, subscriptions, invoices, add-ons, token bundles, plugins, payment methods, analytics, and platform settings. Built on the shared `vbwd-fe-core` component library (included as a git submodule).

Served at `/admin/` (Vite `base: '/admin/'`).

## Features

### Plan Management
- Create, edit, archive tarif plans with name, slug, price, billing period, trial days, description, and feature JSON
- Assign and unassign plan categories (two-panel Available / Assigned layout)
- View subscriber count per plan
- Category column shows assigned category slugs

### Plan Categories
- Hierarchical categories with parent/child relationships
- `is_single` toggle — exclusive (one active sub per user) or open (multiple allowed)
- Create / edit / delete with guards (cannot delete root or category with children)
- Attach and detach plans from a category
- Bulk delete via checkbox selection
- Plans tab and Categories tab on the same Plans page (lazy-loaded)

### Add-on Management
- Create, edit, delete subscription-scoped and global add-ons
- Price, billing period, description, active/archived status
- View active user add-on subscriptions

### Token Bundle Management
- Create, edit, delete token bundles (name, token amount, price)
- Active/archived toggle

### User Management
- Paginated user list with search
- User detail: profile, subscription history, token balance, add-ons
- Edit user profile and roles
- Create manual subscription for a user
- View user's invoices and payment history

### Subscription Management
- List all subscriptions with status, plan, dates
- Subscription detail with full timeline
- Manual status overrides

### Invoice Management
- Paginated invoice list with search and status filter
- Invoice detail with line items and payment reference
- Manual "mark as paid" action

### Analytics
- Revenue over time
- Active subscriber count
- New user signups
- Token usage metrics

### Plugin Management
- List all registered plugins with status
- Enable / disable plugins
- Plugin detail and configuration
- Per-user plugin details (Taro AI prompts, etc.)

### Payment Methods
- Configure enabled payment providers per currency / country
- Payment method form (Stripe keys, PayPal credentials, YooKassa shop ID, etc.)

### Settings
- Company information
- Tax configuration (VAT rates per country)
- Terms and conditions content
- Email / SMTP settings
- Country list management

### Webhooks
- Registered webhook endpoints
- Webhook detail with delivery history

---

## Tech Stack

| | |
|-|-|
| Framework | Vue 3 (Composition API) |
| State | Pinia |
| Router | Vue Router 4 |
| i18n | vue-i18n |
| HTTP | `ApiClient` from `vbwd-view-component` |
| Build | Vite (base: `/admin/`) |
| Tests | Vitest (unit), Playwright (E2E) |

---

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for containerised dev)
- `vbwd-backend` running with admin credentials

---

## Install & Run

### Via monorepo install script (recommended)

Clones, builds, and wires all repos including this one:

```bash
# From vbwd-sdk-2 root:
./recipes/dev-install-ce.sh

# With custom domain and SSL:
./recipes/dev-install-ce.sh --domain myapp.com --ssl
```

### Standalone (manual)

```bash
git clone --recurse-submodules https://github.com/VBWD-platform/vbwd-fe-admin.git
cd vbwd-fe-admin

# Build the shared component library (submodule) first
cd vbwd-fe-core && npm install && npm run build && rm -rf node_modules
cd ..

# Install main app
npm install

# Configure environment
cp .env.example .env   # or create manually (see below)

# Start dev server
npm run dev
```

App available at `http://localhost:5173/admin/` (Vite) or `http://localhost:8081/admin/` (Docker nginx proxy).

---

## Docker

```bash
# Start with Docker Compose (nginx + Vite dev server)
make up
# or
docker compose --profile dev up -d --build
```

The nginx container (port 8081) proxies:
- `/api/` → backend at `http://host.docker.internal:5000`
- everything else → Vite dev server

```bash
# Stop
docker compose down

# View logs
docker compose logs -f
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Base API path — relative, works for any domain via nginx proxy
VITE_API_URL=/api/v1

# Vite dev-server proxy target (only used by `npm run dev`)
VITE_BACKEND_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

For a remote domain:

```env
VITE_API_URL=/api/v1
VITE_BACKEND_URL=https://myapp.com:5000
VITE_WS_URL=wss://myapp.com:5000
```

---

## Production Build

The production Docker image is a two-stage build (builder → nginx). Because Vite is configured with `base: '/admin/'`, assets are served under the `/admin/` path prefix and the nginx config uses an `alias` directive:

```bash
# Build production image
docker build -t vbwd_fe_admin .

# Run (set API_UPSTREAM to your backend service name/address)
docker run -p 8081:80 -e API_UPSTREAM=api:5000 vbwd_fe_admin
```

`API_UPSTREAM` is injected into the nginx config at container startup via `envsubst`. Default: `api:5000`.

---

## Testing

```bash
npm run test          # unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:e2e:ui   # E2E with interactive Playwright UI
npm run lint          # ESLint
```

Test credentials (against seeded backend):
- Admin: `admin@example.com` / `AdminPass123@`

---

## Project Structure

```
vue/
└── src/
    ├── api/           # ApiClient singleton + auth helpers
    ├── i18n/
    │   └── locales/   # en.json
    ├── router/        # Vue Router config (includes /admin/ prefix)
    ├── stores/        # Pinia stores
    │   ├── auth.ts
    │   ├── users.ts
    │   ├── planAdmin.ts
    │   ├── categoryAdmin.ts
    │   ├── subscriptions.ts
    │   ├── invoices.ts
    │   ├── analytics.ts
    │   └── webhooks.ts
    └── views/         # Page components
        ├── Dashboard.vue
        ├── Plans.vue          # Plans + Categories tabs
        ├── PlanForm.vue       # Create / edit plan with category assignment
        ├── CategoryForm.vue   # Create / edit category
        ├── Users.vue
        ├── UserDetails.vue
        ├── Subscriptions.vue
        ├── SubscriptionDetails.vue
        ├── Invoices.vue
        ├── InvoiceDetails.vue
        ├── AddOns.vue
        ├── AddonForm.vue
        ├── PaymentMethods.vue
        ├── Analytics.vue
        ├── Webhooks.vue
        ├── Settings.vue
        └── Login.vue
vbwd-fe-core/          # git submodule — shared component library
```

---

## Plugin Directory

| Plugin | Repository | Description |
|--------|-----------|-------------|
| analytics-widget | [vbwd-fe-admin-plugin-analytics-widget](https://github.com/VBWD-platform/vbwd-fe-admin-plugin-analytics-widget) | Dashboard analytics chart widget |
| cms-admin | [vbwd-fe-admin-plugin-cms-admin](https://github.com/VBWD-platform/vbwd-fe-admin-plugin-cms-admin) | CMS pages/categories/layouts/widgets/styles admin |
| email-admin | [vbwd-fe-admin-plugin-email-admin](https://github.com/VBWD-platform/vbwd-fe-admin-plugin-email-admin) | Email template list and editor (HTML/Text/Preview) |
| ghrm-admin | [vbwd-fe-admin-plugin-ghrm-admin](https://github.com/VBWD-platform/vbwd-fe-admin-plugin-ghrm-admin) | GHRM package management tab in admin |
| taro-admin | [vbwd-fe-admin-plugin-taro-admin](https://github.com/VBWD-platform/vbwd-fe-admin-plugin-taro-admin) | Tarot session section in user detail |

---

## License

CC0 1.0 Universal (Public Domain)
