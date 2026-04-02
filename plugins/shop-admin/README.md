# vbwd-fe-admin-plugin-ecommerce

Admin UI for product, category, order, stock, and warehouse management.

## Structure

```
plugins/ecommerce-admin/
├── index.ts                          # Plugin entry (IPlugin)
├── config.json                       # Default plugin config
├── admin-config.json                 # Admin settings panel schema
├── locales/
│   └── en.json                       # English translations
├── src/
│   ├── views/
│   │   ├── Products.vue              # Product list with search, filters
│   │   ├── ProductForm.vue           # Create/edit product form
│   │   ├── ProductCategories.vue     # Category tree management
│   │   ├── Orders.vue                # Order list with status filter
│   │   ├── OrderDetails.vue          # Order detail (items, shipping, status actions)
│   │   ├── StockOverview.vue         # Stock levels across warehouses
│   │   └── Warehouses.vue            # Warehouse CRUD
│   ├── stores/
│   │   ├── productAdmin.ts           # Product/category CRUD store
│   │   └── orderAdmin.ts             # Order management store
│   └── components/
│       └── ShopRevenueWidget.vue     # Dashboard revenue widget
└── tests/
    └── unit/
        └── productAdmin.spec.ts
```

## Routes

| Path | View | Description |
|------|------|-------------|
| `/admin/shop/products` | Products.vue | Product list |
| `/admin/shop/products/new` | ProductForm.vue | Create product |
| `/admin/shop/products/:id/edit` | ProductForm.vue | Edit product |
| `/admin/shop/categories` | ProductCategories.vue | Category management |
| `/admin/shop/orders` | Orders.vue | Order list |
| `/admin/shop/orders/:id` | OrderDetails.vue | Order detail |
| `/admin/shop/stock` | StockOverview.vue | Stock overview |
| `/admin/shop/warehouses` | Warehouses.vue | Warehouse management |

## Navigation

The plugin injects navigation items into the **Sales** section of the admin sidebar via `extensionRegistry`:

```
Sales
  └── Shop
      ├── Products
      ├── Categories
      ├── Orders
      ├── Stock
      └── Warehouses
```

## Dashboard Widget

`ShopRevenueWidget` is registered via `sdk.addComponent()` and displayed on the admin dashboard.

## Stores

### productAdmin

Manages products and categories via the backend API (`/api/v1/admin/shop/products`, `/api/v1/admin/shop/categories`).

### orderAdmin

Manages orders including status transitions (ship, complete) via the backend API (`/api/v1/admin/shop/orders`).

## Configuration

### config.json

| Key | Default | Description |
|-----|---------|-------------|
| `products_per_page` | `25` | Products per page in admin list |
| `orders_per_page` | `25` | Orders per page in admin list |
| `show_sku_column` | `true` | Show SKU column in product table |
| `show_weight_column` | `true` | Show weight column in product table |
| `default_product_sort` | `"created_at_desc"` | Default sort order |

### admin-config.json

Defines the settings panel UI with a **Display** tab containing number inputs, checkboxes, and a select dropdown for the config values above.

## Development

```bash
# Unit tests
npm run test -- plugins/ecommerce-admin/

# Lint
npm run lint
```
