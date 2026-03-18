import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuSettings, LuArrowUp, LuArrowDown } from 'react-icons/lu';
import styles from './SettingsPage.module.css';
import {
  getExamSchedules,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
  toggleExamScheduleActive,
} from '../api/examScheduleApi';
import type { ExamSchedule as ExamScheduleType } from '../api/examScheduleApi';
import {
  getAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
} from '../api/advertisementApi';
import type { Advertisement } from '../api/advertisementApi';
import MealScheduleSettings from '../components/MealScheduleSettings';
import {
  getSeatLeaveReasons,
  createSeatLeaveReason,
  updateSeatLeaveReason,
  deleteSeatLeaveReason,
} from '../api/seatLeaveApi';
import type { SeatLeaveReason } from '../api/seatLeaveApi';
import useConfirm from '../hooks/useConfirm';

/* ── 탭 목록 ── */
const TABS = ['배너 관리', '시험일정 관리', '식단표 관리', '이탈사유 관리', '메시지 관리','지점 정보'] as const;
type TabId = typeof TABS[number];

const MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const;

/* ── (시험 타입은 ExamScheduleType from api) ── */

/* ── 캘린더 유틸 ── */
function getCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function getExamStatusClass(status: string): string {
  switch (status) {
    case '종료': return styles.statusDone;
    case '진행중': return styles.statusActive;
    case '예정': return styles.statusPending;
    default: return '';
  }
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ── Page ── */

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && (TABS as readonly string[]).includes(tabParam) ? tabParam : '배너 관리',
  );

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuSettings className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>설정</h2>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '기본설정' && <BasicSettings />}
      {activeTab === '배너 관리' && <BannerManagement />}
      {activeTab === '시험일정 관리' && <ExamSchedule />}
      {activeTab === '식단표 관리' && <MealScheduleSettings />}
      {activeTab === '이탈사유 관리' && <SeatLeaveReasonSettings />}
      {activeTab === '보안설정' && <PlaceholderTab label="보안설정" />}
      {activeTab === '알림설정' && <PlaceholderTab label="알림설정" />}
      {activeTab === '게시판관리' && <PlaceholderTab label="게시판관리" />}
    </div>
  );
}

/* ── 기본설정 탭 ── */
function BasicSettings() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>기본설정</h3>
      </div>
      <div className={styles.sectionBody}>
        <p className={styles.placeholderText}>기본설정 내용이 여기에 표시됩니다.</p>
      </div>
    </div>
  );
}

/* ── 배너관리 탭 ── */
function BannerManagement() {
  const { alert, ConfirmDialog } = useConfirm();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* 폼 상태 */
  const [editTarget, setEditTarget] = useState<Advertisement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [objectPos, setObjectPos] = useState({ x: 50, y: 50 }); // % 단위
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [mediaType, setMediaType] = useState<string>('IMAGE');
  const [displaySeconds, setDisplaySeconds] = useState(5);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getAdvertisements();
      setAds(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(`목록 조회 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
      setObjectPos({ x: 50, y: 50 });
      // 파일 MIME 타입으로 미디어 타입 자동 설정
      setMediaType(selected.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
    } else {
      setPreviewUrl(null);
    }
  };

  // cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditTarget(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setObjectPos({ x: 50, y: 50 });
    setMediaType('IMAGE');
    setDisplaySeconds(5);
    setActive(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEdit = (ad: Advertisement) => {
    setEditTarget(ad);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(ad.imageUrl || null);
    setObjectPos({ x: 50, y: 50 });
    setMediaType(ad.mediaType);
    setDisplaySeconds(ad.displaySeconds);
    setActive(ad.active);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* 드래그로 잘림 조정 */
  const handlePreviewMouseDown = () => setDragging(true);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setObjectPos({ x, y });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editTarget) {
        await updateAdvertisement(editTarget.id, {
          file: file ?? undefined,
          mediaType,
          displayOrder: editTarget.displayOrder,
          displaySeconds,
          active,
        });
      } else {
        if (!file) { await alert('파일을 선택해주세요.'); setSubmitting(false); return; }
        await createAdvertisement({ file, mediaType, displayOrder: ads.length + 1, displaySeconds });
      }
      resetForm();
      await fetchAds();
    } catch (err) {
      console.error('[배너 저장] 에러:', err);
      await alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAdvertisement(id);
      if (editTarget?.id === id) resetForm();
      await fetchAds();
    } catch (err) {
      console.error('광고 삭제 실패:', err);
    }
  };

  /* 드래그앤드롭 순서 변경 */
  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
    const reordered = [...ads];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setAds(reordered);
    setDragIdx(null);

    // 변경된 항목만 서버에 순서 업데이트
    try {
      await Promise.all(
        reordered.map((ad, i) => {
          const newOrder = i + 1;
          if (ad.displayOrder === newOrder) return null;
          return updateAdvertisement(ad.id, {
            mediaType: ad.mediaType,
            displayOrder: newOrder,
            displaySeconds: ad.displaySeconds,
            active: ad.active,
          });
        }).filter(Boolean),
      );
      await fetchAds();
    } catch (err) {
      console.error('순서 변경 실패:', err);
      await fetchAds(); // 실패 시 서버 상태로 복구
    }
  };

  return (
    <>
      {/* 등록 / 수정 폼 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{editTarget ? '배너 수정' : '배너 등록'}</h3>
          {editTarget && (
            <button type="button" className={styles.btnSecondary} onClick={resetForm}>
              새로 등록
            </button>
          )}
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>파일</label>
            <div className={styles.uploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <p className={styles.uploadHint}>
                {editTarget ? '변경할 파일을 선택하세요 (선택 안 하면 기존 유지)' : '이미지 또는 영상 파일을 선택하세요'}
              </p>
            </div>
          </div>

          {/* 미리보기 (4:3) */}
          {previewUrl && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                미리보기
                <span className={styles.previewHint}> — 드래그하여 잘림 위치 조정</span>
              </label>
              <div
                ref={previewRef}
                className={styles.previewBox}
                onMouseDown={handlePreviewMouseDown}
              >
                {mediaType === 'VIDEO' ? (
                  <video
                    src={previewUrl}
                    className={styles.previewMedia}
                    style={{ objectPosition: `${objectPos.x}% ${objectPos.y}%` }}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className={styles.previewMedia}
                    style={{ objectPosition: `${objectPos.x}% ${objectPos.y}%` }}
                    draggable={false}
                  />
                )}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>미디어 타입</label>
            <div className={styles.radioGroup}>
              {MEDIA_TYPES.map((mt) => (
                <label key={mt} className={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={mediaType === mt}
                    onChange={() => setMediaType(mt)}
                  />{' '}
                  {mt === 'IMAGE' ? '이미지' : '영상'}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>노출 시간 (초)</label>
            <input
              type="number"
              className={styles.formInput}
              min={1}
              value={displaySeconds}
              onChange={(e) => setDisplaySeconds(Number(e.target.value))}
            />
          </div>

          {editTarget && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>활성 상태</label>
              <label className={styles.radioLabel}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />{' '}
                활성
              </label>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting}>
              {submitting ? '저장 중...' : editTarget ? '수정' : '등록'}
            </button>
            {editTarget && (
              <button type="button" className={styles.btnSecondary} onClick={resetForm}>취소</button>
            )}
          </div>
        </div>
      </div>

      {/* 배너 목록 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>배너 목록</h3>
        </div>
        {fetchError && (
          <div className={styles.sectionBody}>
            <p style={{ color: '#dc2626', fontWeight: 600 }}>{fetchError}</p>
          </div>
        )}
        {loading ? (
          <div className={styles.sectionBody}>
            <p className={styles.placeholderText}>로딩 중...</p>
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th style={{ width: 50 }}>순서</th>
                <th>미리보기</th>
                <th style={{ width: 100 }}>미디어 타입</th>
                <th style={{ width: 100 }}>노출 시간</th>
                <th style={{ width: 80 }}>상태</th>
                <th style={{ width: 100 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {ads.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>등록된 배너가 없습니다.</td></tr>
              ) : (
                ads.map((ad, idx) => (
                  <tr
                    key={ad.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                    className={dragIdx === idx ? styles.draggingRow : ''}
                  >
                    <td className={styles.dragHandle}>&#x2630;</td>
                    <td>{idx + 1}</td>
                    <td>
                      <div className={styles.bannerInfo}>
                        {ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt="배너"
                            className={styles.bannerThumb}
                          />
                        ) : (
                          <div className={styles.bannerThumb} />
                        )}
                        <span>{ad.storeName}</span>
                      </div>
                    </td>
                    <td>{ad.mediaType === 'IMAGE' ? '이미지' : '영상'}</td>
                    <td>{ad.displaySeconds}초</td>
                    <td>
                      <span className={`${styles.statusBadge} ${ad.active ? '' : styles.statusInactive}`}>
                        {ad.active ? '노출중' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className={styles.editBtn} onClick={() => openEdit(ad)}>&#x270E;</button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        style={{ color: '#dc2626', marginLeft: 4 }}
                        onClick={() => handleDelete(ad.id)}
                      >
                        &#x2715;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      {ConfirmDialog}
    </>
  );
}

/* ── 시험일정 관리 탭 ── */
function ExamSchedule() {
  const { alert, ConfirmDialog: ExamConfirmDialog } = useConfirm();
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [exams, setExams] = useState<ExamScheduleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamScheduleType | null>(null);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDir, setDateSortDir] = useState<'asc' | 'desc'>('asc');

  const grid = getCalendarGrid(calYear, calMonth);
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExamSchedules();
      setExams(data);
    } catch (err) {
      console.error('시험일정 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handlePrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const handleNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const getExamsForDay = (day: number): ExamScheduleType[] => {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return exams.filter((e) => e.examDate === dateStr);
  };

  const getExamStatus = (examDate: string): string => {
    const exam = new Date(examDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    exam.setHours(0, 0, 0, 0);
    if (exam.getTime() < now.getTime()) return '종료';
    if (exam.getTime() === now.getTime()) return '진행중';
    return '예정';
  };

  const isToday = (day: number): boolean => {
    return calYear === today.getFullYear() && calMonth === today.getMonth() + 1 && day === today.getDate();
  };

  const resetForm = () => {
    setFormName('');
    setFormDate('');
  };

  const openAddModal = () => {
    resetForm();
    setEditTarget(null);
    setShowAddModal(true);
  };

  const openEditModal = (exam: ExamScheduleType) => {
    setFormName(exam.examName);
    setFormDate(exam.examDate);
    setEditTarget(exam);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formName || !formDate) return;
    try {
      if (editTarget) {
        await updateExamSchedule(editTarget.id, { examName: formName, examDate: formDate });
      } else {
        await createExamSchedule({ examName: formName, examDate: formDate });
      }
      setShowAddModal(false);
      resetForm();
      setEditTarget(null);
      await fetchExams();
    } catch (err) {
      console.error('시험일정 저장 실패:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExamSchedule(id);
      await fetchExams();
    } catch (err) {
      console.error('시험일정 삭제 실패:', err);
    }
  };

  const MAX_ACTIVE = 2;

  const handleToggleActive = async (exam: ExamScheduleType) => {
    // 활성화하려는 경우 최대 개수 체크
    if (!exam.active && exams.filter((e) => e.active).length >= MAX_ACTIVE) {
      void alert(`키오스크 활성화는 최대 ${MAX_ACTIVE}개까지 가능합니다.`);
      return;
    }
    try {
      await toggleExamScheduleActive(exam.id);
      await fetchExams();
    } catch (err) {
      console.error('활성화 상태 변경 실패:', err);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditTarget(null);
    resetForm();
  };

  const toggleDateSort = () => setDateSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  /** 검색 → active 상단 고정 → 날짜 정렬 */
  const displayedExams = exams
    .filter((e) => !searchQuery || e.examName.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // active(ON) 상단 고정
      if (a.active !== b.active) return a.active ? -1 : 1;
      // 날짜 정렬
      const cmp = a.examDate.localeCompare(b.examDate);
      return dateSortDir === 'desc' ? -cmp : cmp;
    });

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>시험일정 관리</h3>
          <div className={styles.sectionHeaderActions}>
            <button
              type="button"
              className={styles.viewToggle}
              onClick={() => setViewMode(viewMode === 'calendar' ? 'table' : 'calendar')}
            >
              {viewMode === 'calendar' ? '목록 보기' : '캘린더 보기'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.sectionBody}>
            <p className={styles.placeholderText}>로딩 중...</p>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className={styles.sectionBody}>
            <div className={styles.calHeader}>
              <h3 className={styles.calTitle}>
                <span className={styles.calMonth}>{MONTH_NAMES[calMonth - 1]}</span>{' '}
                <span className={styles.calYear}>{calYear}</span>
              </h3>
              <div className={styles.calNav}>
                <button type="button" className={styles.calNavBtn} onClick={handlePrevMonth}>&lt;</button>
                <button type="button" className={styles.calNavBtn} onClick={handleNextMonth}>&gt;</button>
              </div>
            </div>

            <table className={styles.examCalendar}>
              <thead>
                <tr>
                  {DAY_LABELS.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day, di) => (
                      <td key={di} className={styles.examCalCell}>
                        {day && (
                          <>
                            <span className={`${styles.examCalDay} ${isToday(day) ? styles.examCalToday : ''}`}>
                              {day}
                            </span>
                            <div className={styles.examCalEvents}>
                              {getExamsForDay(day).map((exam) => (
                                <div
                                  key={exam.id}
                                  className={`${styles.examEvent} ${getExamStatusClass(getExamStatus(exam.examDate))}`}
                                >
                                  {exam.examName}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.sectionBody}>
            <div className={styles.tableToolbar}>
              <input
                className={styles.formInputSm}
                placeholder="시험명 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginRight: 'auto', width: 200 }}
              />
              <button type="button" className={styles.addBtn} onClick={openAddModal}>+ 시험 추가</button>
            </div>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" /></th>
                  <th>시험명</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={toggleDateSort}>
                    날짜 {dateSortDir === 'asc' ? <LuArrowUp /> : <LuArrowDown />}
                  </th>
                  <th>지점</th>
                  <th>상태</th>
                  <th>키오스크 <span style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>(최대 2개)</span></th>
                  <th style={{ width: 50 }}>구분</th>
                </tr>
              </thead>
              <tbody>
                {displayedExams.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyCell}>{searchQuery ? '검색 결과가 없습니다.' : '등록된 시험이 없습니다.'}</td></tr>
                ) : (
                  displayedExams.map((exam) => {
                    const status = getExamStatus(exam.examDate);
                    return (
                      <tr key={exam.id}>
                        <td><input type="checkbox" /></td>
                        <td>{exam.examName}</td>
                        <td>{exam.examDate}</td>
                        <td>{exam.storeName}</td>
                        <td>
                          <span className={`${styles.examStatusBadge} ${getExamStatusClass(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.toggleBtn} ${exam.active ? styles.toggleBtnActive : ''}`}
                            onClick={() => handleToggleActive(exam)}
                          >
                            {exam.active ? 'ON' : 'OFF'}
                          </button>
                        </td>
                        <td><button type="button" className={styles.editBtn} onClick={() => openEditModal(exam)}>&#x270E;</button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 시험 추가/수정 모달 */}
      {showAddModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{editTarget ? '시험 수정' : '시험 추가'}</h3>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>시험명</label>
                <input
                  className={styles.formInput}
                  placeholder="시험명을 입력해주세요"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>날짜</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnPrimary} onClick={handleSubmit}>
                {editTarget ? '수정' : '등록'}
              </button>
              {editTarget && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => { handleDelete(editTarget.id); closeModal(); }}
                  style={{ color: '#dc2626', borderColor: '#dc2626' }}
                >
                  삭제
                </button>
              )}
              <button type="button" className={styles.btnSecondary} onClick={closeModal}>취소</button>
            </div>
          </div>
        </div>
      )}
      {ExamConfirmDialog}
    </>
  );
}

/* ── 이탈사유 관리 탭 ── */
function SeatLeaveReasonSettings() {
  const { confirm, alert, ConfirmDialog } = useConfirm();
  const [reasons, setReasons] = useState<SeatLeaveReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SeatLeaveReason | null>(null);

  const [formName, setFormName] = useState('');
  const [formOrder, setFormOrder] = useState(1);
  const [formActive, setFormActive] = useState(true);

  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const fetchReasons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSeatLeaveReasons();
      setReasons(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err) {
      console.error('이탈 사유 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReasons(); }, [fetchReasons]);

  const resetForm = () => {
    setFormName('');
    setFormOrder(reasons.length + 1);
    setFormActive(true);
    setEditTarget(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOrder(reasons.length + 1);
    setShowModal(true);
  };

  const openEdit = (reason: SeatLeaveReason) => {
    setEditTarget(reason);
    setFormName(reason.reasonName);
    setFormOrder(reason.displayOrder);
    setFormActive(reason.active);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    try {
      if (editTarget) {
        await updateSeatLeaveReason(editTarget.id, {
          reasonName: formName.trim(),
          displayOrder: formOrder,
          active: formActive,
        });
      } else {
        await createSeatLeaveReason({
          reasonName: formName.trim(),
          displayOrder: formOrder,
          active: formActive,
        });
      }
      closeModal();
      await fetchReasons();
    } catch (err) {
      console.error('이탈 사유 저장 실패:', err);
      await alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('이 사유를 삭제하시겠습니까?'))) return;
    try {
      await deleteSeatLeaveReason(id);
      await fetchReasons();
    } catch (err) {
      console.error('이탈 사유 삭제 실패:', err);
      await alert('삭제에 실패했습니다.');
    }
  };

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (targetIdx: number) => {
    const fromIdx = dragIdx.current;
    dragIdx.current = null;
    setDragOverIdx(null);
    if (fromIdx === null || fromIdx === targetIdx) return;

    const reordered = [...reasons];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // 낙관적 UI 업데이트
    const updated = reordered.map((r, i) => ({ ...r, displayOrder: i + 1 }));
    setReasons(updated);

    // 변경된 항목들만 서버에 반영
    try {
      const promises = updated
        .filter((r, i) => r.displayOrder !== reasons.find((o) => o.id === r.id)?.displayOrder)
        .map((r) => updateSeatLeaveReason(r.id, { reasonName: r.reasonName, displayOrder: r.displayOrder, active: r.active }));
      await Promise.all(promises);
    } catch {
      await alert('순서 변경에 실패했습니다.');
      await fetchReasons();
    }
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>좌석 이탈 사유 관리</h3>
          <button type="button" className={styles.addBtn} onClick={openAdd}>+ 사유 추가</button>
        </div>

        {loading ? (
          <div className={styles.sectionBody}>
            <p className={styles.placeholderText}>로딩 중...</p>
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th style={{ width: 60 }}>순서</th>
                <th>사유명</th>
                <th style={{ width: 80 }}>상태</th>
                <th style={{ width: 100 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {reasons.length === 0 ? (
                <tr><td colSpan={5} className={styles.emptyCell}>등록된 사유가 없습니다.</td></tr>
              ) : (
                reasons.map((reason, idx) => (
                  <tr
                    key={reason.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={dragOverIdx === idx ? styles.draggingRow : ''}
                    style={{ cursor: 'grab' }}
                  >
                    <td className={styles.dragHandle}>&#x2630;</td>
                    <td>{reason.displayOrder}</td>
                    <td>{reason.reasonName}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${reason.active ? '' : styles.statusInactive}`}>
                        {reason.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className={styles.editBtn} onClick={() => openEdit(reason)}>&#x270E;</button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        style={{ color: '#dc2626', marginLeft: 4 }}
                        onClick={() => handleDelete(reason.id)}
                      >
                        &#x2715;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{editTarget ? '사유 수정' : '사유 추가'}</h3>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>사유명</label>
                <input
                  className={styles.formInput}
                  placeholder="예: 화장실, 상담 등"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>표시 순서</label>
                <input
                  type="number"
                  className={styles.formInput}
                  min={1}
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>활성 상태</label>
                <label className={styles.radioLabel}>
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />{' '}
                  활성
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnPrimary} onClick={handleSubmit}>
                {editTarget ? '수정' : '등록'}
              </button>
              {editTarget && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => { handleDelete(editTarget.id); closeModal(); }}
                  style={{ color: '#dc2626', borderColor: '#dc2626' }}
                >
                  삭제
                </button>
              )}
              <button type="button" className={styles.btnSecondary} onClick={closeModal}>취소</button>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </>
  );
}

/* ── Placeholder ── */
function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{label}</h3>
      </div>
      <div className={styles.sectionBody}>
        <p className={styles.placeholderText}>{label} 내용이 여기에 표시됩니다.</p>
      </div>
    </div>
  );
}
