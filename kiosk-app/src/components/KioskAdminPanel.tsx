import { useState } from 'react';
import { kioskLogout } from '../api/kioskAuthApi';
import type { KioskSession } from '../api/kioskAuthApi';
import useTheme from '../hooks/useTheme';
import type { ThemeId } from '../hooks/useTheme';
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

const THEME_OPTIONS: { id: ThemeId; label: string; color: string }[] = [
  { id: 'basic', label: '기본', color: '#00C4A7' },
  { id: 'blue', label: '블루', color: '#2563eb' },
  { id: 'orange', label: '오렌지', color: '#ea580c' },
];

export default function KioskAdminPanel({ connected, error, session, onConnect, onClose, onLogout }: KioskAdminPanelProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setPassword((prev) => prev.slice(0, -1));
      setPasswordError(false);
    } else if (key === 'clear') {
      setPassword('');
      setPasswordError(false);
    } else {
      if (password.length >= ADMIN_PASSWORD.length) return;
      setPassword((prev) => prev + key);
      setPasswordError(false);
    }
  };

  const handleSubmit = () => {
    if (password.length < ADMIN_PASSWORD.length) return;
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      setPasswordError(true);
      setPassword('');
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
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>

          <h2 className={styles.authTitle}>관리자 인증</h2>
          <p className={styles.passwordGuide}>비밀번호를 입력해주세요</p>

          <div className={styles.passwordDots}>
            {Array.from({ length: ADMIN_PASSWORD.length }).map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${password.length > i ? styles.dotFilled : ''}`}
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
                    className={`${styles.keypadButton} ${key === 'clear' || key === 'backspace' ? styles.keypadSpecial : ''}`}
                    onClick={() => handleKeyPress(key)}
                  >
                    {key === 'backspace' ? '⌫' : key === 'clear' ? '−' : key}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={password.length < ADMIN_PASSWORD.length}
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
          <h3 className={styles.sectionTitle}>테마 설정</h3>
          <div className={styles.themeGroup}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.themeButton} ${theme === opt.id ? styles.themeButtonActive : ''}`}
                onClick={() => setTheme(opt.id)}
              >
                <span className={styles.themeColorDot} style={{ background: opt.color }} />
                {opt.label}
              </button>
            ))}
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
