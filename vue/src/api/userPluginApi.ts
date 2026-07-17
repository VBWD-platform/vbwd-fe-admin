import { signRequest } from '@/utils/hmac';
import { FE_USER_BASE_URL } from '@/config/feUser';

interface RequestOptions {
  method: 'GET' | 'PUT' | 'POST';
  path: string;
  body?: Record<string, unknown>;
}

async function request<T>(options: RequestOptions): Promise<T> {
  const bodyStr = options.body ? JSON.stringify(options.body) : '';
  const { timestamp, signature } = await signRequest(options.method, options.path, bodyStr);

  const url = `${FE_USER_BASE_URL}${options.path}`;
  const headers: Record<string, string> = {
    'X-Plugin-Timestamp': timestamp,
    'X-Plugin-Signature': signature
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: bodyStr || undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface UserPluginEntry {
  name: string;
  version: string;
  description: string;
  status: 'active' | 'inactive' | 'uninstalled';
  hasConfig: boolean;
}

export interface UserPluginDetail {
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'active' | 'inactive' | 'uninstalled';
  dependencies: string[];
  configSchema: Record<string, { type: string; default: unknown; description?: string }>;
  adminConfig: {
    tabs: Array<{
      id: string;
      label: string;
      fields: Array<{
        key: string;
        label: string;
        component: string;
        inputType?: string;
        options?: Array<{ value: string; label: string }>;
        min?: number;
        max?: number;
      }>;
    }>;
  };
  savedConfig: Record<string, unknown>;
}

export const userPluginApi = {
  async fetchPlugins(): Promise<UserPluginEntry[]> {
    return request<UserPluginEntry[]>({ method: 'GET', path: '/_plugins' });
  },

  async fetchPluginDetail(name: string): Promise<UserPluginDetail> {
    return request<UserPluginDetail>({ method: 'GET', path: `/_plugins/${name}` });
  },

  async savePluginConfig(name: string, config: Record<string, unknown>): Promise<void> {
    await request({ method: 'PUT', path: `/_plugins/${name}/config`, body: config });
  },

  async enablePlugin(name: string): Promise<void> {
    await request({ method: 'POST', path: `/_plugins/${name}/enable` });
  },

  async disablePlugin(name: string): Promise<void> {
    await request({ method: 'POST', path: `/_plugins/${name}/disable` });
  },

  async installPlugin(name: string): Promise<void> {
    await request({ method: 'POST', path: `/_plugins/${name}/install` });
  },

  async uninstallPlugin(name: string): Promise<void> {
    await request({ method: 'POST', path: `/_plugins/${name}/uninstall` });
  }
};
