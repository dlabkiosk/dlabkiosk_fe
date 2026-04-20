import { useCallback, useEffect, useRef, useState } from 'react';

/** 카드 스캔 결과 */
export interface CardScanResult {
  rawValue: string;
  receivedAt: Date;
}

/** Web Serial API의 영문 에러 메시지를 한글로 변환 */
function toKoreanError(msg: string): string {
  if (msg.includes('Failed to open serial port')) {
    return '카드리더기를 연결할 수 없습니다. 다른 프로그램에서 사용 중이거나 장치가 분리된 상태일 수 있습니다.';
  }
  if (msg.includes('The port is already open')) {
    return '이미 카드리더기가 연결되어 있습니다.';
  }
  if (msg.includes('The device has been lost') || msg.includes('device has been lost')) {
    return '카드리더기 연결이 끊어졌습니다. 장치를 다시 연결해주세요.';
  }
  if (msg.includes('NetworkError') || msg.includes('Access denied')) {
    return '카드리더기에 접근할 수 없습니다. 장치 권한을 확인해주세요.';
  }
  if (msg.includes('NotFoundError')) {
    return '카드리더기를 찾을 수 없습니다.';
  }
  return '카드리더기 연결 중 오류가 발생했습니다.';
}

/**
 * Web Serial API를 사용한 카드리더기 입력 수신 훅
 *
 * STX(0x02) / ETX(0x03) 프로토콜 파싱
 * baudRate: 9600
 */
export function useCardScanner(
  onScan: (result: CardScanResult) => void,
  debounceMs = 1500
) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<CardScanResult | null>(null);

  const lastScanTimeRef = useRef(0);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const runningRef = useRef(false);
  const onScanRef = useRef(onScan);

  // onScan 콜백 최신 참조 유지
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  /** 시리얼 데이터 읽기 루프 */
  const readLoop = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const STX = 0x02;
    const ETX = 0x03;
    let buffer: number[] = [];
    let inFrame = false;

    console.log('[useCardScanner] 읽기 루프 시작');

    try {
      while (runningRef.current) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('[useCardScanner] 스트림 종료');
          break;
        }

        if (value) {
          console.log('[useCardScanner] raw:', Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(' '));

          for (const byte of value) {
            if (byte === STX) {
              inFrame = true;
              buffer = [];
            } else if (byte === ETX && inFrame) {
              inFrame = false;
              const cardValue = new TextDecoder().decode(new Uint8Array(buffer)).trim();

              if (cardValue.length === 0) continue;

              const now = Date.now();
              if (now - lastScanTimeRef.current < debounceMs) {
                console.log('[useCardScanner] 중복 입력 무시 (debounce)');
                continue;
              }

              lastScanTimeRef.current = now;
              console.log('[useCardScanner] scanned:', cardValue);

              const result: CardScanResult = {
                rawValue: cardValue,
                receivedAt: new Date(),
              };
              setLastScan(result);
              onScanRef.current(result);
            } else if (inFrame) {
              buffer.push(byte);
            }
          }
        }
      }
    } catch (err) {
      if (runningRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useCardScanner] 읽기 에러:', msg);
        setError(toKoreanError(msg));
      }
    }
  }, [debounceMs]);

  /** 포트 연결 (사용자 제스처 필요). 이미 연결된 상태면 정리 후 재연결. */
  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    try {
      setError(null);

      // 1) 현재 훅이 잡고 있는 포트/리더 정리
      if (portRef.current || readerRef.current) {
        console.log('[useCardScanner] 기존 포트 정리 중...');
        runningRef.current = false;
        try { await readerRef.current?.cancel(); } catch { /* noop */ }
        try { await portRef.current?.close(); } catch { /* noop */ }
        readerRef.current = null;
        portRef.current = null;
        setConnected(false);
      }

      // 2) 로그아웃/재마운트로 훅은 새로 만들어졌지만 브라우저 레벨에서 이미 열린
      //    포트(이전 세션에서 close 미완료된 포트)가 남아있는 경우까지 정리
      try {
        const existing = await navigator.serial.getPorts();
        for (const p of existing) {
          try { await p.close(); } catch { /* 이미 닫혔거나 접근 불가 → 무시 */ }
        }
      } catch { /* getPorts 실패 시 무시하고 계속 */ }

      console.log('[useCardScanner] 포트 선택 요청...');

      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      console.log('[useCardScanner] 포트 연결 성공');
      portRef.current = port;
      runningRef.current = true;
      setConnected(true);

      if (port.readable) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        readLoop(reader).finally(() => {
          setConnected(false);
          runningRef.current = false;
          console.log('[useCardScanner] 연결 종료');
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 사용자가 포트 선택 취소한 경우
      if (msg.includes('No port selected')) {
        console.log('[useCardScanner] 포트 선택 취소');
        return;
      }
      console.error('[useCardScanner] 연결 에러:', msg);
      setError(toKoreanError(msg));
    }
  }, [readLoop]);

  /** 컴포넌트 언마운트 시 정리 — cancel → close 순서 보장 */
  useEffect(() => {
    return () => {
      runningRef.current = false;
      const reader = readerRef.current;
      const port = portRef.current;
      readerRef.current = null;
      portRef.current = null;
      (async () => {
        try { await reader?.cancel(); } catch { /* noop */ }
        try { await port?.close(); } catch { /* noop */ }
      })();
    };
  }, []);

  return { lastScan, connected, error, connect };
}
