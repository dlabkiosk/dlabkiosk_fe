import { useEffect, useState } from 'react';
import styles from './A11yKeyIndicator.module.css';

interface KeyEventDetail {
  key: string;
  label: string;
}

/**
 * 배리어프리 키패드 입력 시각 인디케이터 (KS X 9211 — 부분 시력자용)
 *
 * useA11yKeyboard 훅이 액션을 실행할 때 발행하는 `a11y:key` 커스텀 이벤트를 수신하여
 * 어떤 키가 어떤 동작을 했는지 화면 하단에 잠깐(1.5초) 큰 글씨로 표시.
 *
 * 키 입력 시에만 나타나고 1.5초 후 자동 fade out — 터치 전용 사용자에게는
 * 키 이벤트가 발생하지 않아 자동으로 보이지 않음. 별도의 ON/OFF 게이팅 없이
 * 항상 활성 상태 유지 (배리어프리는 기본 활성).
 */
export default function A11yKeyIndicator() {
  const [info, setInfo] = useState<KeyEventDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<KeyEventDetail>).detail;
      if (!detail) return;
      setInfo({ key: detail.key, label: detail.label ?? '' });
    };
    window.addEventListener('a11y:key', handler);
    return () => window.removeEventListener('a11y:key', handler);
  }, []);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 1500);
    return () => clearTimeout(t);
  }, [info]);

  if (!info) return null;

  return (
    <div
      className={styles.indicator}
      role="status"
      aria-live="polite"
      key={`${info.key}-${Date.now()}`}
    >
      <span className={styles.key}>{formatKeyDisplay(info.key)}</span>
      {info.label && <span className={styles.label}>{info.label}</span>}
    </div>
  );
}

/** A11yKey 정규화 이름을 화면 표시용으로 변환 */
function formatKeyDisplay(key: string): string {
  switch (key) {
    case 'STAR':   return '✱';
    case 'HASH':   return '#';
    case 'ENTER':  return '◯';
    case 'CANCEL': return '✕';
    case 'HOME':   return '△';
    case 'UP':     return '∧';
    case 'DOWN':   return '∨';
    case 'LEFT':   return '◀';
    case 'RIGHT':  return '▶';
    default:       return key;
  }
}
