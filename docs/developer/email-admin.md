# Plugin: email-admin (fe-admin)

## Purpose

Transactional email template management in the admin backoffice. Allows editing event-keyed HTML and plain-text email templates using CodeMirror syntax-highlighted editors, previewing rendered output with example variable data, and sending test emails. Registers a "Email Templates" item in the Settings menu.

## Installation

The plugin self-registers. It is loaded by the admin app's plugin loader.

Requires the backend `email` plugin to be enabled.

## Routes Added

All routes are nested under `/admin/`:

| Path | Component |
|------|-----------|
| `email/templates` | `EmailTemplateList.vue` |
| `email/templates/new` | `EmailTemplateEdit.vue` |
| `email/templates/:id/edit` | `EmailTemplateEdit.vue` |

## Stores

**Store name:** `email` (`useEmailStore`)

| State | Type | Description |
|-------|------|-------------|
| `templates` | `EmailTemplate[]` | All templates |
| `eventTypes` | `EventTypeSchema[]` | Event types + variable schemas from API |
| `loading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |

**Key actions:** `fetchTemplates()`, `fetchTemplate(id)`, `saveTemplate(id, data)`, `createTemplate(data)`, `deleteTemplate(id)`, `fetchEventTypes()`, `renderPreview(event_type, ctx)`, `sendTest(event_type, email)`

## i18n Keys

Translations live in `plugins/email-admin/locales/`. Available: `en`

## Architecture

```
plugins/email-admin/
├── index.ts
├── src/
│   ├── views/
│   │   ├── EmailTemplateList.vue    # Template list with event_type + status
│   │   └── EmailTemplateEdit.vue   # Editor: HTML/Text/Preview tabs + variables table
│   ├── components/
│   │   └── CodeEditor.vue          # CodeMirror 6 wrapper (html/text language modes)
│   └── stores/
│       └── useEmailStore.ts
└── tests/
    └── unit/
```

## Extending

`CodeEditor.vue` uses `@codemirror/lang-html` for the HTML tab and no language plugin for plain text. To add Jinja2 syntax hints, extend `CodeEditor.vue` with a custom CodeMirror language plugin or linter. Event type variable schemas are fetched from `GET /api/v1/admin/email/event-types` — new schemas registered by other plugins appear automatically in the variable hints table.
