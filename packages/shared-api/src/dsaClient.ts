import type { DsaBaseResponse, TokenResponse, RefreshTokenResponse } from './types/dsa.types.ts';
import { DSA_CODE } from './types/dsa.types.ts';
import { md5 } from './md5.ts';

const DSA_BASE_URL = 'https://api.dshw.co.kr';

// ============================================
// secret_id 생성
// ============================================

/** yyyyMMdd 형식의 오늘 날짜 */
function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** secret_id 생성: MD5((yyyyMMdd + rawSecret).toLowerCase()) */
export function generateSecretId(rawSecret: string): string {
  const input = (getTodayString() + rawSecret).toLowerCase();
  return md5(input);
}

// ============================================
// DSA API 에러
// ============================================

export class DsaApiError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'DsaApiError';
    this.code = code;
  }
}

// ============================================
// 토큰 저장소
// ============================================

interface TokenStore {
  token: string;
  refreshToken: string;
}

let tokenStore: TokenStore | null = null;

export function setTokens(token: string, refreshToken: string): void {
  tokenStore = { token, refreshToken };
}

export function getToken(): string | null {
  return tokenStore?.token ?? null;
}

export function clearTokens(): void {
  tokenStore = null;
}

// ============================================
// 인증 설정
// ============================================

interface DsaAuthConfig {
  acad_cd: string;
  client_id: string;
  rawSecret: string;
}

let authConfig: DsaAuthConfig | null = null;

export function setAuthConfig(config: DsaAuthConfig): void {
  authConfig = config;
}

// ============================================
// 공통 fetch
// ============================================

export async function dsaFetch<T extends DsaBaseResponse>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${DSA_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new DsaApiError(-1, `HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as T;

  if (json.code !== DSA_CODE.SUCCESS) {
    throw new DsaApiError(json.code, json.message);
  }

  return json;
}

/** 토큰을 자동으로 포함하는 fetch (만료 시 자동 갱신) */
export async function dsaAuthFetch<T extends DsaBaseResponse>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new DsaApiError(-1, '토큰이 없습니다. 먼저 로그인해주세요.');
  }

  try {
    return await dsaFetch<T>(path, { ...body, token });
  } catch (err) {
    // 토큰 만료(101)면 갱신 시도
    if (err instanceof DsaApiError && err.code === DSA_CODE.INVALID_ACCOUNT) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return await dsaFetch<T>(path, { ...body, token: tokenStore!.token });
      }
    }
    throw err;
  }
}

// ============================================
// 토큰 발급 / 갱신
// ============================================

export async function requestToken(): Promise<TokenResponse> {
  if (!authConfig) {
    throw new DsaApiError(-1, '인증 설정이 없습니다. setAuthConfig()를 먼저 호출하세요.');
  }

  const secretId = generateSecretId(authConfig.rawSecret);

  const res = await dsaFetch<TokenResponse>('/auth/token', {
    acad_cd: authConfig.acad_cd,
    client_id: authConfig.client_id,
    secret_id: secretId,
    service: 'kiosk',
  });

  setTokens(res.token, res.refreshToken);
  return res;
}

async function tryRefreshToken(): Promise<boolean> {
  if (!tokenStore?.refreshToken || !authConfig) {
    return false;
  }

  try {
    const res = await dsaFetch<RefreshTokenResponse>('/auth/refreshToken', {
      client_id: authConfig.client_id,
      refreshToken: tokenStore.refreshToken,
    });

    tokenStore.token = res.token;
    return true;
  } catch {
    // 갱신 실패 시 토큰 초기화
    clearTokens();
    return false;
  }
}
