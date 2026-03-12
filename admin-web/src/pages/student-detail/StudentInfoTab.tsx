import { useState } from 'react';
import { LuChevronUp } from 'react-icons/lu';
import type { Student } from '../../api/studentApi';
import styles from '../StudentDetail.module.css';

interface Props {
  student: Student | null;
}

/* ── StudentInfoTab ── */

export default function StudentInfoTab({ student }: Props) {
  const [sectionOpen, setSectionOpen] = useState(true);

  return (
    <>
      <div
        className={styles.sectionHeader}
        onClick={() => setSectionOpen((v) => !v)}
      >
        <span className={styles.sectionTitle}>학생정보</span>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>

      {sectionOpen && (
        <div className={styles.attendanceContent}>
          {/* Action buttons */}
          <div className={styles.attendanceActions}>
            <button className={styles.attendanceExcelBtn} type="button">
              수정
            </button>
            <button className={styles.attendanceRegisterBtn} type="button">
              EXCEL
            </button>
          </div>

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <div className={styles.infoCell}>
                <span className={styles.infoLabel}>이름</span>
                <span className={styles.infoValue}>{student?.name ?? '-'}</span>
              </div>
              <div className={styles.infoCell}>
                <span className={styles.infoLabel}>반</span>
                <span className={styles.infoValue}>{student?.className ?? '-'}</span>
              </div>
              <div className={styles.infoCell}>
                <span className={styles.infoLabel}>학번</span>
                <span className={styles.infoValue}>{student?.studentNumber ?? '-'}</span>
              </div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoCell}>
                <span className={styles.infoLabel}>학생 전화번호</span>
                <span className={styles.infoValue}>{student?.phone ?? '-'}</span>
              </div>
              <div className={styles.infoCell}>
                <span className={styles.infoLabel}>학년</span>
                <span className={styles.infoValue}>{student?.grade ?? '-'}</span>
              </div>
              <div className={styles.infoCell}>
                <span className={styles.infoLabel}>좌석</span>
                <span className={styles.infoValue}>{student?.assignedSeatLabel || '-'}</span>
              </div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoCellFull}>
                <span className={styles.infoLabel}>지점</span>
                <span className={styles.infoValue}>{student?.storeName ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
