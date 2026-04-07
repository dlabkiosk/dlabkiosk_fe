import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { TTS_TIMEOUT_MULTIPLIER } from '../constants/voiceGuide';

type FontScale = 'default' | 'large' | 'xlarge';
type ZoomScale = 'default' | 'zoomed';

interface AccessibilityState {
  ttsEnabled: boolean;
  fontScale: FontScale;
  zoom: ZoomScale;
  highContrast: boolean;
}

interface AccessibilityActions {
  toggleTts: () => void;
  cycleFontScale: () => void;
  toggleZoom: () => void;
  toggleHighContrast: () => void;
  reset: () => void;
  /** cancelBefore=false 이면 이전 발화를 취소하지 않고 큐에 추가 (숫자 키패드 등) */
  speak: (text: string, cancelBefore?: boolean) => void;
  /** TTS 모드일 때 타임아웃에 적용할 배율 (꺼져 있으면 1) */
  timeoutMultiplier: number;
}

type AccessibilityContextValue = AccessibilityState & AccessibilityActions;

const DEFAULT_STATE: AccessibilityState = {
  ttsEnabled: false,
  fontScale: 'default',
  zoom: 'default',
  highContrast: false,
};

const FONT_SCALE_VALUES: Record<FontScale, number> = {
  default: 2,
  large: 2.25,
  xlarge: 2.5,
};

const ZOOM_VALUES: Record<ZoomScale, number> = {
  default: 1,
  zoomed: 1.3,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE);

  const applyStyles = useCallback((font: FontScale, zoom: ZoomScale) => {
    const root = document.documentElement;
    root.style.setProperty('--a11y-font-scale', String(FONT_SCALE_VALUES[font]));
    root.style.setProperty('--a11y-zoom', String(ZOOM_VALUES[zoom]));
    // 화면확대 모드: 스크롤/터치 드래그 가능하도록 클래스 토글
    root.classList.toggle('a11y-zoomed', zoom !== 'default');
  }, []);

  const speak = useCallback((text: string, cancelBefore = true) => {
    if (!state.ttsEnabled) return;
    if (cancelBefore) speechSynthesis.cancel();
    // 발화 전 정규화:
    //  - '/'를 '슬래시'로 읽는 문제 → 공백 치환
    //  - 학생명 마스킹 '*' 제거 (예: '이*영' → '이영')
    const spoken = text.replace(/\//g, ' ').replace(/\*/g, '');
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }, [state.ttsEnabled]);

  const toggleTts = useCallback(() => {
    setState((prev) => {
      const next = !prev.ttsEnabled;
      if (!next) speechSynthesis.cancel();
      return { ...prev, ttsEnabled: next };
    });
  }, []);

  const cycleFontScale = useCallback(() => {
    setState((prev) => {
      const order: FontScale[] = ['default', 'large', 'xlarge'];
      const idx = order.indexOf(prev.fontScale);
      const next = order[(idx + 1) % order.length];
      applyStyles(next, prev.zoom);
      return { ...prev, fontScale: next };
    });
  }, [applyStyles]);

  const toggleZoom = useCallback(() => {
    setState((prev) => {
      const next: ZoomScale = prev.zoom === 'default' ? 'zoomed' : 'default';
      applyStyles(prev.fontScale, next);
      return { ...prev, zoom: next };
    });
  }, [applyStyles]);

  const toggleHighContrast = useCallback(() => {
    setState((prev) => {
      const next = !prev.highContrast;
      document.documentElement.classList.toggle('high-contrast', next);
      return { ...prev, highContrast: next };
    });
  }, []);

  const reset = useCallback(() => {
    speechSynthesis.cancel();
    applyStyles('default', 'default');
    document.documentElement.classList.remove('high-contrast');
    document.documentElement.classList.remove('a11y-zoomed');
    setState(DEFAULT_STATE);
  }, [applyStyles]);

  const timeoutMultiplier = useMemo(() => (state.ttsEnabled ? TTS_TIMEOUT_MULTIPLIER : 1), [state.ttsEnabled]);

  return (
    <AccessibilityContext.Provider value={{ ...state, toggleTts, cycleFontScale, toggleZoom, toggleHighContrast, reset, speak, timeoutMultiplier }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
