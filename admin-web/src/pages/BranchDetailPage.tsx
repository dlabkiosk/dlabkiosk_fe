import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import settingIcon from '../assets/setting_active.png';
import { getStore, updateStore } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import useConfirm from '../hooks/useConfirm';
import styles from './SettingsPage.module.css';

export default function BranchDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { alert, ConfirmDialog } = useConfirm();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 수정 폼
  const [formStoreName, setFormStoreName] = useState('');
  const [formStoreCode, setFormStoreCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formKioskPin, setFormKioskPin] = useState('');
  const [formDsaAcadCd, setFormDsaAcadCd] = useState('');
  const [formDsaClientId, setFormDsaClientId] = useState('');
  const [formDsaSecretId, setFormDsaSecretId] = useState('');

  const fetchStore = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getStore(Number(storeId));
      setStore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '지점 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const startEdit = () => {
    if (!store) return;
    setFormStoreName(store.storeName);
    setFormStoreCode(store.storeCode);
    setFormAddress(store.address);
    setFormPhone(store.phone);
    setFormActive(store.active);
    setFormKioskPin(store.kioskPin || '');
    setFormDsaAcadCd(store.dsaAcadCd || '');
    setFormDsaClientId(store.dsaClientId || '');
    setFormDsaSecretId(store.dsaSecretId || '');
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (!store || submitting) return;
    if (formStoreCode.trim().length === 0) {
      await alert('지점코드를 입력해주세요.');
      return;
    }
    if (formKioskPin.length > 0 && formKioskPin.length !== 4) {
      await alert('PIN은 숫자 4자리로 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await updateStore(store.id, {
        storeName: formStoreName,
        storeCode: formStoreCode.trim(),
        address: formAddress,
        phone: formPhone,
        active: formActive,
        kioskPin: formKioskPin,
        dsaAcadCd: formDsaAcadCd,
        dsaClientId: formDsaClientId,
        dsaSecretId: formDsaSecretId,
      });
      setIsEditing(false);
      await fetchStore();
    } catch (err) {
      await alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/settings?tab=지점 정보')}
            aria-label="뒤로가기"
          >
            <LuArrowLeft />
          </button>
          <div className={styles.pageTitleGroup}>
            <img src={settingIcon} alt="" className={styles.pageTitleIcon} />
            <h2 className={styles.pageTitle}>설정</h2>
          </div>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionBody}>
            <p className={styles.placeholderText}>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/settings?tab=지점 정보')}
            aria-label="뒤로가기"
          >
            <LuArrowLeft />
          </button>
          <div className={styles.pageTitleGroup}>
            <img src={settingIcon} alt="" className={styles.pageTitleIcon} />
            <h2 className={styles.pageTitle}>설정</h2>
          </div>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionBody}>
            <p style={{ color: '#dc2626', fontWeight: 600, textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
              {error || '지점 정보를 찾을 수 없습니다.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/settings?tab=지점 정보')}
          aria-label="뒤로가기"
        >
          <LuArrowLeft />
        </button>
        <div className={styles.pageTitleGroup}>
          <img src={settingIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>설정</h2>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>지점 정보</h3>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>지점명</label>
            {isEditing ? (
              <input className={styles.formInput} value={formStoreName} onChange={(e) => setFormStoreName(e.target.value)} />
            ) : (
              <p className={styles.formValue}>{store.storeName}</p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              지점코드
              {isEditing && (
                <span style={{ marginLeft: 'var(--spacing-sm)', color: '#b45309', fontSize: 'var(--font-size-xs)', fontWeight: 400 }}>
                  *지점코드 변경 시 해당 지점 키오스크는 다시 로그인이 필요합니다
                </span>
              )}
            </label>
            {isEditing ? (
              <input className={styles.formInput} value={formStoreCode} onChange={(e) => setFormStoreCode(e.target.value)} />
            ) : (
              <p className={styles.formValue}>{store.storeCode}</p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>주소</label>
            {isEditing ? (
              <input className={styles.formInput} value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            ) : (
              <p className={styles.formValue}>{store.address || '-'}</p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>전화번호</label>
            {isEditing ? (
              <input className={styles.formInput} value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            ) : (
              <p className={styles.formValue}>{store.phone || '-'}</p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>활성화</label>
            {isEditing ? (
              <label className={styles.radioLabel}>
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} /> 활성
              </label>
            ) : (
              <span className={`${styles.statusBadge} ${store.active ? '' : styles.statusInactive}`}>
                {store.active ? '활성' : '비활성'}
              </span>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA 연결</label>
            <span className={`${styles.statusBadge} ${store.dsaConnected ? '' : styles.statusInactive}`}>
              {store.dsaConnected ? '연결됨' : '미연결'}
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>키오스크 PIN</label>
            {isEditing ? (
              <>
                <input className={styles.formInput} value={formKioskPin} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setFormKioskPin(v); }} placeholder={store.kioskPin || '변경 시 입력'} maxLength={4} inputMode="numeric" />
                {formKioskPin.length > 0 && formKioskPin.length !== 4 && (
                  <p style={{ color: '#dc2626', fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)' }}>PIN은 숫자 4자리로 입력해주세요.</p>
                )}
              </>
            ) : (
              <p className={styles.formValue}>{store.kioskPin || '-'}</p>
            )}
          </div>
          {isEditing && (
            <p style={{ color: '#b45309', fontSize: 'var(--font-size-xs)', background: '#fef3c7', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--spacing-sm)', lineHeight: 1.6 }}>
              DSA 학원코드, Client ID, Secret ID는 DSA에서 발급받아 정확히 입력해야 키오스크 및 관리자 페이지가 정상 작동합니다.
            </p>
          )}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA 학원코드</label>
            {isEditing ? (
              <input className={styles.formInput} value={formDsaAcadCd} onChange={(e) => setFormDsaAcadCd(e.target.value)} placeholder={store.dsaAcadCd || '변경 시 입력'} />
            ) : (
              <p className={styles.formValue}>{store.dsaAcadCd || '-'}</p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA Client ID</label>
            {isEditing ? (
              <input className={styles.formInput} value={formDsaClientId} onChange={(e) => setFormDsaClientId(e.target.value)} placeholder={store.dsaClientId || '변경 시 입력'} />
            ) : (
              <p className={styles.formValue}>{store.dsaClientId || '-'}</p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>DSA Secret ID</label>
            {isEditing ? (
              <input className={styles.formInput} value={formDsaSecretId} onChange={(e) => setFormDsaSecretId(e.target.value)} placeholder={store.dsaSecretId || '변경 시 입력'} />
            ) : (
              <p className={styles.formValue}>{store.dsaSecretId || '-'}</p>
            )}
          </div>

          <div className={styles.modalActions}>
            {isEditing ? (
              <>
                <button type="button" className={styles.btnPrimary} onClick={handleUpdate} disabled={submitting}>
                  {submitting ? '저장 중...' : '저장'}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsEditing(false)}>취소</button>
              </>
            ) : (
              <button type="button" className={styles.btnPrimary} onClick={startEdit}>수정</button>
            )}
          </div>
        </div>
      </div>

      {ConfirmDialog}
    </div>
  );
}
