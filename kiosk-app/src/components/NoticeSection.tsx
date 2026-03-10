import styles from './NoticeSection.module.css';

interface NoticeItem {
  id: number;
  content: string;
}

const MOCK_NOTICES: NoticeItem[] = [
  { id: 1, content: '3월 모의고사 3월 20일(금) 실시' },
  { id: 2, content: '시험 시작 10분 전 입실 필수' },
  { id: 3, content: '[국어] 6월 8일 보강 진행' },
  { id: 4, content: '[수학] 임시 강의 실시' },
  { id: 5, content: '[휴원] 3월 1일 삼일절 공휴일 휴원' },
  { id: 6, content: '자습실 좌석은 지정 좌석제로 운영' },
  { id: 7, content: '[급식] 3월 급식 신청 기간 2월 25일' },
  { id: 8, content: '7월 모의고사 7월 12일(토) 실시' },
];

export default function NoticeSection() {
  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>공지사항</h2>
        <button type="button" className={styles.moreButton} aria-label="공지사항 더보기">
          +
        </button>
      </div>
      <ul className={styles.list}>
        {MOCK_NOTICES.map((notice) => (
          <li key={notice.id} className={styles.item}>
            {notice.content}
          </li>
        ))}
      </ul>
    </section>
  );
}
