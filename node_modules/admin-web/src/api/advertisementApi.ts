import { apiGet, apiDelete } from './client';

/* ── 타입 ── */

export interface Advertisement {
  id: number;
  storeId: number;
  storeName: string;
  imageUrl: string;
  mediaType: string;
  displayOrder: number;
  displaySeconds: number;
  active: boolean;
}

/* ── API ── */

/** 광고 목록 조회 (MANAGER: 자기 지점, ADMIN: 전체) */
export function getAdvertisements(): Promise<Advertisement[]> {
  return apiGet<Advertisement[]>('/api/v1/admin/advertisements');
}

/** 광고 단건 조회 */
export function getAdvertisement(id: number): Promise<Advertisement> {
  return apiGet<Advertisement>(`/api/v1/admin/advertisements/${id}`);
}

/** 파일 크기 제한 (50MB) */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 너무 큽니다. (${(file.size / 1024 / 1024).toFixed(1)}MB, 최대 50MB)`);
  }
}

async function handleFormDataResponse(res: Response, fallbackMessage: string): Promise<Advertisement> {
  let json;
  try {
    json = await res.json();
  } catch {
    if (res.status === 413) throw new Error('파일 크기가 서버 허용 용량을 초과했습니다.');
    throw new Error(`서버 응답 오류 (${res.status}). 파일 크기나 형식을 확인해주세요.`);
  }
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? fallbackMessage);
  }
  return json.data;
}

/** 광고 등록 (multipart/form-data) */
export async function createAdvertisement(params: {
  file: File;
  mediaType: string;
  displayOrder: number;
  displaySeconds: number;
  storeId?: number;
}): Promise<Advertisement> {
  validateFile(params.file);

  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('mediaType', params.mediaType);
  formData.append('displayOrder', String(params.displayOrder));
  formData.append('displaySeconds', String(params.displaySeconds));
  if (params.storeId !== undefined) {
    formData.append('storeId', String(params.storeId));
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/admin/advertisements`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
  } catch (err) {
    console.error('[광고 등록] fetch 실패:', err);
    console.error('[광고 등록] URL:', `${API_BASE_URL}/api/v1/admin/advertisements`);
    throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  return handleFormDataResponse(res, '광고 등록에 실패했습니다.');
}

/** 광고 수정 (multipart/form-data, 파일은 선택) */
export async function updateAdvertisement(id: number, params: {
  file?: File;
  mediaType: string;
  displayOrder: number;
  displaySeconds: number;
  active: boolean;
}): Promise<Advertisement> {
  if (params.file) validateFile(params.file);

  const formData = new FormData();
  if (params.file) {
    formData.append('file', params.file);
  }
  formData.append('mediaType', params.mediaType);
  formData.append('displayOrder', String(params.displayOrder));
  formData.append('displaySeconds', String(params.displaySeconds));
  formData.append('active', String(params.active));

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/admin/advertisements/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  return handleFormDataResponse(res, '광고 수정에 실패했습니다.');
}

/** 광고 삭제 */
export function deleteAdvertisement(id: number): Promise<string> {
  return apiDelete<string>(`/api/v1/admin/advertisements/${id}`);
}
