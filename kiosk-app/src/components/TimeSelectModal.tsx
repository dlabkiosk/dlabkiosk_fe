import { useState } from 'react';
import styles from './TimeSelectModal.module.css';

const TIME_SLOTS = [
  '9:00', '9:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

function isTimePast(timeStr: string): boolean {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const slotMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

interface TimeSelectModalProps {
  title: string;
  onClose: () => void;
  onBack: () => void;
  onSubmit: (time: string) => void;
}

export default function TimeSelectModal({ title, onClose, onBack, onSubmit }: TimeSelectModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>신청 시간을 선택해주세요</p>

        <div className={styles.grid}>
          {TIME_SLOTS.map((time) => {
            const past = isTimePast(time);
            const active = selected === time;
            return (
              <button
                key={time}
                type="button"
                className={`${styles.timeSlot} ${active ? styles.timeSlotActive : ''} ${past ? styles.timeSlotPast : ''}`}
                onClick={() => !past && setSelected(time)}
                disabled={past}
              >
                {time}
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onBack}>
            취소
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
          >
            신청하기
          </button>
        </div>
      </div>
    </div>
  );
}
