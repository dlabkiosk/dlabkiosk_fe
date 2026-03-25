import { apiGet, apiPost, apiDelete } from './client';

/* ── 타입 ── */

export interface MealMenuDay {
  id?: number;
  menuDate: string;       // YYYY-MM-DD
  dayOfWeek?: string;     // MONDAY, TUESDAY, ...
  lunch: string;
  dinner: string;
  closed: boolean;
}

export interface MealMenuWeekResponse {
  weekStartDate: string;  // YYYY-MM-DD (월요일)
  weekEndDate: string;    // YYYY-MM-DD (일요일)
  days: MealMenuDay[];
}

export interface MealMenuSaveBody {
  weekStartDate: string;
  days: {
    menuDate: string;
    lunch: string;
    dinner: string;
    closed: boolean;
  }[];
}

/* ── API ── */

/** 해당 주 식단 조회 */
export function getMealMenuWeek(weekStartDate: string, storeId?: number): Promise<MealMenuWeekResponse> {
  const params = new URLSearchParams({ weekStartDate });
  if (storeId !== undefined) params.set('storeId', String(storeId));
  return apiGet<MealMenuWeekResponse>(`/api/v1/admin/meal-menus?${params.toString()}`);
}

/** 해당 주 식단 등록/수정 (upsert) */
export function saveMealMenu(body: MealMenuSaveBody, storeId?: number): Promise<MealMenuWeekResponse> {
  const params = storeId !== undefined ? `?storeId=${storeId}` : '';
  return apiPost<MealMenuWeekResponse>(`/api/v1/admin/meal-menus${params}`, body as unknown as Record<string, unknown>);
}

/** 해당 주 식단 전체 삭제 */
export function deleteMealMenu(weekStartDate: string, storeId?: number): Promise<string> {
  const params = new URLSearchParams({ weekStartDate });
  if (storeId !== undefined) params.set('storeId', String(storeId));
  return apiDelete<string>(`/api/v1/admin/meal-menus?${params.toString()}`);
}
