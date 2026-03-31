import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
  LuList,
  LuLayoutGrid,
  LuX,
  LuPlus,
  LuPencil,
  LuMapPin,
  LuSave,
  LuGripVertical,
} from 'react-icons/lu';
import seatIcon from '../assets/seat_active.png';
import { getStudents } from '../api/studentApi';
import {
  getSeats,
  getSeatAreas,
  getSeatStatusByArea,
  getSeatStatus,
  createSeat,
  updateSeat,
  deleteSeat,
  getSeatChangeRequests,
  approveSeatChangeRequest,
  rejectSeatChangeRequest,
} from '../api/seatApi';
import type { Seat, SeatArea, SeatStatusByArea, SeatStatusItem, SeatWaitingEntry, SeatChangeRequest, PageResponse } from '../api/seatApi';
import { getSeatLeaves } from '../api/seatLeaveApi';
import { getTodayAttendanceStatus } from '../api/attendanceAdminApi';
import { getMe } from '../api/authApi';
import useConfirm from '../hooks/useConfirm';
import styles from './SeatManagement.module.css';
import f from '../styles/filter.module.css';
import FilterSelect from '../components/FilterSelect';

/* ── 배치도용 합성 타입 ── */

/** 좌석에 표시할 출결 상태 */
type SeatAttendanceLabel = '학습중' | '외출' | '조퇴' | '하원' | '좌석이탈' | null;

interface SeatWithStatus extends Seat {
  assignedStudentName: string | null;
  assignedStudentNumber: string | null;
  assignedClassName: string | null;
  waitingCount: number;
  waitingList: SeatWaitingEntry[];
  attendanceLabel: SeatAttendanceLabel;
  seatLeaveReason: string | null;
}

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'currentSeatLabel' | 'desiredSeat1Label' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareRows(a: SeatChangeRequest, b: SeatChangeRequest, field: SortField, dir: SortDir): number {
  const va = (a[field] ?? '') as string;
  const vb = (b[field] ?? '') as string;
  const cmp = va.localeCompare(vb);
  return dir === 'desc' ? -cmp : cmp;
}

const ITEMS_PER_PAGE = 20;

const ATT_STYLE_MAP: Record<string, string> = {
  '학습중': 'attPresent',
  '외출': 'attOuting',
  '조퇴': 'attEarlyLeave',
  '하원': 'attCheckedOut',
  '좌석이탈': 'attSeatLeave',
};

/* ── 뷰 타입 ── */

type ViewMode = 'layout' | 'waiting';
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

/* ── Page ── */

export default function SeatManagement() {
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'waiting' ? 'waiting' : 'layout';
  const { confirm, alert, ConfirmDialog } = useConfirm();
  const [view, setView] = useState<ViewMode>(initialView);

  /* ── 로그인 지점 ── */
  const [myStoreId, setMyStoreId] = useState<number | undefined>(undefined);

  /* ── 구역 상태 ── */
  const [areas, setAreas] = useState<SeatArea[]>([]);
  const [selectedAreaCd, setSelectedAreaCd] = useState<string>('');

  /* ── 배치도 상태 ── */
  const [seats, setSeats] = useState<SeatWithStatus[]>([]);
  const [searchSeat, setSearchSeat] = useState('');
  const [layoutLoading, setLayoutLoading] = useState(false);

  /* ── 캔버스 배치 모드 ── */
  type PlacingTarget = 'add' | 'edit' | null;
  const [placingMode, setPlacingMode] = useState<PlacingTarget>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editSeatRef = useRef<SeatWithStatus | null>(null);

  /* ── 좌석 편집 모드 (일괄 저장) ── */
  const [editingLayout, setEditingLayout] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

  interface PendingAdd {
    tempId: string;
    seatLabel: string;
    seatType: string;
    xPos: number;
    yPos: number;
  }
  interface PendingMove {
    seatId: number;
    xPos: number;
    yPos: number;
  }
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([]);
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set());

  /* ── 편집 모드: 좌석 추가 모달 ── */
  const [editAddPos, setEditAddPos] = useState<{ x: number; y: number } | null>(null);
  const [editAddLabel, setEditAddLabel] = useState('');
  const [editAddType, setEditAddType] = useState('INDIVIDUAL');

  /* ── 드래그 상태 ── */
  const [draggingSeatId, setDraggingSeatId] = useState<number | string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  /* ── 캔버스 드래그-패닝 (비편집 모드) ── */
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const panMovedRef = useRef(false);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isPanningRef.current = true;
    panMovedRef.current = false;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panMovedRef.current = true;
    container.scrollLeft = panStartRef.current.scrollLeft - dx;
    container.scrollTop = panStartRef.current.scrollTop - dy;
  }, []);

  const handlePanEnd = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = '';
      container.style.userSelect = '';
    }
  }, []);

  /* ── 좌석 추가 폼 ── */
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSeatLabel, setNewSeatLabel] = useState('');
  const [newSeatType, setNewSeatType] = useState('INDIVIDUAL');
  const [newXPos, setNewXPos] = useState('');
  const [newYPos, setNewYPos] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  /* ── 좌석 상세/수정 모달 ── */
  const [selectedSeat, setSelectedSeat] = useState<SeatWithStatus | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState('');
  const [editXPos, setEditXPos] = useState('');
  const [editYPos, setEditYPos] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showWaitingList, setShowWaitingList] = useState(false);

  /* ── 대기 리스트 상태 ── */
  const [waitingData, setWaitingData] = useState<SeatChangeRequest[]>([]);
  const [waitingTotal, setWaitingTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalItem, setModalItem] = useState<SeatChangeRequest | null>(null);
  const [approvalSeat, setApprovalSeat] = useState<string | null>(null);

  /* ── 대기 리스트 필터 ── */
  const [wSearchName, setWSearchName] = useState('');
  const [wSearchNumber, setWSearchNumber] = useState('');
  const [wAppliedFilters, setWAppliedFilters] = useState({ name: '', number: '' });

  /* ── 로그인 정보 + 구역 목록 로드 ── */
  useEffect(() => {
    getMe()
      .then((me) => {
        setMyStoreId(me.storeId);
        return getSeatAreas(me.storeId);
      })
      .then((list) => {
        setAreas(list);
        if (list.length > 0 && !selectedAreaCd) {
          setSelectedAreaCd(list[0].areaCd);
        }
      })
      .catch(() => setAreas([]));
  }, []);

  /* ── 배치도 로드: 좌석 + 좌석현황 + 출결 + 이탈 병합 ── */
  const loadLayout = useCallback(async () => {
    setLayoutLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // DSA 좌석 현황: 구역이 선택되었을 때만 조회
      const dsaStatusPromise = selectedAreaCd
        ? getSeatStatusByArea(selectedAreaCd).catch(() => [] as SeatStatusByArea[])
        : Promise.resolve([] as SeatStatusByArea[]);

      const DSA_CELL_W = 80;
      const DSA_CELL_H = 60;

      const [dsaStatusList, attendanceList, seatLeaveResult] = await Promise.all([
        dsaStatusPromise,
        getTodayAttendanceStatus().catch(() => []),
        getSeatLeaves({ startDate: today, endDate: today, page: 0, size: 500 }).catch(() => ({ content: [] })),
      ]);

      // 출결 상태 맵
      const attendanceBySeatLabel = new Map<string, string>();
      const attendanceByStudentName = new Map<string, string>();
      attendanceList.forEach((a) => {
        if (a.seatLabel) attendanceBySeatLabel.set(a.seatLabel, a.status);
        if (a.studentName) attendanceByStudentName.set(a.studentName, a.status);
      });

      // 활성 좌석이탈
      const activeLeaveBySeatLabel = new Map<string, string>();
      (seatLeaveResult.content ?? []).forEach((r) => {
        if (!r.endedAt) {
          activeLeaveBySeatLabel.set(r.seatLabel, r.reasonName);
        }
      });

      // DSA 데이터 기준으로 좌석 생성
      const merged: SeatWithStatus[] = dsaStatusList
        .filter((dsa) => dsa.seatGn === 'Y')
        .map((dsa) => {
          const seatLabel = dsa.seatNm;
          const studentName = dsa.studentName ?? null;

          let attendanceLabel: SeatAttendanceLabel = null;
          let seatLeaveReason: string | null = null;

          // DSA 실시간 상태
          switch (dsa.state) {
            case 'S': attendanceLabel = '학습중'; break;
            case 'D': attendanceLabel = '외출'; break;
            case 'A': attendanceLabel = '좌석이탈'; break;
            default: break;
          }
          if (dsa.away) {
            attendanceLabel = '좌석이탈';
          }
          if (attendanceLabel === '좌석이탈' && dsa.leaveReasonName) {
            seatLeaveReason = dsa.leaveReasonName;
          }

          // 자체 백엔드 출결로 조퇴/하원 덮어쓰기
          const attStatus = attendanceBySeatLabel.get(seatLabel)
            || (studentName ? attendanceByStudentName.get(studentName) : undefined);
          if (attStatus === 'EARLY_LEAVE') {
            attendanceLabel = '조퇴';
          } else if (attStatus === 'CHECKED_OUT') {
            attendanceLabel = '하원';
          } else if (attStatus === 'OUTING' && attendanceLabel !== '좌석이탈') {
            attendanceLabel = '외출';
          }
          if (attStatus === 'PRESENT' && !attendanceLabel) {
            attendanceLabel = '학습중';
          }

          // 좌석이탈 사유 보강
          if (attendanceLabel === '좌석이탈' && !seatLeaveReason) {
            seatLeaveReason = activeLeaveBySeatLabel.get(seatLabel) ?? null;
          }

          return {
            id: 0,
            storeId: myStoreId ?? 0,
            seatLabel,
            seatType: 'INDIVIDUAL',
            xPos: dsa.xPos * DSA_CELL_W,
            yPos: dsa.yPos * DSA_CELL_H,
            active: true,
            areaCd: selectedAreaCd,
            areaNm: '',
            assignedStudentName: studentName,
            assignedStudentNumber: null,
            assignedClassName: null,
            waitingCount: 0,
            waitingList: [],
            attendanceLabel,
            seatLeaveReason,
          } as SeatWithStatus;
        });
      setSeats(merged);
    } catch (err) {
      console.error('좌석 배치도 조회 실패:', err);
    } finally {
      setLayoutLoading(false);
    }
  }, [selectedAreaCd]);

  useEffect(() => {
    if (view === 'layout') loadLayout();
  }, [view, loadLayout]);

  /* ── 대기 리스트 로드 ── */
  const loadWaiting = useCallback(() => {
    getSeatChangeRequests({ status: statusFilter === 'ALL' ? undefined : statusFilter, page: page - 1, size: ITEMS_PER_PAGE })
      .then((result: PageResponse<SeatChangeRequest>) => {
        setWaitingData(result.content);
        setWaitingTotal(result.totalElements);
      })
      .catch(() => { /* 에러 시 빈 목록 */ });
  }, [statusFilter, page]);

  useEffect(() => {
    if (view === 'waiting') loadWaiting();
  }, [view, loadWaiting]);

  /* ── 배치도: 캔버스 크기 계산 ── */
  const MIN_CANVAS_W = 1200;
  const MIN_CANVAS_H = 700;
  const CANVAS_PADDING = 200;

  const canvasSize = useMemo(() => {
    if (seats.length === 0) return { width: MIN_CANVAS_W, height: MIN_CANVAS_H };
    const maxX = Math.max(...seats.map((s) => s.xPos));
    const maxY = Math.max(...seats.map((s) => s.yPos));
    return {
      width: Math.max(MIN_CANVAS_W, maxX + CANVAS_PADDING),
      height: Math.max(MIN_CANVAS_H, maxY + CANVAS_PADDING),
    };
  }, [seats]);

  /* ── 배치도: 검색 필터 ── */
  const filteredSeats = useMemo(() => {
    if (!searchSeat.trim()) return seats.filter((s) => s.active);
    const q = searchSeat.trim().toLowerCase();
    return seats.filter((s) => {
      if (!s.active) return false;
      return (
        s.seatLabel.toLowerCase().includes(q) ||
        (s.assignedStudentName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [seats, searchSeat]);

  const activeSeats = seats.filter((s) => s.active);
  const occupiedCount = activeSeats.filter((s) => s.assignedStudentName).length;
  const vacantCount = activeSeats.length - occupiedCount;

  /* ── 캔버스 클릭 → 좌표 지정 (그리드 스냅) ── */
  const SEAT_W = 80;
  const SEAT_H = 60;
  const GRID_X = SEAT_W;
  const GRID_Y = SEAT_H;

  /** 마우스 좌표 → 캔버스 내 절대 좌표 */
  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
    const scrollTop = canvasRef.current?.scrollTop ?? 0;
    return {
      x: Math.round(e.clientX - rect.left + scrollLeft),
      y: Math.round(e.clientY - rect.top + scrollTop),
    };
  };

  /** 커서가 위치한 그리드 셀 좌상단으로 스냅 */
  const snapToGrid = (pos: { x: number; y: number }) => ({
    x: Math.max(0, Math.floor(pos.x / GRID_X) * GRID_X),
    y: Math.max(0, Math.floor(pos.y / GRID_Y) * GRID_Y),
  });

  /** 해당 좌표에 이미 좌석이 있는지 확인 (수정 시 자기 자신은 제외) */
  const isOccupiedCell = (x: number, y: number) => {
    const editingId = placingMode === 'edit' ? editSeatRef.current?.id : undefined;
    return seats.some((s) => s.active && s.id !== editingId && s.xPos === x && s.yPos === y);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode) return;
    const raw = getCanvasPos(e);
    if (!raw) return;
    const pos = snapToGrid(raw);

    if (isOccupiedCell(pos.x, pos.y)) return;

    if (placingMode === 'add') {
      setNewXPos(String(pos.x));
      setNewYPos(String(pos.y));
      setShowAddForm(true);
      setPlacingMode(null);
      setGhostPos(null);
    } else if (placingMode === 'edit' && editSeatRef.current) {
      setEditXPos(String(pos.x));
      setEditYPos(String(pos.y));
      setSelectedSeat(editSeatRef.current);
      setPlacingMode(null);
      setGhostPos(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode) { setGhostPos(null); return; }
    const raw = getCanvasPos(e);
    if (raw) setGhostPos(snapToGrid(raw));
  };

  const handleCanvasMouseLeave = () => {
    setGhostPos(null);
  };

  const cancelPlacing = () => {
    setPlacingMode(null);
    setGhostPos(null);
  };

  /* ── 편집 모드 진입/취소/저장 ── */
  const enterEditMode = () => {
    closeSeatDetail();
    setPendingAdds([]);
    setPendingMoves([]);
    setPendingDeletes(new Set());
    setEditingLayout(true);
  };

  const cancelEditMode = async () => {
    const hasChanges = pendingAdds.length > 0 || pendingMoves.length > 0 || pendingDeletes.size > 0;
    if (hasChanges && !await confirm('변경사항을 취소하시겠습니까?')) return;
    setPendingAdds([]);
    setPendingMoves([]);
    setPendingDeletes(new Set());
    setEditingLayout(false);
    setDraggingSeatId(null);
    loadLayout();
  };

  const saveEditMode = async () => {
    const totalChanges = pendingAdds.length + pendingMoves.length + pendingDeletes.size;
    if (totalChanges === 0) {
      setEditingLayout(false);
      return;
    }
    setSavingLayout(true);
    try {
      // 삭제 처리
      for (const seatId of pendingDeletes) {
        await deleteSeat(seatId);
      }
      // 추가 처리
      for (const add of pendingAdds) {
        await createSeat({ seatLabel: add.seatLabel, seatType: add.seatType, xPos: add.xPos, yPos: add.yPos });
      }
      // 이동 처리 (삭제 대상은 건너뜀)
      for (const move of pendingMoves) {
        if (pendingDeletes.has(move.seatId)) continue;
        const original = seats.find((s) => s.id === move.seatId);
        if (!original) continue;
        await updateSeat(move.seatId, {
          seatLabel: original.seatLabel,
          seatType: original.seatType,
          xPos: move.xPos,
          yPos: move.yPos,
          active: original.active,
        });
      }
      setPendingAdds([]);
      setPendingMoves([]);
      setPendingDeletes(new Set());
      setEditingLayout(false);
      loadLayout();
    } catch (err) {
      console.error('좌석 일괄 저장 실패:', err);
      await alert('저장에 실패했습니다. 일부 변경만 적용되었을 수 있습니다.');
      loadLayout();
    } finally {
      setSavingLayout(false);
    }
  };

  /** 편집 모드에서 좌석의 현재 좌표 (이동 반영) */
  const getEditPos = (seat: SeatWithStatus) => {
    const move = pendingMoves.find((m) => m.seatId === seat.id);
    return move ? { x: move.xPos, y: move.yPos } : { x: seat.xPos, y: seat.yPos };
  };

  /** 편집 모드: 빈 셀 클릭 → 좌석 추가 모달 열기 */
  const handleEditCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editingLayout || draggingSeatId) return;
    const raw = getCanvasPos(e);
    if (!raw) return;
    const pos = snapToGrid(raw);

    // 기존 좌석/추가 예정 좌석과 겹치는지 확인
    const occupied = seats.some((s) => s.active && !pendingDeletes.has(s.id) && getEditPos(s).x === pos.x && getEditPos(s).y === pos.y)
      || pendingAdds.some((a) => a.xPos === pos.x && a.yPos === pos.y);
    if (occupied) return;

    setEditAddPos(pos);
    setEditAddLabel('');
    setEditAddType('INDIVIDUAL');
  };

  /** 편집 모드: 좌석 추가 모달 확인 */
  const handleEditAddConfirm = async () => {
    if (!editAddPos) return;
    if (!editAddLabel.trim()) { await alert('좌석 라벨을 입력해주세요.'); return; }

    // 중복 라벨 확인
    const allLabels = [
      ...seats.filter((s) => !pendingDeletes.has(s.id)).map((s) => s.seatLabel),
      ...pendingAdds.map((a) => a.seatLabel),
    ];
    if (allLabels.includes(editAddLabel.trim())) {
      await alert('이미 동일한 좌석 번호가 존재합니다.');
      return;
    }

    setPendingAdds((prev) => [...prev, {
      tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      seatLabel: editAddLabel.trim(),
      seatType: editAddType,
      xPos: editAddPos.x,
      yPos: editAddPos.y,
    }]);
    setEditAddPos(null);
  };

  /** 드래그 시작 (기존 좌석) */
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, seatId: number) => {
    if (!editingLayout) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);
    if (!pos) return;
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return;
    const editP = getEditPos(seat);
    dragOffsetRef.current = { dx: pos.x - editP.x, dy: pos.y - editP.y };
    setDraggingSeatId(seatId);
  };

  /** 드래그 시작 (추가 예정 좌석) */
  const handlePendingDragStart = (e: React.MouseEvent<HTMLDivElement>, tempId: string, xPos: number, yPos: number) => {
    if (!editingLayout) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);
    if (!pos) return;
    dragOffsetRef.current = { dx: pos.x - xPos, dy: pos.y - yPos };
    setDraggingSeatId(tempId);
  };

  /** 드래그 중 / 편집 모드 호버 */
  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingSeatId) {
      if (editingLayout || placingMode) {
        const raw = getCanvasPos(e);
        if (raw) setGhostPos(snapToGrid(raw));
      }
      return;
    }
    const pos = getCanvasPos(e);
    if (!pos) return;
    const snapped = snapToGrid({ x: pos.x - dragOffsetRef.current.dx, y: pos.y - dragOffsetRef.current.dy });
    setGhostPos(snapped);
  };

  /** 드래그 종료 */
  const handleDragEnd = () => {
    if (!draggingSeatId || !ghostPos) {
      setDraggingSeatId(null);
      setGhostPos(null);
      return;
    }

    // 겹침 확인 (자기 자신 제외)
    const isOccupied = seats.some((s) => {
      if (!s.active || pendingDeletes.has(s.id)) return false;
      if (s.id === draggingSeatId) return false;
      const p = getEditPos(s);
      return p.x === ghostPos.x && p.y === ghostPos.y;
    }) || pendingAdds.some((a) => {
      if (a.tempId === draggingSeatId) return false;
      return a.xPos === ghostPos.x && a.yPos === ghostPos.y;
    });

    if (!isOccupied) {
      if (typeof draggingSeatId === 'number') {
        // 기존 좌석 이동
        setPendingMoves((prev) => {
          const filtered = prev.filter((m) => m.seatId !== draggingSeatId);
          const original = seats.find((s) => s.id === draggingSeatId);
          // 원래 위치로 돌아왔으면 제거
          if (original && original.xPos === ghostPos.x && original.yPos === ghostPos.y) return filtered;
          return [...filtered, { seatId: draggingSeatId, xPos: ghostPos.x, yPos: ghostPos.y }];
        });
      } else {
        // 추가 예정 좌석 이동
        setPendingAdds((prev) => prev.map((a) =>
          a.tempId === draggingSeatId ? { ...a, xPos: ghostPos.x, yPos: ghostPos.y } : a
        ));
      }
    }

    setDraggingSeatId(null);
    setGhostPos(null);
  };

  /** 편집 모드: 추가 예정 좌석 삭제 */
  const removePendingAdd = (tempId: string) => {
    setPendingAdds((prev) => prev.filter((a) => a.tempId !== tempId));
  };

  /** 편집 모드: 기존 좌석 삭제 토글 (이동 기록은 유지하여 위치 보존) */
  const togglePendingDelete = (seatId: number) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  };

  const pendingChangeCount = pendingAdds.length + pendingMoves.length + pendingDeletes.size;

  /* ── 좌석 추가 핸들러 ── */
  const resetAddForm = () => {
    setNewSeatLabel('');
    setNewSeatType('INDIVIDUAL');
    setNewXPos('');
    setNewYPos('');
    setShowAddForm(false);
    setPlacingMode(null);
    setGhostPos(null);
  };

  const handleAddSeat = async () => {
    if (!newSeatLabel.trim()) { await alert('좌석 라벨을 입력해주세요.'); return; }
    if (!newXPos || !newYPos) { await alert('좌표(X, Y)를 입력해주세요.'); return; }
    if (seats.some((s) => s.seatLabel === newSeatLabel.trim())) {
      await alert('이미 동일한 좌석 번호가 존재합니다.');
      return;
    }
    setAddLoading(true);
    try {
      await createSeat({
        seatLabel: newSeatLabel.trim(),
        seatType: newSeatType,
        xPos: Number(newXPos),
        yPos: Number(newYPos),
      });
      resetAddForm();
      loadLayout();
    } catch (err) {
      console.error('좌석 추가 실패:', err);
      await alert('좌석 추가에 실패했습니다.');
    } finally {
      setAddLoading(false);
    }
  };

  /* ── 좌석 상세 모달 핸들러 ── */
  const openSeatDetail = (seat: SeatWithStatus) => {
    setSelectedSeat(seat);
    setEditMode(false);
    setShowWaitingList(false);
  };

  const closeSeatDetail = () => {
    setSelectedSeat(null);
    setEditMode(false);
    setShowWaitingList(false);
  };

  const startEdit = () => {
    if (!selectedSeat) return;
    setEditLabel(selectedSeat.seatLabel);
    setEditType(selectedSeat.seatType);
    setEditXPos(String(selectedSeat.xPos));
    setEditYPos(String(selectedSeat.yPos));
    setEditMode(true);
  };

  const handleDeleteSeat = async () => {
    if (!selectedSeat) return;
    const msg = selectedSeat.assignedStudentName
      ? `좌석 "${selectedSeat.seatLabel}"을(를) 삭제하시겠습니까?\n\n해당 학생의 좌석 배치를 다시 설정해야 합니다.`
      : `좌석 "${selectedSeat.seatLabel}"을(를) 삭제하시겠습니까?`;
    if (!await confirm(msg)) return;
    try {
      await deleteSeat(selectedSeat.id);
      closeSeatDetail();
      loadLayout();
    } catch (err) {
      console.error('좌석 삭제 실패:', err);
      await alert('좌석 삭제에 실패했습니다.');
    }
  };

  const handleEditSeat = async () => {
    if (!selectedSeat) return;
    if (!editLabel.trim()) { await alert('좌석 라벨을 입력해주세요.'); return; }
    if (seats.some((s) => s.id !== selectedSeat.id && s.seatLabel === editLabel.trim())) {
      await alert('이미 동일한 좌석 번호가 존재합니다.');
      return;
    }
    setEditLoading(true);
    try {
      await updateSeat(selectedSeat.id, {
        seatLabel: editLabel.trim(),
        seatType: editType,
        xPos: Number(editXPos),
        yPos: Number(editYPos),
        active: selectedSeat.active,
      });
      closeSeatDetail();
      loadLayout();
    } catch (err) {
      console.error('좌석 수정 실패:', err);
      await alert('좌석 수정에 실패했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  /* ── 대기 리스트: 필터 핸들러 ── */
  const handleWaitingSearch = () => {
    setWAppliedFilters({ name: wSearchName, number: wSearchNumber });
    setPage(1);
  };

  const handleWaitingReset = () => {
    setWSearchName('');
    setWSearchNumber('');
    setWAppliedFilters({ name: '', number: '' });
    setSort({ field: null, dir: 'asc' });
    setPage(1);
  };

  const handleWaitingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleWaitingSearch();
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  /* ── 대기 리스트: 클라이언트 필터 + 정렬 ── */
  const filteredWaiting = useMemo(() => {
    return waitingData.filter((row) => {
      if (wAppliedFilters.name && !(row.studentName ?? '').includes(wAppliedFilters.name)) return false;
      if (wAppliedFilters.number && !(row.studentNumber ?? '').includes(wAppliedFilters.number)) return false;
      return true;
    });
  }, [waitingData, wAppliedFilters]);

  const sortedWaiting = useMemo(() => {
    if (!sort.field) return filteredWaiting;
    return [...filteredWaiting].sort((a, b) => compareRows(a, b, sort.field!, sort.dir));
  }, [filteredWaiting, sort]);

  const totalPages = Math.max(1, Math.ceil(waitingTotal / ITEMS_PER_PAGE));

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <LuArrowUpDown className={styles.sortIcon} />;
    return sort.dir === 'asc'
      ? <LuArrowUp className={styles.sortIconActive} />
      : <LuArrowDown className={styles.sortIconActive} />;
  };

  const allSelected = sortedWaiting.length > 0 && sortedWaiting.every((r) => selectedIds.has(r.id));
  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedWaiting.map((r) => r.id)));
  };
  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProcess = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    const label = action === 'APPROVED' ? '승인' : '거절';
    if (action === 'APPROVED' && !approvalSeat) {
      await alert('승인할 좌석을 선택해주세요.');
      return;
    }
    const approvalSeatLabel = modalItem
      ? [
          { cd: modalItem.desiredSeat1Cd, label: modalItem.desiredSeat1Label },
          { cd: modalItem.desiredSeat2Cd, label: modalItem.desiredSeat2Label },
          { cd: modalItem.desiredSeat3Cd, label: modalItem.desiredSeat3Label },
        ].find((s) => s.cd === approvalSeat)?.label ?? approvalSeat
      : approvalSeat;
    const confirmMsg = action === 'APPROVED'
      ? `${approvalSeatLabel} 좌석으로 승인하시겠습니까?`
      : '해당 요청을 거절하시겠습니까?';
    if (!await confirm(confirmMsg)) return;
    try {
      if (action === 'APPROVED') {
        await approveSeatChangeRequest(id, approvalSeat!);
      } else {
        await rejectSeatChangeRequest(id);
      }
      loadWaiting();
    } catch (err) {
      console.error(`좌석 변경 ${label} 실패:`, err);
      await alert(`${label}에 실패했습니다.`);
    }
    setModalItem(null);
  };

  const getStatusBadge = (status: SeatChangeRequest['status']) => {
    switch (status) {
      case 'PENDING': return <span className={styles.statusPending}>대기중</span>;
      case 'APPROVED': return <span className={styles.statusApproved}>승인</span>;
      case 'REJECTED': return <span className={styles.statusRejected}>거절</span>;
    }
  };

  /** 테이블 처리상태 셀: 배지 + 처리일시 + 승인좌석 */
  const renderStatusCell = (row: SeatChangeRequest) => (
    <div className={styles.statusCellWrap}>
      {getStatusBadge(row.status)}
      {row.status === 'APPROVED' && row.approvedSeatLabel && (
        <span className={styles.statusExtra}>{row.approvedSeatLabel}</span>
      )}
      {row.status !== 'PENDING' && row.processedAt && (
        <span className={styles.statusExtra}>{row.processedAt.replace('T', ' ').slice(0, 16)}</span>
      )}
    </div>
  );

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <img src={seatIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>좌석 관리</h2>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.waitingListBtn} ${view === 'waiting' ? styles.waitingListBtnActive : ''}`}
            onClick={() => setView(view === 'layout' ? 'waiting' : 'layout')}
          >
            {view === 'layout' ? <LuList /> : <LuLayoutGrid />}
            {view === 'layout' ? '좌석 대기 리스트 보기' : '배치도 보기'}
          </button>
          {/* 좌석 편집 UI 제거 — DSA 기준 조회만 사용 */}
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => (view === 'layout' ? loadLayout() : loadWaiting())}
          >
            새로고침
          </button>
        </div>
      </div>

      {/* ── 배치도 뷰 ── */}
      {view === 'layout' && (
        <>
          {/* 필터 */}
          <div className={f.filterCard}>
            <div className={f.filterRow}>
              {areas.length > 0 && (
                <div className={styles.areaTabs}>
                  {areas.map((a) => (
                    <button
                      key={a.areaCd}
                      type="button"
                      className={`${styles.areaTab} ${selectedAreaCd === a.areaCd ? styles.areaTabActive : ''}`}
                      onClick={() => setSelectedAreaCd(a.areaCd)}
                    >
                      {a.areaNm}
                    </button>
                  ))}
                </div>
              )}
              <div className={f.filterActions}>
                <input
                  className={f.filterInput}
                  value={searchSeat}
                  onChange={(e) => setSearchSeat(e.target.value)}
                  placeholder="좌석 또는 학생명 검색"
                  style={{ textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          {/* 배치/편집 모드 배너 제거 — DSA 기준 조회만 사용 */}

          {/* 배치도 */}
          <div
            ref={scrollContainerRef}
            className={`${styles.contentCard} ${styles.pannable}`}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
          >
            <div className={styles.areaTitle}>
              배정인원 : {occupiedCount}명
              <span className={styles.areaSummary}>(여석 {vacantCount}석)</span>
            </div>

            {layoutLoading ? (
              <div className={styles.emptyState}>불러오는 중...</div>
            ) : seats.length === 0 ? (
              <div className={styles.emptyState}>등록된 좌석이 없습니다.</div>
            ) : (
              <div
                ref={canvasRef}
                className={styles.seatCanvas}
                style={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              >
                {filteredSeats.map((seat) => {
                  const occupied = !!seat.assignedStudentName;
                  const attClass = seat.attendanceLabel ? (styles[ATT_STYLE_MAP[seat.attendanceLabel]] ?? '') : '';
                  return (
                    <div
                      key={seat.seatLabel}
                      className={`${styles.seatCell} ${occupied ? styles.seatOccupied : styles.seatEmpty} ${styles.seatClickable}`}
                      style={{
                        position: 'absolute',
                        left: seat.xPos,
                        top: seat.yPos,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (panMovedRef.current) return;
                        openSeatDetail(seat);
                      }}
                    >
                      <span className={styles.seatLabel}>{seat.seatLabel}</span>
                      {seat.assignedStudentName && (
                        <span className={styles.seatStudentName}>{seat.assignedStudentName}</span>
                      )}
                      {seat.attendanceLabel && (
                        <span
                          className={`${styles.seatAttStatus} ${attClass}`}
                          title={seat.seatLeaveReason ? `${seat.attendanceLabel}: ${seat.seatLeaveReason}` : seat.attendanceLabel}
                        >
                          {seat.attendanceLabel === '좌석이탈' ? seat.seatLeaveReason ?? '이탈' : seat.attendanceLabel}
                        </span>
                      )}
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        </>
      )}

      {/* ── 대기 리스트 뷰 ── */}
      {view === 'waiting' && (
        <>
        {/* 필터 */}
        <div className={f.filterCard}>
          <div className={f.filterRow}>
            <div className={f.filterGroup}>
              <label className={f.filterLabel} htmlFor="sw-name">학생명</label>
              <input
                id="sw-name"
                className={f.filterInput}
                placeholder="학생명"
                value={wSearchName}
                onChange={(e) => setWSearchName(e.target.value)}
                onKeyDown={handleWaitingKeyDown}
              />
            </div>
            <div className={f.filterGroup}>
              <label className={f.filterLabel} htmlFor="sw-number">학번</label>
              <input
                id="sw-number"
                className={f.filterInput}
                placeholder="학번"
                value={wSearchNumber}
                onChange={(e) => setWSearchNumber(e.target.value)}
                onKeyDown={handleWaitingKeyDown}
              />
            </div>
            <div className={f.filterGroup}>
              <label className={f.filterLabel}>상태</label>
              <FilterSelect
                value={statusFilter}
                options={['ALL', 'PENDING', 'APPROVED', 'REJECTED']}
                labelMap={{ ALL: '전체', PENDING: '대기중', APPROVED: '승인', REJECTED: '거절' }}
                placeholder="전체"
                defaultValue="ALL"
                onChange={(v) => handleStatusFilter(v as StatusFilter)}
              />
            </div>
            <div className={f.filterActions}>
              <button type="button" className={f.searchButton} onClick={handleWaitingSearch}>검색</button>
              <button type="button" className={f.resetButton} onClick={handleWaitingReset}>초기화</button>
            </div>
          </div>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCol}>
                    <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                  </th>
                  <th className={styles.sortableCol} onClick={() => handleSort('studentName')}>
                    이름 <SortIcon field="studentName" />
                  </th>
                  <th className={styles.sortableCol} onClick={() => handleSort('studentNumber')}>
                    학번 <SortIcon field="studentNumber" />
                  </th>
                  <th className={styles.sortableCol} onClick={() => handleSort('currentSeatLabel')}>
                    현재좌석 <SortIcon field="currentSeatLabel" />
                  </th>
                  <th>희망 1순위</th>
                  <th>희망 2순위</th>
                  <th>희망 3순위</th>
                  <th className={styles.sortableCol} onClick={() => handleSort('createdAt')}>
                    신청일 <SortIcon field="createdAt" />
                  </th>
                  <th className={styles.sortableCol} onClick={() => handleSort('status')}>
                    처리상태 <SortIcon field="status" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWaiting.length === 0 ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={9}>대기 중인 요청이 없습니다.</td>
                  </tr>
                ) : (
                  sortedWaiting.map((row) => (
                    <tr key={row.id} className={styles.clickableRow} onClick={() => { setModalItem(row); setApprovalSeat(row.desiredSeat1Cd); }}>
                      <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                        />
                      </td>
                      <td>{row.studentName}</td>
                      <td>{row.studentNumber}</td>
                      <td>{row.currentSeatLabel}</td>
                      <td>{row.desiredSeat1Label}</td>
                      <td>{row.desiredSeat2Label}</td>
                      <td>{row.desiredSeat3Label}</td>
                      <td>{row.createdAt.slice(0, 10)}</td>
                      <td>{renderStatusCell(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className={f.pagination}>
            <button
              type="button"
              className={f.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              &lt;
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`${f.pageBtn} ${page === p ? f.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={f.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
        </>
      )}

      {/* ── 좌석 추가 모달 ── */}
      {showAddForm && (
        <div className={styles.modalOverlay} onClick={() => resetAddForm()}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>좌석 추가</h3>
              <button type="button" className={styles.modalCloseBtn} onClick={() => resetAddForm()}>
                <LuX />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>좌석 라벨</label>
                <input
                  className={styles.formInput}
                  value={newSeatLabel}
                  onChange={(e) => setNewSeatLabel(e.target.value)}
                  placeholder="예: A-1"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>좌석 유형</label>
                <select
                  className={styles.formSelect}
                  value={newSeatType}
                  onChange={(e) => setNewSeatType(e.target.value)}
                >
                  <option value="INDIVIDUAL">개인석</option>
                  <option value="GROUP">그룹석</option>
                </select>
              </div>
              <button
                type="button"
                className={styles.pickPositionBtn}
                onClick={() => {
                  setShowAddForm(false);
                  setPlacingMode('add');
                }}
              >
                <LuMapPin /> {newXPos && newYPos ? '배치도에서 위치 다시 선택' : '배치도에서 위치 선택'}
              </button>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.resetButton} onClick={() => resetAddForm()}>
                취소
              </button>
              <button
                type="button"
                className={styles.searchButton}
                onClick={handleAddSeat}
                disabled={addLoading}
              >
                {addLoading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 좌석 상세 모달 ── */}
      {selectedSeat && !showWaitingList && (
        <div className={styles.modalOverlay} onClick={closeSeatDetail}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                좌석 {selectedSeat.seatLabel}
              </h3>
              <div className={styles.modalHeaderActions}>
                <button type="button" className={styles.modalCloseBtn} onClick={closeSeatDetail}>
                  <LuX />
                </button>
              </div>
            </div>

            {(
              <>
                <div className={styles.modalBody}>
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>좌석번호</span>
                    <span className={styles.modalValue}>{selectedSeat.seatLabel}</span>
                  </div>
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>좌석유형</span>
                    <span className={styles.modalValue}>
                      {selectedSeat.seatType === 'INDIVIDUAL' ? '개인석' : '그룹석'}
                    </span>
                  </div>
                  {selectedSeat.areaNm && (
                    <div className={styles.modalRow}>
                      <span className={styles.modalLabel}>구역</span>
                      <span className={styles.modalValue}>{selectedSeat.areaNm}</span>
                    </div>
                  )}

                  <div className={styles.sectionDivider} />

                  <h4 className={styles.sectionTitle}>현재 착석자</h4>
                  {selectedSeat.assignedStudentName ? (
                    <div className={styles.studentInfoCard}>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>이름</span>
                        <span className={styles.modalValue}>{selectedSeat.assignedStudentName}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>학번</span>
                        <span className={styles.modalValue}>{selectedSeat.assignedStudentNumber ?? '-'}</span>
                      </div>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>반</span>
                        <span className={styles.modalValue}>{selectedSeat.assignedClassName ?? '-'}</span>
                      </div>
                      {selectedSeat.attendanceLabel && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>출결현황</span>
                          <span className={styles.modalValue}>
                            {selectedSeat.attendanceLabel}
                            {selectedSeat.seatLeaveReason && ` (${selectedSeat.seatLeaveReason})`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={styles.emptyText}>착석자 없음</p>
                  )}

                  <div className={styles.sectionDivider} />

                  <div className={styles.waitingSection}>
                    <span className={styles.modalLabel}>대기자</span>
                    <button
                      type="button"
                      className={styles.waitingListBtnSm}
                      onClick={() => setShowWaitingList(true)}
                    >
                      목록 보기 ({selectedSeat.waitingCount}명)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 좌석 대기자 리스트 모달 ── */}
      {selectedSeat && showWaitingList && (
        <div className={styles.modalOverlay} onClick={() => setShowWaitingList(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {selectedSeat.seatLabel} 대기자 목록
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowWaitingList(false)}
              >
                <LuX />
              </button>
            </div>
            <div className={styles.modalBody}>
              {selectedSeat.waitingList.length === 0 ? (
                <div className={styles.emptyState}>대기자가 없습니다.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>순위</th>
                        <th>이름</th>
                        <th>학번</th>
                        <th>신청일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSeat.waitingList.map((w) => (
                        <tr key={w.requestId}>
                          <td>{w.priority}순위</td>
                          <td>{w.studentName}</td>
                          <td>{w.studentNumber}</td>
                          <td>{w.createdAt.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => setShowWaitingList(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 좌석 변경 신청 상세 모달 ── */}
      {modalItem && (
        <div className={styles.modalOverlay} onClick={() => setModalItem(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>좌석 변경 신청 상세</h3>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setModalItem(null)}>
                <LuX />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>신청학생</span>
                <span className={styles.modalValue}>{modalItem.studentName}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>신청일</span>
                <span className={styles.modalValue}>{modalItem.createdAt.slice(0, 10)}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>현재 좌석</span>
                <span className={styles.modalValue}>{modalItem.currentSeatLabel}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>희망 1순위</span>
                <span className={styles.modalValue}>{modalItem.desiredSeat1Label}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>희망 2순위</span>
                <span className={styles.modalValue}>{modalItem.desiredSeat2Label}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>희망 3순위</span>
                <span className={styles.modalValue}>{modalItem.desiredSeat3Label}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>처리상태</span>
                <span className={styles.modalValue}>{getStatusBadge(modalItem.status)}</span>
              </div>
              {modalItem.status === 'APPROVED' && modalItem.processedAt && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>승인 일시</span>
                  <span className={styles.modalValue}>{modalItem.processedAt.replace('T', ' ').slice(0, 16)}</span>
                </div>
              )}
              {modalItem.status === 'APPROVED' && modalItem.approvedSeatLabel && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>승인 좌석</span>
                  <span className={styles.modalValue}>{modalItem.approvedSeatLabel}</span>
                </div>
              )}
            </div>
            {modalItem.status === 'PENDING' && (
              <>
                <div className={styles.modalBody}>
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>승인 좌석 선택</span>
                  </div>
                  <div className={styles.seatChoiceGroup}>
                    {[
                      { label: '1순위', display: modalItem.desiredSeat1Label, cd: modalItem.desiredSeat1Cd },
                      { label: '2순위', display: modalItem.desiredSeat2Label, cd: modalItem.desiredSeat2Cd },
                      { label: '3순위', display: modalItem.desiredSeat3Label, cd: modalItem.desiredSeat3Cd },
                    ].filter((s) => s.display && s.cd).map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        className={`${styles.seatChoiceBtn} ${approvalSeat === s.cd ? styles.seatChoiceBtnActive : ''}`}
                        onClick={() => setApprovalSeat(s.cd)}
                      >
                        <span className={styles.seatChoiceLabel}>{s.label}</span>
                        <span className={styles.seatChoiceValue}>{s.display}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.approveBtn}
                    onClick={() => handleProcess(modalItem.id, 'APPROVED')}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className={styles.rejectBtn}
                    onClick={() => handleProcess(modalItem.id, 'REJECTED')}
                  >
                    거절
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* 편집 모드 좌석 추가 모달 제거 — DSA 기준 조회만 사용 */}
      {ConfirmDialog}
    </div>
  );
}
