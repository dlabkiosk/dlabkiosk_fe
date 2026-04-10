import { apiGet, apiDelete } from './client';

/* ── 이탈 사유 타입 ── */

export interface SeatLeaveReason {
  id: number;
  storeId: number;
  reasonName: string;
  displayOrder: number;
  active: boolean;
  /** 업로드된 아이콘 이미지 URL. 없으면 텍스트만 표시 */
  iconUrl?: string | null;
}

/* ── 이탈 기록 타입 ── */

export interface SeatLeaveRecord {
  id: number;
  storeId: number;
  storeName: string;
  studentId: number;
  studentName: string;
  studentNumber?: string;
  className?: string;
  seatLabel: string;
  reasonName: string;
  startedAt: string;
  endedAt: string | null;
}

/* ── 이탈 사유 CRUD ── */

/** 이탈 사유 목록 조회 */
export function getSeatLeaveReasons(storeId?: number): Promise<SeatLeaveReason[]> {
  const query = storeId ? `?storeId=${storeId}` : '';
  return apiGet<SeatLeaveReason[]>(`/api/v1/admin/seat-leave-reasons${query}`);
}

/** 아이콘 파일 크기 제한 (5MB) */
const MAX_ICON_SIZE = 5 * 1024 * 1024;

function validateIconFile(file: File) {
  if (file.size > MAX_ICON_SIZE) {
    throw new Error(`파일 크기가 너무 큽니다. (${(file.size / 1024 / 1024).toFixed(1)}MB, 최대 5MB)`);
  }
}

async function handleReasonFormDataResponse(res: Response, fallbackMessage: string): Promise<SeatLeaveReason> {
  let json;
  try {
    json = await res.json();
  } catch {
    if (res.status === 413) throw new Error('파일 크기가 서버 허용 용량을 초과했습니다.');
    throw new Error(`서버 응답 오류 (${res.status}).`);
  }
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? fallbackMessage);
  }
  return json.data;
}

function buildReasonQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** 이탈 사유 등록 — icon: body(multipart, 선택), 나머지: query params */
export async function createSeatLeaveReason(params: {
  reasonName: string;
  displayOrder: number;
  active: boolean;
  storeId?: number;
  iconFile?: File;
}): Promise<SeatLeaveReason> {
  if (params.iconFile) validateIconFile(params.iconFile);

  const formData = new FormData();
  if (params.iconFile) {
    formData.append('iconFile', params.iconFile);
  }

  const query = buildReasonQuery({
    reasonName: params.reasonName,
    displayOrder: params.displayOrder,
    active: params.active,
    storeId: params.storeId,
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/admin/seat-leave-reasons${query}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  return handleReasonFormDataResponse(res, '이탈 사유 등록에 실패했습니다.');
}

/** 이탈 사유 수정 — iconFile은 선택. 없으면 기존 아이콘 유지, 있으면 교체 */
export async function updateSeatLeaveReason(id: number, params: {
  reasonName: string;
  displayOrder: number;
  active: boolean;
  iconFile?: File;
}): Promise<SeatLeaveReason> {
  if (params.iconFile) validateIconFile(params.iconFile);

  const formData = new FormData();
  if (params.iconFile) {
    formData.append('iconFile', params.iconFile);
  }

  const query = buildReasonQuery({
    reasonName: params.reasonName,
    displayOrder: params.displayOrder,
    active: params.active,
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/admin/seat-leave-reasons/${id}${query}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  return handleReasonFormDataResponse(res, '이탈 사유 수정에 실패했습니다.');
}

/** 이탈 사유 삭제 */
export function deleteSeatLeaveReason(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/seat-leave-reasons/${id}`);
}

/* ── 페이지 응답 ── */

export interface PageResponse<T> {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  content: T[];
}

/* ── 좌석 이탈 기록 조회 ── */

/** 기간별 좌석이탈 현황 조회 (페이지네이션) */
export function getSeatLeaves(params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SeatLeaveRecord>> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  query.set('page', String(params?.page ?? 0));
  query.set('size', String(params?.size ?? 20));
  query.set('sort', 'startedAt,DESC');

  return apiGet<PageResponse<SeatLeaveRecord>>(`/api/v1/admin/seat-leaves?${query.toString()}`);
}

/** 관리자 강제 복귀 처리 */
export function forceReturnSeatLeave(id: number): Promise<SeatLeaveRecord> {
  return apiPost<SeatLeaveRecord>(`/api/v1/admin/seat-leaves/${id}/force-return`);
}

/** 좌석이탈 엑셀 다운로드 */
export async function exportSeatLeaves(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/seat-leaves/export?${query.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('엑셀 다운로드 실패');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `좌석이탈_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
