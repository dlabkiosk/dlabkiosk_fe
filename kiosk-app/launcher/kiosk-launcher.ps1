param(
  [string]$Url = 'https://kiosk.daesung.example/',
  [int]$Port = 17654,
  [string]$ChromePath = ''
)

# Chrome 실행 파일 자동 탐색
if ([string]::IsNullOrEmpty($ChromePath)) {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { $ChromePath = $p; break }
  }
  if ([string]::IsNullOrEmpty($ChromePath)) {
    Write-Error 'chrome.exe 를 찾을 수 없음. -ChromePath 로 명시 지정.'
    exit 1
  }
}

# localhost 종료 신호 리스너
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Error "포트 $Port 바인딩 실패: $_"
  exit 1
}

# Chrome --kiosk 실행
$chromeArgs = @(
  '--kiosk',
  '--no-first-run',
  '--noerrdialogs',
  '--disable-pinch',
  '--overscroll-history-navigation=0',
  '--disable-features=TranslateUI',
  $Url
)
$chrome = Start-Process -FilePath $ChromePath -ArgumentList $chromeArgs -PassThru

# 종료 신호 또는 Chrome 종료 대기
$ctxTask = $listener.GetContextAsync()
while (-not $chrome.HasExited) {
  if ($ctxTask.IsCompleted) {
    try {
      $ctx = $ctxTask.Result
      $ctx.Response.AddHeader('Access-Control-Allow-Origin', '*')
      $ctx.Response.AddHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      $ctx.Response.StatusCode = 204
      $ctx.Response.Close()
    } catch {}
    Stop-Process -Id $chrome.Id -Force -ErrorAction SilentlyContinue
    break
  }
  Start-Sleep -Milliseconds 200
}

try { $listener.Stop() } catch {}
try { $listener.Close() } catch {}
