/** 식사 상태 */
export const MEAL_STATUS = {
  COMPLETED: '식사 완료',
  WAITING: '대기',
  CANCELLED: '취소',
} as const;

export type MealStatus = (typeof MEAL_STATUS)[keyof typeof MEAL_STATUS];

/** 식사 태그 기록 */
export interface MealTagRecord {
  id: number;
  memberId: number;
  memberName: string;
  status: MealStatus;
  tagTime: string;
}
