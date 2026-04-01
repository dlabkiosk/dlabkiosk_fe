import { createPortal } from 'react-dom';
import { LuVolume2, LuVolumeX, LuZoomIn, LuALargeSmall, LuContrast } from 'react-icons/lu';
import { useAccessibility } from '../contexts/AccessibilityContext';
import {
  VOICE_TTS_ON,
  VOICE_FONT_SCALE,
  VOICE_ZOOM_ON,
  VOICE_ZOOM_OFF,
  VOICE_HIGH_CONTRAST_ON,
  VOICE_HIGH_CONTRAST_OFF,
} from '../constants/voiceGuide';
import styles from './AccessibilityBar.module.css';

const FONT_LABELS = {
  default: '기본',
  large: '크게',
  xlarge: '매우 크게',
} as const;

export default function AccessibilityBar() {
  const { ttsEnabled, fontScale, zoom, highContrast, toggleTts, cycleFontScale, toggleZoom, toggleHighContrast, speak } = useAccessibility();

  const hideIcons = fontScale !== 'default';

  const bar = (
    <div className={styles.bar}>
      <button
        type="button"
        className={`${styles.btn} ${ttsEnabled ? styles.active : ''}`}
        onClick={() => {
          toggleTts();
          if (!ttsEnabled) {
            setTimeout(() => {
              const utterance = new SpeechSynthesisUtterance(VOICE_TTS_ON);
              utterance.lang = 'ko-KR';
              utterance.rate = 0.9;
              speechSynthesis.speak(utterance);
            }, 100);
          }
        }}
      >
        {!hideIcons && <span className={styles.iconWrap}>{ttsEnabled ? <LuVolume2 /> : <LuVolumeX />}</span>}
        <span>음성안내 {ttsEnabled ? 'ON' : 'OFF'}</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${fontScale !== 'default' ? styles.active : ''}`}
        onClick={() => {
          const order = ['default', 'large', 'xlarge'] as const;
          const nextIdx = (order.indexOf(fontScale) + 1) % order.length;
          cycleFontScale();
          speak(VOICE_FONT_SCALE[order[nextIdx]]);
        }}
      >
        {!hideIcons && <span className={styles.iconWrap}><LuALargeSmall /></span>}
        <span>글씨 {FONT_LABELS[fontScale]}</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${zoom !== 'default' ? styles.active : ''}`}
        onClick={() => {
          toggleZoom();
          speak(zoom === 'default' ? VOICE_ZOOM_ON : VOICE_ZOOM_OFF);
        }}
      >
        {!hideIcons && <span className={styles.iconWrap}><LuZoomIn /></span>}
        <span>화면확대 {zoom !== 'default' ? 'ON' : 'OFF'}</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${highContrast ? styles.active : ''}`}
        onClick={() => {
          toggleHighContrast();
          speak(highContrast ? VOICE_HIGH_CONTRAST_OFF : VOICE_HIGH_CONTRAST_ON);
        }}
      >
        {!hideIcons && <span className={styles.iconWrap}><LuContrast /></span>}
        <span>고대비 {highContrast ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );

  // 항상 body에 portal하여 #root의 zoom 영향 제거
  return createPortal(bar, document.body);
}
