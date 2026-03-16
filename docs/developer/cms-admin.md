# Plugin: cms-admin (fe-admin)

## Purpose

Full CMS management interface in the admin backoffice. Covers: pages CRUD with TipTap rich-text editor, category management, image gallery with upload and resize, widget management, layout management, CSS style management, routing rules, and full ZIP import/export. Registers a sidebar navigation section with 8 menu items under "CMS".

## Installation

The plugin self-registers. It is loaded by the admin app's plugin loader.

Requires the backend `cms` plugin to be enabled.

## Routes Added

All routes are nested under `/admin/`:

| Path | Component |
|------|-----------|
| `cms/pages` | `CmsPageList.vue` |
| `cms/pages/new` | `CmsPageEditor.vue` |
| `cms/pages/:id/edit` | `CmsPageEditor.vue` |
| `cms/categories` | `CmsCategoryList.vue` |
| `cms/images` | `CmsImageGallery.vue` |
| `cms/styles` | `CmsStyleList.vue` |
| `cms/styles/new` | `CmsStyleEditor.vue` |
| `cms/styles/:id/edit` | `CmsStyleEditor.vue` |
| `cms/widgets` | `CmsWidgetList.vue` |
| `cms/widgets/new` | `CmsWidgetEditor.vue` |
| `cms/widgets/:id/edit` | `CmsWidgetEditor.vue` |
| `cms/layouts` | `CmsLayoutList.vue` |
| `cms/layouts/new` | `CmsLayoutEditor.vue` |
| `cms/layouts/:id/edit` | `CmsLayoutEditor.vue` |
| `cms/import-export` | `CmsImportExport.vue` |

## Stores

**Store name:** `cms-admin` (`useCmsAdminStore`)

| State key | Description |
|-----------|-------------|
| `pages` | Page list + pagination |
| `currentPage` | Currently edited page |
| `categories` | All categories |
| `images` / `selectedImageIds` | Image gallery + selection |
| `layouts` / `currentLayout` | Layout list + detail |
| `widgets` / `currentWidget` | Widget list + detail |
| `styles` / `currentStyle` | Style list + detail |

**Key actions:** `fetchPages()`, `savePage()`, `deletePage()`, `bulkAction()`, `uploadImage()`, `resizeImage()`, `saveLayout()`, `setWidgetAssignments()`, `saveWidget()`, `saveStyle()`, `exportCms()`, `importCms()`

## i18n Keys

Translations live in `plugins/cms-admin/locales/`.
Available locales: `en`, `ru`, `de`, `es`, `fr`, `ja`, `zh`, `th`

## Architecture

```
plugins/cms-admin/
├── index.ts
├── src/
│   ├── views/           # 15 view components (list + editor per entity)
│   ├── components/
│   │   ├── TipTapEditor.vue         # Rich text editor
│   │   ├── CodeMirrorEditor.vue     # HTML/CSS code editor
│   │   ├── CmsMenuTreeEditor.vue    # Navigation menu builder
│   │   ├── CmsWidgetPicker.vue      # Widget selector dialog
│   │   └── CmsImagePicker.vue       # Image gallery dialog
│   ├── widgets/
│   │   ├── widgetEditorRegistry.ts  # Per-widget config tab registry
│   │   ├── NativePricingPlansEditorTab.vue
│   │   ├── ContactFormEditorTab.vue
│   │   └── CmsBreadcrumbEditorTab.vue
│   ├── stores/
│   │   └── useCmsAdminStore.ts
│   └── cms-admin.css
├── docs/                # Internal architecture docs
└── locales/             # 8 locale files
```

## Extending

To add a custom widget config tab in the widget editor, register it in `widgetEditorRegistry.ts`:

```typescript
import { widgetEditorRegistry } from './src/widgets/widgetEditorRegistry'
import MyWidgetTab from './MyWidgetTab.vue'

widgetEditorRegistry.register('my-widget', MyWidgetTab)
```

The editor renders the registered tab when a widget of that `type` is selected.
