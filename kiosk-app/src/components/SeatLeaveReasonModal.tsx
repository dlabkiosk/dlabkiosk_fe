import { useEffect, useMemo, useState } from 'react';
import { getSeatLeaveReasons } from '../api/seatLeaveApi';
import type { SeatLeaveReason } from '../api/seatLeaveApi';
import { useA11yKeyboard } from '../hooks/useA11yKeyboard';
import type { A11yKey } from '../hooks/useA11yKeyboard';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { VOICE_A11Y_CANCEL, VOICE_A11Y_REASON_SELECT } from '../constants/voiceGuide';
import styles from './SeatLeaveReasonModal.module.css';

interface SeatLeaveReasonModalProps {
  onClose: () => void;
  onSelect: (reasonId: number, reasonLabel: string) => void;
}

export default function SeatLeaveReasonModal({ onClose, onSelect }: SeatLeaveReasonModalProps) {
  const { speak } = useAccessibility();
  const [reasons, setReasons] = useState<SeatLeaveReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSeatLeaveReasons()
      .then((list) => setReasons(list.filter((r) => r.active).sort((a, b) => a.displayOrder - b.displayOrder)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 배리어프리 키패드 매핑 — 사유 1~9 + 취소 (사유는 동적이라 useMemo)
  const { keyMapping, keyEchoLabels } = useMemo(() => {
    const mapping: Partial<Record<A11yKey, () => void>> = { CANCEL: onClose };
    const labels: Partial<Record<A11yKey, string>> = { CANCEL: VOICE_A11Y_CANCEL };
    reasons.slice(0, 9).forEach((reason, idx) => {
      const k = String(idx + 1) as A11yKey;
      mapping[k] = () => onSelect(reason.id, reason.reasonName);
      labels[k] = VOICE_A11Y_REASON_SELECT(idx + 1, reason.reasonName);
    });
    return { keyMapping: mapping, keyEchoLabels: labels };
  }, [reasons, onClose, onSelect]);

  useA11yKeyboard({
    mapping: keyMapping,
    echoLabels: keyEchoLabels,
    speak,
  });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>좌석 이탈</h2>
        <p className={styles.subtitle}>사유를 선택해주세요</p>

        {loading ? (
          <p className={styles.subtitle}>불러오는 중...</p>
        ) : reasons.length === 0 ? (
          <p className={styles.subtitle}>등록된 사유가 없습니다.</p>
        ) : (
          <div className={styles.grid}>
            {reasons.map((reason) => (
              <button
                key={reason.id}
                type="button"
                className={styles.reasonButton}
                onClick={() => onSelect(reason.id, reason.reasonName)}
              >
                {reason.iconUrl && (
                  <img src={reason.iconUrl} alt={reason.reasonName} className={styles.reasonIcon} />
                )}
                <span className={styles.reasonLabel}>{reason.reasonName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
