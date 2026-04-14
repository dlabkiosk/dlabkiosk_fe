import { apiGet } from './client';

export interface NoticeCategory {
  id: number;
  storeId: number;
  name: string;
  displayOrder: number;
}

/** 해당 지점의 말머리 목록 조회 (displayOrder 오름차순) */
export function getNoticeCategories(): Promise<NoticeCategory[]> {
  return apiGet<NoticeCategory[]>('/api/v1/kiosk/notice-categories');
}
