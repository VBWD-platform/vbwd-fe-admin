# Email Admin Plugin — Architecture

## Overview

The `email-admin` plugin is a pure UI plugin: it contains no backend code. It talks to the REST API exposed by the `vbwd-plugin-email` backend plugin and renders the results in the admin backoffice.

```
vbwd-fe-admin (admin app)
└── plugins/email-admin/
    ├── Plugin registration (index.ts)
    ├── Pinia store  (useEmailStore)
    └── Views / Components
          ↕ REST API
vbwd-backend
└── plugins/email/  (backend plugin)
```

---

## State Management

All state lives in `useEmailStore` (Pinia):

| State | Type | Description |
|-------|------|-------------|
| `templates` | `EmailTemplate[]` | Full list from GET /templates |
| `current` | `EmailTemplate \| null` | Template being edited |
| `eventTypes` | `EventTypeMeta[]` | Catalogue of event types + variables |
| `preview` | `{ subject, html_body, text_body }` | Last rendered preview |
| `loading` | `boolean` | API request in flight |
| `error` | `string \| null` | Last API error message |

### Actions

| Action | API call |
|--------|----------|
| `fetchTemplates()` | `GET /api/v1/admin/email/templates` |
| `fetchTemplate(id)` | `GET /api/v1/admin/email/templates/:id` |
| `saveTemplate(id, patch)` | `PUT /api/v1/admin/email/templates/:id` |
| `deleteTemplate(id)` | `DELETE /api/v1/admin/email/templates/:id` |
| `fetchEventTypes()` | `GET /api/v1/admin/email/event-types` |
| `fetchPreview(event_type, context)` | `POST /api/v1/admin/email/templates/preview` |
| `sendTest(event_type, to)` | `POST /api/v1/admin/email/test-send` |

---

## Component Breakdown

### `EmailTemplateList.vue`

- Fetches all templates on mount via `store.fetchTemplates()`
- Client-side search (event_type + subject) and sort (any column, asc/desc)
- Reactive `Set<string>` for multi-select; bulk activate/deactivate/delete/export
- Navigates to editor on row click: `/admin/email/templates/:id/edit`

### `EmailTemplateEdit.vue`

- Loads `current` template + `eventTypes` catalogue on mount
- Three tabs: **HTML**, **Plain Text**, **Preview**
  - Preview tab calls `fetchPreview` with a default context assembled from `eventTypes[].variables`
- Available-variables sidebar built from `eventTypes` catalogue
- Inactive warning banner when `is_active === false`
- Test-send form: input for recipient email + dispatches `sendTest`

### `CodeEditor.vue`

- Thin wrapper around a `<textarea>` with a monospace font and line numbers
- Emits `update:modelValue` for `v-model` compatibility
- No external editor dependency (avoids bundle bloat)

---

## Data Flow — Edit & Save

```
EmailTemplateEdit mounted
  → store.fetchTemplate(id)       → GET /templates/:id
  → store.fetchEventTypes()       → GET /event-types

User edits HTML body
  → local ref updated (not store)

User clicks Save
  → store.saveTemplate(id, { html_body: ... })  → PUT /templates/:id
  → store.current updated with response

User clicks Preview (tab)
  → store.fetchPreview(event_type, defaultContext)  → POST /preview
  → preview.html_body rendered in iframe
```

---

## Internationalization

All user-facing strings use `vue-i18n` keys under the `email.*` namespace:

```json
{
  "email": {
    "title": "Email Templates",
    "tab_html": "HTML",
    "tab_text": "Plain Text",
    "tab_preview": "Preview",
    ...
  }
}
```

Translations are registered in `index.ts` via `sdk.addTranslations('en', ...)`.

---

## Security Notes

- The HTML preview tab renders `html_body` via an `<iframe srcdoc>` — never via `v-html` — to sandbox template output
- The editor does not validate Jinja2 syntax client-side; malformed templates are rejected by the backend preview endpoint (400)
- All API calls include the JWT bearer token from the admin auth store
