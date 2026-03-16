# Plugin: analytics-widget (fe-admin)

## Purpose

Dashboard metrics widget for the admin backoffice. Displays key platform KPIs: active subscriptions, revenue this month, new signups, and token usage overview. Registers as a reusable `AnalyticsWidget` component injected into the admin dashboard. No routes added — pure component plugin.

## Installation

The plugin self-registers. It is loaded by the admin app's plugin loader.

Requires the backend `analytics` plugin to be enabled.

## Routes Added

None.

## Stores

None. Data is fetched directly inside `AnalyticsWidget.vue` via the admin API.

## Config

`plugins/analytics-widget/config.json` — enabled/disabled flag.

## Architecture

```
plugins/analytics-widget/
├── index.ts            # sdk.addComponent('AnalyticsWidget', AnalyticsWidget)
├── AnalyticsWidget.vue # Metrics card with MRR, users, subscriptions, tokens
├── README.md
├── config.json
└── admin-config.json
```

## Extending

To add new metric cards, extend `AnalyticsWidget.vue` with additional API calls to `GET /api/v1/admin/analytics/dashboard`. The dashboard response includes `mrr`, `revenue_total`, `revenue_this_month`, `user_count`, `new_users_this_month`, `active_subscriptions`, `churn_rate`, `conversion_rate`, `arpu`.
