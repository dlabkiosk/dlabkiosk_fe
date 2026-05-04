import { useEffect, useState } from 'react';
import KioskLoginPage from './pages/KioskLoginPage';
import MainPage from './pages/MainPage';
import { kioskMe } from './api/kioskAuthApi';
import type { KioskSession } from './api/kioskAuthApi';
import { AccessibilityProvider } from './contexts/AccessibilityContext';

export default function App() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [checking, setChecking] = useState(true);

  // 서버 세션 확인 (항상 서버 기준)
  useEffect(() => {
    kioskMe()
      .then((s) => {
        setSession(s);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => setChecking(false));
  }, []);

  // 401 발생 시 자동으로 로그인 화면으로 복귀
  useEffect(() => {
    const handleUnauthorized = () => setSession(null);
    window.addEventListener('kiosk:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('kiosk:unauthorized', handleUnauthorized);
  }, []);

  const handleLogin = (s: KioskSession) => {
    setSession(s);
  };

  const handleLogout = () => {
    setSession(null);
  };

  if (checking && !session) return null;

  return (
    <AccessibilityProvider>
      {!session ? (
        <KioskLoginPage onLogin={handleLogin} />
      ) : (
        <MainPage session={session} onLogout={handleLogout} />
      )}
    </AccessibilityProvider>
  );
}
