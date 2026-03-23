import { apiGet } from './client';

/* ── 타입 ── */

export interface DsaRankingItem {
  [key: string]: string;
}

export interface DsaRankingBlock {
  code: number;
  message: string;
  data: DsaRankingItem[];
  extra: Record<string, string>;
  success: boolean;
  total_inwon: string;
  study_tm: string;
}

export interface StudyRankingData {
  firstPlace: DsaRankingBlock;
  averageStudyTime: DsaRankingBlock;
  rankingList: DsaRankingBlock;
}

/* ── 전지점 랭킹 타입 ── */

export interface AllStoreRankingItem {
  rank: number;
  studentName: string;
  storeName: string;
  studyTime: string;
  studyTimeMinutes: number;
}

export interface AllStoreRankingData {
  rankings: AllStoreRankingItem[];
}

/* ── API ── */

/** 전주 순공시간 랭킹, 1위, 평균 공부시간 조회 */
export function getStudyRankings(): Promise<StudyRankingData> {
  return apiGet<StudyRankingData>('/api/v1/kiosk/study-rankings');
}

/** 전지점 전주 순공시간 랭킹 조회 */
export function getAllStoreRankings(): Promise<AllStoreRankingData> {
  return apiGet<AllStoreRankingData>('/api/v1/kiosk/study-rankings/all');
}
