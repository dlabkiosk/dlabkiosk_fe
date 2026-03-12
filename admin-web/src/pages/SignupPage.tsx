import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../api/authApi';
import { ApiError } from '../api/client';
import logoImg from '../assets/logo.png';
import loginIcon from '../assets/login_icon.png';
import styles from './LoginPage.module.css';
import signupStyles from './SignupPage.module.css';

export default function SignupPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');

    if (!loginId.trim() || !password.trim() || !name.trim()) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      await signup({ loginId, password, name, storeId: 1 });
      navigate('/login', { state: { signupSuccess: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
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
          <h1 className={styles.title}>SIGN UP</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-name">
                이름 <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-name"
                type="text"
                className={styles.input}
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-id">
                아이디 <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-id"
                type="text"
                className={styles.input}
                placeholder="아이디를 입력하세요"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-pw">
                비밀번호 <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-pw"
                type="password"
                className={styles.input}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-pw-confirm">
                비밀번호 확인 <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-pw-confirm"
                type="password"
                className={styles.input}
                placeholder="비밀번호를 다시 입력하세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? '가입 중...' : '회원가입'}
            </button>

            <div className={signupStyles.loginLink}>
              <span>이미 계정이 있으신가요?</span>
              <button
                type="button"
                className={signupStyles.loginButton}
                onClick={() => navigate('/login')}
              >
                로그인
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
