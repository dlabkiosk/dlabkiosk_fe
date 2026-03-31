import { useCallback, useEffect, useState } from 'react';
import { LuMonitor } from 'react-icons/lu';
import { getPhoneSubmissions } from '../api/phoneSubmissionApi';
import type { PhoneSubmission, PageResponse } from '../api/phoneSubmissionApi';
import type { SeatLeaveRecord } from '../api/seatLeaveApi';
import styles from './RemoteApplyManagement.module.css';
import f from '../styles/filter.module.css';

/* ── 상수 ── */

const CARD_PREVIEW_LIMIT = 3;
const LIST_MODAL_PAGE_SIZE = 20;

/* ── 타입 ── */

interface PendingItem {
  id: number;
  name: string;
  studentInfo: string;
  type: string;
  typeLabel: string;
  dateTime: string;
  reason: string;
}

interface CompletedItem {
  id: number;
  name: string;
  studentInfo: string;
  typeLabel: string;
  type: string;
  dateTime: string;
  reason: string;
  approvedAt: string;
}

interface RejectedItem {
  id: number;
  name: string;
  studentInfo: string;
  typeLabel: string;
  type: string;
  dateTime: string;
  reason: string;
  rejectReason: string;
  rejectedAt: string;
}

interface SeatChangeItem {
  id: number;
  name: string;
  studentInfo: string;
  fromSeat: string;
  toSeat: string;
  appliedAt: string;
}

type ListModalType = 'pending' | 'completed' | 'rejected' | 'phone' | 'seat-leave' | 'seat-change';

/* ── 목 데이터 ── */

const MOCK_PENDING: PendingItem[] = [
  { id: 1, name: '홍길동', studentInfo: '2026 독학재수 2026 윈터스쿨 인문 8반 홍길동 (8001)', type: 'early-leave', typeLabel: '조퇴', dateTime: '2026.03.09 13:00 ~', reason: '학원' },
  { id: 2, name: '김철수', studentInfo: '2026 독학재수 2026 윈터스쿨 자연 3반 김철수 (3012)', type: 'go-out', typeLabel: '외출', dateTime: '2026.03.09 14:00 ~ 16:00', reason: '병원' },
  { id: 3, name: '고영희', studentInfo: '2026 독학재수 2026 윈터스쿨 인문 2반 고영희 (2005)', type: 'absence', typeLabel: '결석', dateTime: '2026.03.10', reason: '가족행사' },
];

const MOCK_COMPLETED: CompletedItem[] = [
  { id: 1, name: '홍길동', studentInfo: '2026 독학재수 2026 윈터스쿨 인문 8반 홍길동 (8001)', typeLabel: '조퇴', type: 'early-leave', dateTime: '2026.03.09 13:00 ~', reason: '학원', approvedAt: '2026.03.09 11:30' },
  { id: 2, name: '김철수', studentInfo: '2026 독학재수 2026 윈터스쿨 자연 3반 김철수 (3012)', typeLabel: '외출', type: 'go-out', dateTime: '2026.03.09 14:00 ~ 16:00', reason: '병원', approvedAt: '2026.03.09 11:45' },
];

const MOCK_REJECTED: RejectedItem[] = [
  { id: 1, name: '박지민', studentInfo: '2026 독학재수 2026 윈터스쿨 자연 5반 박지민 (5003)', typeLabel: '외출', type: 'go-out', dateTime: '2026.03.09 15:00 ~ 17:00', reason: '개인사유', rejectReason: '사유 불충분', rejectedAt: '2026.03.09 12:00' },
  { id: 2, name: '이수진', studentInfo: '2026 독학재수 2026 윈터스쿨 인문 1반 이수진 (1008)', typeLabel: '조퇴', type: 'early-leave', dateTime: '2026.03.09 14:00 ~', reason: '두통', rejectReason: '보건실 이용 권장', rejectedAt: '2026.03.09 12:15' },
];

const MOCK_SEAT_CHANGE: SeatChangeItem[] = [
  { id: 1, name: '정우진', studentInfo: '2026 독학재수 2026 윈터스쿨 자연 4반 정우진 (4002)', fromSeat: 'A-3', toSeat: 'B-7', appliedAt: '09:45' },
  { id: 2, name: '이서연', studentInfo: '2026 독학재수 2026 윈터스쿨 인문 5반 이서연 (5010)', fromSeat: 'C-1', toSeat: 'A-12', appliedAt: '10:30' },
  { id: 3, name: '한지호', studentInfo: '2026 독학재수 2026 윈터스쿨 자연 2반 한지호 (2015)', fromSeat: 'B-5', toSeat: 'C-3', appliedAt: '11:15' },
];

/* ── 유틸 ── */

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'early-leave': return styles.badgeEarlyLeave;
    case 'go-out': return styles.badgeGoOut;
    case 'absence': return styles.badgeAbsence;
    default: return '';
  }
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/* ── 간단 모달 타입 ── */
interface SimpleDetailModal {
  title: string;
  studentInfo: string;
  typeLabel: string;
  appliedAt: string;
}

/* ── Page ── */

export default function RemoteApplyManagement() {
  const [pendingList] = useState(MOCK_PENDING);
  const [completedList] = useState(MOCK_COMPLETED);
  const [rejectedList] = useState(MOCK_REJECTED);
  const [seatLeaveList, setSeatLeaveList] = useState<SeatLeaveRecord[]>([]);
  const [seatChangeList] = useState(MOCK_SEAT_CHANGE);

  // 휴대폰 미소지 - API 연결
  const [phonePreview, setPhonePreview] = useState<PhoneSubmission[]>([]);

  // 상세 모달
  const [selectedPending, setSelectedPending] = useState<PendingItem | null>(null);
  const [selectedCompleted, setSelectedCompleted] = useState<CompletedItem | null>(null);
  const [selectedRejected, setSelectedRejected] = useState<RejectedItem | null>(null);
  const [simpleDetail, setSimpleDetail] = useState<SimpleDetailModal | null>(null);

  // 거절 사유 모달
  const [rejectTarget, setRejectTarget] = useState<PendingItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 더보기 리스트 모달
  const [listModal, setListModal] = useState<ListModalType | null>(null);
  const [prevListModal, setPrevListModal] = useState<ListModalType | null>(null);
  const [phonePage, setPhonePage] = useState<PageResponse<PhoneSubmission> | null>(null);
  const [phoneCurrentPage, setPhoneCurrentPage] = useState(0);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // 휴대폰 미소지 프리뷰 로드
  useEffect(() => {
    getPhoneSubmissions({ size: CARD_PREVIEW_LIMIT })
      .then((page) => setPhonePreview(page.content))
      .catch(() => setPhonePreview([]));
  }, []);

  // TODO: 백엔드 GET /api/v1/admin/seat-leaves 엔드포인트 준비 후 연결
  // const fetchSeatLeaves = useCallback(() => {
  //   getActiveSeatLeaves()
  //     .then((data) => setSeatLeaveList(data))
  //     .catch(() => setSeatLeaveList([]));
  // }, []);
  // useEffect(() => { fetchSeatLeaves(); }, [fetchSeatLeaves]);

  // 더보기 모달 - 휴대폰 페이지 로드
  const loadPhonePage = useCallback((page: number) => {
    setPhoneLoading(true);
    getPhoneSubmissions({ page, size: LIST_MODAL_PAGE_SIZE })
      .then((data) => {
        setPhonePage(data);
        setPhoneCurrentPage(page);
      })
      .catch(() => setPhonePage(null))
      .finally(() => setPhoneLoading(false));
  }, []);

  const openListModal = (type: ListModalType) => {
    setListModal(type);
    if (type === 'phone') {
      loadPhonePage(0);
    }
  };

  const closeListModal = () => {
    setListModal(null);
    setPrevListModal(null);
    setPhonePage(null);
    setPhoneCurrentPage(0);
  };

  // 더보기 모달에서 행 클릭 → 상세 모달 (이전 목록 기억)
  const openDetailFromList = (listType: ListModalType) => {
    setPrevListModal(listType);
    setListModal(null);
  };

  const handlePhoneRowClick = (item: PhoneSubmission) => {
    openDetailFromList('phone');
    setSimpleDetail({
      title: '휴대폰 미소지',
      studentInfo: `${item.studentName} (${item.studentNumber})`,
      typeLabel: '휴대폰 미소지',
      appliedAt: formatTime(item.submittedAt),
    });
  };

  const handleSeatLeaveRowClick = (item: SeatLeaveRecord) => {
    openDetailFromList('seat-leave');
    setSimpleDetail({
      title: '좌석 이탈',
      studentInfo: `${item.studentName} (${item.seatLabel})`,
      typeLabel: `좌석 이탈 (${item.reasonName})`,
      appliedAt: formatTime(item.startedAt),
    });
  };

  const handleSeatChangeRowClick = (item: SeatChangeItem) => {
    openDetailFromList('seat-change');
    setSimpleDetail({
      title: '좌석 변경 신청',
      studentInfo: item.studentInfo,
      typeLabel: `좌석 변경 (${item.fromSeat} → ${item.toSeat})`,
      appliedAt: item.appliedAt,
    });
  };

  // 상세 모달에서 뒤로가기
  const handleDetailBack = () => {
    setSelectedPending(null);
    setSelectedCompleted(null);
    setSelectedRejected(null);
    setSimpleDetail(null);
    if (prevListModal) {
      openListModal(prevListModal);
      setPrevListModal(null);
    }
  };

  const handleApprove = () => {
    if (!selectedPending) return;
    console.log('승인:', selectedPending.name);
    setSelectedPending(null);
  };

  const handleOpenReject = () => {
    if (!selectedPending) return;
    setRejectTarget(selectedPending);
    setSelectedPending(null);
    setRejectReason('');
  };

  const handleRejectSubmit = () => {
    if (!rejectTarget) return;
    console.log('거절:', rejectTarget.name, '사유:', rejectReason);
    setRejectTarget(null);
    setRejectReason('');
  };

  // 페이지네이션 렌더
  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (p: number) => void) => {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) pages.push(i);
    return (
      <div className={f.pagination}>
        <button
          type="button"
          className={f.pageBtn}
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          &lsaquo;
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`${f.pageBtn} ${p === currentPage ? f.pageBtnActive : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          className={f.pageBtn}
          disabled={currentPage === totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          &rsaquo;
        </button>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuMonitor className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>비대면 신청 관리</h2>
        </div>
      </div>

      <div className={styles.grid}>
        {/* 휴대폰 미소지 목록 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>&#x1F4F1;</span>
            <h3 className={styles.cardTitle}>휴대폰 미소지 목록</h3>
            <button type="button" className={styles.moreBtn} onClick={() => openListModal('phone')}>더보기</button>
          </div>
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th>이름</th>
                <th>좌석</th>
                <th>신청 시간</th>
              </tr>
            </thead>
            <tbody>
              {phonePreview.length === 0 ? (
                <tr><td colSpan={3} className={styles.emptyCell}>신청 내역이 없습니다.</td></tr>
              ) : (
                phonePreview.map((item) => (
                  <tr
                    key={item.id}
                    className={styles.clickableRow}
                    onClick={() => setSimpleDetail({
                      title: '휴대폰 미소지',
                      studentInfo: `${item.studentName} (${item.studentNumber})`,
                      typeLabel: '휴대폰 미소지',
                      appliedAt: formatTime(item.submittedAt),
                    })}
                  >
                    <td>{item.studentName}</td>
                    <td>{item.seatLabel}</td>
                    <td className={styles.timeCell}>{formatTime(item.submittedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 좌석 이탈 목록 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>&#x1FA91;</span>
            <h3 className={styles.cardTitle}>좌석 이탈 목록</h3>
            {seatLeaveList.length > CARD_PREVIEW_LIMIT && (
              <button type="button" className={styles.moreBtn} onClick={() => openListModal('seat-leave')}>더보기</button>
            )}
          </div>
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th>이름</th>
                <th>사유</th>
                <th>신청 시간</th>
              </tr>
            </thead>
            <tbody>
              {seatLeaveList.length === 0 ? (
                <tr><td colSpan={3} className={styles.emptyCell}>이탈 중인 학생이 없습니다.</td></tr>
              ) : (
                seatLeaveList.slice(0, CARD_PREVIEW_LIMIT).map((item) => (
                  <tr
                    key={item.id}
                    className={styles.clickableRow}
                    onClick={() => setSimpleDetail({ title: '좌석 이탈', studentInfo: `${item.studentName} (${item.seatLabel})`, typeLabel: `좌석 이탈 (${item.reasonName})`, appliedAt: formatTime(item.startedAt) })}
                  >
                    <td>{item.studentName}</td>
                    <td>{item.reasonName}</td>
                    <td className={styles.timeCell}>{formatTime(item.startedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 좌석 변경 신청 목록 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>&#x1F4BA;</span>
            <h3 className={styles.cardTitle}>좌석 변경 신청 목록</h3>
            {seatChangeList.length > CARD_PREVIEW_LIMIT && (
              <button type="button" className={styles.moreBtn} onClick={() => openListModal('seat-change')}>더보기</button>
            )}
          </div>
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th>이름</th>
                <th>변경</th>
                <th>신청 시간</th>
              </tr>
            </thead>
            <tbody>
              {seatChangeList.length === 0 ? (
                <tr><td colSpan={3} className={styles.emptyCell}>신청 내역이 없습니다.</td></tr>
              ) : (
                seatChangeList.slice(0, CARD_PREVIEW_LIMIT).map((item) => (
                  <tr
                    key={item.id}
                    className={styles.clickableRow}
                    onClick={() => setSimpleDetail({
                      title: '좌석 변경 신청',
                      studentInfo: item.studentInfo,
                      typeLabel: `좌석 변경 (${item.fromSeat} → ${item.toSeat})`,
                      appliedAt: item.appliedAt,
                    })}
                  >
                    <td>{item.name}</td>
                    <td>{item.fromSeat} → {item.toSeat}</td>
                    <td className={styles.timeCell}>{item.appliedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 더보기 리스트 모달 ── */}
      {listModal === 'phone' && (
        <div className={styles.overlay} onClick={closeListModal}>
          <div className={styles.listModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeListModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>휴대폰 미소지 목록</h3>
            {phoneLoading ? (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>불러오는 중...</p>
            ) : phonePage && phonePage.content.length > 0 ? (
              <>
                <table className={styles.listModalTable}>
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>학번</th>
                      <th>좌석</th>
                      <th>신청 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonePage.content.map((item) => (
                      <tr key={item.id} className={styles.clickableRow} onClick={() => handlePhoneRowClick(item)}>
                        <td>{item.studentName}</td>
                        <td>{item.studentNumber}</td>
                        <td>{item.seatLabel}</td>
                        <td className={styles.timeCell}>{formatTime(item.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination(phoneCurrentPage, phonePage.totalPages, loadPhonePage)}
              </>
            ) : (
              <p style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>신청 내역이 없습니다.</p>
            )}
          </div>
        </div>
      )}

      {listModal === 'pending' && (
        <div className={styles.overlay} onClick={closeListModal}>
          <div className={styles.listModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeListModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>승인 대기 목록</h3>
            <table className={styles.listModalTable}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>유형</th>
                  <th>시간/날짜</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((item) => (
                  <tr key={item.id} className={styles.clickableRow} onClick={() => { openDetailFromList('pending'); setSelectedPending(item); }}>
                    <td>{item.name}</td>
                    <td><span className={`${styles.badge} ${getTypeBadgeClass(item.type)}`}>{item.typeLabel}</span></td>
                    <td>{item.dateTime}</td>
                    <td>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {listModal === 'completed' && (
        <div className={styles.overlay} onClick={closeListModal}>
          <div className={styles.listModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeListModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>승인 완료 목록</h3>
            <table className={styles.listModalTable}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>유형</th>
                  <th>시간/날짜</th>
                  <th>승인일시</th>
                </tr>
              </thead>
              <tbody>
                {completedList.map((item) => (
                  <tr key={item.id} className={styles.clickableRow} onClick={() => { openDetailFromList('completed'); setSelectedCompleted(item); }}>
                    <td>{item.name}</td>
                    <td><span className={`${styles.badge} ${getTypeBadgeClass(item.type)}`}>{item.typeLabel}</span></td>
                    <td>{item.dateTime}</td>
                    <td>{item.approvedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {listModal === 'rejected' && (
        <div className={styles.overlay} onClick={closeListModal}>
          <div className={styles.listModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeListModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>미승인 목록</h3>
            <table className={styles.listModalTable}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>유형</th>
                  <th>시간/날짜</th>
                  <th>거절사유</th>
                </tr>
              </thead>
              <tbody>
                {rejectedList.map((item) => (
                  <tr key={item.id} className={styles.clickableRow} onClick={() => { openDetailFromList('rejected'); setSelectedRejected(item); }}>
                    <td>{item.name}</td>
                    <td><span className={`${styles.badge} ${getTypeBadgeClass(item.type)}`}>{item.typeLabel}</span></td>
                    <td>{item.dateTime}</td>
                    <td>{item.rejectReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {listModal === 'seat-leave' && (
        <div className={styles.overlay} onClick={closeListModal}>
          <div className={styles.listModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeListModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>좌석 이탈 목록</h3>
            <table className={styles.listModalTable}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>좌석</th>
                  <th>사유</th>
                  <th>이탈 시간</th>
                </tr>
              </thead>
              <tbody>
                {seatLeaveList.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>이탈 중인 학생이 없습니다.</td></tr>
                ) : (
                  seatLeaveList.map((item) => (
                    <tr key={item.id} className={styles.clickableRow} onClick={() => handleSeatLeaveRowClick(item)}>
                      <td>{item.studentName}</td>
                      <td>{item.seatLabel}</td>
                      <td>{item.reasonName}</td>
                      <td className={styles.timeCell}>{formatTime(item.startedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {listModal === 'seat-change' && (
        <div className={styles.overlay} onClick={closeListModal}>
          <div className={styles.listModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeListModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>좌석 변경 신청 목록</h3>
            <table className={styles.listModalTable}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>변경</th>
                  <th>신청 시간</th>
                </tr>
              </thead>
              <tbody>
                {seatChangeList.map((item) => (
                  <tr key={item.id} className={styles.clickableRow} onClick={() => handleSeatChangeRowClick(item)}>
                    <td>{item.name}</td>
                    <td>{item.fromSeat} → {item.toSeat}</td>
                    <td className={styles.timeCell}>{item.appliedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 승인 대기 상세 모달 ── */}
      {selectedPending && (
        <div className={styles.overlay} onClick={() => { setSelectedPending(null); setPrevListModal(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => { setSelectedPending(null); setPrevListModal(null); }}>&#x2715;</button>
            {prevListModal && (
              <button type="button" className={styles.modalBack} onClick={handleDetailBack}>&#x2190; 목록으로</button>
            )}
            <h3 className={styles.modalTitle}>승인 대기</h3>
            <table className={styles.detailTable}>
              <tbody>
                <tr><th>학생정보</th><td>{selectedPending.studentInfo}</td></tr>
                <tr><th>신청 항목</th><td>{selectedPending.typeLabel}</td></tr>
                <tr><th>신청 시간/날짜</th><td>{selectedPending.dateTime}</td></tr>
                <tr><th>신청 사유</th><td>{selectedPending.reason}</td></tr>
              </tbody>
            </table>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnOutline}>학생 정보 보기</button>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnPrimary} onClick={handleApprove}>승인</button>
              <button type="button" className={styles.modalBtnSecondary} onClick={handleOpenReject}>거절</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 승인 완료 상세 모달 ── */}
      {selectedCompleted && (
        <div className={styles.overlay} onClick={() => { setSelectedCompleted(null); setPrevListModal(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => { setSelectedCompleted(null); setPrevListModal(null); }}>&#x2715;</button>
            {prevListModal && (
              <button type="button" className={styles.modalBack} onClick={handleDetailBack}>&#x2190; 목록으로</button>
            )}
            <h3 className={styles.modalTitle}>승인 완료</h3>
            <table className={styles.detailTable}>
              <tbody>
                <tr><th>학생정보</th><td>{selectedCompleted.studentInfo}</td></tr>
                <tr><th>신청 항목</th><td>{selectedCompleted.typeLabel}</td></tr>
                <tr><th>신청 시간/날짜</th><td>{selectedCompleted.dateTime}</td></tr>
                <tr><th>신청 사유</th><td>{selectedCompleted.reason}</td></tr>
                <tr>
                  <th>승인 일시</th>
                  <td className={styles.approvedText}>{selectedCompleted.approvedAt}</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnOutline}>학생 정보 보기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 미승인 상세 모달 ── */}
      {selectedRejected && (
        <div className={styles.overlay} onClick={() => { setSelectedRejected(null); setPrevListModal(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => { setSelectedRejected(null); setPrevListModal(null); }}>&#x2715;</button>
            {prevListModal && (
              <button type="button" className={styles.modalBack} onClick={handleDetailBack}>&#x2190; 목록으로</button>
            )}
            <h3 className={styles.modalTitle}>미승인</h3>
            <table className={styles.detailTable}>
              <tbody>
                <tr><th>학생정보</th><td>{selectedRejected.studentInfo}</td></tr>
                <tr><th>신청 항목</th><td>{selectedRejected.typeLabel}</td></tr>
                <tr><th>신청 시간/날짜</th><td>{selectedRejected.dateTime}</td></tr>
                <tr><th>신청 사유</th><td>{selectedRejected.reason}</td></tr>
                <tr><th>거절 사유</th><td>{selectedRejected.rejectReason}</td></tr>
                <tr>
                  <th>거절 일시</th>
                  <td className={styles.rejectedText}>{selectedRejected.rejectedAt}</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnOutline}>학생 정보 보기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 휴대폰/좌석이탈/좌석변경 상세 모달 ── */}
      {simpleDetail && (
        <div className={styles.overlay} onClick={() => { setSimpleDetail(null); setPrevListModal(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => { setSimpleDetail(null); setPrevListModal(null); }}>&#x2715;</button>
            {prevListModal && (
              <button type="button" className={styles.modalBack} onClick={handleDetailBack}>&#x2190; 목록으로</button>
            )}
            <h3 className={styles.modalTitle}>{simpleDetail.title}</h3>
            <table className={styles.detailTable}>
              <tbody>
                <tr><th>학생정보</th><td>{simpleDetail.studentInfo}</td></tr>
                <tr><th>신청 항목</th><td>{simpleDetail.typeLabel}</td></tr>
                <tr><th>신청 시간</th><td>{simpleDetail.appliedAt}</td></tr>
              </tbody>
            </table>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnOutline}>학생 정보 보기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 거절 사유 입력 모달 ── */}
      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => setRejectTarget(null)}>&#x2715;</button>
            <h3 className={styles.modalTitle}>거절 사유 입력</h3>
            <p className={styles.rejectDesc}>{rejectTarget.name} 학생을<br />거절처리 합니다.</p>
            <textarea
              className={styles.rejectTextarea}
              placeholder="거절 사유를 입력해주세요."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnPrimary} onClick={handleRejectSubmit}>확인</button>
              <button type="button" className={styles.modalBtnSecondary} onClick={() => setRejectTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
