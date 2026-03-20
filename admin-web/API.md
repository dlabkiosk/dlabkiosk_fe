# 대성 키오스크 API 명세 & 구현 체크리스트

> **기준**: Swagger OpenAPI 3.1.0 (`http://13.124.163.110:8081`)
> **최종 갱신**: 2026-03-20

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | 프론트엔드 API 함수 구현 완료 |
| ⬜ | 미구현 |
| (미사용) | 백엔드에서 deprecated / 통합 태그로 대체 |

---

# PART 1: 관리자 (Admin) API

---

## 1. 관리자 인증 (Auth)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | POST | `/api/admin/auth/signup` | 관리자 회원가입 (loginId, password, name) |
| ✅ | POST | `/api/admin/auth/login` | 관리자 로그인 (JWT 쿠키 발급) |
| ✅ | POST | `/api/admin/auth/logout` | 관리자 로그아웃 (Redis 토큰 삭제, 쿠키 초기화) |
| ✅ | POST | `/api/admin/auth/refresh` | accessToken 재발급 (refreshToken 쿠키) |
| ✅ | GET | `/api/admin/auth/me` | 현재 로그인 관리자 정보 |

**파일**: `authApi.ts`

---

## 2. 관리자 관리 (Admin Management) — ADMIN 전용

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ⬜ | GET | `/api/v1/admin/admins` | 관리자 목록 조회 |
| ⬜ | DELETE | `/api/v1/admin/admins/{adminId}` | 관리자 삭제 |
| ⬜ | PATCH | `/api/v1/admin/admins/{adminId}/role` | 관리자 역할 승격 (MANAGER→ADMIN 등) |

**파일**: 미생성 (`adminApi.ts` 필요)

---

## 3. 대시보드 (Dashboard)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/dashboard/all` | 대시보드 전체 조회 (`?storeId=`) |

**파일**: `dashboardApi.ts`

---

## 4. 지점 관리 (Store)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/stores` | 지점 목록 조회 (ADMIN: 전체, MANAGER: 소속) |
| ✅ | GET | `/api/v1/admin/stores/{storeId}` | 지점 단건 조회 |
| ✅ | POST | `/api/v1/admin/stores` | 지점 등록 (storeCode 중복불가, 예: DS-001) |
| ✅ | PUT | `/api/v1/admin/stores/{storeId}` | 지점 수정 |
| ✅ | DELETE | `/api/v1/admin/stores/{storeId}` | 지점 삭제 |

**파일**: `storeApi.ts`

---

## 5. 학생 관리 (Student)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/students` | 학생 목록 (MANAGER: 자기 지점, ADMIN: 전체) |
| ✅ | GET | `/api/v1/admin/students/{studentId}` | 학생 단건 조회 |
| ✅ | POST | `/api/v1/admin/students` | 학생 등록 (`?storeId=`, QR UUID 자동생성) |
| ✅ | PUT | `/api/v1/admin/students/{studentId}` | 학생 수정 (소속 지점 변경 불가) |
| ✅ | DELETE | `/api/v1/admin/students/{studentId}` | 학생 삭제 |
| ✅ | GET | `/api/v1/admin/students/{studentId}/qr` | QR 코드 PNG 다운로드 |

**파일**: `studentApi.ts`

---

## 6. 출결 관리 (Attendance)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/attendance/today-status` | 오늘 학생별 출결 상태 조회 |

**파일**: `attendanceAdminApi.ts`

---

## 7. 좌석 관리 (Seat)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/seats` | 좌석 목록 조회 (`?areaCd=` 구역 필터) |
| ✅ | GET | `/api/v1/admin/seats/{seatId}` | 좌석 단건 조회 |
| ✅ | POST | `/api/v1/admin/seats` | 좌석 등록 (`?storeId=`, 좌표는 캔버스 픽셀) |
| ✅ | PUT | `/api/v1/admin/seats/{seatId}` | 좌석 수정 (라벨, 좌표, 활성 여부 등) |
| ✅ | DELETE | `/api/v1/admin/seats/{seatId}` | 좌석 삭제 |
| ✅ | GET | `/api/v1/admin/seats/areas` | 구역 목록 조회 (DSA 연동) |
| ✅ | GET | `/api/v1/admin/seats/status` | 구역별 좌석 현황 (`?areaCd=`, DSA 실시간) |

**파일**: `seatApi.ts`

---

## 8. 좌석 변경 신청 관리 (Seat Change Request)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/seat-change-requests` | 신청 목록 (페이징, `?status=` 필터) |
| ✅ | GET | `/api/v1/admin/seat-change-requests/{requestId}` | 신청 상세 조회 |
| ✅ | GET | `/api/v1/admin/seat-change-requests/seat-status` | 좌석 현황 (배정자+대기자, `?storeId=`) |
| ✅ | PUT | `/api/v1/admin/seat-change-requests/{requestId}/approve` | 승인 (`?seatLabel=`, 순위 내 좌석만 가능) |
| ✅ | PUT | `/api/v1/admin/seat-change-requests/{requestId}/reject` | 거절 |

**파일**: `seatApi.ts`

---

## 9. 좌석이탈 사유 (Seat Leave Reason)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/seat-leave-reasons` | 이탈 사유 목록 |
| ✅ | POST | `/api/v1/admin/seat-leave-reasons` | 이탈 사유 등록 (`?storeId=`) |
| ✅ | PUT | `/api/v1/admin/seat-leave-reasons/{id}` | 이탈 사유 수정 |
| ✅ | DELETE | `/api/v1/admin/seat-leave-reasons/{id}` | 이탈 사유 삭제 |

**파일**: `seatLeaveApi.ts`

---

## 10. 좌석이탈 현황 (Seat Leave)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/seat-leaves` | 좌석이탈 현황 조회 (기간, 페이징) |
| ✅ | POST | `/api/v1/admin/seat-leaves/{id}/force-return` | 관리자 강제 복귀 (AWAY→IN_USE, 시간 차감 반영) |
| ✅ | GET | `/api/v1/admin/seat-leaves/export` | 좌석이탈 엑셀 다운로드 |

**파일**: `seatLeaveApi.ts`

---

## 11. 공지사항 (Notice)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/notices` | 공지 목록 (MANAGER: 자기 지점, ADMIN: 전체) |
| ✅ | GET | `/api/v1/admin/notices/{noticeId}` | 공지 단건 조회 |
| ✅ | POST | `/api/v1/admin/notices` | 공지 등록 (`?storeId=`) |
| ✅ | PUT | `/api/v1/admin/notices/{noticeId}` | 공지 수정 |
| ✅ | DELETE | `/api/v1/admin/notices/{noticeId}` | 공지 삭제 |

**파일**: `noticeApi.ts`

---

## 12. 광고 (Advertisement)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/advertisements` | 광고 목록 |
| ✅ | GET | `/api/v1/admin/advertisements/{id}` | 광고 상세 |
| ✅ | POST | `/api/v1/admin/advertisements` | 광고 등록 (multipart, `?storeId=&mediaType=&displayOrder=&displaySeconds=`) |
| ✅ | PUT | `/api/v1/admin/advertisements/{id}` | 광고 수정 (multipart, 파일 변경 시만 file 포함) |
| ✅ | DELETE | `/api/v1/admin/advertisements/{id}` | 광고 삭제 |

**파일**: `advertisementApi.ts`

---

## 13. 시험 일정 (Exam Schedule)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/exam-schedules` | 시험 일정 목록 |
| ✅ | GET | `/api/v1/admin/exam-schedules/{id}` | 시험 일정 단건 조회 |
| ✅ | POST | `/api/v1/admin/exam-schedules` | 시험 일정 등록 (`?storeId=`) |
| ✅ | PUT | `/api/v1/admin/exam-schedules/{id}` | 시험 일정 수정 |
| ✅ | DELETE | `/api/v1/admin/exam-schedules/{id}` | 시험 일정 삭제 |
| ✅ | PATCH | `/api/v1/admin/exam-schedules/{id}/toggle-active` | 활성화 토글 |

**파일**: `examScheduleApi.ts`

---

## 14. 식사 확인 (Meal Check)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/meal-checks` | 식사 확인 목록 (년월, 학생명 필터) |

**파일**: `mealCheckApi.ts`

---

## 15. 휴대폰 미소지 (Phone Submission)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/phone-submissions` | 신청 목록 (기간, 학생명 필터) |
| ✅ | PUT | `/api/v1/admin/phone-submissions/{id}` | 신청 수정 (DAILY/PERIOD/NO_PHONE) |
| ✅ | DELETE | `/api/v1/admin/phone-submissions/{id}` | 신청 삭제 |
| ✅ | GET | `/api/v1/admin/phone-submissions/export` | 엑셀 다운로드 |

**파일**: `phoneSubmissionApi.ts`

---

## 16. 학생 메시지 (Student Message)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/admin/student-messages` | 학생 메시지 조회 (`?studentId=`) |
| ✅ | POST | `/api/v1/admin/student-messages` | 학생 메시지 등록 |
| ✅ | PUT | `/api/v1/admin/student-messages/{id}` | 학생 메시지 수정 |
| ✅ | DELETE | `/api/v1/admin/student-messages/{id}` | 학생 메시지 삭제 |

**파일**: `studentMessageApi.ts`

---

# PART 2: 키오스크 (Kiosk) API

---

## 17. 키오스크 인증

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | POST | `/api/v1/kiosk/auth/login` | 지점코드 + PIN 로그인 (JWT 쿠키) |
| ✅ | POST | `/api/v1/kiosk/auth/logout` | 로그아웃 (Redis 토큰 삭제) |

---

## 18. 통합 태그 (Tag) — 핵심 API

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | POST | `/api/v1/kiosk/tag` | 통합 태그 (등원/하원/외출/복귀/조퇴/급식 자동 판별) |
| ✅ | POST | `/api/v1/kiosk/tag/confirm` | 출결 확인 (외출/조퇴 승인 후 학생 확인) |
| ✅ | POST | `/api/v1/kiosk/tag/meal-confirm` | 급식 태그 확인 (`?identifier=`) |

---

## 19. 키오스크 좌석

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/seats/areas` | 구역 목록 조회 |
| ✅ | GET | `/api/v1/kiosk/seats` | 구역별 좌석 현황 (`?areaCd=`) |

---

## 20. 키오스크 좌석 변경 신청

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | POST | `/api/v1/kiosk/seat-change-requests` | 좌석 변경 신청/수정 (1~3순위) |

---

## 21. 키오스크 좌석이탈

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | POST | `/api/v1/kiosk/seat-leaves/start` | 좌석이탈 신청 (좌석번호로 학생 자동 식별) |
| ✅ | POST | `/api/v1/kiosk/seat-leaves/end` | 좌석이탈 복귀 |

---

## 22. 키오스크 휴대폰 미소지

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | POST | `/api/v1/kiosk/phone-submissions` | 휴대폰 미소지 신청 (DAILY/PERIOD/NO_PHONE) |

---

## 23. 키오스크 공지사항

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/notices` | 공지사항 목록 조회 |

---

## 24. 키오스크 광고

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/advertisements` | 광고 목록 조회 |

---

## 25. 키오스크 순공랭킹

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/rankings` | 전주 순공시간 랭킹 조회 |

---

## 26. 키오스크 학생 조회

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/students` | 학생 본인 정보 검색 |

---

## 27. 키오스크 시험 일정

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/exam-schedules` | 시험 일정 조회 |

---

## 28. 키오스크 지점

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| ✅ | GET | `/api/v1/kiosk/stores` | 지점 정보 조회 (인증 불필요) |

---

## 29. 키오스크 출석 (미사용 — 통합 태그로 대체)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| - | POST | `/api/v1/kiosk/attendance/check-in` | 등원 (통합 태그로 대체됨) |
| - | POST | `/api/v1/kiosk/attendance/check-out` | 하원 (통합 태그로 대체됨) |

---

## 30. 키오스크 외출 (미사용 — 통합 태그로 대체)

| 구현 | Method | Endpoint | 설명 |
|:----:|--------|----------|------|
| - | POST | `/api/v1/kiosk/outings/start` | 외출 시작 (통합 태그로 대체됨) |
| - | POST | `/api/v1/kiosk/outings/end` | 외출 복귀 (통합 태그로 대체됨) |

---

# PART 3: 구현 현황 요약

## 관리자 API 체크리스트

| # | 도메인 | 엔드포인트 수 | 구현 | 미구현 | 파일 |
|---|--------|:------------:|:----:|:------:|------|
| 1 | 관리자 인증 | 5 | 5 | 0 | `authApi.ts` |
| 2 | **관리자 관리** | **3** | **0** | **3** | **미생성** |
| 3 | 대시보드 | 1 | 1 | 0 | `dashboardApi.ts` |
| 4 | 지점 관리 | 5 | 5 | 0 | `storeApi.ts` |
| 5 | 학생 관리 | 6 | 6 | 0 | `studentApi.ts` |
| 6 | 출결 관리 | 1 | 1 | 0 | `attendanceAdminApi.ts` |
| 7 | 좌석 관리 | 7 | 7 | 0 | `seatApi.ts` |
| 8 | 좌석 변경 신청 | 5 | 5 | 0 | `seatApi.ts` |
| 9 | 좌석이탈 사유 | 4 | 4 | 0 | `seatLeaveApi.ts` |
| 10 | 좌석이탈 현황 | 3 | 3 | 0 | `seatLeaveApi.ts` |
| 11 | 공지사항 | 5 | 5 | 0 | `noticeApi.ts` |
| 12 | 광고 | 5 | 5 | 0 | `advertisementApi.ts` |
| 13 | 시험 일정 | 6 | 6 | 0 | `examScheduleApi.ts` |
| 14 | 식사 확인 | 1 | 1 | 0 | `mealCheckApi.ts` |
| 15 | 휴대폰 미소지 | 4 | 4 | 0 | `phoneSubmissionApi.ts` |
| 16 | 학생 메시지 | 4 | 4 | 0 | `studentMessageApi.ts` |
| | **합계** | **65** | **62** | **3** | |

## 미구현 목록 (TODO)

- [ ] `adminApi.ts` 생성 — 관리자 목록 조회, 삭제, 역할 승격 (ADMIN 전용)
  - `GET /api/v1/admin/admins`
  - `DELETE /api/v1/admin/admins/{adminId}`
  - `PATCH /api/v1/admin/admins/{adminId}/role`

## 참고

- **메시지 템플릿 API**: 현재 Swagger 스펙에 존재하지 않음. 백엔드 추가 시 별도 업데이트 필요.
- **키오스크 출석/외출 API**: 통합 태그(`POST /api/v1/kiosk/tag`)로 대체되어 미사용 상태.
- **공통 응답 형식**: 모든 API는 `CommonResponse<T>` 래퍼로 응답 (`data`, `message`, `status` 등).
