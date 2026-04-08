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
  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

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
      // 재시도도 401이면 인증 자체가 끊긴 것 → 로그인으로
      if (retryRes.status === 401) {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        throw new ApiError('UNAUTHORIZED', '로그인이 필요합니다.');
      }
      return handleResponse<T>(retryRes);
    }
    // 토큰/세션이 모두 만료된 상태 → 로그인 페이지로 이동
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
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

// 동시 401 재발급 요청을 직렬화 — refresh token rotation 백엔드에서
// 병렬 refresh가 서로의 토큰을 무효화하는 경쟁 상태 방지
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = (await res.json()) as ApiResponse;
      return json.success;
    } catch {
      return false;
    } finally {
      // 다음 만료 시점까지 새 호출 가능하도록 microtask 후 해제
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();
  return refreshInFlight;
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
