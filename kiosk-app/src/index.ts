import { app, BrowserWindow } from 'electron';
import { SerialPort, ReadlineParser } from 'serialport';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

/** 시리얼 포트(카드리더기) 연결 */
function connectCardReader(): void {
  const port = new SerialPort({
    path: 'COM3',
    baudRate: 9600,
  });

  // raw 데이터 디버그 로그
  port.on('data', (buf: Buffer) => {
    console.log('[CardReader] raw:', buf.toString('hex'), '|', buf.toString('utf-8').replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r' }));

  parser.on('data', (data: string) => {
    const value = data.trim();
    if (value.length === 0) return;

    console.log('[CardReader] scanned:', value);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('card:scanned', value);
    }
  });

  port.on('open', () => {
    console.log('[CardReader] COM3 포트 연결 성공');
  });

  port.on('error', (err: Error) => {
    console.error('[CardReader] 포트 에러:', err.message);
  });

  port.on('close', () => {
    console.log('[CardReader] 포트 닫힘 - 3초 후 재연결 시도');
    setTimeout(connectCardReader, 3000);
  });
}

app.on('ready', () => {
  createWindow();
  connectCardReader();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
