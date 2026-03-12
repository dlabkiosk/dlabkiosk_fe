// 타입 & 상수
export type {
  DsaBaseResponse,
  TokenRequest,
  TokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TotalAttendCountResponse,
  FirstAttendStdItem,
  FirstAttendStdResponse,
  SetAttendStdRequest,
  SetAttendStdResponse,
  GetAttendListStdRequest,
  GetAttendListStdResponse,
  RequestListItem,
  GetRequestListStdResponse,
  SetAttendRequestStdRequest,
  SetRequestCancelStdRequest,
  StudyAreaItem,
  GetStudyAreaInfoResponse,
  StudyAreaSeatItem,
  GetStudyAreaSeatInfoResponse,
  AttendAreaCountItem,
  GetAttendAreaCountResponse,
  SeatStateItem,
  GetStudyAreaSeatStateResponse,
  FirstStudyTimeStdItem,
  GetFirstLastWeekStudyTimeStdResponse,
  GetAvgLastWeekStudyTimeResponse,
  StudyTimeRankItem,
  GetLastWeekStudyTimeListResponse,
  ScheduleItem,
  GetScheduleInfoResponse,
  LessonItem,
  GetLessonInfoResponse,
  AttGn,
} from './types/dsa.types.ts';

export {
  DSA_CODE,
  ATT_GN,
  REG_GN,
  REQUEST_STATE,
  DSA_SEAT_STATE,
  DSA_SEAT_GN,
} from './types/dsa.types.ts';

// 클라이언트
export {
  setAuthConfig,
  setTokens,
  getToken,
  clearTokens,
  requestToken,
  generateSecretId,
  dsaFetch,
  dsaAuthFetch,
  DsaApiError,
} from './dsaClient.ts';

// 출결 API
export {
  getTotalAttendCount,
  getFirstAttendStd,
  setAttendStd,
  getAttendListStd,
  getRequestListStd,
  setAttendRequestStd,
  setRequestCancelStd,
} from './attendanceApi.ts';

// 좌석/구역 API
export {
  getStudyAreaInfo,
  getStudyAreaSeatInfo,
  getAttendAreaCount,
  getStudyAreaSeatState,
} from './seatApi.ts';

// 랭킹 API
export {
  getFirstLastWeekStudyTimeStd,
  getAvgLastWeekStudyTime,
  getLastWeekStudyTimeList,
} from './rankingApi.ts';

// 시간표/강좌 API
export {
  getScheduleInfo,
  getLessonInfo,
} from './scheduleApi.ts';
