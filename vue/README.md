# VBWD Admin Dashboard

Vue 3 admin backoffice application for VBWD platform management.

## Features

- User management (CRUD, roles, permissions)
- Subscription management
- Tariff plan configuration
- Invoice management
- Webhook configuration
- Analytics dashboard
- Settings management

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs on http://localhost:5174

### Build

```bash
npm run build
```

### Testing

```bash
# Unit tests
npm run test

# Unit tests in watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

## Project Structure

```
admin/vue/
├── bin/                  # CLI tools
│   └── plugin-manager.ts # Plugin management CLI
├── src/
│   ├── api/              # API client
│   ├── components/       # Vue components
│   ├── layouts/          # Layout components
│   ├── plugins/          # Plugin directory
│   ├── router/           # Vue Router config
│   ├── stores/           # Pinia stores
│   └── views/            # Page components
├── tests/
│   ├── unit/             # Vitest unit tests
│   └── e2e/              # Playwright E2E tests
├── plugins.json          # Plugin configuration
└── package.json
```

## Plugin System

The admin app supports a plugin architecture for extending functionality. Plugins are managed via CLI.

### Plugin CLI Commands

```bash
# List all plugins with their status
npm run plugin list

# Install a plugin from local plugins directory
npm run plugin install <name>

# Uninstall a plugin (removes from config)
npm run plugin uninstall <name>

# Activate an installed plugin
npm run plugin activate <name>

# Deactivate a plugin without removing it
npm run plugin deactivate <name>

# Show help
npm run plugin help
```

### Example

```bash
$ npm run plugin list

VBWD Plugin Manager v1.0.0

NAME                VERSION     STATUS        DESCRIPTION
──────────────────────────────────────────────────────────────────────
stripe-payment      1.2.0       active        Stripe payment provider
paypal-payment      1.1.0       inactive      PayPal payment provider

Total: 2 plugins (1 active, 1 inactive)
```

### Plugin Configuration

Plugins are configured in `plugins.json`:

```json
{
  "plugins": {
    "stripe-payment": {
      "enabled": true,
      "version": "1.2.0",
      "installedAt": "2026-01-05T10:30:00.000Z",
      "source": "local"
    }
  }
}
```

### Creating a Plugin

1. Create plugin directory in `src/plugins/<plugin-name>/`
2. Add `package.json` with version info
3. Export plugin object implementing `IPlugin` interface
4. Install via CLI: `npm run plugin install <plugin-name>`
5. Activate: `npm run plugin activate <plugin-name>`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `/api/v1` |

## Test Credentials

- Admin: `admin@example.com` / `AdminPass123@`
- User: `test@example.com` / `TestPass123@`

## Architecture

The admin app uses a hybrid architecture:

- **Flat views** for core functionality (users, subscriptions, invoices, plans)
- **Plugin system** for payment integrations and value-added services

This approach keeps core features simple while allowing extensibility for third-party integrations.

## Related Documentation

- [Core SDK](../../core/README.md)
- [Architecture](../../../docs/architecture_core_view_admin/README.md)

## License

BSL-1.1 Business Source License
