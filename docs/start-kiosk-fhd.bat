@echo off
REM ────────────────────────────────────────────────
REM  FHD 키오스크 (1920x1080) 실행 스크립트
REM  - 키오스크 모드 (전체화면, 주소창 숨김)
REM  - 기본 배율 (--force-device-scale-factor 사용 안 함)
REM ────────────────────────────────────────────────

set KIOSK_URL=https://kiosk-lake-sigma.vercel.app/
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"

%CHROME% ^
  --kiosk %KIOSK_URL% ^
  --no-first-run ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-features=TranslateUI ^
  --disable-session-crashed-bubble ^
  --noerrdialogs
