import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getMe } from '../api/authApi';
import { ApiError } from '../api/client';
import logoImg from '../assets/logo.png';
import loginIcon from '../assets/login_icon.png';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      await login({ userId: loginId, password });
      sessionStorage.setItem('isLoggedIn', 'true');

      try {
        const me = await getMe();
        sessionStorage.setItem('adminName', me.name);
        sessionStorage.setItem('storeName', me.storeName);
      } catch { /* me 실패해도 로그인은 진행 */ }

      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError('아이디와 비밀번호를 확인해주세요.');
      } else {
        setError('서버에 연결할 수 없습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* 왼쪽 비주얼 영역 */}
        <div className={styles.visual}>
          <img src={logoImg} alt="D'Lab" className={styles.visualLogo} />
          <img src={loginIcon} alt="" className={styles.visualIcon} />
        </div>

        {/* 오른쪽 폼 영역 */}
        <div className={styles.formSection}>
          <h1 className={styles.title}>LOGIN</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="loginId">
                아이디 <span className={styles.required}>*</span>
              </label>
              <input
                id="loginId"
                type="text"
                className={styles.input}
                placeholder="아이디를 입력하세요"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                비밀번호 <span className={styles.required}>*</span>
              </label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.options}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>로그인 상태 유지</span>
              </label>
              <div className={styles.links}>
                <button type="button" className={styles.link}>아이디찾기</button>
                <button type="button" className={styles.link}>비밀번호 찾기</button>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? '로그인 중...' : '로그인'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>계정이 없으신가요? </span>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                style={{ fontSize: '13px', fontWeight: 600, color: '#4a7fba', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                회원가입
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}