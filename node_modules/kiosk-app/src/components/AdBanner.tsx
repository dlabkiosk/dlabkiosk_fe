import adBannerImg from '../assets/ad_banner.png';
import styles from './AdBanner.module.css';

export default function AdBanner() {
  return (
    <section className={styles.container}>
      <img src={adBannerImg} alt="광고 배너" className={styles.image} />
    </section>
  );
}
