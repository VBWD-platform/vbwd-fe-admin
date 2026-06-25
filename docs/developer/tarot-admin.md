# Plugin: tarot-admin (fe-admin)

## Purpose

Tarot tarot reading platform admin extension. Adds a "Tarot Sessions" section to the User Details page in the admin backoffice. Allows admins to view a user's session history, token usage, and arcana interpretation logs, and to reset daily quotas. Uses the extension registry pattern — no dedicated routes.

## Installation

The plugin self-registers. It is loaded by the admin app's plugin loader.

Requires the backend `tarot` plugin to be enabled.

## Routes Added

None. Extends the existing User Details page via `extensionRegistry`.

## Stores

None. Data is fetched directly inside `UserTarotSection.vue` via the admin API.

## Architecture

```
plugins/tarot-admin/
├── index.ts           # Registers UserTarotSection in extensionRegistry as userDetailsSections
├── extension.ts       # Extension registration helper
└── components/
    └── UserTarotSection.vue  # Session list, token usage, reset-quota button
```

## Extending

`UserTarotSection` is registered as a `userDetailsSections[]` extension. To add further admin views for Tarot (e.g. a global sessions analytics page), add a dedicated route and sidebar link:

```typescript
sdk.addRoute({ path: '/admin/tarot/sessions', component: () => import('./views/TarotSessionsAdmin.vue') })
sdk.addNavItem({ section: 'settings', label: 'Tarot Sessions', to: '/admin/tarot/sessions' })
```
