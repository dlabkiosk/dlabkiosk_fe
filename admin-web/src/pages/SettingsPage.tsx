import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LuArrowUp, LuArrowDown, LuChevronDown } from 'react-icons/lu';
import settingIcon from '../assets/setting_active.png';
import editIcon from '../assets/edit.png';
import trashIcon from '../assets/trash.png';
import styles from './SettingsPage.module.css';
import f from '../styles/filter.module.css';
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
import type { Advertisement, CropParams } from '../api/advertisementApi';
import MealScheduleSettings from '../components/MealScheduleSettings';
import FilterDatePicker from '../components/FilterDatePicker';
import {
  getSeatLeaveReasons,
  createSeatLeaveReason,
  updateSeatLeaveReason,
  deleteSeatLeaveReason,
} from '../api/seatLeaveApi';
import type { SeatLeaveReason } from '../api/seatLeaveApi';
import useConfirm from '../hooks/useConfirm';
import { getStores, getStore, createStore, updateStore, deleteStore } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import { getMe } from '../api/authApi';
import FilterSelect from '../components/FilterSelect';
import { getStudents } from '../api/studentApi';
import type { Student } from '../api/studentApi';
import {
  getStudentMessages,
  createStudentMessage,
  updateStudentMessage,
  deleteStudentMessage,
} from '../api/studentMessageApi';
import type { StudentMessage } from '../api/studentMessageApi';
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from '../api/messageTemplateApi';
import type { MessageTemplate } from '../api/messageTemplateApi';
import { syncStudents, syncStores } from '../api/syncApi';
import type { StudentSyncResult, StoreSyncResult } from '../api/syncApi';

/* ── 탭 목록 ── */
const TABS = ['배너 관리', '시험일정 관리', '식단표 관리', '이탈사유 관리', '메시지 관리', '데이터 관리', '지점 정보'] as const;
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

  useEffect(() => {
    if (tabParam && (TABS as readonly string[]).includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const tabBarRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateSlider = useCallback(() => {
    if (!tabBarRef.current) return;
    const idx = TABS.indexOf(activeTab);
    const buttons = tabBarRef.current.querySelectorAll('button');
    const btn = buttons[idx];
    if (!btn) return;
    const barRect = tabBarRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setSliderStyle({ left: btnRect.left - barRect.left, width: btnRect.width });
  }, [activeTab]);

  useEffect(() => {
    updateSlider();
    window.addEventListener('resize', updateSlider);
    const ro = new ResizeObserver(updateSlider);
    if (tabBarRef.current) ro.observe(tabBarRef.current);
    return () => { window.removeEventListener('resize', updateSlider); ro.disconnect(); };
  }, [updateSlider]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <img src={settingIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>설정</h2>
        </div>
      </div>

      <div className={styles.tabBar} ref={tabBarRef}>
        <div
          className={styles.tabSlider}
          style={{
            left: sliderStyle.left,
            width: sliderStyle.width,
          }}
        />
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
      
      {activeTab === '배너 관리' && <BannerManagement />}
      {activeTab === '시험일정 관리' && <ExamSchedule />}
      {activeTab === '식단표 관리' && <MealScheduleSettings />}
      {activeTab === '이탈사유 관리' && <SeatLeaveReasonSettings />}
      {activeTab === '메시지 관리' && (
        <>
          <MessageTemplateSettings />
          <StudentMessageSettings />
        </>
      )}
      {activeTab === '데이터 관리' && <DataManagement />}
      {activeTab === '지점 정보' && <BranchInfo />}
    </div>
  );
}

/* ── 데이터 관리 탭 ── */
function DataManagement() {
  const { alert, ConfirmDialog: DataConfirmDialog } = useConfirm();
  const [syncingStudents, setSyncingStudents] = useState(false);
  const [syncingStores, setSyncingStores] = useState(false);
  const [studentResults, setStudentResults] = useState<StudentSyncResult[] | null>(null);
  const [storeResult, setStoreResult] = useState<StoreSyncResult | null>(null);

  const handleSyncStudents = async () => {
    if (syncingStudents) return;
    setSyncingStudents(true);
    setStudentResults(null);
    try {
      const results = await syncStudents();
      setStudentResults(results);
    } catch (err) {
      await alert(err instanceof Error ? err.message : '학생 동기화에 실패했습니다.');
    } finally {
      setSyncingStudents(false);
    }
  };

  const handleSyncStores = async () => {
    if (syncingStores) return;
    setSyncingStores(true);
    setStoreResult(null);
    try {
      const result = await syncStores();
      setStoreResult(result);
    } catch (err) {
      await alert(err instanceof Error ? err.message : '지점 동기화에 실패했습니다.');
    } finally {
      setSyncingStores(false);
    }
  };

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>DSA 데이터 동기화</h3>
        </div>
        <div className={styles.sectionBody}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            DSA 서버에서 최신 데이터를 가져와 동기화합니다.
          </p>

          {/* 지점 동기화 */}
          <div className={styles.syncCard}>
            <div className={styles.syncCardHeader}>
              <div>
                <h4 className={styles.syncCardTitle}>지점 동기화</h4>
                <p className={styles.syncCardDesc}>DSA에 등록된 지점(학원) 목록을 동기화합니다. 새 지점은 자동 생성되고, 기존 지점은 이름이 업데이트됩니다.</p>
              </div>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSyncStores}
                disabled={syncingStores}
              >
                {syncingStores ? '동기화 중...' : '지점 동기화'}
              </button>
            </div>
            {storeResult && (
              <div className={styles.syncResultTable}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>DSA 전체</th>
                      <th>신규</th>
                      <th>업데이트</th>
                      <th>변경없음</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{storeResult.totalFromDsa}</td>
                      <td>{storeResult.created}</td>
                      <td>{storeResult.updated}</td>
                      <td>{storeResult.unchanged}</td>
                    </tr>
                  </tbody>
                </table>
                {storeResult.errors.length > 0 && (
                  <div className={styles.syncErrors}>
                    {storeResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 학생 동기화 */}
          <div className={styles.syncCard}>
            <div className={styles.syncCardHeader}>
              <div>
                <h4 className={styles.syncCardTitle}>학생 동기화</h4>
                <p className={styles.syncCardDesc}>DSA에 등록된 학생 정보를 동기화합니다. 전체 지점의 학생 데이터를 가져옵니다.</p>
              </div>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSyncStudents}
                disabled={syncingStudents}
              >
                {syncingStudents ? '동기화 중...' : '학생 동기화'}
              </button>
            </div>
            {studentResults && (
              <div className={styles.syncResultTable}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>지점명</th>
                      <th>DSA 전체</th>
                      <th>신규</th>
                      <th>업데이트</th>
                      <th>변경없음</th>
                      <th>실패</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map((r) => (
                      <tr key={r.storeId}>
                        <td>{r.storeName}</td>
                        <td>{r.totalFromDsa}</td>
                        <td>{r.created}</td>
                        <td>{r.updated}</td>
                        <td>{r.unchanged}</td>
                        <td style={r.failed > 0 ? { color: '#dc2626', fontWeight: 600 } : undefined}>{r.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {studentResults.some((r) => r.errors.length > 0) && (
                  <div className={styles.syncErrors}>
                    {studentResults.flatMap((r) => r.errors).map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {DataConfirmDialog}
    </>
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
  const { alert, confirm, ConfirmDialog } = useConfirm();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [myStoreId, setMyStoreId] = useState<number | undefined>(undefined);
  const [fetchError, setFetchError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ADMIN 역할 & 지점 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('전체');
  const [storeFilterOpen, setStoreFilterOpen] = useState(false);
  const storeFilterRef = useRef<HTMLDivElement>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

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
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

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

  useEffect(() => {
    getMe().then((me) => {
      setMyStoreId(me.storeId);
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => {
          const activeStores = list.filter((s) => s.active);
          setStores(activeStores);
          if (activeStores.length > 0) setStoreFilter(activeStores[0].storeName);
        });
      }
    }).catch(() => {});
  }, []);

  /* 드롭다운 외부 클릭 닫기 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
      if (storeFilterRef.current && !storeFilterRef.current.contains(e.target as Node)) {
        setStoreFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ADMIN 지점 필터 적용 */
  const filteredAds = useMemo(() => {
    if (!isAdmin || storeFilter === '전체') return ads;
    return ads.filter((ad) => ad.storeName === storeFilter);
  }, [ads, isAdmin, storeFilter]);

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!selected) {
      setPreviewUrl(null);
      setNaturalSize(null);
      return;
    }
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
    setObjectPos({ x: 50, y: 50 });
    const isVideo = selected.type.startsWith('video/');
    setMediaType(isVideo ? 'VIDEO' : 'IMAGE');

    // 원본 크기 저장
    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setNaturalSize({ w: video.videoWidth, h: video.videoHeight });
      };
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
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
    setNaturalSize(null);
    setMediaType('IMAGE');
    setDisplaySeconds(5);
    setActive(true);
    setSelectedStoreId(undefined);
    setStoreDropdownOpen(false);
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
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  /* 드래그로 잘림 조정 */
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: objectPos.x, posY: objectPos.y };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!previewRef.current || !dragStartRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      const x = Math.max(0, Math.min(100, dragStartRef.current.posX - dx));
      const y = Math.max(0, Math.min(100, dragStartRef.current.posY - dy));
      setObjectPos({ x, y });
    };
    const handleUp = () => { setDragging(false); dragStartRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  /** objectPos(%) + 원본 크기 → 픽셀 crop 좌표 계산 (object-fit:cover 기준) */
  const calcCrop = (): CropParams | undefined => {
    if (!naturalSize) return undefined;
    const { w: imgW, h: imgH } = naturalSize;
    const CONTAINER_RATIO = 16 / 9;
    const imgRatio = imgW / imgH;

    let cropX = 0;
    let cropY = 0;
    let cropWidth = imgW;
    let cropHeight = imgH;

    if (imgRatio > CONTAINER_RATIO) {
      // 이미지가 더 넓음 → 좌우 잘림
      cropWidth = Math.round(imgH * CONTAINER_RATIO);
      cropHeight = imgH;
      const overflow = imgW - cropWidth;
      cropX = Math.round((objectPos.x / 100) * overflow);
    } else if (imgRatio < CONTAINER_RATIO) {
      // 이미지가 더 높음 → 상하 잘림
      cropWidth = imgW;
      cropHeight = Math.round(imgW / CONTAINER_RATIO);
      const overflow = imgH - cropHeight;
      cropY = Math.round((objectPos.y / 100) * overflow);
    }
    // 정확히 16:9면 crop 불필요 → undefined 반환
    if (cropX === 0 && cropY === 0 && cropWidth === imgW && cropHeight === imgH) return undefined;
    return { cropX, cropY, cropWidth, cropHeight };
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const crop = file ? calcCrop() : undefined;
      if (editTarget) {
        await updateAdvertisement(editTarget.id, {
          file: file ?? undefined,
          mediaType,
          displayOrder: editTarget.displayOrder,
          displaySeconds,
          active,
          crop,
        });
      } else {
        if (!file) { await alert('파일을 선택해주세요.'); setSubmitting(false); return; }
        if (isAdmin && !selectedStoreId) { await alert('지점을 선택해주세요.'); setSubmitting(false); return; }
        const storeIdToSend = isAdmin ? selectedStoreId : myStoreId;
        await createAdvertisement({ file, mediaType, displayOrder: ads.length + 1, displaySeconds, crop, storeId: storeIdToSend });
      }
      resetForm();
      await fetchAds();
    } catch (err) {
      await alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm('정말 삭제하시겠습니까?');
    if (!ok) return;
    try {
      await deleteAdvertisement(id);
      if (editTarget?.id === id) resetForm();
      await fetchAds();
    } catch (err) {
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
      await fetchAds(); // 실패 시 서버 상태로 복구
    }
  };

  return (
    <>
      {/* 등록 / 수정 폼 */}
      <div className={styles.section} ref={formRef}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{editTarget ? '배너 수정' : '배너 등록'}</h3>
          {editTarget && (
            <button type="button" className={styles.btnSecondary} onClick={resetForm}>
              새로 등록
            </button>
          )}
        </div>
        <div className={styles.sectionBody}>
          {/* ADMIN 전용: 등록 시 지점 선택 */}
          {isAdmin && !editTarget && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>지점</label>
              <div className={styles.dropdown} ref={storeDropdownRef} style={{ width: 200 }}>
                <button
                  type="button"
                  className={`${styles.dropdownTrigger} ${storeDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                  onClick={() => setStoreDropdownOpen((v) => !v)}
                >
                  <span className={!selectedStoreId ? styles.dropdownPlaceholder : ''}>
                    {selectedStoreId
                      ? stores.find((s) => s.id === selectedStoreId)?.storeName ?? '선택'
                      : '지점을 선택해주세요'}
                  </span>
                  <LuChevronDown className={`${styles.dropdownChevron} ${storeDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
                </button>
                {storeDropdownOpen && (
                  <ul className={styles.dropdownMenu}>
                    {stores.map((store) => (
                      <li key={store.id}>
                        <button
                          type="button"
                          className={`${styles.dropdownItem} ${selectedStoreId === store.id ? styles.dropdownItemActive : ''}`}
                          onClick={() => { setSelectedStoreId(store.id); setStoreDropdownOpen(false); }}
                        >
                          {store.storeName}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              파일
              {previewUrl && <span className={styles.previewHint}> — 드래그하여 잘림 위치 조정</span>}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className={styles.fileInput}
            />
            {previewUrl ? (
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
                <button
                  type="button"
                  className={styles.changeFileButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  파일 변경
                </button>
              </div>
            ) : (
              <div
                className={styles.uploadArea}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className={styles.uploadPlaceholder}>
                  {editTarget ? '변경할 파일을 선택하세요' : '클릭하여 이미지 또는 영상을 선택하세요'}
                </p>
                <p className={styles.uploadHint}>권장 비율: 16:9 (예: 1920×1080)</p>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>미디어 타입</label>
            <div className={styles.radioGroup}>
              {MEDIA_TYPES.map((mt) => {
                const isFileAttached = !!file;
                const fileIsVideo = file?.type.startsWith('video/');
                const disabled = isFileAttached && (mt === 'VIDEO' ? !fileIsVideo : fileIsVideo);
                return (
                  <label key={mt} className={`${styles.radioLabel} ${disabled ? styles.radioLabelDisabled : ''}`}>
                    <input
                      type="radio"
                      checked={mediaType === mt}
                      onChange={() => setMediaType(mt)}
                      disabled={disabled}
                    />{' '}
                    {mt === 'IMAGE' ? '이미지' : '영상'}
                  </label>
                );
              })}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>노출 시간 (초)</label>
            <input
              type="number"
              className={styles.formInputSm}
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
        <div className={styles.sectionHeader} style={{ borderBottom: 'none' }}>
          <h3 className={styles.sectionTitle}>배너 목록</h3>
          {isAdmin && (
            <div className={styles.dropdown} ref={storeFilterRef} style={{ marginLeft: 'auto', width: 160 }}>
              <button
                type="button"
                className={`${styles.dropdownTrigger} ${storeFilterOpen ? styles.dropdownTriggerOpen : ''}`}
                onClick={() => setStoreFilterOpen((v) => !v)}
              >
                <span>{storeFilter}</span>
                <LuChevronDown className={`${styles.dropdownChevron} ${storeFilterOpen ? styles.dropdownChevronOpen : ''}`} />
              </button>
              {storeFilterOpen && (
                <ul className={styles.dropdownMenu}>
                  {stores.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${storeFilter === s.storeName ? styles.dropdownItemActive : ''}`}
                        onClick={() => { setStoreFilter(s.storeName); setStoreFilterOpen(false); }}
                      >
                        {s.storeName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
          <div className={styles.sectionBody} style={{ paddingTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-lg)', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
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
                {filteredAds.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyCell}>등록된 배너가 없습니다.</td></tr>
                ) : (
                filteredAds.map((ad, idx) => (
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
                          ad.mediaType === 'VIDEO' ? (
                            <video
                              src={ad.imageUrl}
                              className={styles.bannerThumb}
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={ad.imageUrl}
                              alt="배너"
                              className={styles.bannerThumb}
                            />
                          )
                        ) : (
                          <div className={styles.bannerThumb} />
                        )}
                        <span>{ad.storeName}</span>
                      </div>
                    </td>
                    <td>{ad.mediaType === 'IMAGE' ? '이미지' : '영상'}</td>
                    <td>{ad.displaySeconds}초</td>
                    <td>
                      <span className={`${styles.statusBadge} ${ad.active ? styles.statusActive : styles.statusInactive}`}>
                        {ad.active ? '노출중' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button type="button" className={styles.iconBtn} onClick={() => openEdit(ad)}>
                          <img src={editIcon} alt="수정" className={styles.actionIcon} />
                        </button>
                        <button type="button" className={styles.iconBtn} onClick={() => handleDelete(ad.id)}>
                          <img src={trashIcon} alt="삭제" className={styles.actionIcon} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {ConfirmDialog}
    </>
  );
}

/* ── 시험일정 관리 탭 ── */
function ExamSchedule() {
  const { alert, confirm, ConfirmDialog: ExamConfirmDialog } = useConfirm();
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [exams, setExams] = useState<ExamScheduleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamScheduleType | null>(null);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [calMenuOpenId, setCalMenuOpenId] = useState<number | null>(null);

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('전체');
  const [myStoreId, setMyStoreId] = useState<number | undefined>(undefined);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDir, setDateSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const grid = getCalendarGrid(calYear, calMonth);
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* 사용자 정보 로드 */
  useEffect(() => {
    getMe().then((me) => {
      setMyStoreId(me.storeId);
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => {
          const activeStores = list.filter((s) => s.active);
          setStores(activeStores);
        });
      }
    }).catch(() => {});
  }, []);

  /* ADMIN 지점 필터 적용 */
  const filteredExams = useMemo(() => {
    if (!isAdmin || storeFilter === '전체') return exams;
    return exams.filter((e) => e.storeName === storeFilter);
  }, [exams, isAdmin, storeFilter]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExamSchedules();
      setExams(data);
    } catch (err) {

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
    return filteredExams.filter((e) => e.examDate === dateStr);
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
    setSelectedStoreId(undefined);
  };

  const openAddModal = (presetDate?: string) => {
    resetForm();
    if (presetDate) setFormDate(presetDate);
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
    if (!formName) { await alert('시험명을 입력해주세요.'); return; }
    if (!formDate) { await alert('날짜를 선택해주세요.'); return; }
    if (isAdmin && !selectedStoreId) { await alert('지점을 선택해주세요.'); return; }
    try {
      if (editTarget) {
        await updateExamSchedule(editTarget.id, { examName: formName, examDate: formDate });
      } else {
        const storeIdToSend = isAdmin ? selectedStoreId : myStoreId;
        const created = await createExamSchedule({ examName: formName, examDate: formDate, storeId: storeIdToSend, active: false });
        if (created.active) {
          await toggleExamScheduleActive(created.id);
        }
      }
      setShowAddModal(false);
      resetForm();
      setEditTarget(null);
      await fetchExams();
    } catch (err) {

    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('이 시험일정을 삭제하시겠습니까?'))) return;
    try {
      await deleteExamSchedule(id);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      await fetchExams();
    } catch (err) {

    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!(await confirm(`선택한 ${selectedIds.size}개의 시험일정을 삭제하시겠습니까?`))) return;
    try {
      await Promise.all([...selectedIds].map((id) => deleteExamSchedule(id)));
      setSelectedIds(new Set());
      await fetchExams();
    } catch (err) {

    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedExams.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedExams.map((e) => e.id)));
    }
  };

  const MAX_ACTIVE = 2;

  const handleToggleActive = async (exam: ExamScheduleType) => {
    // 활성화하려는 경우 지점별로 최대 개수 체크
    const activeInStore = filteredExams.filter((e) => e.active && e.storeId === exam.storeId).length;
    if (!exam.active && activeInStore >= MAX_ACTIVE) {
      void alert(`키오스크 활성화는 지점당 최대 ${MAX_ACTIVE}개까지 가능합니다.`);
      return;
    }
    try {
      await toggleExamScheduleActive(exam.id);
      await fetchExams();
    } catch (err) {

    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditTarget(null);
    resetForm();
  };

  const toggleDateSort = () => setDateSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  /** 검색 → active 상단 고정 → 날짜 정렬 */
  const displayedExams = filteredExams
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
                      <td
                        key={di}
                        className={`${styles.examCalCell}${day ? ` ${styles.examCalCellHoverable}` : ''}`}
                        style={day ? { cursor: 'pointer' } : undefined}
                        onClick={() => {
                          if (!day) return;
                          const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayExams = getExamsForDay(day);
                          if (dayExams.length > 0) {
                            setSelectedCalDate(dateStr);
                          } else {
                            openAddModal(dateStr);
                          }
                        }}
                      >
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
              {isAdmin && (
                <div className={f.filterGroup} style={{ marginRight: 8 }}>
                  <FilterSelect
                    value={storeFilter}
                    options={['전체', ...stores.map((s) => s.storeName)]}
                    placeholder="전체"
                    defaultValue="전체"
                    onChange={(v: string) => setStoreFilter(v)}
                  />
                </div>
              )}
              <div className={f.filterGroup}>
                {/* <span className={f.filterLabel}>시험명</span> */}
                <input
                  type="text"
                  className={f.filterInput}
                  style={{ width: 280 }}
                  placeholder="시험명을 검색하세요."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-sm)' }}>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    className={styles.addBtn}
                    style={{ color: '#dc2626', borderColor: '#dc2626' }}
                    onClick={handleBulkDelete}
                  >
                    선택 삭제 ({selectedIds.size})
                  </button>
                )}
                <button type="button" className={styles.addBtn} onClick={openAddModal}>+ 시험 추가</button>
              </div>
            </div>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={displayedExams.length > 0 && selectedIds.size === displayedExams.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>시험명</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={toggleDateSort}>
                    날짜 {dateSortDir === 'asc' ? <LuArrowUp /> : <LuArrowDown />}
                  </th>
                  <th>지점</th>
                  <th>상태</th>
                  <th>키오스크 <span style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>(최대 2개)</span></th>
                  <th style={{ width: 50 }}>관리</th>
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
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(exam.id)}
                            onChange={() => toggleSelect(exam.id)}
                          />
                        </td>
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
                        <td><button type="button" className={styles.editBtn} onClick={() => openEditModal(exam)}><img src={editIcon} alt="편집" className={styles.actionIcon} /></button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 캘린더 날짜 상세 모달 */}
      {selectedCalDate && (
        <div className={styles.overlay} onClick={() => setSelectedCalDate(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => setSelectedCalDate(null)}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{selectedCalDate}</h3>

            <div className={styles.modalForm}>
              {filteredExams
                .filter((e) => e.examDate === selectedCalDate)
                .map((exam) => (
                  <div key={exam.id} style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{exam.examName}</span>
                        <span className={`${styles.statusBadge} ${getExamStatusClass(getExamStatus(exam.examDate))}`}>
                          {getExamStatus(exam.examDate)}
                        </span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '16px', color: '#6b7280' }}
                          onClick={() => setCalMenuOpenId(calMenuOpenId === exam.id ? null : exam.id)}
                        >
                          &#x22EE;
                        </button>
                        {calMenuOpenId === exam.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid var(--color-border-light)',
                            borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 100, overflow: 'hidden',
                          }}>
                            <button
                              type="button"
                              style={{ display: 'block', width: '100%', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)', textAlign: 'left' }}
                              onClick={() => { setCalMenuOpenId(null); setSelectedCalDate(null); openEditModal(exam); }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              style={{ display: 'block', width: '100%', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)', textAlign: 'left', color: '#dc2626' }}
                              onClick={() => { setCalMenuOpenId(null); setSelectedCalDate(null); handleDelete(exam.id); }}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      지점: {exam.storeName} · 활성 여부: {exam.active ? '활성' : '비활성'}
                    </div>
                  </div>
                ))}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => { setSelectedCalDate(null); openAddModal(selectedCalDate); }}
              >
                + 추가 일정 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시험 추가/수정 모달 */}
      {showAddModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{editTarget ? '시험 수정' : '시험 추가'}</h3>

            <div className={styles.modalForm}>
              {!editTarget && isAdmin && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>지점</label>
                  <FilterSelect
                    value={selectedStoreId ? stores.find((s) => s.id === selectedStoreId)?.storeName || '' : ''}
                    options={stores.map((s) => s.storeName)}
                    placeholder="지점 선택"
                    onChange={(v: string) => {
                      const store = stores.find((s) => s.storeName === v);
                      setSelectedStoreId(store?.id);
                    }}
                  />
                </div>
              )}
              <div className={styles.formGroup} style={{ marginBottom: 'var(--spacing-sm)' }}>
                <label className={styles.formLabel}>시험명</label>
                <input
                  className={styles.formInput}
                  placeholder="시험명을 입력해주세요"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={15}
                />
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 2 }}>
                  {formName.length}/15
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>날짜</label>
                <div className={styles.datePickerFullWidth}>
                  <FilterDatePicker value={formDate} onChange={setFormDate} placeholder="날짜 선택" />
                </div>
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

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(1);
  const [modalStoreId, setModalStoreId] = useState<number | undefined>(undefined);

  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    getMe().then((me) => {
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => {
          const activeStores = list.filter((s) => s.active);
          setStores(activeStores);
          if (activeStores.length > 0) {
            setSelectedStoreId(activeStores[0].id);
          }
        });
      }
    }).catch(() => {});
  }, []);

  const currentStoreId = isAdmin ? selectedStoreId : undefined;

  const fetchReasons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSeatLeaveReasons();
      const filtered = currentStoreId ? data.filter((r) => r.storeId === currentStoreId) : data;
      setReasons(filtered.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err) {

    } finally {
      setLoading(false);
    }
  }, [currentStoreId]);

  useEffect(() => { fetchReasons(); }, [fetchReasons, isAdmin]);

  const resetForm = () => {
    setFormName('');
    setFormOrder(reasons.length + 1);
    setFormActive(true);
    setEditTarget(null);
  };

  const openAdd = () => {
    resetForm();
    setModalStoreId(undefined);
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
    if (isAdmin && !editTarget && !modalStoreId) { await alert('지점을 선택해주세요.'); return; }
    if (!formName.trim()) { await alert('사유명을 입력해주세요.'); return; }
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
          displayOrder: reasons.length + 1,
          active: formActive,
          storeId: isAdmin ? modalStoreId : undefined,
        });
      }
      closeModal();
      await fetchReasons();
    } catch (err) {
      await alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('이 사유를 삭제하시겠습니까?'))) return;
    try {
      await deleteSeatLeaveReason(id);
      await fetchReasons();
    } catch (err) {
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

        {isAdmin && (
          <div style={{ paddingTop: 'var(--spacing-md)', paddingRight: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
            <FilterSelect
              value={selectedStoreId && stores.length > 0 ? stores.find((s) => s.id === selectedStoreId)?.storeName || '' : ''}
              options={stores.map((s) => s.storeName)}
              defaultValue={stores.length > 0 ? stores[0].storeName : undefined}
              onChange={(v: string) => {
                const store = stores.find((s) => s.storeName === v);
                setSelectedStoreId(store?.id);
              }}
            />
          </div>
        )}

        <div className={styles.sectionBody} style={{ paddingTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-lg)', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
          {loading ? (
            <p className={styles.placeholderText}>로딩 중...</p>
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
                      <span className={`${styles.statusBadge} ${reason.active ? styles.statusActive : styles.statusInactive}`}>
                        {reason.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button type="button" className={styles.iconBtn} onClick={() => openEdit(reason)}>
                          <img src={editIcon} alt="수정" className={styles.actionIcon} />
                        </button>
                        <button type="button" className={styles.iconBtn} onClick={() => handleDelete(reason.id)}>
                          <img src={trashIcon} alt="삭제" className={styles.actionIcon} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{editTarget ? '사유 수정' : '사유 추가'}</h3>

            <div className={styles.modalForm}>
              {!editTarget && isAdmin && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>지점</label>
                  <FilterSelect
                    value={modalStoreId && stores.length > 0 ? stores.find((s) => s.id === modalStoreId)?.storeName || '' : ''}
                    options={stores.map((s) => s.storeName)}
                    placeholder="지점 선택"
                    onChange={(v: string) => {
                      const store = stores.find((s) => s.storeName === v);
                      setModalStoreId(store?.id);
                    }}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>사유명</label>
                <input
                  className={styles.formInput}
                  placeholder="예: 화장실, 상담 등"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={10}
                />
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 2 }}>
                  {formName.length}/10
                </div>
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

/* ── 지점 정보 탭 ── */
function BranchInfo() {
  const nav = useNavigate();
  const { confirm, alert, ConfirmDialog: StoreConfirmDialog } = useConfirm();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [myStoreId, setMyStoreId] = useState<number | null>(null);

  // 모달 상태
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 수정 폼
  const [formStoreName, setFormStoreName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formKioskPin, setFormKioskPin] = useState('');
  const [formDsaAcadCd, setFormDsaAcadCd] = useState('');
  const [formDsaClientId, setFormDsaClientId] = useState('');
  const [formDsaSecretId, setFormDsaSecretId] = useState('');

  // 등록 폼
  const [createStoreCode, setCreateStoreCode] = useState('');
  const [createStoreName, setCreateStoreName] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createKioskPin, setCreateKioskPin] = useState('');
  const [createDsaAcadCd, setCreateDsaAcadCd] = useState('');
  const [createDsaClientId, setCreateDsaClientId] = useState('');
  const [createDsaSecretId, setCreateDsaSecretId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getStores();
      setStores(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(`지점 목록 조회 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const me = await getMe();
        setRole(me.role);
        setMyStoreId(me.storeId);
      } catch {
        setFetchError('사용자 정보를 불러올 수 없습니다.');
      }
      await fetchStores();
    }
    init();
  }, [fetchStores]);

  const startEdit = () => {
    if (!selectedStore) return;
    setFormStoreName(selectedStore.storeName);
    setFormAddress(selectedStore.address);
    setFormPhone(selectedStore.phone);
    setFormActive(selectedStore.active);
    setFormKioskPin(selectedStore.kioskPin || '');
    setFormDsaAcadCd(selectedStore.dsaAcadCd || '');
    setFormDsaClientId(selectedStore.dsaClientId || '');
    setFormDsaSecretId(selectedStore.dsaSecretId || '');
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (!selectedStore || submitting) return;
    setSubmitting(true);
    try {
      await updateStore(selectedStore.id, {
        storeName: formStoreName,
        address: formAddress,
        phone: formPhone,
        active: formActive,
        kioskPin: formKioskPin,
        dsaAcadCd: formDsaAcadCd,
        dsaClientId: formDsaClientId,
        dsaSecretId: formDsaSecretId,
      });
      setShowModal(false);
      setIsEditing(false);
      await fetchStores();
    } catch (err) {
      await alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStore = async (id: number) => {
    if (!(await confirm('이 지점을 삭제하시겠습니까?'))) return;
    try {
      await deleteStore(id);
      setShowModal(false);
      await fetchStores();
    } catch (err) {
      await alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const resetCreateForm = () => {
    setCreateStoreCode('');
    setCreateStoreName('');
    setCreateAddress('');
    setCreatePhone('');
    setCreateKioskPin('');
    setCreateDsaAcadCd('');
    setCreateDsaClientId('');
    setCreateDsaSecretId('');
  };

  const handleCreate = async () => {
    if (!createStoreName.trim() || !createStoreCode.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createStore({
        storeName: createStoreName,
        storeCode: createStoreCode,
        address: createAddress,
        phone: createPhone,
        kioskPin: createKioskPin,
        dsaAcadCd: createDsaAcadCd,
        dsaClientId: createDsaClientId,
        dsaSecretId: createDsaSecretId,
      });
      setShowCreateModal(false);
      resetCreateForm();
      await fetchStores();
    } catch (err) {
      await alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // MANAGER: 자기 지점만 바로 표시
  const isManager = role === 'MANAGER';
  const myStore = isManager ? stores.find((s) => s.id === myStoreId) ?? null : null;

  // MANAGER일 때 자기 지점 자동 로드
  useEffect(() => {
    if (isManager && myStore && !showModal) {
      setSelectedStore(myStore);
    }
  }, [isManager, myStore, showModal]);

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}><h3 className={styles.sectionTitle}>지점 정보</h3></div>
        <div className={styles.sectionBody}><p className={styles.placeholderText}>로딩 중...</p></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}><h3 className={styles.sectionTitle}>지점 정보</h3></div>
        <div className={styles.sectionBody}><p style={{ color: '#dc2626', fontWeight: 600 }}>{fetchError}</p></div>
      </div>
    );
  }

  /* ── 상세/수정 모달 렌더 (ADMIN 클릭 시 + MANAGER 인라인 공용) ── */
  const renderStoreDetail = (store: Store, inline?: boolean) => (
    <div className={inline ? styles.sectionBody : styles.modalForm}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>지점명</label>
        {isEditing ? (
          <input className={styles.formInput} value={formStoreName} onChange={(e) => setFormStoreName(e.target.value)} />
        ) : (
          <p className={styles.formValue}>{store.storeName}</p>
        )}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>지점코드</label>
        <p className={styles.formValue}>{store.storeCode}</p>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>주소</label>
        {isEditing ? (
          <input className={styles.formInput} value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
        ) : (
          <p className={styles.formValue}>{store.address || '-'}</p>
        )}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>전화번호</label>
        {isEditing ? (
          <input className={styles.formInput} value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
        ) : (
          <p className={styles.formValue}>{store.phone || '-'}</p>
        )}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>활성화</label>
        {isEditing ? (
          <label className={styles.radioLabel}>
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} /> 활성
          </label>
        ) : (
          <span className={`${styles.statusBadge} ${store.active ? styles.statusActive : styles.statusInactive}`}>
            {store.active ? '활성' : '비활성'}
          </span>
        )}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>DSA 연결</label>
        <span className={`${styles.statusBadge} ${store.dsaConnected ? styles.statusActive : styles.statusInactive}`}>
          {store.dsaConnected ? '연결됨' : '미연결'}
        </span>
      </div>

      {isEditing && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>키오스크 PIN</label>
            <input className={styles.formInput} value={formKioskPin} onChange={(e) => setFormKioskPin(e.target.value)} placeholder="변경 시 입력" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA 학원코드</label>
            <input className={styles.formInput} value={formDsaAcadCd} onChange={(e) => setFormDsaAcadCd(e.target.value)} placeholder="변경 시 입력" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA Client ID</label>
            <input className={styles.formInput} value={formDsaClientId} onChange={(e) => setFormDsaClientId(e.target.value)} placeholder="변경 시 입력" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA Secret ID</label>
            <input className={styles.formInput} value={formDsaSecretId} onChange={(e) => setFormDsaSecretId(e.target.value)} placeholder="변경 시 입력" />
          </div>
        </>
      )}

      <div className={styles.modalActions}>
        {isEditing ? (
          <>
            <button type="button" className={styles.btnPrimary} onClick={handleUpdate} disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
            <button type="button" className={styles.btnSecondary} onClick={() => setIsEditing(false)}>취소</button>
          </>
        ) : (
          <>
            <button type="button" className={styles.btnPrimary} onClick={startEdit}>수정</button>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ color: '#dc2626', borderColor: '#dc2626' }}
              onClick={() => handleDeleteStore(store.id)}
            >
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  );

  // MANAGER: 자기 지점 정보만 표시
  if (isManager) {
    return (
      <>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>지점 정보</h3>
          </div>
          {myStore ? renderStoreDetail(myStore, true) : (
            <div className={styles.sectionBody}>
              <p className={styles.placeholderText}>소속 지점 정보를 찾을 수 없습니다.</p>
            </div>
          )}
        </div>
        {StoreConfirmDialog}
      </>
    );
  }

  // ADMIN: 지점 목록 + 클릭 시 상세 페이지 이동
  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ borderBottom: 'none' }}>
          <h3 className={styles.sectionTitle}>지점 정보</h3>
          <button type="button" className={styles.addBtn} onClick={() => setShowCreateModal(true)}>+ 지점 추가</button>
        </div>

        <div className={styles.sectionBody} style={{ paddingTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-lg)', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>지점코드</th>
                <th>지점명</th>
                <th>주소</th>
                <th style={{ width: 140 }}>전화번호</th>
                <th style={{ width: 70 }}>상태</th>
                <th style={{ width: 80 }}>DSA</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>등록된 지점이 없습니다.</td></tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/settings/branch/${store.id}`)}>
                    <td>{store.storeCode}</td>
                    <td>{store.storeName}</td>
                    <td>{store.address || '-'}</td>
                    <td>{store.phone || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${store.active ? styles.statusActive : styles.statusInactive}`}>
                        {store.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${store.dsaConnected ? styles.statusActive : styles.statusInactive}`}>
                        {store.dsaConnected ? '연결' : '미연결'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 등록 모달 */}
      {showCreateModal && (
        <div className={styles.overlay} onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>&#x2715;</button>
            <h3 className={styles.modalTitle}>지점 등록</h3>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>지점코드 *</label>
                <input className={styles.formInput} placeholder="예: DS-001" value={createStoreCode} onChange={(e) => setCreateStoreCode(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>지점명 *</label>
                <input className={styles.formInput} placeholder="예: 대성학원 강남점" value={createStoreName} onChange={(e) => setCreateStoreName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>주소</label>
                <input className={styles.formInput} value={createAddress} onChange={(e) => setCreateAddress(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>전화번호</label>
                <input className={styles.formInput} value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>키오스크 PIN</label>
                <input className={styles.formInput} value={createKioskPin} onChange={(e) => setCreateKioskPin(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>DSA 학원코드</label>
                <input className={styles.formInput} value={createDsaAcadCd} onChange={(e) => setCreateDsaAcadCd(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>DSA Client ID</label>
                <input className={styles.formInput} value={createDsaClientId} onChange={(e) => setCreateDsaClientId(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>DSA Secret ID</label>
                <input className={styles.formInput} value={createDsaSecretId} onChange={(e) => setCreateDsaSecretId(e.target.value)} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnPrimary} onClick={handleCreate} disabled={submitting}>
                {submitting ? '등록 중...' : '등록'}
              </button>
              <button type="button" className={styles.btnSecondary} onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {StoreConfirmDialog}
    </>
  );
}

/* ── 메시지 템플릿 관리 ── */
function MessageTemplateSettings() {
  const { confirm, alert, ConfirmDialog: TplConfirmDialog } = useConfirm();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<MessageTemplate | null>(null);
  const [formContent, setFormContent] = useState('');
  const [myStoreId, setMyStoreId] = useState<number | undefined>(undefined);
  const [tplPage, setTplPage] = useState(1);
  const TPL_PER_PAGE = 10;

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [modalStoreId, setModalStoreId] = useState<number | undefined>(undefined);

  useEffect(() => {
    getMe().then((me) => {
      setMyStoreId(me.storeId);
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => {
          const activeStores = list.filter((s) => s.active);
          setStores(activeStores);
        });
      }
    }).catch(() => {});
  }, []);

  const currentStoreId = isAdmin ? selectedStoreId : undefined;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMessageTemplates();
      const filtered = currentStoreId ? data.filter((t) => t.storeId === currentStoreId) : data;
      setTemplates(filtered);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates, isAdmin]);

  const resetForm = () => { setFormContent(''); setEditTarget(null); };

  const openAdd = () => { resetForm(); setModalStoreId(undefined); setShowModal(true); };
  const openEdit = (t: MessageTemplate) => {
    setEditTarget(t);
    setFormContent(t.content);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const handleSubmit = async () => {
    if (isAdmin && !editTarget && !modalStoreId) { await alert('지점을 선택해주세요.'); return; }
    if (!formContent.trim()) { await alert('메시지 내용을 입력해주세요.'); return; }
    try {
      if (editTarget) {
        await updateMessageTemplate(editTarget.id, { content: formContent.trim() });
      } else {
        const storeIdToSend = isAdmin ? modalStoreId : myStoreId;
        await createMessageTemplate({ content: formContent.trim() }, storeIdToSend);
      }
      closeModal();
      await fetchTemplates();
    } catch {
      await alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('이 템플릿을 삭제하시겠습니까?'))) return;
    try {
      await deleteMessageTemplate(id);
      await fetchTemplates();
    } catch {
      await alert('삭제에 실패했습니다.');
    }
  };

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>메시지 템플릿</h3>
          <button type="button" className={styles.addBtn} onClick={openAdd}>+ 템플릿 추가</button>
        </div>

        {isAdmin && (
          <div style={{ paddingTop: 'var(--spacing-md)', paddingRight: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
            <FilterSelect
              value={selectedStoreId ? (stores.find((s) => s.id === selectedStoreId)?.storeName || '') : '전체'}
              options={['전체', ...stores.map((s) => s.storeName)]}
              defaultValue="전체"
              onChange={(v: string) => {
                if (v === '전체') {
                  setSelectedStoreId(undefined);
                } else {
                  const store = stores.find((s) => s.storeName === v);
                  setSelectedStoreId(store?.id);
                }
              }}
            />
          </div>
        )}

        <div className={styles.sectionBody} style={{ paddingTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-lg)', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
          {loading ? (
            <p className={styles.placeholderText}>로딩 중...</p>
          ) : (
            <>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>지점</th>
                    <th>내용</th>
                    <th style={{ width: 150 }}>등록일</th>
                    <th style={{ width: 100 }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 ? (
                    <tr><td colSpan={4} className={styles.emptyCell}>등록된 템플릿이 없습니다.</td></tr>
                  ) : (
                    templates.slice((tplPage - 1) * TPL_PER_PAGE, tplPage * TPL_PER_PAGE).map((t) => (
                    <tr key={t.id}>
                      <td>{t.storeName}</td>
                      <td style={{ textAlign: 'center' }}>{t.content}</td>
                      <td>{new Date(t.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button type="button" className={styles.iconBtn} onClick={() => openEdit(t)}>
                            <img src={editIcon} alt="수정" className={styles.actionIcon} />
                          </button>
                          <button type="button" className={styles.iconBtn} onClick={() => handleDelete(t.id)}>
                            <img src={trashIcon} alt="삭제" className={styles.actionIcon} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
              {templates.length > TPL_PER_PAGE && (
                <div className={f.pagination}>
                  <button
                    type="button"
                    className={f.pageBtn}
                    disabled={tplPage <= 1}
                    onClick={() => setTplPage((p) => p - 1)}
                  >
                    &lsaquo;
                  </button>
                  <span className={f.pageInfo}>{tplPage} / {Math.ceil(templates.length / TPL_PER_PAGE)}</span>
                  <button
                    type="button"
                    className={f.pageBtn}
                    disabled={tplPage >= Math.ceil(templates.length / TPL_PER_PAGE)}
                    onClick={() => setTplPage((p) => p + 1)}
                  >
                    &rsaquo;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{editTarget ? '템플릿 수정' : '템플릿 추가'}</h3>
            <div className={styles.modalForm}>
              {!editTarget && isAdmin && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>지점</label>
                  <FilterSelect
                    value={modalStoreId && stores.length > 0 ? stores.find((s) => s.id === modalStoreId)?.storeName || '' : ''}
                    options={stores.map((s) => s.storeName)}
                    placeholder="지점 선택"
                    onChange={(v: string) => {
                      const store = stores.find((s) => s.storeName === v);
                      setModalStoreId(store?.id);
                    }}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>내용</label>
                <textarea
                  className={styles.formInput}
                  rows={4}
                  maxLength={50}
                  placeholder="메시지 템플릿 내용을 입력하세요"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <span className={styles.charCount}>{formContent.length}/50</span>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnPrimary} onClick={handleSubmit}>
                  {editTarget ? '수정' : '등록'}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={closeModal}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {TplConfirmDialog}
    </>
  );
}

/* ── 학생 메시지 관리 ── */
function StudentMessageSettings() {
  const { confirm, alert, ConfirmDialog: MsgConfirmDialog } = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StudentMessage | null>(null);
  const [formContent, setFormContent] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [msgPage, setMsgPage] = useState(1);
  const MSG_PER_PAGE = 7;

  // 복수 학생 선택 (신규 등록용)
  const [modalStudentIds, setModalStudentIds] = useState<number[]>([]);
  const [modalStudentSearch, setModalStudentSearch] = useState('');

  // 메시지 템플릿
  const [msgTemplates, setMsgTemplates] = useState<MessageTemplate[]>([]);

  // 학생 목록 로드
  useEffect(() => {
    setLoading(true);
    getStudents()
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
    getMessageTemplates().then(setMsgTemplates).catch(() => {});
  }, []);

  // 학생 검색 필터 (좌측 목록)
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.trim().toLowerCase();
    return students.filter(
      (s) => (s.name ?? '').toLowerCase().includes(q) || (s.studentNumber ?? '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  // 모달 내 학생 검색 필터
  const modalFilteredStudents = useMemo(() => {
    if (!modalStudentSearch.trim()) return students;
    const q = modalStudentSearch.trim().toLowerCase();
    return students.filter(
      (s) => (s.name ?? '').toLowerCase().includes(q) || (s.studentNumber ?? '').toLowerCase().includes(q)
    );
  }, [students, modalStudentSearch]);

  // 선택된 학생의 메시지 로드
  const fetchMessages = useCallback(async (studentId: number) => {
    setMsgLoading(true);
    try {
      const data = await getStudentMessages(studentId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) fetchMessages(selectedStudentId);
    else setMessages([]);
  }, [selectedStudentId, fetchMessages]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const resetForm = () => {
    setFormContent('');
    setFormActive(true);
    setEditTarget(null);
    setModalStudentIds([]);
    setModalStudentSearch('');
  };

  const openAdd = () => {
    resetForm();
    // 현재 선택된 학생이 있으면 미리 체크
    if (selectedStudentId) setModalStudentIds([selectedStudentId]);
    setShowModal(true);
  };

  const openEdit = (msg: StudentMessage) => {
    setEditTarget(msg);
    setFormContent(msg.content);
    setFormActive(msg.active);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const toggleModalStudent = (id: number) => {
    setModalStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllModalStudents = () => {
    const visibleIds = modalFilteredStudents.map((s) => s.id);
    const allSelected = visibleIds.every((id) => modalStudentIds.includes(id));
    if (allSelected) {
      setModalStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setModalStudentIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleSubmit = async () => {
    if (!editTarget && modalStudentIds.length === 0) { await alert('학생을 선택해주세요.'); return; }
    if (!formContent.trim()) { await alert('템플릿을 선택하거나 메시지 내용을 입력해주세요.'); return; }
    try {
      if (editTarget) {
        await updateStudentMessage(editTarget.id, {
          content: formContent.trim(),
          active: formActive,
        });
      } else {
        await createStudentMessage({
          studentIds: modalStudentIds,
          content: formContent.trim(),
        });
      }
      closeModal();
      if (selectedStudentId) await fetchMessages(selectedStudentId);
    } catch {
      await alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('이 메시지를 삭제하시겠습니까?'))) return;
    try {
      await deleteStudentMessage(id);
      if (selectedStudentId) await fetchMessages(selectedStudentId);
    } catch {
      await alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (msg: StudentMessage) => {
    try {
      await updateStudentMessage(msg.id, {
        content: msg.content,
        active: !msg.active,
      });
      if (selectedStudentId) await fetchMessages(selectedStudentId);
    } catch {
      await alert('상태 변경에 실패했습니다.');
    }
  };

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>학생 개인 메시지 관리</h3>
          <button type="button" className={styles.addBtn} onClick={openAdd}>+ 메시지 추가</button>
        </div>
        <div className={styles.sectionBody}>
          {/* 학생 선택 영역 */}
          <div className={styles.msgLayout}>
            <div className={styles.msgStudentList}>
              <input
                type="text"
                className={f.filterInput}
                style={{ width: '100%' }}
                placeholder="학생 이름 또는 학번 검색"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <div className={styles.msgStudentScroll}>
                {loading ? (
                  <p className={styles.placeholderText}>로딩 중...</p>
                ) : filteredStudents.length === 0 ? (
                  <p className={styles.placeholderText}>학생이 없습니다.</p>
                ) : (
                  <>
                    {filteredStudents.slice(0, 50).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`${styles.msgStudentItem} ${selectedStudentId === s.id ? styles.msgStudentItemActive : ''}`}
                        onClick={() => { setSelectedStudentId(s.id); setMsgPage(1); }}
                      >
                        <span className={styles.msgStudentName}>{s.name}</span>
                        <span className={styles.msgStudentNumber}>{s.studentNumber}</span>
                      </button>
                    ))}
                    {filteredStudents.length > 50 && (
                      <p className={styles.placeholderText} style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-sm)' }}>
                        외 {filteredStudents.length - 50}명 — 검색으로 범위를 좁혀주세요
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 메시지 목록 영역 */}
            <div className={styles.msgContent}>
              {!selectedStudentId ? (
                <p className={styles.placeholderText}>왼쪽에서 학생을 선택하세요.</p>
              ) : (
                <>
                  <div className={styles.msgContentHeader}>
                    <span className={styles.msgContentTitle}>
                      {selectedStudent?.name} ({selectedStudent?.studentNumber})
                    </span>
                  </div>

                  {msgLoading ? (
                    <p className={styles.placeholderText}>로딩 중...</p>
                  ) : messages.length === 0 ? (
                    <p className={styles.placeholderText}>등록된 메시지가 없습니다.</p>
                  ) : (
                    <>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>내용</th>
                          <th style={{ width: 80 }}>상태</th>
                          <th style={{ width: 150 }}>등록일</th>
                          <th style={{ width: 100 }}>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.slice((msgPage - 1) * MSG_PER_PAGE, msgPage * MSG_PER_PAGE).map((msg) => (
                          <tr key={msg.id}>
                            <td style={{ textAlign: 'left' }}>{msg.content}</td>
                            <td>
                              <button
                                type="button"
                                className={`${styles.statusBadge} ${msg.active ? styles.statusActive : styles.statusInactive}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleToggleActive(msg)}
                              >
                                {msg.active ? '활성' : '비활성'}
                              </button>
                            </td>
                            <td>{new Date(msg.createdAt).toLocaleDateString('ko-KR')}</td>
                            <td>
                              <div className={styles.actionBtns}>
                                <button type="button" className={styles.iconBtn} onClick={() => openEdit(msg)}>
                                  <img src={editIcon} alt="수정" className={styles.actionIcon} />
                                </button>
                                <button type="button" className={styles.iconBtn} onClick={() => handleDelete(msg.id)}>
                                  <img src={trashIcon} alt="삭제" className={styles.actionIcon} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {messages.length > MSG_PER_PAGE && (
                      <div className={f.pagination}>
                        <button type="button" className={f.pageBtn} disabled={msgPage === 1} onClick={() => setMsgPage(msgPage - 1)}>&lt;</button>
                        {Array.from({ length: Math.ceil(messages.length / MSG_PER_PAGE) }, (_, i) => (
                          <button
                            key={i + 1}
                            type="button"
                            className={`${f.pageBtn} ${msgPage === i + 1 ? f.pageBtnActive : ''}`}
                            onClick={() => setMsgPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button type="button" className={f.pageBtn} disabled={msgPage === Math.ceil(messages.length / MSG_PER_PAGE)} onClick={() => setMsgPage(msgPage + 1)}>&gt;</button>
                      </div>
                    )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 추가/수정 모달 */}
      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{editTarget ? '메시지 수정' : '메시지 추가'}</h3>

            <div className={styles.modalForm}>
              {/* 복수 학생 선택 (신규 등록 시) */}
              {!editTarget && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    대상 학생 ({modalStudentIds.length}명 선택)
                  </label>
                  <input
                    type="text"
                    className={f.filterInput}
                    style={{ width: '100%' }}
                    placeholder="이름 또는 학번으로 검색"
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                  />
                  <div className={styles.modalStudentPicker}>
                    <label className={styles.modalStudentCheckAll}>
                      <input
                        type="checkbox"
                        checked={modalFilteredStudents.length > 0 && modalFilteredStudents.every((s) => modalStudentIds.includes(s.id))}
                        onChange={toggleAllModalStudents}
                      />
                      전체 선택
                    </label>
                    {modalFilteredStudents.slice(0, 50).map((s) => (
                      <label key={s.id} className={styles.modalStudentCheckItem}>
                        <input
                          type="checkbox"
                          checked={modalStudentIds.includes(s.id)}
                          onChange={() => toggleModalStudent(s.id)}
                        />
                        <span>{s.name}</span>
                        <span className={styles.msgStudentNumber}>{s.studentNumber}</span>
                      </label>
                    ))}
                    {modalFilteredStudents.length > 50 && (
                      <p className={styles.placeholderText} style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-sm)' }}>
                        외 {modalFilteredStudents.length - 50}명 — 검색으로 범위를 좁혀주세요
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!editTarget && msgTemplates.length > 0 && (
                <div className={`${styles.formGroup} ${styles.formFilterFull}`}>
                  <label className={styles.formLabel}>템플릿 선택</label>
                  <FilterSelect
                    value=""
                    options={['선택', ...msgTemplates.map((t) => t.content)]}
                    placeholder="-- 템플릿을 선택하세요 --"
                    defaultValue="선택"
                    onChange={(v) => { if (v !== '선택') setFormContent(v); }}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>내용</label>
                <textarea
                  className={styles.formInput}
                  rows={4}
                  maxLength={50}
                  placeholder="학생에게 표시할 메시지를 입력하세요"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <span className={styles.charCount}>{formContent.length}/50</span>
              </div>

              {editTarget && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>상태</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input type="radio" checked={formActive} onChange={() => setFormActive(true)} />
                      활성
                    </label>
                    <label className={styles.radioLabel}>
                      <input type="radio" checked={!formActive} onChange={() => setFormActive(false)} />
                      비활성
                    </label>
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSubmit}
                >
                  {editTarget ? '수정' : `${modalStudentIds.length}명에게 등록`}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={closeModal}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {MsgConfirmDialog}
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
