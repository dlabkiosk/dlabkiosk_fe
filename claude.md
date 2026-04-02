# CLAUDE.md (DAESUNG KIOSK Frontend Template)

## 핵심 목표 (절대 우선순위)

1. **키오스크 앱과 어드민 웹을 한 레포에서 일관된 구조로 관리**
2. **기능 추가보다 안정성, 예측 가능성, 유지보수성을 우선**
3. **UI / 도메인 로직 / API / 타입 역할을 명확히 분리**
4. **장비 입력(카드/QR) 처리 흐름을 단순하고 안전하게 유지**
5. **공통 타입과 공통 모듈을 최대한 재사용**
6. **키오스크 특성상 전체화면, 고정 동선, 빠른 입력, 복구 용이성을 고려**
7. **불필요한 추상화보다 읽기 쉽고 수정 쉬운 구조를 우선**
8. **어드민과 키오스크는 같은 레포에 두되, 실행/배포 단위는 분리**

---

## 프로젝트 성격

이 프로젝트는 **학원/독서실/교육 공간용 키오스크 프론트엔드 시스템**이다.

구성:
- **admin-web**: 관리자용 웹 페이지
- **kiosk-app**: 현장 키오스크용 웹 앱
- **shared**: 공통 타입, 공통 API 함수, 공통 상수/유틸

핵심 특징:
- 카드리더기 / QR리더기 입력으로 사용자 식별
- 출결, 좌석, 공지, 순공시간, 랭킹 등 기능 연동
- 키오스크는 빠른 입력과 최소한의 클릭으로 동작해야 함
- 관리자 페이지는 설정/조회/운영 중심

---

## 기술 스택

### admin-web
- React
- TypeScript
- Vite

### kiosk-app
- React
- TypeScript
- Vite

### 공통
- Backend: Java / Spring Boot / REST API
- 패키지 매니저: npm 또는 추후 pnpm 확장 가능
- 스타일: 프로젝트 진행 방향에 맞춰 CSS / SCSS / CSS Module 중 일관되게 선택
- 상태관리는 필요한 범위에서만 도입하며, 과도한 전역 상태 사용 금지

---

## 아키텍처 원칙

### 1. 역할 분리
- **React**: 화면, 사용자 입력, 렌더링
- **API Layer**: 서버 통신
- **Domain Layer**: 출결/좌석/회원/공지 등 업무 로직
- **UI Layer**: 화면 요소 및 레이아웃

### 2. 입력 장치 처리
카드리더기 / QR리더기는 HID Keyboard 방식으로 문자열 입력을 처리한다.
- 리더기가 키보드처럼 문자열 입력
- React input 또는 전역 입력 버퍼로 처리 가능

### 3. 보안
- 민감한 정보는 서버에서 처리
- API 호출 시 인증 정보 안전 관리

---

## 도메인 설계 원칙

이 프로젝트의 주요 도메인은 아래와 같다.

- Branch(지점)
- KioskAuth(키오스크 지점 인증)
- Member(회원)
- Attendance(출결)
- Seat(좌석)
- Notice(공지)
- Ranking(순공시간 / 랭킹)
- DeviceInput(카드/QR 입력)
- ApprovalFlow(DSA 승인/거부 등 실시간 응답)

### 도메인 원칙
- 화면 이름보다 도메인 이름을 우선한다
- 문자열 상수는 하드코딩하지 말고 상수화한다
- API 응답 구조는 타입으로 명시한다
- 출결/좌석 상태값은 enum성 상수로 관리한다

예:
- `ATTENDANCE_STATUS`
- `SEAT_STATUS`
- `DEVICE_INPUT_TYPE`
- `KIOSK_MODE`

---

## 타입 설계 원칙 (TypeScript 필수)

이 프로젝트는 **JavaScript보다 TypeScript를 우선**한다.

### 이유
- API 응답 구조가 명확해야 함
- 카드/QR 입력 데이터 구조를 안전하게 관리해야 함

### 원칙
- `any` 사용 금지
- API DTO 타입 정의
- UI Props 타입 정의
- nullable 여부를 명확히 표현

예시 타입 범주:
- `MemberSummary`
- `AttendanceRecord`
- `SeatInfo`
- `NoticeItem`
- `CardScanPayload`
- `QrScanPayload`
- `KioskBranchAuthResponse`

---

## 폴더 구조 규칙

### admin-web 권장 구조
admin-web/src
├─ app or pages
├─ components
├─ features
├─ entities
├─ shared
├─ api
├─ hooks
├─ utils
├─ types
└─ styles

### kiosk-app 권장 구조
kiosk-app/src
├─ components
├─ features
├─ entities
├─ pages
├─ hooks
├─ api
├─ utils
├─ types
└─ styles

### 역할
- `components`: 재사용 UI
- `features`: 사용자 행동 중심 기능
- `entities`: 도메인 단위 모델/뷰
- `pages`: 화면 단위
- `api`: 서버 통신
- `types`: 타입 정의
- `utils`: 순수 유틸
- `hooks`: 재사용 훅

---

## 네이밍 규칙

### 파일명
- React 컴포넌트: PascalCase
- 훅: `useSomething.ts`
- 유틸: camelCase
- 상수: `UPPER_SNAKE_CASE`
- 타입: PascalCase

예:
- `AttendancePage.tsx`
- `SeatStatusCard.tsx`
- `useCardScanner.ts`
- `attendanceApi.ts`
- `seatConstants.ts`

---

## UI / 화면 설계 원칙

### 키오스크 화면
키오스크는 일반 웹이 아니라 **현장 장치 UI**다.

반드시 고려:
- 버튼 수 최소화
- 클릭 동선 최소화
- 큰 텍스트 / 큰 터치 영역
- 현재 상태를 즉시 이해 가능해야 함
- 잘못된 입력 후 복구가 쉬워야 함
- 제한 시간/자동 초기화 필요 여부를 항상 고려

### 어드민 화면
- 운영자가 정보 조회/설정/관리하기 쉬운 정보 구조
- 목록 / 상세 / 검색 / 필터 / 상태 표시를 명확하게 구성
- CRUD보다 “운영 흐름”이 드러나게 설계

---

## 스타일 원칙

- 일관성 없는 스타일 혼용 금지
- 인라인 스타일 금지
- 컴포넌트 내부에 과도한 스타일 하드코딩 금지
- 공통 색상 / spacing / radius / shadow / z-index는 토큰화 권장
- 키오스크 화면은 시인성과 터치 친화성을 우선
- 어드민은 정보 밀도와 가독성 균형 우선

### 권장 방향
- 초기에는 단순한 구조 유지
- 디자인 시스템은 필요한 만큼만
- 너무 이른 추상화 금지
- 공통 버튼/모달/배지 정도부터 재사용

---

## 상태관리 원칙

- 로컬 상태로 충분하면 local state 사용
- 전역 상태는 정말 필요한 경우만 사용
- 서버 상태와 UI 상태를 구분
- 일시적인 입력 상태를 전역으로 올리지 말 것

예:
- 입력 중인 카드값 → 로컬 상태
- 현재 로그인된 지점 정보 → 전역 가능
- 서버에서 가져온 공지 목록 → 서버 상태로 관리
- 좌석 선택 중 임시 값 → 로컬 상태 우선

---

## API 연동 원칙

Backend는 Spring REST API를 기본으로 한다.

### 기본 원칙
- API 경로는 하드코딩하지 말고 상수/설정으로 분리
- fetch/axios 사용 시 공통 클라이언트 계층 구성 가능
- 요청/응답 타입 정의
- 에러 응답 구조 정리
- UI 컴포넌트 안에서 직접 API 세부 구현 남발 금지

### 예시 엔드포인트 범주
- `POST /api/v1/kiosk/login`
- `POST /api/v1/kiosk/card-scan`
- `POST /api/v1/kiosk/qr-scan`
- `GET /api/v1/notices`
- `GET /api/v1/rankings`
- `GET /api/v1/seats`
- `POST /api/v1/attendance/check-in`
- `POST /api/v1/attendance/check-out`

실제 엔드포인트는 백엔드 계약을 기준으로 맞춘다.

---

## 장비 입력 처리 원칙

### 카드/QR 입력 흐름
1. 장비 입력 수신
2. 문자열 정규화(trim, suffix 제거 등)
3. 입력 타입 식별(card / qr)
4. 중복 입력 방지 처리
5. 서버 조회 또는 로컬 검증
6. 성공/실패 UI 피드백
7. 일정 시간 후 초기 상태 복귀

### 원칙
- 리더기 입력 원문을 임의로 변형하지 말 것
- 파싱 규칙은 별도 유틸로 분리
- 디버깅을 위해 raw value와 normalized value를 구분
- 너무 짧은 시간 내 동일 입력 반복 방지
- 입력 실패 메시지는 사용자 친화적으로 표시

예시 개념:
- `rawValue`
- `normalizedValue`
- `inputType`
- `receivedAt`

---

## 배포 원칙

### admin-web
- 일반 웹 배포
- 환경변수 분리
- API base URL 관리

### kiosk-app
- 일반 웹 배포 (Vite 빌드)
- 환경변수 분리
- API base URL 관리
- 전체화면 브라우저 실행 시 고려

---

## 커밋 / 작업 원칙

- 한 커밋에는 한 목적만 담기
- 구조 변경과 기능 변경을 가능하면 분리
- 이름만 바꾸는 리팩토링과 로직 변경을 섞지 않기
- 임시 테스트 코드 커밋 금지

권장 커밋 예:
- `init: create admin-web and kiosk-app`
- `feat: add kiosk login screen`
- `feat: handle card scanner input`
- `refactor: split attendance api layer`
- `fix: prevent duplicate card scan submission`

---

## 금지 (절대)

- `any` 남발
- 화면 컴포넌트 안에 API/도메인/파싱 로직 다 몰아넣기
- 문자열 상태값 하드코딩
- 키오스크 화면에 불필요하게 복잡한 UX 넣기
- 추상화만 많은 빈 구조 만들기
- 공유하지도 않을 코드를 shared로 과하게 분리하기
- 장비 입력 처리 로직을 여러 컴포넌트에 중복 작성하기

---

## 기능 구현 시 항상 먼저 확인할 것

1. 이 기능은 admin-web용인가 kiosk-app용인가?
2. 도메인이 무엇인가? (출결/좌석/공지/인증/랭킹/회원)
3. 서버 상태인가, UI 상태인가?
4. 공통 타입이 필요한가?
5. 실패했을 때 복구 흐름은 무엇인가?

---

## 답변 출력 형식 (반드시 지킬 것)

기능/페이지/구조 제안 시 아래 형식을 따른다.

1. 요구 요약
2. 적용 범위 (`admin-web` / `kiosk-app` / `shared`)
3. 구조 설계
4. 생성/수정 파일 목록
5. 코드
6. 상태 / API / 타입 설명
7. 예외 처리 / 실패 케이스
8. 이후 확장 포인트

---

## 이 프로젝트에서 AI가 지켜야 할 기본 태도

- 실무적으로 바로 적용 가능한 방향을 우선 제안
- 지금 단계에 맞지 않는 과설계 금지
- “나중에 필요할 수 있는 것”과 “지금 당장 필요한 것”을 구분
- 키오스크는 안정성, 어드민은 관리 효율성을 기준으로 판단
- 같은 내용을 admin-web과 kiosk-app에 무조건 동일하게 적용하지 말 것
- 레포는 하나지만 앱은 다르다는 점을 항상 고려할 것