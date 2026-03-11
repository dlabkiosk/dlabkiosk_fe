import { useCallback, useRef } from 'react';

/**
 * 연속 탭으로 숨겨진 기능을 활성화하는 훅
 *
 * @param onActivate - 필요 횟수만큼 탭 완료 시 호출
 * @param requiredTaps - 필요 탭 횟수 (기본 5)
 * @param timeoutMs - 탭 간 최대 허용 간격 (기본 3000ms)
 */
export function useSecretTap(
  onActivate: () => void,
  requiredTaps = 3,
  timeoutMs = 3000
) {
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const handleTap = useCallback(() => {
    const now = Date.now();

    if (now - lastTapTimeRef.current > timeoutMs) {
      tapCountRef.current = 0;
    }

    tapCountRef.current += 1;
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= requiredTaps) {
      tapCountRef.current = 0;
      onActivateRef.current();
    }
  }, [requiredTaps, timeoutMs]);

  return handleTap;
}
