@echo off
REM ============================================================
REM Daesung 키오스크 Chrome --kiosk 런처
REM
REM 사용법:
REM   1) 아래 KIOSK_URL 을 실제 배포 URL 로 수정
REM   2) 이 .bat 파일을 더블클릭하거나 시작 프로그램에 등록
REM
REM 종료 흐름:
REM   - 시계 3번 탭 -> 종료 모달 -> 종료 버튼
REM   - 프론트엔드가 http://localhost:%KIOSK_EXIT_PORT%/exit 로 신호 전송
REM   - 본 런처가 chrome.exe 강제 종료
REM
REM 프론트엔드 환경변수와 포트가 일치해야 함 (VITE_KIOSK_EXIT_PORT)
REM ============================================================

set "KIOSK_URL=https://kiosk.daesung.example/"
set "KIOSK_EXIT_PORT=17654"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kiosk-launcher.ps1" -Url "%KIOSK_URL%" -Port %KIOSK_EXIT_PORT%
