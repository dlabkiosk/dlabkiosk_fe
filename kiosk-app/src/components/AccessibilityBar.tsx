import { createPortal } from 'react-dom';
import { LuVolume2, LuVolumeX, LuZoomIn, LuALargeSmall, LuContrast } from 'react-icons/lu';
import { useAccessibility } from '../contexts/AccessibilityContext';
import styles from './AccessibilityBar.module.css';

const FONT_LABELS = {
  default: '기본',
  large: '크게',
  xlarge: '매우 크게',
} as const;

export default function AccessibilityBar() {
  const { ttsEnabled, fontScale, zoom, highContrast, toggleTts, cycleFontScale, toggleZoom, toggleHighContrast, speak } = useAccessibility();

  const bar = (
    <div className={styles.bar}>
      <button
        type="button"
        className={`${styles.btn} ${ttsEnabled ? styles.active : ''}`}
        onClick={() => {
          toggleTts();
          if (!ttsEnabled) {
            setTimeout(() => {
              const utterance = new SpeechSynthesisUtterance('음성 안내가 시작됩니다.');
              utterance.lang = 'ko-KR';
              utterance.rate = 0.9;
              speechSynthesis.speak(utterance);
            }, 100);
          }
        }}
      >
        {ttsEnabled ? <LuVolume2 /> : <LuVolumeX />}
        <span>음성안내 {ttsEnabled ? 'ON' : 'OFF'}</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${fontScale !== 'default' ? styles.active : ''}`}
        onClick={() => {
          cycleFontScale();
          speak('글씨 크기 변경');
        }}
      >
        <LuALargeSmall />
        <span>글씨 {FONT_LABELS[fontScale]}</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${zoom !== 'default' ? styles.active : ''}`}
        onClick={() => {
          toggleZoom();
          speak(zoom === 'default' ? '화면 확대' : '화면 원래 크기');
        }}
      >
        <LuZoomIn />
        <span>화면확대 {zoom !== 'default' ? 'ON' : 'OFF'}</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${highContrast ? styles.active : ''}`}
        onClick={() => {
          toggleHighContrast();
          speak(highContrast ? '고대비 모드 해제' : '고대비 모드');
        }}
      >
        <LuContrast />
        <span>고대비 {highContrast ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );

  // 항상 body에 portal하여 #root의 zoom 영향 제거
  return createPortal(bar, document.body);
}
