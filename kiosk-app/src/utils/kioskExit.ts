/**
 * 키오스크 종료 신호를 로컬 런처(kiosk-launcher.bat / .ps1)에 전달.
 *
 * 브라우저의 window.close() 는 스크립트가 직접 연 창이 아니면 차단되므로
 * Chrome --kiosk 모드에서는 동작하지 않는다. 대신 OS 단에서 띄우는 런처가
 * localhost HTTP 리스너를 열어두고, 본 함수가 신호를 전송하면 런처가
 * chrome.exe 프로세스를 종료한다.
 *
 * 런처가 떠 있지 않은 환경(개발 중 등)에서는 fetch 가 실패하므로 폴백으로
 * window.close() 를 시도한다.
 */

const DEFAULT_EXIT_PORT = 17654;

function getExitPort(): number {
  const raw = import.meta.env.VITE_KIOSK_EXIT_PORT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXIT_PORT;
}

export async function requestKioskExit(): Promise<void> {
  const port = getExitPort();
  try {
    await fetch(`http://localhost:${port}/exit`, {
      method: 'POST',
      mode: 'no-cors',
    });
    return;
  } catch {
    // 런처 미실행 시 폴백
  }
  window.open('', '_self');
  window.close();
}
