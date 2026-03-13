import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdvertisements } from '../api/advertisementApi';
import type { Advertisement } from '../api/advertisementApi';
import adBannerFallback from '../assets/ad_banner.png';
import styles from './AdBanner.module.css';

const FETCH_INTERVAL_MS = 5 * 60 * 1000; // 5분마다 목록 갱신

export default function AdBanner() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAds = useCallback(async () => {
    try {
      const data = await getAdvertisements();
      setAds(data);
      setCurrentIdx(0);
    } catch {
      // 조회 실패 시 기존 목록 유지
    }
  }, []);

  // 초기 로드 + 주기적 갱신
  useEffect(() => {
    fetchAds();
    const interval = setInterval(fetchAds, FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAds]);

  // 슬라이드 타이머: 현재 광고의 displaySeconds만큼 대기 후 다음으로
  useEffect(() => {
    if (ads.length <= 1) return;

    const current = ads[currentIdx];
    const seconds = current?.displaySeconds ?? 5;

    timerRef.current = setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % ads.length);
    }, seconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ads, currentIdx]);

  // 광고가 없으면 기본 이미지 표시
  if (ads.length === 0) {
    return (
      <section className={styles.container}>
        <img src={adBannerFallback} alt="광고 배너" className={styles.image} />
      </section>
    );
  }

  const current = ads[currentIdx];

  return (
    <section className={styles.container}>
      {current.mediaType === 'VIDEO' ? (
        <video
          key={current.id}
          className={styles.image}
          src={current.imageUrl}
          autoPlay
          muted
          playsInline
          onEnded={() => {
            if (ads.length > 1) {
              setCurrentIdx((prev) => (prev + 1) % ads.length);
            }
          }}
        />
      ) : (
        <img
          key={current.id}
          src={current.imageUrl}
          alt="광고 배너"
          className={styles.image}
        />
      )}

      {ads.length > 1 && (
        <div className={styles.indicators}>
          {ads.map((ad, idx) => (
            <span
              key={ad.id}
              className={`${styles.dot} ${idx === currentIdx ? styles.dotActive : ''}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
