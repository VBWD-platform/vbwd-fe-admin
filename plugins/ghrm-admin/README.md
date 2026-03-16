# GHRM Admin Plugin (vbwd-fe-admin)

GitHub Repo Manager — admin interface for managing software packages and syncing from GitHub.

## Purpose

Adds admin UI for the GHRM plugin: create/edit/delete software packages, configure GitHub owner/repo, trigger sync, manage access keys, view per-package subscriber list.

---

## Related

| | Repository |
|-|------------|
| 🖥 Backend | [vbwd-plugin-ghrm](https://github.com/VBWD-platform/vbwd-plugin-ghrm) |
| 👤 Frontend (user) | [vbwd-fe-user-plugin-ghrm](https://github.com/VBWD-platform/vbwd-fe-user-plugin-ghrm) |

**Core:** [vbwd-fe-admin](https://github.com/VBWD-platform/vbwd-fe-admin) · [vbwd-fe-core](https://github.com/VBWD-platform/vbwd-fe-core)

## Routes / Views

| Path | View | Description |
|------|------|-------------|
| `/admin/ghrm/packages` | Package list | List all GHRM packages |
| `/admin/ghrm/packages/new` | Package form | Create package |
| `/admin/ghrm/packages/:id` | Package detail | View stats + trigger sync |
| `/admin/ghrm/packages/:id/edit` | Package form | Edit package |

## Stores

GHRM admin store — CRUD, sync trigger, subscriber list.

## Testing

```bash
cd vbwd-fe-admin
./bin/pre-commit-check.sh --unit
```
