import { useEffect, useState } from 'react';
import KioskLoginPage from './pages/KioskLoginPage';
import MainPage from './pages/MainPage';
import { kioskMe } from './api/kioskAuthApi';
import type { KioskSession } from './api/kioskAuthApi';

export default function App() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [checking, setChecking] = useState(true);

  // 새로고침 시 세션 복구
  useEffect(() => {
    const saved = sessionStorage.getItem('kioskSession');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch { /* ignore */ }
    }

    kioskMe()
      .then((s) => {
        setSession(s);
        sessionStorage.setItem('kioskSession', JSON.stringify(s));
      })
      .catch(() => {
        if (!saved) setSession(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (s: KioskSession) => {
    setSession(s);
    sessionStorage.setItem('kioskSession', JSON.stringify(s));
  };

  const handleLogout = () => {
    setSession(null);
    sessionStorage.removeItem('kioskSession');
  };

  if (checking && !session) return null;

  if (!session) {
    return <KioskLoginPage onLogin={handleLogin} />;
  }

  return <MainPage session={session} onLogout={handleLogout} />;
}
