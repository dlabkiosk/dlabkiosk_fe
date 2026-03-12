import { useEffect, useRef, useState } from 'react';

/** QR 스캔 결과 */
export interface QrScanResult {
  rawValue: string;
  receivedAt: Date;
}

/**
 * USB QR 스캐너(HID 키보드 방식) 입력 수신 훅
 *
 * QR 스캐너는 키보드처럼 문자를 빠르게 입력하고 마지막에 Enter를 보낸다.
 * 사람의 타이핑과 구분하기 위해 입력 간격이 짧은 연속 입력만 QR로 인식한다.
 *
 * @param onScan - 스캔 완료 시 호출되는 콜백
 * @param options.debounceMs - 동일 QR 중복 입력 방지 간격 (기본 1500ms)
 * @param options.maxKeyIntervalMs - 키 입력 간 최대 허용 간격 (기본 100ms, 이보다 느리면 사람 입력으로 판단)
 * @param options.minLength - QR 값 최소 길이 (기본 4, 너무 짧은 입력 무시)
 */
export function useQrScanner(
  onScan: (result: QrScanResult) => void,
  options: {
    debounceMs?: number;
    maxKeyIntervalMs?: number;
    minLength?: number;
  } = {}
) {
  const {
    debounceMs = 1500,
    maxKeyIntervalMs = 100,
    minLength = 4,
  } = options;

  const [lastScan, setLastScan] = useState<QrScanResult | null>(null);

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const lastScanTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // onScan 콜백 최신 참조 유지
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 요소에 포커스된 경우 무시 (검색창 등)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const now = Date.now();

      if (e.key === 'Enter') {
        const scannedValue = bufferRef.current.trim();
        bufferRef.current = '';

        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }

        if (scannedValue.length < minLength) {
          return;
        }

        // 중복 입력 방지
        if (now - lastScanTimeRef.current < debounceMs) {
          console.log('[useQrScanner] 중복 입력 무시 (debounce)');
          return;
        }

        lastScanTimeRef.current = now;
        console.log('[useQrScanner] scanned:', scannedValue);

        const result: QrScanResult = {
          rawValue: scannedValue,
          receivedAt: new Date(),
        };
        setLastScan(result);
        onScanRef.current(result);
        return;
      }

      // 단일 문자 키만 버퍼에 추가
      if (e.key.length !== 1) {
        return;
      }

      // 이전 키 입력과 간격이 너무 길면 버퍼 초기화 (사람 입력으로 판단)
      if (bufferRef.current.length > 0 && now - lastKeyTimeRef.current > maxKeyIntervalMs) {
        bufferRef.current = '';
      }

      bufferRef.current += e.key;
      lastKeyTimeRef.current = now;

      // Enter 없이 입력이 멈추면 버퍼 초기화
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        bufferRef.current = '';
        resetTimerRef.current = null;
      }, maxKeyIntervalMs * 2);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [debounceMs, maxKeyIntervalMs, minLength]);

  return { lastScan };
}
