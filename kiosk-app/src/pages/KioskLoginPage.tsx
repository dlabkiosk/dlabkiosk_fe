import { useState } from 'react';
import { getStoreByCode, kioskLogin } from '../api/kioskAuthApi';
import type { KioskSession } from '../api/kioskAuthApi';
import logoImg from '../assets/logo.png';
import styles from './KioskLoginPage.module.css';

interface KioskLoginPageProps {
  onLogin: (session: KioskSession) => void;
}

const PIN_LENGTH = 4;

export default function KioskLoginPage({ onLogin }: KioskLoginPageProps) {
  const [step, setStep] = useState<'storeCode' | 'pin'>('storeCode');
  const [storeCode, setStoreCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* 지점 코드 확인 */
  const handleStoreSubmit = async () => {
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
  };

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

  const KEYPAD_ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src={logoImg} alt="Logo" className={styles.logo} />

        {step === 'storeCode' ? (
          <>
            <h2 className={styles.title}>키오스크 로그인</h2>
            <p className={styles.subtitle}>지점 코드를 입력해주세요</p>

            <input
              className={styles.input}
              type="text"
              placeholder="예: DS-001"
              value={storeCode}
              onChange={(e) => { setStoreCode(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleStoreSubmit()}
              autoFocus
            />

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.submitButton}
              type="button"
              onClick={handleStoreSubmit}
              disabled={loading}
            >
              {loading ? '확인 중...' : '다음'}
            </button>
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

            <div className={styles.keypad}>
              {KEYPAD_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className={styles.keypadRow}>
                  {row.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.keypadButton} ${key === 'clear' || key === 'backspace' ? styles.keypadSpecial : ''}`}
                      onClick={() => handleKeyPress(key)}
                      disabled={loading}
                    >
                      {key === 'backspace' ? '⌫' : key === 'clear' ? '−' : key}
                    </button>
                  ))}
                </div>
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
