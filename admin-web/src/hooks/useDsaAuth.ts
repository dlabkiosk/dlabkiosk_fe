import { useEffect, useState } from 'react';
import { setAuthConfig, requestToken, getToken } from '@daesung/shared-api';

// TODO: 추후 환경변수 또는 로그인 응답에서 가져오도록 변경
const DSA_CONFIG = {
  acad_cd: '45',
  client_id: 'client8_1',
  rawSecret: 'test123',
};

interface DsaAuthState {
  isReady: boolean;
  error: string | null;
}

export function useDsaAuth(): DsaAuthState {
  const [state, setState] = useState<DsaAuthState>({
    isReady: getToken() !== null,
    error: null,
  });

  useEffect(() => {
    if (state.isReady) return;

    let cancelled = false;

    async function init() {
      try {
        setAuthConfig(DSA_CONFIG);
        await requestToken();
        if (!cancelled) {
          setState({ isReady: true, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'DSA 인증 실패';
          setState({ isReady: false, error: message });
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [state.isReady]);

  return state;
}
