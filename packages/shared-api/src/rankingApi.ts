import { dsaAuthFetch } from './dsaClient.ts';
import type {
  GetFirstLastWeekStudyTimeStdResponse,
  GetAvgLastWeekStudyTimeResponse,
  GetLastWeekStudyTimeListResponse,
} from './types/dsa.types.ts';

/** 전주 공부시간 1위 원생 조회 */
export function getFirstLastWeekStudyTimeStd(): Promise<GetFirstLastWeekStudyTimeStdResponse> {
  return dsaAuthFetch('/kiosk/getFirstLastWeekStudyTimeStd');
}

/** 전주 1일 평균 공부시간 조회 */
export function getAvgLastWeekStudyTime(): Promise<GetAvgLastWeekStudyTimeResponse> {
  return dsaAuthFetch('/kiosk/getAvgLastWeekStudyTime');
}

/** 전주 공부순위 목록 조회 */
export function getLastWeekStudyTimeList(): Promise<GetLastWeekStudyTimeListResponse> {
  return dsaAuthFetch('/kiosk/getLastWeekStudyTimeList');
}
