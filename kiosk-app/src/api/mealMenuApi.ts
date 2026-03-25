import { apiGet } from './client';

/* ── 타입 ── */

export interface MealMenuDay {
  id: number;
  menuDate: string;       // YYYY-MM-DD
  dayOfWeek: string;      // MONDAY, TUESDAY, ...
  lunch: string;
  dinner: string;
  closed: boolean;
}

export interface MealMenuWeekResponse {
  weekStartDate: string;
  weekEndDate: string;
  days: MealMenuDay[];
}

/* ── API ── */

/** 해당 주 식단 조회 (미입력 시 이번 주 월요일 기준) */
export function getMealMenuWeek(weekStartDate?: string, storeId?: number): Promise<MealMenuWeekResponse> {
  const params = new URLSearchParams();
  if (weekStartDate) params.set('weekStartDate', weekStartDate);
  if (storeId !== undefined) params.set('storeId', String(storeId));
  const qs = params.toString();
  return apiGet<MealMenuWeekResponse>(`/api/v1/kiosk/meal-menus${qs ? `?${qs}` : ''}`);
}
