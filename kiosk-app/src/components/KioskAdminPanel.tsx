import { useState } from 'react';
import { kioskLogin, kioskLogout } from '../api/kioskAuthApi';
import type { KioskSession } from '../api/kioskAuthApi';
import styles from './KioskAdminPanel.module.css';

const PIN_LENGTH = 4;

interface KioskAdminPanelProps {
  connected: boolean;
  error: string | null;
  session: KioskSession;
  onConnect: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export default function KioskAdminPanel({ connected, error, session, onConnect, onClose, onLogout }: KioskAdminPanelProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (key: string) => {
    if (loading) return;
    if (key === 'backspace') {
      setPassword((prev) => prev.slice(0, -1));
      setPasswordError(false);
    } else if (key === 'clear') {
      setPassword('');
      setPasswordError(false);
    } else {
      if (password.length >= PIN_LENGTH) return;
      setPassword((prev) => prev + key);
      setPasswordError(false);
    }
  };

  const handleSubmit = async () => {
    if (password.length < PIN_LENGTH || loading) return;
    setLoading(true);
    try {
      await kioskLogin(session.storeCode, password);
      setAuthenticated(true);
    } catch {
      setPasswordError(true);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'];

  if (!authenticated) {
    return (
      <div className={styles.overlay}>
        <div className={styles.panel}>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            &#x2715;
          </button>

          <h2 className={styles.authTitle}>관리자 인증</h2>
          <p className={styles.passwordGuide}>비밀번호를 입력해주세요</p>

          <div className={styles.passwordDots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${password.length > i ? styles.dotFilled : ''}`}
              />
            ))}
          </div>

          {passwordError && (
            <p className={styles.passwordError}>비밀번호가 일치하지 않습니다</p>
          )}

          <div className={styles.keypadGrid}>
            {KEYPAD_KEYS.map((key, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.keypadKey} ${key === 'backspace' ? styles.keypadBackspace : ''} ${key === 'clear' ? styles.keypadClear : ''}`}
                onClick={() => handleKeyPress(key)}
                aria-label={key === 'backspace' ? '지우기' : key === 'clear' ? '전체 삭제' : key}
              >
                {key === 'backspace' ? '⌫' : key === 'clear' ? 'C' : key}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={password.length < PIN_LENGTH}
          >
            입력 완료
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2 className={styles.title}>키오스크 관리자</h2>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>장치 관리</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>카드리더기</span>
            {connected ? (
              <button
                type="button"
                className={`${styles.infoBadgeActive} ${styles.infoBadgeActiveButton}`}
                onClick={onConnect}
                title="다시 연결"
              >
                연결 완료
              </button>
            ) : (
              <button type="button" className={styles.infoBadgeButton} onClick={onConnect}>
                카드리더기 연결하기
              </button>
            )}
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>QR스캐너</span>
            <span className={styles.infoBadgeActive}>자동 감지</span>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>지점 정보</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>지점명</span>
            <span className={styles.infoValue}>{session.storeName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>지점 코드</span>
            <span className={styles.infoValue}>{session.storeCode}</span>
          </div>
        </div>

        <p className={styles.refreshWarning}>*화면 새로고침 시 카드 리더기를 재연결해야 합니다.</p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => window.location.reload()}
          >
            화면 새로고침
          </button>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => {
              kioskLogout().catch(() => {});
              onLogout();
            }}
          >
            키오스크 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
