import { dsaAuthFetch } from './dsaClient.ts';
import type {
  GetStudyAreaInfoResponse,
  GetStudyAreaSeatInfoResponse,
  GetAttendAreaCountResponse,
  GetStudyAreaSeatStateResponse,
} from './types/dsa.types.ts';

/** 독서실 구역 정보 조회 */
export function getStudyAreaInfo(): Promise<GetStudyAreaInfoResponse> {
  return dsaAuthFetch('/kiosk/getStudyAreaInfo');
}

/** 독서실 구역 좌석 정보 조회 */
export function getStudyAreaSeatInfo(areaCd: string): Promise<GetStudyAreaSeatInfoResponse> {
  return dsaAuthFetch('/kiosk/getStudyAreaSeatInfo', { area_cd: areaCd });
}

/** 독서실 구역별 출석 인원 조회 */
export function getAttendAreaCount(): Promise<GetAttendAreaCountResponse> {
  return dsaAuthFetch('/kiosk/getAttendAreaCount');
}

/** 독서실 구역/좌석별 상태 조회 */
export function getStudyAreaSeatState(areaCd: string): Promise<GetStudyAreaSeatStateResponse> {
  return dsaAuthFetch('/kiosk/getStudyAreaSeatState', { area_cd: areaCd });
}
