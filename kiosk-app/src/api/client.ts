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
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? '알 수 없는 오류가 발생했습니다.',
    );
  }

  return json.data;
}

/* ── HTTP 메서드 헬퍼 ── */

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}
