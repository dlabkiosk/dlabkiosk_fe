import { apiGet } from './client';

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

/** 해당 지점의 활성 광고를 순서대로 조회 */
export function getAdvertisements(): Promise<Advertisement[]> {
  return apiGet<Advertisement[]>('/api/v1/kiosk/advertisements');
}
