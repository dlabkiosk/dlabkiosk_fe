import { apiGet, apiPost, apiPut } from './client';

export interface MealScheduleItem {
  id?: number;
  date: string;          // YYYY-MM-DD
  lunch: string;
  dinner: string;
  isHoliday: boolean;
}

export interface MealScheduleWeekResponse {
  weekStart: string;     // YYYY-MM-DD (월요일)
  meals: MealScheduleItem[];
}

export interface MealScheduleSaveBody {
  weekStart: string;
  meals: {
    date: string;
    lunch: string;
    dinner: string;
    isHoliday: boolean;
  }[];
}

export function getMealScheduleWeek(weekStart: string): Promise<MealScheduleWeekResponse> {
  return apiGet<MealScheduleWeekResponse>(
    `/api/v1/admin/meal-schedules?weekStart=${encodeURIComponent(weekStart)}`,
  );
}

export function saveMealSchedule(body: MealScheduleSaveBody): Promise<MealScheduleWeekResponse> {
  return apiPost<MealScheduleWeekResponse>('/api/v1/admin/meal-schedules', body as unknown as Record<string, unknown>);
}

export function updateMealSchedule(body: MealScheduleSaveBody): Promise<MealScheduleWeekResponse> {
  return apiPut<MealScheduleWeekResponse>('/api/v1/admin/meal-schedules', body as unknown as Record<string, unknown>);
}

export function syncMealScheduleToKiosk(weekStart: string): Promise<void> {
  return apiPost<void>('/api/v1/admin/meal-schedules/sync', { weekStart });
}
