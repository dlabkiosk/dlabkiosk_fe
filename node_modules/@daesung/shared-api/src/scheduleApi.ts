import { dsaAuthFetch } from './dsaClient.ts';
import type {
  GetScheduleInfoResponse,
  GetLessonInfoResponse,
} from './types/dsa.types.ts';

/** 시간표 정보 조회 */
export function getScheduleInfo(): Promise<GetScheduleInfoResponse> {
  return dsaAuthFetch('/kiosk/getScheduleInfo');
}

/** 강좌 시간 정보 조회 */
export function getLessonInfo(): Promise<GetLessonInfoResponse> {
  return dsaAuthFetch('/kiosk/getLessonInfo');
}
