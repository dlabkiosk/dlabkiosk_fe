import { useEffect, useState } from 'react';
import { LuPin } from 'react-icons/lu';
import { getNotices } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import styles from './NoticeSection.module.css';

export default function NoticeSection() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getNotices();
        if (!cancelled) setNotices(data);
      } catch {
        // 조회 실패 시 빈 목록 유지
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>공지사항</h2>
        <button type="button" className={styles.moreButton} aria-label="공지사항 더보기">
          +
        </button>
      </div>
      <ul className={styles.list}>
        {loading ? (
          <li className={styles.item}>불러오는 중...</li>
        ) : notices.length === 0 ? (
          <li className={styles.item}>등록된 공지가 없습니다.</li>
        ) : (
          notices.map((notice) => (
            <li key={notice.id} className={styles.item}>
              {notice.pinned && <LuPin className={styles.pinIcon} />}
              {notice.title}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
