import { useState } from 'react';
import { kioskLogout } from '../api/kioskAuthApi';
import type { KioskSession } from '../api/kioskAuthApi';
import styles from './KioskAdminPanel.module.css';

const ADMIN_PASSWORD = '0000';

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

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setPassword((prev) => prev.slice(0, -1));
      setPasswordError(false);
    } else if (key === 'clear') {
      setPassword('');
      setPasswordError(false);
    } else {
      const next = password + key;
      setPasswordError(false);
      if (next.length >= ADMIN_PASSWORD.length) {
        if (next === ADMIN_PASSWORD) {
          setAuthenticated(true);
        } else {
          setPasswordError(true);
          setPassword('');
        }
      } else {
        setPassword(next);
      }
    }
  };

  const KEYPAD_ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  if (!authenticated) {
    return (
      <div className={styles.overlay}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2 className={styles.title}>관리자 인증</h2>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <p className={styles.passwordGuide}>비밀번호를 입력해주세요</p>

          <div className={styles.passwordDots}>
            {Array.from({ length: ADMIN_PASSWORD.length }).map((_, i) => (
              <span
                key={i}
                className={password.length > i ? styles.dotFilled : styles.dot}
              />
            ))}
          </div>

          {passwordError && (
            <p className={styles.passwordError}>비밀번호가 일치하지 않습니다</p>
          )}

          <div className={styles.keypad}>
            {KEYPAD_ROWS.map((row, rowIdx) => (
              <div key={rowIdx} className={styles.keypadRow}>
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.keypadButton}
                    onClick={() => handleKeyPress(key)}
                  >
                    {key === 'backspace' ? '⌫' : key === 'clear' ? 'C' : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>키오스크 관리자</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>장치 관리</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>카드리더기</span>
            {connected ? (
              <span className={styles.infoBadgeActive}>연결 완료</span>
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

        <div className={styles.section}>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => window.location.reload()}
            >
              화면 새로고침
            </button>
            <p className={styles.refreshWarning}>화면 새로고침시 카드 리더기를 재연결해야 합니다.</p>
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
    </div>
  );
}
