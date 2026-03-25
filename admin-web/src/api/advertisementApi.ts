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

export interface CropParams {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

/** query params 빌드 (undefined 값 제외) */
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** 광고 등록 — file: body(multipart), 나머지: query params */
export async function createAdvertisement(params: {
  file: File;
  mediaType: string;
  displayOrder: number;
  displaySeconds: number;
  storeId?: number;
  crop?: CropParams;
}): Promise<Advertisement> {
  validateFile(params.file);

  const formData = new FormData();
  formData.append('file', params.file);

  const query = buildQuery({
    mediaType: params.mediaType,
    displayOrder: params.displayOrder,
    displaySeconds: params.displaySeconds,
    storeId: params.storeId,
    cropX: params.crop ? Math.round(params.crop.cropX) : undefined,
    cropY: params.crop ? Math.round(params.crop.cropY) : undefined,
    cropWidth: params.crop ? Math.round(params.crop.cropWidth) : undefined,
    cropHeight: params.crop ? Math.round(params.crop.cropHeight) : undefined,
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/admin/advertisements${query}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
  } catch (err) {
    console.error('[광고 등록] fetch 실패:', err);
    throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  return handleFormDataResponse(res, '광고 등록에 실패했습니다.');
}

/** 광고 수정 — file: body(multipart, 선택), 나머지: query params */
export async function updateAdvertisement(id: number, params: {
  file?: File;
  mediaType: string;
  displayOrder: number;
  displaySeconds: number;
  active: boolean;
  crop?: CropParams;
}): Promise<Advertisement> {
  if (params.file) validateFile(params.file);

  const formData = new FormData();
  if (params.file) {
    formData.append('file', params.file);
  }

  const query = buildQuery({
    mediaType: params.mediaType,
    displayOrder: params.displayOrder,
    displaySeconds: params.displaySeconds,
    active: params.active,
    cropX: params.crop ? Math.round(params.crop.cropX) : undefined,
    cropY: params.crop ? Math.round(params.crop.cropY) : undefined,
    cropWidth: params.crop ? Math.round(params.crop.cropWidth) : undefined,
    cropHeight: params.crop ? Math.round(params.crop.cropHeight) : undefined,
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/admin/advertisements/${id}${query}`, {
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
