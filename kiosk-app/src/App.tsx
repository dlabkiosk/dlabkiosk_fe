import { useCallback, useState } from 'react';
import { useCardScanner, CardScanResult } from './hooks/useCardScanner';

export default function App() {
  const [scanLog, setScanLog] = useState<CardScanResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanned'>('idle');

  const handleScan = useCallback((result: CardScanResult) => {
    setScanLog((prev) => [result, ...prev].slice(0, 10));
    setStatus('scanned');
    setTimeout(() => setStatus('idle'), 3000);
  }, []);

  useCardScanner(handleScan);

  return (
    <div style={styles.container}>
      {/* 상태 표시 */}
      <div style={styles.statusArea}>
        {status === 'idle' ? (
          <>
            <div style={styles.pulseCircle} />
            <h1 style={styles.title}>카드를 태그해주세요</h1>
            <p style={styles.subtitle}>카드리더기에 카드를 가까이 대주세요</p>
          </>
        ) : (
          <>
            <div style={{ ...styles.pulseCircle, ...styles.scannedCircle }} />
            <h1 style={styles.title}>카드 인식 완료</h1>
            <p style={styles.scanCode}>{scanLog[0]?.rawValue}</p>
            <p style={styles.scanTime}>
              {scanLog[0]?.receivedAt.toLocaleTimeString('ko-KR')}
            </p>
          </>
        )}
      </div>

      {/* 스캔 로그 */}
      <div style={styles.logArea}>
        <h3 style={styles.logTitle}>최근 스캔 기록</h3>
        {scanLog.length === 0 ? (
          <p style={styles.emptyLog}>아직 스캔 기록이 없습니다</p>
        ) : (
          <ul style={styles.logList}>
            {scanLog.map((scan) => (
              <li key={`${scan.rawValue}-${scan.receivedAt.getTime()}`} style={styles.logItem}>
                <span style={styles.logCode}>{scan.rawValue}</span>
                <span style={styles.logTime}>
                  {scan.receivedAt.toLocaleTimeString('ko-KR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '48px',
  },
  statusArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  pulseCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#dce3eb',
    border: '4px solid #a0b4c8',
    marginBottom: '16px',
  },
  scannedCircle: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
  },
  scanCode: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#4a90d9',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  scanTime: {
    fontSize: '16px',
    color: '#6b7280',
  },
  logArea: {
    width: '500px',
    maxHeight: '250px',
    overflow: 'auto',
  },
  logTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  emptyLog: {
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    padding: '16px',
  },
  logList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  logItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #f0f0f0',
    fontSize: '14px',
  },
  logCode: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#1a1a2e',
  },
  logTime: {
    color: '#9ca3af',
  },
};
