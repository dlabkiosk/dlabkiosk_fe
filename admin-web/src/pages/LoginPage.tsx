import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import loginIcon from '../assets/login_icon.png';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 추후 API 연동으로 교체
    if (loginId === 'daesung1' && password === '1111') {
      sessionStorage.setItem('isLoggedIn', 'true');
      navigate('/');
    } else {
      setError('아이디 또는 비밀번호가 일치하지 않습니다.');
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

            <button type="submit" className={styles.submitButton}>
              로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
