import { apiGet, apiPost } from './client';

/* ── 타입 ── */

export interface AdminInfo {
  id: number;
  loginId: string;
  name: string;
  role: string;
  storeId: number;
  storeName: string;
}

interface LoginRequest {
  userId: string;
  password: string;
}

interface SignupRequest {
  loginId: string;
  password: string;
  name: string;
  storeId: number;
}

/* ── API ── */

/** 로그인 (accessToken, refreshToken HttpOnly 쿠키 설정) */
export function login(data: LoginRequest): Promise<string> {
  return apiPost<string>('/api/admin/auth/login', data as unknown as Record<string, unknown>);
}

/** 회원가입 */
export function signup(data: SignupRequest): Promise<string> {
  return apiPost<string>('/api/admin/auth/signup', data as unknown as Record<string, unknown>);
}

/** 로그아웃 (Redis 토큰 삭제 + 쿠키 초기화) */
export function logout(): Promise<string> {
  return apiPost<string>('/api/admin/auth/logout');
}

/** accessToken 재발급 (refreshToken 쿠키로 자동 전송) */
export function refreshToken(): Promise<string> {
  return apiPost<string>('/api/admin/auth/refresh');
}

/** 현재 로그인된 관리자 정보 */
export function getMe(): Promise<AdminInfo> {
  return apiGet<AdminInfo>('/api/admin/auth/me');
}
