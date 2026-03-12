import { useCallback, useEffect, useRef, useState } from 'react';

/** 카드 스캔 결과 */
export interface CardScanResult {
  rawValue: string;
  receivedAt: Date;
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
        setError(msg);
      }
    }
  }, [debounceMs]);

  /** 포트 연결 (사용자 제스처 필요) */
  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    try {
      setError(null);
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
      setError(msg);
    }
  }, [readLoop]);

  /** 컴포넌트 언마운트 시 정리 */
  useEffect(() => {
    return () => {
      runningRef.current = false;
      readerRef.current?.cancel().catch(() => {});
      portRef.current?.close().catch(() => {});
    };
  }, []);

  return { lastScan, connected, error, connect };
}
