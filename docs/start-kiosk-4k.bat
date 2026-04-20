@echo off
REM ────────────────────────────────────────────────
REM  4K 키오스크 (3840x2160) 실행 스크립트
REM  - 키오스크 모드 (전체화면, 주소창 숨김)
REM  - --force-device-scale-factor=2
REM    : 크롬이 네이티브 4K로 렌더링하여 글씨가 선명
REM    : 앱은 기존 1080x1920 CSS 기준 그대로 동작
REM ────────────────────────────────────────────────

set KIOSK_URL=https://kiosk-lake-sigma.vercel.app/
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"

%CHROME% ^
  --kiosk %KIOSK_URL% ^
  --force-device-scale-factor=2 ^
  --no-first-run ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-features=TranslateUI ^
  --disable-session-crashed-bubble ^
  --noerrdialogs
