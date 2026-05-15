import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoreByCode, kioskLogin } from '../api/kioskAuthApi';
import type { KioskSession } from '../api/kioskAuthApi';
import logoImg from '../assets/logo.png';
import blackLogoImg from '../assets/black_logo.png';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useA11yKeyboard } from '../hooks/useA11yKeyboard';
import {
  VOICE_A11Y_CANCEL,
  VOICE_A11Y_KEYPAD_BACKSPACE,
} from '../constants/voiceGuide';
import styles from './KioskLoginPage.module.css';

interface KioskLoginPageProps {
  onLogin: (session: KioskSession) => void;
}

const PIN_LENGTH = 4;

export default function KioskLoginPage({ onLogin }: KioskLoginPageProps) {
  const { highContrast, speak } = useAccessibility();
  const [step, setStep] = useState<'storeCode' | 'pin'>('storeCode');
  const [storeCode, setStoreCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* 지점 코드 확인 */
  const handleStoreSubmit = useCallback(async () => {
    const code = storeCode.trim();
    if (!code) {
      setError('지점 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const store = await getStoreByCode(code);
      if (!store.active) {
        setError('비활성화된 지점입니다.');
        return;
      }
      setStoreName(store.storeName);
      setStep('pin');
    } catch {
      setError('지점 코드를 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [storeCode]);

  /* PIN 키패드 입력 */
  const handleKeyPress = async (key: string) => {
    if (loading) return;
    setError('');

    if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      setPin('');
      return;
    }

    const next = pin + key;
    if (next.length < PIN_LENGTH) {
      setPin(next);
      return;
    }

    // PIN 입력 완료 → 로그인 시도
    setPin(next);
    setLoading(true);
    try {
      const session = await kioskLogin(storeCode.trim(), next);
      onLogin(session);
    } catch {
      setError('PIN이 올바르지 않습니다.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  /* 온스크린 키보드 (지점 코드용) */
  const handleKbPress = (key: string) => {
    if (loading) return;
    setError('');
    if (key === 'backspace') {
      setStoreCode((prev) => prev.slice(0, -1));
    } else if (key === 'enter') {
      handleStoreSubmit();
    } else {
      setStoreCode((prev) => prev + key);
    }
  };

  /* ── 배리어프리 키보드 입력 — Step 1 (지점 코드: 영문+숫자+하이픈) ──
   * useA11yKeyboard는 표준 키패드(숫자/특수키)만 지원하므로,
   * 영문이 포함된 지점 코드 입력은 별도 window keydown 리스너로 처리.
   * (login 시점에는 useQrScanner가 마운트되지 않아 충돌 없음)
   */
  // 최신 콜백 참조 유지 (effect 의존성 회전 방지)
  const handleStoreSubmitRef = useRef(handleStoreSubmit);
  handleStoreSubmitRef.current = handleStoreSubmit;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    if (step !== 'storeCode') return;

    const handler = (e: KeyboardEvent) => {
      if (loadingRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const key = e.key;
      if (key === 'Backspace') {
        e.preventDefault();
        setStoreCode((prev) => prev.slice(0, -1));
        setError('');
      } else if (key === 'Enter') {
        e.preventDefault();
        handleStoreSubmitRef.current();
      } else if (key === '-') {
        e.preventDefault();
        setStoreCode((prev) => prev + '-');
        setError('');
      } else if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        setStoreCode((prev) => prev + key.toUpperCase());
        setError('');
      } else if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        setStoreCode((prev) => prev + key);
        setError('');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step]);

  /* ── 배리어프리 키보드 입력 — Step 2 (PIN: 숫자 4자리) ──
   * 표준 키패드 매핑. 0~9, *(backspace), ESC(이전 단계로).
   * 보안상 PIN 숫자는 TTS echo 하지 않음. backspace/취소만 음성 안내.
   */
  useA11yKeyboard({
    enabled: step === 'pin',
    noTimingGuard: true,
    speak,
    mapping: {
      '0': () => handleKeyPress('0'),
      '1': () => handleKeyPress('1'),
      '2': () => handleKeyPress('2'),
      '3': () => handleKeyPress('3'),
      '4': () => handleKeyPress('4'),
      '5': () => handleKeyPress('5'),
      '6': () => handleKeyPress('6'),
      '7': () => handleKeyPress('7'),
      '8': () => handleKeyPress('8'),
      '9': () => handleKeyPress('9'),
      STAR: () => handleKeyPress('backspace'),
      CANCEL: () => { setStep('storeCode'); setPin(''); setError(''); },
    },
    echoLabels: {
      // 0~9는 echo 안 함 (PIN 보안)
      STAR: VOICE_A11Y_KEYPAD_BACKSPACE,
      CANCEL: VOICE_A11Y_CANCEL,
    },
  });

  const KB_ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '-'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
  ];

  const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src={highContrast ? blackLogoImg : logoImg} alt="Logo" className={styles.logo} />

        {step === 'storeCode' ? (
          <>
            <h2 className={styles.title}>키오스크 로그인</h2>
            <p className={styles.subtitle}>지점 코드를 입력해주세요</p>

            <div className={styles.inputDisplay}>
              {storeCode || <span className={styles.inputPlaceholder}>예: DS-001</span>}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.keyboard}>
              {KB_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className={styles.kbRow}>
                  {row.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.kbKey} ${key === 'backspace' ? styles.kbKeyWide : ''}`}
                      onClick={() => handleKbPress(key)}
                      disabled={loading}
                    >
                      {key === 'backspace' ? '⌫' : key}
                    </button>
                  ))}
                </div>
              ))}
              <div className={styles.kbRow}>
                <button
                  type="button"
                  className={`${styles.kbKey} ${styles.kbKeyEnter}`}
                  onClick={() => handleKbPress('enter')}
                  disabled={loading}
                >
                  {loading ? '확인 중...' : '다음'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.title}>{storeName}</h2>
            <p className={styles.subtitle}>PIN을 입력해주세요</p>

            <div className={styles.pinDots}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span
                  key={i}
                  className={pin.length > i ? styles.dotFilled : styles.dot}
                />
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.keypadGrid}>
              {KEYPAD_KEYS.map((key, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.keypadKey} ${key === 'backspace' ? styles.keypadBackspace : ''} ${key === 'clear' ? styles.keypadClear : ''}`}
                  onClick={() => handleKeyPress(key)}
                  disabled={loading}
                >
                  {key === 'backspace' ? '⌫' : key === 'clear' ? 'C' : key}
                </button>
              ))}
            </div>

            <button
              className={styles.backLink}
              type="button"
              onClick={() => { setStep('storeCode'); setPin(''); setError(''); }}
            >
              ← 지점 코드 다시 입력
            </button>
          </>
        )}
      </div>
    </div>
  );
}
