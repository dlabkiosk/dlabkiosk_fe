/**
 * 배리어프리 음성 안내 메시지 상수
 */

/* ── TTS 토글 ── */
export const VOICE_TTS_ON =
  '음성 안내를 시작합니다. 출결을 위해 화면 아래쪽 인식기에 카드나 큐알 코드를 대주세요. 위치를 찾기 어렵거나 도움이 필요하시면 기기 오른쪽 하단의 호출벨을 눌러주세요.';

/* ── 출결 결과 ──
 * action 코드는 tagApi.ts의 ACTION_LABEL_MAP과 동일하게 유지할 것 (S/T/A/D/N/C/R/M)
 */
export const VOICE_TAG_CHECKIN = (name: string) => `${name} 학생, 등원 처리 되었습니다.`;
export const VOICE_TAG_CHECKOUT = (name: string) => `${name} 학생, 하원 처리 되었습니다.`;
export const VOICE_TAG_LATE = (name: string) => `${name} 학생, 지각 처리 되었습니다.`;
export const VOICE_TAG_OUTING = (name: string) => `${name} 학생, 외출 처리 되었습니다.`;
export const VOICE_TAG_OUTING_REASON = (name: string) => `${name} 학생, 사유 외출 처리 되었습니다.`;
export const VOICE_TAG_EARLY_LEAVE = (name: string) => `${name} 학생, 조퇴 처리 되었습니다.`;
export const VOICE_TAG_RETURN = (name: string) => `${name} 학생, 복귀 처리 되었습니다.`;
export const VOICE_TAG_MEAL_DONE = (name: string) => `${name} 학생, 급식 확인이 완료되었습니다.`;

const ACTION_VOICE_MAP: Record<string, (name: string) => string> = {
  S: VOICE_TAG_CHECKIN,
  T: VOICE_TAG_CHECKOUT,
  A: VOICE_TAG_LATE,
  D: VOICE_TAG_OUTING,
  N: VOICE_TAG_OUTING_REASON,
  C: VOICE_TAG_EARLY_LEAVE,
  R: VOICE_TAG_RETURN,
  M: VOICE_TAG_MEAL_DONE,
};

export function getTagVoice(action: string | undefined, name: string): string | null {
  if (action && ACTION_VOICE_MAP[action]) return ACTION_VOICE_MAP[action](name);
  return null;
}

/* ── 퀵메뉴 버튼 클릭 ── */
export const VOICE_MENU_NO_CARD =
  '휴대폰번호 출결 버튼을 클릭했습니다. 휴대폰 번호인증입니다. 화면 중앙에서 번호 8자리를 입력한 후, 하단의 입력 완료를 눌러주세요.';

export const VOICE_MENU_SEAT_LEAVE =
  '좌석 이탈 신청입니다. 화면 중앙에 나열된 사유 버튼 중 하나를 선택해 주세요.';

export const VOICE_MENU_REMOTE_APPLY =
  '비대면 신청 메뉴입니다. 화면 왼쪽의 휴대폰 미소지 또는 오른쪽의 좌석 변경 버튼을 눌러주세요. 위치를 찾기 어렵거나 도움이 필요하시면 기기 오른쪽 하단의 호출벨을 눌러주세요.';

export const VOICE_MENU_STUDENT_INFO =
  '학적 조회 메뉴입니다. 본인 인증을 위해 화면 아래쪽 인식기에 카드나 큐알 코드를 대주세요. 개인정보 보호를 위해 상세 학적 정보는 음성으로 안내되지 않습니다. 상세 확인이 필요하시면 기기 오른쪽 하단의 호출벨을 눌러주세요.';

export const VOICE_MENU_MEAL_PLAN =
  '이번 주 식단 안내입니다. 현재 화면에 월요일부터 금요일까지의 메뉴가 표시되고 있습니다. 시각적 확인이 어려우신 경우, 기기 오른쪽 아래 호출벨을 눌러주시면 직원이 오늘의 메뉴를 친절히 안내해 드립니다.';

export const VOICE_MENU_SEAT_MAP =
  '좌석 배치도 안내입니다. 현재 화면에 전체 강의실의 좌석 현황이 그림으로 표시되고 있습니다. 본인 좌석의 위치를 확인하기 어려우시면 기기 오른쪽 하단의 호출벨을 눌러주세요.';

/* ── 카드스캔 모달 ── */
export const VOICE_SCAN_PROMPT = '본인 인증을 위해 화면 아래쪽 인식기에 카드나 큐알 코드를 대주세요.';

export const VOICE_KEYPAD_PHONE =
  '휴대폰 뒷자리 인증입니다. 화면 중앙에서 번호 8자리를 입력한 후, 오른쪽 하단 입력 완료를 눌러주세요.';

export const VOICE_KEYPAD_AUTH_FAIL = '등록되지 않은 번호입니다. 번호를 확인하신 후 다시 입력해 주세요.';
export const VOICE_SCAN_AUTH_FAIL = '인식에 실패했습니다. 다시 시도해주세요.';

/* ── 좌석 이탈 ── */
export const VOICE_SEAT_LEAVE_REASON_SELECTED = (reason: string) =>
  `선택하신 사유는 '${reason}'입니다. 본인 인증을 위해 화면 아래쪽 인식기에 카드나 큐알 코드를 대주세요.`;

export const VOICE_SEAT_LEAVE_ALREADY =
  '이미 좌석 이탈 상태입니다. 먼저 복귀 처리를 완료해 주세요.';

/* ── 비대면 신청 서브메뉴 ── */
export const VOICE_REMOTE_NO_PHONE =
  '휴대폰 미소지 신청입니다. 본인 인증을 위해 화면 아래쪽 인식기에 카드나 큐알 코드를 대주세요.';

export const VOICE_REMOTE_SEAT_CHANGE =
  '좌석 변경 신청입니다. 본인 인증을 위해 화면 아래쪽 인식기에 카드나 큐알 코드를 대주세요.';

/* ── 모달 닫힘 / 메인 복귀 ── */
export const VOICE_BACK_TO_MAIN = '메인 화면으로 돌아왔습니다. 카드 또는 큐알 코드를 태그해주세요.';

/* ── 배리어프리 기능 ── */
export const VOICE_FONT_SCALE: Record<string, string> = {
  default: '글씨 크기가 기본으로 변경되었습니다.',
  large: '글씨 크기가 크게 변경되었습니다.',
  xlarge: '글씨 크기가 가장 크게 변경되었습니다.',
};

export const VOICE_ZOOM_ON = '화면이 확대되었습니다.';
export const VOICE_ZOOM_OFF = '화면이 기본 크기로 돌아왔습니다.';
export const VOICE_HIGH_CONTRAST_ON = '고대비 모드가 켜졌습니다.';
export const VOICE_HIGH_CONTRAST_OFF = '고대비 모드가 꺼졌습니다.';

/* ── 공지사항 ── */
export const VOICE_NOTICE_OPEN =
  '공지사항 목록입니다. 전체 공지사항과 과목 공지사항이 표시되고 있습니다. 확인하고 싶은 공지를 선택해 주세요.';

export const VOICE_NOTICE_DETAIL = (title: string) =>
  `공지사항 상세입니다. 제목은 '${title}'입니다. 시각적 확인이 어려우시면 기기 오른쪽 하단의 호출벨을 눌러주세요.`;

export const VOICE_NOTICE_FULL_GENERAL = '전체 공지사항 목록입니다. 확인하고 싶은 공지를 선택해 주세요.';
export const VOICE_NOTICE_FULL_SUBJECT = '과목 공지사항 목록입니다. 확인하고 싶은 공지를 선택해 주세요.';

/* ── 타임아웃 ── */
export const VOICE_TIMEOUT = '시간이 초과되어 메인 화면으로 돌아갑니다.';

/* ── 키패드 숫자 읽기 ── */
export const VOICE_KEYPAD_NUMBER = (num: string) => num;

/* ── 배리어프리 키패드 단축키 echo (KS X 9211) ──
 * 키 입력 시 어떤 메뉴/액션이 선택되었는지 음성으로 안내.
 * `useA11yKeyboard`의 echoLabels 옵션에 주입.
 */
export const VOICE_A11Y_MENU_NO_CARD = '1번, 휴대폰번호 출결';
export const VOICE_A11Y_MENU_SEAT_LEAVE = '2번, 좌석 이탈';
export const VOICE_A11Y_MENU_REMOTE_APPLY = '3번, 비대면 신청';
export const VOICE_A11Y_MENU_STUDENT_INFO = '4번, 학적 조회';
export const VOICE_A11Y_MENU_MEAL_PLAN = '5번, 식단표';
export const VOICE_A11Y_MENU_SEAT_MAP = '6번, 좌석 배치도';
export const VOICE_A11Y_CANCEL = '취소';
export const VOICE_A11Y_REMOTE_NO_PHONE = '1번, 휴대폰 미소지';
export const VOICE_A11Y_REMOTE_SEAT_CHANGE = '2번, 좌석 변경';
/** 사유 선택 echo. order=1-based, label=사유명 */
export const VOICE_A11Y_REASON_SELECT = (order: number, label: string) => `${order}번, ${label}`;

/* ── 키패드 (휴대폰 8자리 등) 입력 echo ── */
export const VOICE_A11Y_KEYPAD_BACKSPACE = '지우기';
export const VOICE_A11Y_KEYPAD_SUBMIT = '입력 완료';

/* ── TTS 모드 타임아웃 배율 ── */
export const TTS_TIMEOUT_MULTIPLIER = 1.5;
