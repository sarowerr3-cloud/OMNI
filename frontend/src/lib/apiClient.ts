/**
 * Production-ready API client for OMNI frontend
 * Features:
 * - Automatic JWT token injection
 * - Configurable request timeouts via AbortSignal
 * - Transient retry mechanism (exponential backoff)
 * - Standardized ApiError normalization
 * - Full TypeScript generic response typing
 */

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number = 0, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('omni_auth_token') || localStorage.getItem('access_token');
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('omni_auth_token', token);
}

export function removeStoredAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('omni_auth_token');
  localStorage.removeItem('access_token');
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return endpoint;
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  }
  const queryString = searchParams.toString();
  if (!queryString) return endpoint;
  return endpoint.includes('?') ? `${endpoint}&${queryString}` : `${endpoint}?${queryString}`;
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 8000,
    retries = 1,
    skipAuth = false,
    params,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const url = buildUrl(endpoint, params);
  const headers = new Headers(customHeaders);

  if (!skipAuth) {
    const token = getStoredAuthToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Set default JSON Content-Type if not sending FormData
  if (!(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errData: any = null;
        try {
          errData = await response.json();
        } catch {
          errData = await response.text();
        }

        const msg =
          (typeof errData === 'object' && (errData?.detail || errData?.message)) ||
          response.statusText ||
          `Request failed with status ${response.status}`;

        // Retry on 502, 503, 504 server gateway issues if retries left
        if ([502, 503, 504].includes(response.status) && attempt < retries) {
          attempt++;
          await wait(attempt * 400);
          continue;
        }

        throw new ApiError(msg, response.status, errData);
      }

      // Check if response has body content
      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        lastError = new ApiError(`Request timeout after ${timeoutMs}ms`, 408);
      } else if (err instanceof ApiError) {
        lastError = err;
        // Don't retry client errors (4xx)
        if (err.status >= 400 && err.status < 500) {
          throw err;
        }
      } else {
        lastError = new ApiError(err.message || 'Network request failed', 0, err);
      }

      if (attempt < retries) {
        attempt++;
        await wait(attempt * 400);
      } else {
        break;
      }
    }
  }

  throw lastError;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
