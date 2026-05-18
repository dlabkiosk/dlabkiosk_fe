import { useCallback, useEffect, useRef, useState } from 'react';

/** 카드 스캔 결과 */
export interface CardScanResult {
  rawValue: string;
  receivedAt: Date;
}

/* ── localStorage 키 및 디바이스 식별자 헬퍼 ──
   같은 USB 디바이스를 가리키는지(다른 포트에 꽂혀도) 안전하게 판별하기 위해
   USB 벤더/제품 ID 를 저장하고, 자동 재연결 시 매칭. */
const STORAGE_VENDOR_KEY = 'cardReader.vendorId';
const STORAGE_PRODUCT_KEY = 'cardReader.productId';

function rememberPort(port: SerialPort): void {
  try {
    const info = port.getInfo();
    if (info.usbVendorId !== undefined) {
      localStorage.setItem(STORAGE_VENDOR_KEY, String(info.usbVendorId));
    }
    if (info.usbProductId !== undefined) {
      localStorage.setItem(STORAGE_PRODUCT_KEY, String(info.usbProductId));
    }
    console.log('[useCardScanner] 식별자 저장:', info);
  } catch { /* localStorage 접근 불가 시 무시 */ }
}

function findRememberedPort(ports: SerialPort[]): SerialPort | null {
  try {
    const vendorStr = localStorage.getItem(STORAGE_VENDOR_KEY);
    const productStr = localStorage.getItem(STORAGE_PRODUCT_KEY);
    if (!vendorStr || !productStr) return null;
    const savedVendor = Number(vendorStr);
    const savedProduct = Number(productStr);
    return ports.find((p) => {
      const info = p.getInfo();
      return info.usbVendorId === savedVendor && info.usbProductId === savedProduct;
    }) ?? null;
  } catch {
    return null;
  }
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
 *
 * ── 자동 재연결 ──
 *   - mount 시 `navigator.serial.getPorts()` 로 이전에 인증된 포트가 있으면 자동 open
 *     (Web Serial 사양상 한 번 사용자가 인증한 포트는 이후 사용자 제스처 없이 open 가능)
 *   - `serial.onconnect` / `serial.ondisconnect` 이벤트로 USB 재삽입 시 자동 재연결
 *   - 최초 1회만 어드민에서 "연결" 버튼으로 포트 선택하면, 이후 새로고침/재부팅/재삽입 후 자동 복구
 *
 * ── 디바이스 식별자 매칭 (다른 USB 포트에 꽂혀도 안전) ──
 *   - 어드민 연결 성공 시 USB 벤더/제품 ID 를 localStorage 에 저장
 *   - 자동 재연결 우선순위:
 *       1) 저장된 식별자와 일치하는 포트 (다른 USB 포트로 옮겨도 같은 디바이스로 인식)
 *       2) 인증된 포트가 정확히 1개면 그것을 사용 (최초 설치 안전망)
 *       3) 그 외 (여러 포트, 매칭 없음) → 보류, 어드민 수동 연결 필요
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

  /**
   * 이미 인증된 포트를 받아 open + read loop 시작.
   * `connect()` 와 자동 재연결 모두에서 공통 사용.
   */
  const openAndRead = useCallback(async (port: SerialPort): Promise<boolean> => {
    try {
      await port.open({ baudRate: 9600 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 이미 열려있는 경우는 정상 흐름으로 간주
      if (!msg.includes('already open')) {
        console.error('[useCardScanner] open 실패:', msg);
        return false;
      }
    }

    portRef.current = port;
    runningRef.current = true;
    setConnected(true);

    if (port.readable) {
      const reader = port.readable.getReader();
      readerRef.current = reader;
      readLoop(reader).finally(() => {
        setConnected(false);
        runningRef.current = false;
        readerRef.current = null;
        console.log('[useCardScanner] 연결 종료');
      });
    }
    return true;
  }, [readLoop]);

  /** 현재 잡고 있는 포트/리더 정리 (재연결 전에 호출) */
  const cleanupCurrent = useCallback(async () => {
    if (!portRef.current && !readerRef.current) return;
    console.log('[useCardScanner] 기존 포트 정리 중...');
    runningRef.current = false;
    try { await readerRef.current?.cancel(); } catch { /* noop */ }
    try { await portRef.current?.close(); } catch { /* noop */ }
    readerRef.current = null;
    portRef.current = null;
    setConnected(false);
  }, []);

  /**
   * 사용자 제스처가 필요한 명시적 연결 (어드민 "연결" 버튼).
   * 이미 연결된 상태면 정리 후 재선택.
   */
  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    try {
      setError(null);
      await cleanupCurrent();

      // 브라우저 레벨에 남아있는 이전 포트도 정리
      try {
        const existing = await navigator.serial.getPorts();
        for (const p of existing) {
          try { await p.close(); } catch { /* 이미 닫혔거나 접근 불가 → 무시 */ }
        }
      } catch { /* getPorts 실패 시 무시하고 계속 */ }

      console.log('[useCardScanner] 포트 선택 요청...');
      const port = await navigator.serial.requestPort();
      console.log('[useCardScanner] 포트 연결 시도');
      const ok = await openAndRead(port);
      if (ok) {
        // 다음 부팅/USB 재삽입 때 자동으로 같은 디바이스 인식하도록 식별자 저장
        rememberPort(port);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No port selected')) {
        console.log('[useCardScanner] 포트 선택 취소');
        return;
      }
      console.error('[useCardScanner] 연결 에러:', msg);
      setError(toKoreanError(msg));
    }
  }, [cleanupCurrent, openAndRead]);

  /**
   * 자동 재연결: 이전에 인증된 포트가 있으면 사용자 제스처 없이 자동 open.
   *   - mount 시 1회
   *   - serial.onconnect 이벤트 발생 시 (USB 재삽입)
   */
  const autoReconnect = useCallback(async () => {
    if (!('serial' in navigator)) return;
    if (runningRef.current) return; // 이미 연결 중이면 skip

    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length === 0) {
        console.log('[useCardScanner] 자동 재연결 — 인증된 포트 없음 (최초 사용 시 어드민에서 수동 연결 필요)');
        return;
      }

      // 1순위: 저장된 식별자(USB 벤더/제품 ID) 와 일치하는 포트 우선 매칭
      const matched = findRememberedPort(ports);
      if (matched) {
        console.log('[useCardScanner] 자동 재연결 시도 (식별자 매칭)');
        const ok = await openAndRead(matched);
        if (!ok) console.log('[useCardScanner] 자동 재연결 실패 (식별자 매칭)');
        return;
      }

      // 2순위: 인증된 포트가 정확히 1개면 그것을 사용 (최초 설치 안전망)
      if (ports.length === 1) {
        console.log('[useCardScanner] 자동 재연결 시도 (단일 포트 fallback)');
        const ok = await openAndRead(ports[0]);
        if (ok) rememberPort(ports[0]); // 이후 인식을 위해 식별자 저장
        else console.log('[useCardScanner] 자동 재연결 실패 (단일 포트 fallback)');
        return;
      }

      // 그 외: 여러 포트가 인증되어 있으나 매칭 안됨 → 안전을 위해 자동 연결하지 않음
      console.log('[useCardScanner] 자동 재연결 보류 — 인증된 포트가 여러 개이지만 저장된 식별자와 일치하는 것 없음. 어드민에서 수동 연결 권장.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useCardScanner] 자동 재연결 에러:', msg);
      // 자동 재연결 실패는 에러 UI에 노출하지 않음 (조용히 fallback)
    }
  }, [openAndRead]);

  /** mount 시 자동 재연결 + 장치 plug/unplug 이벤트 핸들러 등록 */
  useEffect(() => {
    if (!('serial' in navigator)) return;

    // 1) mount 시 자동 재연결 시도
    void autoReconnect();

    // 2) USB 재삽입 감지 → 자동 재연결
    const handleConnect = () => {
      console.log('[useCardScanner] serial.onconnect — USB 재삽입 감지');
      void autoReconnect();
    };

    // 3) USB 분리 감지 → 상태 갱신
    const handleDisconnect = () => {
      console.log('[useCardScanner] serial.ondisconnect — USB 분리 감지');
      runningRef.current = false;
      readerRef.current = null;
      portRef.current = null;
      setConnected(false);
    };

    navigator.serial.addEventListener('connect', handleConnect);
    navigator.serial.addEventListener('disconnect', handleDisconnect);

    return () => {
      navigator.serial.removeEventListener('connect', handleConnect);
      navigator.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [autoReconnect]);

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
