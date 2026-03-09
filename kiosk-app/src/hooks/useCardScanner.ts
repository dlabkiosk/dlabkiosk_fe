import { useEffect, useRef, useState } from 'react';

/** 카드 스캔 결과 */
export interface CardScanResult {
  rawValue: string;
  receivedAt: Date;
}

/**
 * 시리얼 포트(COM) 카드리더기 입력을 수신하는 훅
 *
 * main 프로세스 → IPC(card:scanned) → preload 브리지 → 이 훅
 */
export function useCardScanner(
  onScan: (result: CardScanResult) => void,
  debounceMs = 1500
) {
  const lastScanTimeRef = useRef(0);
  const [lastScan, setLastScan] = useState<CardScanResult | null>(null);

  useEffect(() => {
    if (!window.kiosk?.onCardScanned) {
      console.warn('[useCardScanner] window.kiosk.onCardScanned 브리지가 없습니다');
      return;
    }

    const cleanup = window.kiosk.onCardScanned((value: string) => {
      const now = Date.now();

      if (now - lastScanTimeRef.current < debounceMs) return;

      lastScanTimeRef.current = now;
      const result: CardScanResult = {
        rawValue: value,
        receivedAt: new Date(),
      };
      setLastScan(result);
      onScan(result);
    });

    return cleanup;
  }, [onScan, debounceMs]);

  return { lastScan };
}
