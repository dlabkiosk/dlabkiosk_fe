const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/* ── 공통 응답 타입 ── */

export interface ApiResponse<T = string> {
  success: boolean;
  data: T;
  error: {
    code: string;
    message: string;
  } | null;
}

/* ── API 에러 ── */

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/* ── 공통 fetch ── */

async function request<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const urlObj = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        urlObj.searchParams.append(key, String(value));
      }
    });
  }
  const url = urlObj.toString();

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // 401 → 토큰 만료, refresh 시도
  if (res.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retryRes = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return handleResponse<T>(retryRes);
    }
    throw new ApiError('UNAUTHORIZED', '로그인이 필요합니다.');
  }

  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}: ${res.statusText}`);
  }

  // 204 No Content 또는 빈 응답 body 처리
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  const json = JSON.parse(text) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? '알 수 없는 오류가 발생했습니다.',
    );
  }

  return json.data;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const json = (await res.json()) as ApiResponse;
    return json.success;
  } catch {
    return false;
  }
}

/* ── HTTP 메서드 헬퍼 ── */

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: Record<string, unknown>, query?: Record<string, string | number | undefined>): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  }, query);
}

export function apiPut<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
