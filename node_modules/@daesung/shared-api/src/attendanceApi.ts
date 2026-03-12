import { dsaAuthFetch } from './dsaClient.ts';
import type {
  TotalAttendCountResponse,
  FirstAttendStdResponse,
  SetAttendStdResponse,
  GetAttendListStdResponse,
  GetRequestListStdResponse,
  SetAttendRequestStdRequest,
  SetRequestCancelStdRequest,
  DsaBaseResponse,
} from './types/dsa.types.ts';

/** 현재 출석인원 조회 */
export function getTotalAttendCount(): Promise<TotalAttendCountResponse> {
  return dsaAuthFetch('/kiosk/getTotalAttendCount');
}

/** 금일 1등 등원생 조회 */
export function getFirstAttendStd(): Promise<FirstAttendStdResponse> {
  return dsaAuthFetch('/kiosk/getFirstAttendStd');
}

/** 원생 출결 저장 (카드 태깅) */
export function setAttendStd(params: {
  rfid_no: string;
  tag_dt: string;
  con_gn?: string | null;
}): Promise<SetAttendStdResponse> {
  return dsaAuthFetch('/kiosk/setAttendStd', {
    rfid_no: params.rfid_no,
    tag_dt: params.tag_dt,
    con_gn: params.con_gn ?? null,
  });
}

/** 원생 출결 현황 조회 */
export function getAttendListStd(params: {
  rfid_no: string;
  month: string;
}): Promise<GetAttendListStdResponse> {
  return dsaAuthFetch('/kiosk/getAttendListStd', {
    rfid_no: params.rfid_no,
    month: params.month,
  });
}

/** 원생 출결 신청내역 조회 */
export function getRequestListStd(params: {
  rfid_no: string;
  month: string;
}): Promise<GetRequestListStdResponse> {
  return dsaAuthFetch('/kiosk/getRequestListStd', {
    rfid_no: params.rfid_no,
    month: params.month,
  });
}

/** 원생 출결 신청 저장 */
export function setAttendRequestStd(params: {
  rfid_no: string;
  reg_gn: string;
  excuse_gn: SetAttendRequestStdRequest['excuse_gn'];
  reg_dt: string;
}): Promise<DsaBaseResponse> {
  return dsaAuthFetch('/kiosk/setAttendRequestStd', {
    rfid_no: params.rfid_no,
    reg_gn: params.reg_gn,
    excuse_gn: params.excuse_gn,
    reg_dt: params.reg_dt,
  });
}

/** 원생 출결 신청 취소 */
export function setRequestCancelStd(params: {
  rfid_no: SetRequestCancelStdRequest['rfid_no'];
  reg_cd: string;
}): Promise<DsaBaseResponse> {
  return dsaAuthFetch('/kiosk/setRequestCancleStd', {
    rfid_no: params.rfid_no,
    reg_cd: params.reg_cd,
  });
}
