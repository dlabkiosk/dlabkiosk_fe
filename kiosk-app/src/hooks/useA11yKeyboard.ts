import { useEffect, useRef } from 'react';

/**
 * 배리어프리 키패드 입력 매핑 훅 (KS X 9211:2021 호환)
 *
 * 표준 배리어프리 키패드 (4x3 + 방향키 + 제어):
 *   [1] [2] [3]          [∧]               [♪↑]
 *   [4] [5] [6]      [<] [O] [>]           [♪↓]
 *   [7] [8] [9]          [∨]
 *   [*] [0] [#]      [△]     [×]           (이어폰 잭)
 *
 * --- QR 스캐너 / RFID 와의 공존 ---
 * - RFID(`useCardScanner`): Web Serial API → 키 이벤트 발생 안 함. 영향 0.
 * - QR(`useQrScanner`): HID 키보드. 빠른 연속 입력 + Enter 종결.
 *   본 훅은 `KEY_TIMING_GUARD_MS`(120ms) 동안 추가 입력이 없을 때만 액션 실행.
 *   QR 데이터(수 ms 간격 연속 입력)는 가드에 걸려 자동 취소되어 무시.
 *
 * --- 입력 요소 포커스 처리 ---
 * INPUT/TEXTAREA/contenteditable 포커스 시 본 훅은 동작하지 않음
 * (사용자가 일반 입력 중일 때 단축키 발동 방지).
 */

/** 정규화된 키패드 키 이름 */
export type A11yKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'STAR'    // * (별표)
  | 'HASH'    // # (샵)
  | 'ENTER'   // O (가운데) / Enter
  | 'CANCEL'  // × / Escape
  | 'HOME'    // △
  | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface UseA11yKeyboardOptions {
  /** 키 → 액션 매핑. undefined 값은 비활성 */
  mapping: Partial<Record<A11yKey, (() => void) | undefined>>;
  /** 키 누름 시 TTS로 읽어줄 라벨. `speak` 제공된 경우에만 발화 */
  echoLabels?: Partial<Record<A11yKey, string>>;
  /** false 시 훅 비활성 (예: 다른 모달 활성 중일 때 메인 단축키 비활성) */
  enabled?: boolean;
  /** TTS 발화 함수. 보통 `useAccessibility().speak` 주입 */
  speak?: (text: string, cancelBefore?: boolean) => void;
}

/** QR 스캐너의 `maxKeyIntervalMs`(100ms)보다 약간 큰 값. 단일 사람 입력 판별 */
const KEY_TIMING_GUARD_MS = 120;

/** OS 키 이벤트 → 정규화된 A11yKey. 매핑 불가능한 키는 null */
function normalizeKey(e: KeyboardEvent): A11yKey | null {
  const key = e.key;
  const code = e.code;

  // 숫자 (메인 영역 + Numpad 모두)
  if (key >= '0' && key <= '9') {
    return key as A11yKey;
  }
  if (/^Numpad[0-9]$/.test(code)) {
    return code.slice(-1) as A11yKey;
  }

  // 특수
  if (key === '*' || code === 'NumpadMultiply') return 'STAR';
  if (key === '#') return 'HASH';

  // 제어
  if (key === 'Enter') return 'ENTER';
  if (key === 'Escape') return 'CANCEL';
  if (key === 'Home') return 'HOME';

  // 방향
  if (key === 'ArrowUp') return 'UP';
  if (key === 'ArrowDown') return 'DOWN';
  if (key === 'ArrowLeft') return 'LEFT';
  if (key === 'ArrowRight') return 'RIGHT';

  return null;
}

/** 입력 요소(INPUT/TEXTAREA/contenteditable) 포커스 시 단축키 비활성 */
function isInputFocused(target: EventTarget | null): boolean {
  if (!target || !(target as HTMLElement).tagName) return false;
  const el = target as HTMLElement;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function useA11yKeyboard({
  mapping,
  echoLabels = {},
  enabled = true,
  speak,
}: UseA11yKeyboardOptions): void {
  // 매핑/콜백 최신 참조 유지 (effect 의존성 회전 방지)
  const mappingRef = useRef(mapping);
  const echoLabelsRef = useRef(echoLabels);
  const speakRef = useRef(speak);
  mappingRef.current = mapping;
  echoLabelsRef.current = echoLabels;
  speakRef.current = speak;

  // timing 가드용 pending 입력 추적
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // 일반 입력 필드 포커스 시 무시 (QR 스캐너와 동일 패턴)
      if (isInputFocused(e.target)) return;

      const a11yKey = normalizeKey(e);
      if (!a11yKey) return;

      const action = mappingRef.current[a11yKey];
      if (!action) return;

      // 이미 pending 입력이 있으면 = 빠른 연속 입력 = QR 스캐너 데이터로 판단
      // 둘 다 취소하고 QR 스캐너에 위임
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
        return;
      }

      // ESC(취소)는 명확한 의도 키 → timing 가드 우회, 즉시 실행
      if (a11yKey === 'CANCEL') {
        action();
        const label = echoLabelsRef.current[a11yKey];
        if (label && speakRef.current) speakRef.current(label);
        return;
      }

      // 일반 키: 120ms 동안 추가 입력 없으면 사람 단일 입력으로 판단 → 액션 실행
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        action();
        const label = echoLabelsRef.current[a11yKey];
        if (label && speakRef.current) speakRef.current(label);
      }, KEY_TIMING_GUARD_MS);
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [enabled]);
}
