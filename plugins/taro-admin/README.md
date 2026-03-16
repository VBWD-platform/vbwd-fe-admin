# Taro Admin Plugin (vbwd-fe-admin)

Taro tarot reading platform — admin extension for user detail pages.

## Purpose

Adds a "Taro Sessions" tab to the User Details page in the admin backoffice, showing session history, token usage, and arcana interpretation logs for each user.

---

## Related

| | Repository |
|-|------------|
| 🖥 Backend | [vbwd-plugin-taro](https://github.com/VBWD-platform/vbwd-plugin-taro) |
| 👤 Frontend (user) | [vbwd-fe-user-plugin-taro](https://github.com/VBWD-platform/vbwd-fe-user-plugin-taro) |

**Core:** [vbwd-fe-admin](https://github.com/VBWD-platform/vbwd-fe-admin) · [vbwd-fe-core](https://github.com/VBWD-platform/vbwd-fe-core)

## Extension Point

Registers a section in the User Details view via `extensionRegistry`:
- Component: `TaroAdminUserDetail.vue`
- Section label: "Taro Sessions"

## Testing

```bash
cd vbwd-fe-admin
./bin/pre-commit-check.sh --unit
```
