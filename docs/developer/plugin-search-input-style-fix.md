# Fix: Missing styles on the plugin search input (Settings → plugin tabs)

**Date:** 2026-06-29
**Area:** `vbwd-fe-admin` — `vue/src/views/Settings.vue`
**Surface:** `http://localhost:8081/admin/settings` → Admin Plugins / Backend Plugins / User Plugins tabs

## Symptom

The quick-search box on every plugin tab rendered with raw browser
defaults — no border radius, padding, or width — e.g.:

```html
<div class="plugin-search-box">
  <input type="text" placeholder="Search admin plugins..."
         class="search-input" data-testid="admin-plugin-search">
</div>
```

## Root cause

The scoped stylesheet in `Settings.vue` styled the wrapper
(`.plugin-search-box { margin-bottom: 15px; }`) but had **no rule at all**
for the inner `.search-input` element. All three plugin tabs share the same
markup (`admin-plugin-search`, `backend-plugin-search`, `user-plugin-search`),
so the omission affected every tab.

## Fix

Added a scoped `.search-input` rule matching the file's existing `.form-input`
convention (full width, 10px/15px padding, 1px `#ddd` border, 4px radius,
`box-sizing: border-box`) plus a focus highlight (`#3498db`). One rule covers
all three tabs because they reuse the same class.

```css
.plugin-search-box .search-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.plugin-search-box .search-input:focus {
  outline: none;
  border-color: #3498db;
}
```

## Verification

- ESLint clean on `vue/src/views/Settings.vue`.
- All three plugin tabs (admin / backend / user) use the identical
  `.plugin-search-box .search-input` markup, so the single scoped rule
  applies uniformly.
