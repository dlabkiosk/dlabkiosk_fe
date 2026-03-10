import { useCallback, useState } from 'react';
import Header from '../components/Header';
import NoticeSection from '../components/NoticeSection';
import RankingSection from '../components/RankingSection';
import QuickMenu from '../components/QuickMenu';
import AdBanner from '../components/AdBanner';
import AttendanceModal from '../components/AttendanceModal';
import CardScanModal from '../components/CardScanModal';
import { useCardScanner } from '../hooks/useCardScanner';
import type { CardScanResult } from '../hooks/useCardScanner';
import styles from './MainPage.module.css';

export default function MainPage() {
  const [showAttendance, setShowAttendance] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ actionId: string; label: string } | null>(null);
  const [scanResult, setScanResult] = useState<CardScanResult | null>(null);

  const handleScan = useCallback((result: CardScanResult) => {
    console.log('[MainPage] 카드 인식:', result.rawValue);
    setScanResult(result);
  }, []);

  const { connected, error, connect } = useCardScanner(handleScan);

  const handleMenuClick = (menuId: string) => {
    if (menuId === 'attendance') {
      setShowAttendance(true);
    }
  };

  const handleAttendanceSelect = (actionId: string, label: string) => {
    setShowAttendance(false);
    setScanResult(null);
    setScanTarget({ actionId, label });
  };

  const handleScanClose = () => {
    setScanTarget(null);
    setScanResult(null);
  };

  return (
    <div className={styles.page}>
      <Header />

      {!connected ? (
        <div className={styles.connectArea}>
          <button type="button" className={styles.connectButton} onClick={connect}>
            카드리더기 연결
          </button>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      ) : (
        <p className={styles.connectedBadge}>카드리더기 연결됨</p>
      )}

      <div className={styles.infoSection}>
        <NoticeSection />
        <RankingSection />
      </div>

      <QuickMenu onMenuClick={handleMenuClick} />

      <AdBanner />

      {showAttendance && (
        <AttendanceModal
          onClose={() => setShowAttendance(false)}
          onSelect={handleAttendanceSelect}
        />
      )}

      {scanTarget && (
        <CardScanModal
          title={scanTarget.label}
          scanResult={scanResult}
          onClose={handleScanClose}
        />
      )}
    </div>
  );
}
