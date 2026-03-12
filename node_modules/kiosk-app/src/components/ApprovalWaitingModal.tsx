import styles from './ApprovalWaitingModal.module.css';

interface ApprovalWaitingModalProps {
  studentName: string;
  onClose: () => void;
}

export default function ApprovalWaitingModal({ studentName, onClose }: ApprovalWaitingModalProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <p className={styles.completeText}>{studentName}님 신청완료 되었습니다</p>
          <h2 className={styles.waitingTitle}>승인 대기 중...</h2>
          <p className={styles.waitingDesc}>관리자가 확인 중입니다.</p>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
