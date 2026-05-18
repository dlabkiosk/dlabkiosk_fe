import { createPortal } from 'react-dom';
import { LuVolume2, LuVolumeX, LuZoomIn, LuALargeSmall, LuContrast, LuAccessibility } from 'react-icons/lu';
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
  xlarge: '크게',
} as const;

const VOICE_A11Y_MODE_ON =
  '배리어프리 모드를 시작합니다. 음성 안내, 큰 글씨, 화면 확대, 고대비가 모두 활성화 되었습니다.';

export default function AccessibilityBar() {
  const {
    ttsEnabled, fontScale, zoom, highContrast,
    toggleTts, cycleFontScale, toggleZoom, toggleHighContrast, speak,
    isA11yActive, toggleA11yMode,
  } = useAccessibility();

  const hideIcons = fontScale !== 'default';

  const bar = (
    <div className={styles.bar}>
      {/* 상위 토글: 배리어프리 통합 ON/OFF (단독 박스, KS X 9211 표준 메인 진입점) */}
      <button
        type="button"
        className={`${styles.masterBtn} ${isA11yActive ? styles.active : ''}`}
        onClick={() => {
          const willTurnOn = !isA11yActive;
          toggleA11yMode();
          if (willTurnOn) {
            // 모드 ON 직후 환영 음성 (state 반영 후 발화되도록 약간 지연)
            setTimeout(() => {
              const utterance = new SpeechSynthesisUtterance(VOICE_A11Y_MODE_ON);
              utterance.lang = 'ko-KR';
              utterance.rate = 0.9;
              speechSynthesis.speak(utterance);
            }, 120);
          } else {
            speechSynthesis.cancel();
          }
        }}
      >
        {!hideIcons && <span className={styles.iconWrap}><LuAccessibility /></span>}
        <span>배리어프리 {isA11yActive ? 'ON' : 'OFF'}</span>
      </button>

      {/* 하위 옵션: 4개 세부 토글 (하나의 외곽 테두리로 묶음) */}
      <div className={`${styles.subGroup} ${isA11yActive ? styles.active : ''}`}>
        <button
          type="button"
          className={`${styles.subBtn} ${ttsEnabled ? styles.active : ''}`}
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
          className={`${styles.subBtn} ${fontScale !== 'default' ? styles.active : ''}`}
          onClick={() => {
            const order = ['default', 'xlarge'] as const;
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
          className={`${styles.subBtn} ${zoom !== 'default' ? styles.active : ''}`}
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
          className={`${styles.subBtn} ${highContrast ? styles.active : ''}`}
          onClick={() => {
            toggleHighContrast();
            speak(highContrast ? VOICE_HIGH_CONTRAST_OFF : VOICE_HIGH_CONTRAST_ON);
          }}
        >
          {!hideIcons && <span className={styles.iconWrap}><LuContrast /></span>}
          <span>고대비 {highContrast ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );

  // 항상 body에 portal하여 #root의 zoom 영향 제거
  return createPortal(bar, document.body);
}
