# Analytics Widget Plugin (vbwd-fe-admin)

Dashboard analytics widget showing key platform metrics.

## Purpose

Adds a summary analytics widget to the admin dashboard: active subscriptions, revenue this month, new signups, and token usage overview.

---

## Related

| | Repository |
|-|------------|
| 🖥 Backend | [vbwd-plugin-analytics](https://github.com/VBWD-platform/vbwd-plugin-analytics) |

**Core:** [vbwd-fe-admin](https://github.com/VBWD-platform/vbwd-fe-admin) · [vbwd-fe-core](https://github.com/VBWD-platform/vbwd-fe-core)

## Extension Point

Registers `AnalyticsWidget.vue` as a dashboard widget via the plugin system.

## Testing

```bash
cd vbwd-fe-admin
./bin/pre-commit-check.sh --unit
```
