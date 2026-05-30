// Admin read-only view of a user's REGISTERED DEVICE KEYS (public material).
// Message content is end-to-end encrypted and is NOT available to admins.

export interface DeviceKeyRow {
  id: string;
  public_key: string; // base64 Ed25519 identity pub (public material only)
  algorithm: string;
  label: string | null;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('admin_token') ?? ''}`,
  };
}

export async function listUserDevices(userId: string): Promise<DeviceKeyRow[]> {
  const res = await fetch(`/api/v1/messaging/users/${userId}/devices`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw body;
  }
  const data = (await res.json()) as { items: DeviceKeyRow[] };
  return data.items;
}
