# Plugin: taro-admin (fe-admin)

## Purpose

Taro tarot reading platform admin extension. Adds a "Taro Sessions" section to the User Details page in the admin backoffice. Allows admins to view a user's session history, token usage, and arcana interpretation logs, and to reset daily quotas. Uses the extension registry pattern — no dedicated routes.

## Installation

The plugin self-registers. It is loaded by the admin app's plugin loader.

Requires the backend `taro` plugin to be enabled.

## Routes Added

None. Extends the existing User Details page via `extensionRegistry`.

## Stores

None. Data is fetched directly inside `UserTaroSection.vue` via the admin API.

## Architecture

```
plugins/taro-admin/
├── index.ts           # Registers UserTaroSection in extensionRegistry as userDetailsSections
├── extension.ts       # Extension registration helper
└── components/
    └── UserTaroSection.vue  # Session list, token usage, reset-quota button
```

## Extending

`UserTaroSection` is registered as a `userDetailsSections[]` extension. To add further admin views for Taro (e.g. a global sessions analytics page), add a dedicated route and sidebar link:

```typescript
sdk.addRoute({ path: '/admin/taro/sessions', component: () => import('./views/TaroSessionsAdmin.vue') })
sdk.addNavItem({ section: 'settings', label: 'Taro Sessions', to: '/admin/taro/sessions' })
```
