/**
 * Reload the admin SPA. Toggling an *admin* (fe-admin) frontend plugin rewrites
 * this app's own manifest server-side; the running SPA must reload for the
 * plugin loader to actually mount/unmount it (see stores/plugins.ts). Wrapped
 * in a one-line module so callers (e.g. the Settings bulk-activate handler) can
 * be unit-tested by mocking this seam instead of fighting jsdom's window.location.
 */
export function reloadApp(): void {
  window.location.reload();
}
