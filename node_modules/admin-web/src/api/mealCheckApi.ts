import { apiGet } from './client';

export interface MealCheckRow {
  id: number;
  studentName: string;
  className: string;
  studentNumber: string;
  seatLabel: string;
  lunchRequested: boolean;
  lunchTaggedAt: string | null;
  lunchNeedsConfirm: boolean;
  dinnerRequested: boolean;
  dinnerTaggedAt: string | null;
  dinnerNeedsConfirm: boolean;
}

export interface MealCheckListResponse {
  content: MealCheckRow[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface MealCheckParams {
  yearMonth: string;
  studentName?: string;
  className?: string;
  studentNumber?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export function getMealCheckList(params: MealCheckParams): Promise<MealCheckListResponse> {
  const query = new URLSearchParams();
  query.set('yearMonth', params.yearMonth);
  if (params.studentName) query.set('studentName', params.studentName);
  if (params.className) query.set('className', params.className);
  if (params.studentNumber) query.set('studentNumber', params.studentNumber);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.size !== undefined) query.set('size', String(params.size));
  if (params.sort) query.set('sort', params.sort);
  if (params.direction) query.set('direction', params.direction);
  return apiGet<MealCheckListResponse>(`/api/v1/admin/meal-checks?${query.toString()}`);
}
