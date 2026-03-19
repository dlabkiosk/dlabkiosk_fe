import { dsaAuthFetch } from './dsaClient.ts';
import type { GetDlabListResponse } from './types/dsa.types.ts';

/** 지점(DLab) 목록 조회 */
export function getDlabList(): Promise<GetDlabListResponse> {
  return dsaAuthFetch('/kiosk/getDlabList');
}
