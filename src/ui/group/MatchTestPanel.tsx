import { useState } from 'react';
import { usePhotoStore } from '../../state/photoStore';
import { compare } from '../../matching/matchEngine';
import type { MatchResult } from '../../matching/types';
import styles from './MatchTestPanel.module.css';

/**
 * Lets you pick any two photos and see the Match Engine's score breakdown.
 * This is a verification tool for the engine itself — the real auto-grouping and
 * review-card UI (spec sections 7-9, 16) come in later steps and will reuse `compare()`.
 */
export function MatchTestPanel() {
  const photos = usePhotoStore((s) => s.photos);
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);

  const photoA = photos.find((p) => p.photoId === idA);
  const photoB = photos.find((p) => p.photoId === idB);

  function handleCompare() {
    if (!photoA || !photoB) return;
    setResult(compare(photoA, photoB));
  }

  return (
    <section className={styles.wrap}>
      <h2>매칭 엔진 테스트</h2>
      <p className={styles.hint}>
        사진 두 장을 선택하면 GPS·시간·방향·이미지 특징·파일명을 종합한 매칭 점수와 근거를 보여줍니다. 자동
        그룹화 UI는 다음 단계에서 이 엔진을 그대로 사용합니다.
      </p>

      <div className={styles.pickerRow}>
        <select value={idA} onChange={(e) => setIdA(e.target.value)}>
          <option value="">사진 A 선택</option>
          {photos.map((p) => (
            <option key={p.photoId} value={p.photoId}>
              {p.originalFileName}
            </option>
          ))}
        </select>
        <select value={idB} onChange={(e) => setIdB(e.target.value)}>
          <option value="">사진 B 선택</option>
          {photos.map((p) => (
            <option key={p.photoId} value={p.photoId}>
              {p.originalFileName}
            </option>
          ))}
        </select>
        <button onClick={handleCompare} disabled={!photoA || !photoB}>
          비교하기
        </button>
      </div>

      {photoA && photoB && (
        <div className={styles.previewRow}>
          <img src={photoA.thumbnail} alt={photoA.originalFileName} />
          <span className={styles.vs}>vs</span>
          <img src={photoB.thumbnail} alt={photoB.originalFileName} />
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.scoreRow}>
            <span className={styles.scoreValue}>종합점수: {result.baseScore}</span>
            <span className={styles.confidence}>{result.confidenceLabel}</span>
          </div>
          <ul className={styles.factorList}>
            {result.factors.map((f) => (
              <li key={f.key} className={f.applicable ? '' : styles.factorInapplicable}>
                <span>{f.label}</span>
                <span className={styles.factorDetail}>{f.detail}</span>
                <span className={styles.factorScore}>
                  {f.applicable ? `+${f.score}` : '제외'} / {f.maxScore}
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.method}>matchMethod: {result.matchMethod}</div>
        </div>
      )}
    </section>
  );
}
