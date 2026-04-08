import { useNavigate } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>페이지가 없습니다</h1>
      <p className={styles.description}>
        요청하신 페이지를 찾을 수 없습니다. 주소를 다시 확인해주세요.
      </p>
      <button type="button" className={styles.button} onClick={() => navigate('/')}>
        대시보드로 이동
      </button>
    </div>
  );
}
