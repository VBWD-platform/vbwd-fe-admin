/**
 * Shared API Client Instance
 *
 * Singleton ApiClient used by all stores and components.
 * Auth token management is handled by the auth store.
 */
import { ApiClient } from 'vbwd-view-component';
import type { ApiClientConfig, RequestConfig } from 'vbwd-view-component';

/** HTTP status the backend returns for a license-gated feature. */
const LICENSE_REQUIRED_STATUS = 402;

/**
 * URL fragment identifying a CMS *admin* API call. When `LICENSE_REQUIRED=true`
 * and the license does not cover CMS, every `/api/v1/admin/cms/...` request
 * returns `402 {"error":"License required","feature":"cms"}`. fe-core's
 * ApiError keeps only `status` (the JSON body is discarded), so we identify the
 * CMS block from the 402 status on a CMS-admin URL rather than the body.
 */
const CMS_ADMIN_URL_MARKER = '/admin/cms';

/** Licensable feature name surfaced to `onLicenseBlocked` listeners. */
const CMS_FEATURE = 'cms';

type LicenseBlockedListener = (feature: string) => void;

/** Clickable follow-up a refused admin action offers (buy tokens / upgrade). */
export interface AdminApiActionHint {
  label: string;
  url: string;
}

/**
 * Structured error body some admin endpoints return alongside a 4xx. E.g. the
 * user-provisioning guard refuses `POST /admin/users/` with
 *   402 {"error":"...","code":"TOKENS_REQUIRED","action":{"label":"Buy tokens","url":"/dashboard/tokens"}}
 *   403 {"error":"...","code":"SEAT_LIMIT_REACHED","action":{"label":"Upgrade plan","url":"..."}}
 * fe-core's `ApiError` keeps only `status`/`message`; `AdminApiClient` re-attaches
 * this body (see `data` below) so callers can render the follow-up action.
 */
export interface AdminApiErrorBody {
  error?: string;
  code?: string;
  action?: AdminApiActionHint;
}

/** An `ApiError` enriched by `AdminApiClient` with the structured JSON body. */
export interface StructuredAdminApiError extends Error {
  status?: number;
  data?: AdminApiErrorBody;
}

/** Minimal shape of the axios error our response interceptor inspects. */
interface AxiosErrorLike {
  config?: { url?: string };
  response?: { data?: unknown };
}

/** True when a structured body carries a machine-readable `code`. */
function hasStructuredCode(data: unknown): data is AdminApiErrorBody {
  return typeof (data as AdminApiErrorBody | null)?.code === 'string';
}

function isLicenseBlockedStatus(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === LICENSE_REQUIRED_STATUS;
}

function isCmsAdminUrl(url: string): boolean {
  return url.includes(CMS_ADMIN_URL_MARKER);
}

/**
 * fe-admin HTTP client.
 *
 * Extends fe-core's `ApiClient` (unchanged) to add global detection of a CMS
 * license block: when a `/admin/cms/...` request fails with HTTP 402 it fires
 * the registered `onLicenseBlocked` listeners, letting the app surface a
 * prominent "License expired" state. All other errors (401 → login,
 * 403 → forbidden, etc.) keep fe-core's behaviour and simply propagate.
 */
export class AdminApiClient extends ApiClient {
  private licenseBlockedListeners: LicenseBlockedListener[] = [];

  /**
   * Structured error bodies captured by the response interceptor, keyed by the
   * request URL. fe-core's `get/post/...` discard the JSON body before the verb
   * override sees the thrown `ApiError`, so we snapshot the body here (while the
   * raw axios error is still available) and re-attach it in the override.
   */
  private capturedErrorBodies = new Map<string, AdminApiErrorBody>();

  constructor(config: ApiClientConfig) {
    super(config);
    this.installStructuredErrorCapture();
  }

  /**
   * Add a response interceptor to fe-core's (otherwise private) axios instance
   * that records any structured error body without altering fe-core's own error
   * handling. `axiosInstance` is a runtime property of the base class; we reach
   * it via a typed cast rather than modifying fe-core.
   */
  private installStructuredErrorCapture(): void {
    const axiosInstance = (this as unknown as {
      axiosInstance: {
        interceptors: {
          response: {
            use: (
              onFulfilled: (value: unknown) => unknown,
              onRejected: (error: AxiosErrorLike) => unknown,
            ) => void;
          };
        };
      };
    }).axiosInstance;

    axiosInstance.interceptors.response.use(
      (value) => value,
      (error: AxiosErrorLike) => {
        this.captureStructuredErrorBody(error);
        return Promise.reject(error);
      },
    );
  }

  private captureStructuredErrorBody(error: AxiosErrorLike): void {
    const url = error.config?.url;
    const data = error.response?.data;
    if (url && hasStructuredCode(data)) {
      this.capturedErrorBodies.set(url, data);
    }
  }

  /** Move any captured structured body for `url` onto the thrown error. */
  private attachStructuredErrorBody(error: unknown, url: string): void {
    const body = this.capturedErrorBodies.get(url);
    if (body) {
      this.capturedErrorBodies.delete(url);
      (error as StructuredAdminApiError).data = body;
    }
  }

  /** Register a listener fired when a CMS admin call is license-blocked (402). */
  onLicenseBlocked(listener: LicenseBlockedListener): void {
    this.licenseBlockedListeners.push(listener);
  }

  private notifyIfCmsLicenseBlocked(error: unknown, url: string): void {
    if (isLicenseBlockedStatus(error) && isCmsAdminUrl(url)) {
      this.licenseBlockedListeners.forEach((listener) => listener(CMS_FEATURE));
    }
  }

  override async get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    this.capturedErrorBodies.delete(url);
    try {
      return await super.get<T>(url, config);
    } catch (error) {
      this.notifyIfCmsLicenseBlocked(error, url);
      this.attachStructuredErrorBody(error, url);
      throw error;
    }
  }

  override async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>,
  ): Promise<T> {
    this.capturedErrorBodies.delete(url);
    try {
      return await super.post<T>(url, data, config);
    } catch (error) {
      this.notifyIfCmsLicenseBlocked(error, url);
      this.attachStructuredErrorBody(error, url);
      throw error;
    }
  }

  override async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>,
  ): Promise<T> {
    this.capturedErrorBodies.delete(url);
    try {
      return await super.put<T>(url, data, config);
    } catch (error) {
      this.notifyIfCmsLicenseBlocked(error, url);
      this.attachStructuredErrorBody(error, url);
      throw error;
    }
  }

  override async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>,
  ): Promise<T> {
    this.capturedErrorBodies.delete(url);
    try {
      return await super.patch<T>(url, data, config);
    } catch (error) {
      this.notifyIfCmsLicenseBlocked(error, url);
      this.attachStructuredErrorBody(error, url);
      throw error;
    }
  }

  override async delete<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    this.capturedErrorBodies.delete(url);
    try {
      return await super.delete<T>(url, config);
    } catch (error) {
      this.notifyIfCmsLicenseBlocked(error, url);
      this.attachStructuredErrorBody(error, url);
      throw error;
    }
  }
}

const clientConfig: ApiClientConfig = {
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
};

// Singleton API client instance
export const api = new AdminApiClient(clientConfig);
