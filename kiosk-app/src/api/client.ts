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
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('kiosk:unauthorized'));
    throw new ApiError('UNAUTHORIZED', '인증이 필요합니다. 다시 로그인해주세요.');
  }

  let json: ApiResponse<T>;

  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    if (!res.ok) {
      throw new ApiError('HTTP_ERROR', getHttpErrorMessage(res.status));
    }
    throw new ApiError('PARSE_ERROR', '서버 응답을 처리할 수 없습니다.');
  }

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? getHttpErrorMessage(res.status),
    );
  }

  return json.data;
}

function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400: return '잘못된 요청입니다.';
    case 401: return '인증이 필요합니다. 다시 로그인해주세요.';
    case 403: return '접근 권한이 없습니다.';
    case 404: return '요청한 정보를 찾을 수 없습니다.';
    case 409: return '이미 처리된 요청입니다.';
    case 422: return '입력 정보를 확인해주세요.';
    case 429: return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    case 500: return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 502: return '서버에 연결할 수 없습니다.';
    case 503: return '서버 점검 중입니다. 잠시 후 다시 시도해주세요.';
    default: return '알 수 없는 오류가 발생했습니다.';
  }
}

/* ── HTTP 메서드 헬퍼 ── */

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: object): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string, body?: object): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}
