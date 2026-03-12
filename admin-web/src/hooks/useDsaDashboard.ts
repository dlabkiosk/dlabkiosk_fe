import { useEffect, useState } from 'react';
import {
  getTotalAttendCount,
  getFirstAttendStd,
  getLastWeekStudyTimeList,
  getAttendAreaCount,
  DsaApiError,
} from '@daesung/shared-api';
import type {
  FirstAttendStdItem,
  StudyTimeRankItem,
  AttendAreaCountItem,
} from '@daesung/shared-api';

export interface DsaDashboardData {
  totalAttendCount: string | null;
  firstAttendStd: FirstAttendStdItem[] | null;
  studyTimeRanking: StudyTimeRankItem[] | null;
  attendAreaCount: AttendAreaCountItem[] | null;
}

interface DsaDashboardState {
  data: DsaDashboardData;
  isLoading: boolean;
  error: string | null;
}

export function useDsaDashboard(isReady: boolean): DsaDashboardState {
  const [state, setState] = useState<DsaDashboardState>({
    data: {
      totalAttendCount: null,
      firstAttendStd: null,
      studyTimeRanking: null,
      attendAreaCount: null,
    },
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;

    async function fetchAll() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const [attendCount, firstStd, ranking, areaCount] = await Promise.allSettled([
          getTotalAttendCount(),
          getFirstAttendStd(),
          getLastWeekStudyTimeList(),
          getAttendAreaCount(),
        ]);

        if (cancelled) return;

        setState({
          data: {
            totalAttendCount:
              attendCount.status === 'fulfilled' ? attendCount.value.total_inwon : null,
            firstAttendStd:
              firstStd.status === 'fulfilled' ? firstStd.value.data : null,
            studyTimeRanking:
              ranking.status === 'fulfilled' ? ranking.value.data : null,
            attendAreaCount:
              areaCount.status === 'fulfilled' ? areaCount.value.data : null,
          },
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof DsaApiError ? err.message : 'DSA 데이터 조회 실패';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [isReady]);

  return state;
}
