# Plugin: ghrm-admin (fe-admin)

## Purpose

GitHub Repo Manager admin extension. Adds a "Software" tab to the tariff plan edit page for plans belonging to software categories (`backend`, `fe-user`, `fe-admin`). Allows admins to configure GitHub repository access settings per plan without leaving the plan edit view. Uses the extension registry pattern — no dedicated routes.

## Installation

The plugin self-registers. It is loaded by the admin app's plugin loader.

Requires the backend `ghrm` plugin to be enabled.

## Routes Added

None. Extends the existing plan edit page via `extensionRegistry`.

## Stores

None.

## Architecture

```
plugins/ghrm-admin/
├── index.ts
├── src/
│   ├── api/
│   │   └── ghrmWidgetApi.ts             # GHRM widget API calls
│   ├── components/
│   │   ├── GhrmSoftwareTab.vue          # Plan detail tab (GitHub repo config)
│   │   ├── GhrmBreadcrumbWidgetConfig.vue # Breadcrumb widget config (3-tab: General/CSS/Preview)
│   │   └── GhrmBreadcrumbPreview.vue    # Live breadcrumb preview
│   └── views/
│       └── GhrmWidgets.vue              # Widget configuration page
└── docs/
```

## Extending

The `GhrmSoftwareTab` component is registered into the plan detail page's tab system via `extensionRegistry`. To add more admin tabs for GHRM (e.g. a releases tab), register additional tab components the same way:

```typescript
sdk.extensionRegistry.register('planDetailTabs', {
  label: 'Releases',
  component: GhrmReleasesTab,
  condition: (plan) => plan.category_slugs.some(s => softwareSlugs.includes(s)),
})
```
