import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { usePhotoStore } from '../../state/photoStore';
import { useGroupStore } from '../../state/groupStore';
import { useAISettingsStore } from '../../state/aiSettingsStore';
import { rankAfterCandidates } from '../../matching/modeBMatcher';
import { runAIMatchAnalysis, getProvider } from '../../ai/aiManager';
import type { AIAnalysisOutcome } from '../../ai/aiManager';
import styles from './ModeBMatchPanel.module.css';

interface AIRunState {
  loading: boolean;
  outcome?: AIAnalysisOutcome;
  error?: string;
}

/**
 * For each Excel-extracted "before" photo that doesn't have an "after" match yet, ranks every
 * candidate "after" photo and lets the user apply the recommendation or pick a different one
 * (spec sections 29-31).
 */
export function ModeBMatchPanel() {
  const project = useProjectStore((s) => s.currentProject);
  const photos = usePhotoStore((s) => s.photos);
  const groups = useGroupStore((s) => s.groups);
  const addPhotoToGroup = useGroupStore((s) => s.addPhotoToGroup);
  const applyAIResult = useGroupStore((s) => s.applyAIResult);
  const ai = useAISettingsStore();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [aiRuns, setAiRuns] = useState<Record<string, AIRunState>>({});

  async function handleAIAnalyze(groupId: string, beforePhotoId: string, candidatePhotoIds: string[], baseScore: number) {
    setAiRuns((prev) => ({ ...prev, [groupId]: { loading: true } }));
    const beforePhoto = photos.find((p) => p.photoId === beforePhotoId);
    const candidatePhotos = photos.filter((p) => candidatePhotoIds.includes(p.photoId));
    if (!beforePhoto) return;

    const result = await runAIMatchAnalysis(ai.providerId, ai.apiKey, ai.model, beforePhoto, candidatePhotos, baseScore);
    if (result.ok) {
      setAiRuns((prev) => ({ ...prev, [groupId]: { loading: false, outcome: result.outcome } }));
      applyAIResult(groupId, result.outcome.aiScore);
    } else {
      setAiRuns((prev) => ({ ...prev, [groupId]: { loading: false, error: result.error } }));
    }
  }

  if (!project) return null;

  const beforePhotos = photos.filter((p) => p.excelSource);
  const afterPhotos = photos.filter((p) => !p.excelSource);
  const usedAfterIds = new Set(groups.flatMap((g) => g.afterPhotoIds));

  const pendingGroups = groups
    .filter((g) => g.beforePhotoIds.length > 0 && g.afterPhotoIds.length === 0 && !g.locked)
    .sort((a, b) => {
      const pa = photos.find((p) => p.photoId === a.representativeBeforePhotoId)?.excelSource?.pageIndex ?? 0;
      const pb = photos.find((p) => p.photoId === b.representativeBeforePhotoId)?.excelSource?.pageIndex ?? 0;
      return pa - pb;
    });

  const matchedCount = beforePhotos.length - pendingGroups.length;

  if (beforePhotos.length === 0) {
    return (
      <section className={styles.wrap}>
        <h2>후 사진 매칭</h2>
        <p className={styles.empty}>먼저 "Excel 업로드" 탭에서 전 사진을 가져오세요.</p>
      </section>
    );
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <h2>후 사진 매칭</h2>
        <span className={styles.summary}>
          {matchedCount} / {beforePhotos.length} 페이지 매칭됨
        </span>
      </div>

      {afterPhotos.length === 0 && (
        <p className={styles.empty}>"사진" 탭에서 후 사진을 업로드하면 여기서 추천 매칭을 확인할 수 있습니다.</p>
      )}

      <div className={styles.pageList}>
        {pendingGroups.map((group) => {
          const beforePhoto = photos.find((p) => p.photoId === group.representativeBeforePhotoId);
          if (!beforePhoto) return null;

          const availableCandidates = afterPhotos.filter((p) => !usedAfterIds.has(p.photoId));
          const ranked = rankAfterCandidates(beforePhoto, availableCandidates);
          const top = ranked[0];

          return (
            <div key={group.groupId} className={styles.pageCard}>
              <div className={styles.pageHeader}>
                <span>
                  {beforePhoto.excelSource?.sheetName} · {beforePhoto.excelSource?.anchorCell}
                </span>
              </div>

              <div className={styles.row}>
                <div className={styles.photoCell}>
                  <span className={styles.label}>전</span>
                  <img src={beforePhoto.thumbnail} alt={beforePhoto.originalFileName} />
                </div>

                <div className={styles.arrow}>→</div>

                <div className={styles.photoCell}>
                  <span className={styles.label}>추천 후</span>
                  {top ? (
                    <img src={top.photo.thumbnail} alt={top.photo.originalFileName} />
                  ) : (
                    <div className={styles.noCandidate}>후보 없음</div>
                  )}
                </div>
              </div>

              {top && (
                <div className={styles.scoreLine}>
                  매칭점수 {top.result.baseScore} · {top.result.confidenceLabel}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.applyBtn}
                  disabled={!top}
                  onClick={() => top && addPhotoToGroup(group.groupId, top.photo.photoId, 'after')}
                >
                  적용
                </button>
                <button
                  className={styles.pickBtn}
                  disabled={ranked.length === 0}
                  onClick={() => setPickerFor(pickerFor === group.groupId ? null : group.groupId)}
                >
                  다른 사진 선택
                </button>
                {ai.enabled && (
                  <button
                    className={styles.pickBtn}
                    disabled={!ai.apiKey || ranked.length === 0 || aiRuns[group.groupId]?.loading}
                    onClick={() =>
                      handleAIAnalyze(
                        group.groupId,
                        beforePhoto.photoId,
                        ranked.map((c) => c.photo.photoId),
                        top?.result.baseScore ?? 0,
                      )
                    }
                  >
                    {aiRuns[group.groupId]?.loading ? 'AI 분석 중...' : 'AI 2차 분석'}
                  </button>
                )}
              </div>

              {aiRuns[group.groupId]?.outcome && (
                <div className={styles.aiResult}>
                  🤖 {getProvider(ai.providerId)?.label} 점수: {aiRuns[group.groupId].outcome!.aiScore}
                  {aiRuns[group.groupId].outcome!.reasoning && (
                    <span className={styles.aiReasoning}> — {aiRuns[group.groupId].outcome!.reasoning}</span>
                  )}
                </div>
              )}
              {aiRuns[group.groupId]?.error && (
                <div className={styles.aiError}>AI 분석 실패: {aiRuns[group.groupId].error}</div>
              )}

              {pickerFor === group.groupId && (
                <div className={styles.pickerList}>
                  {ranked.map((c) => (
                    <button
                      key={c.photo.photoId}
                      className={styles.pickerItem}
                      onClick={() => {
                        addPhotoToGroup(group.groupId, c.photo.photoId, 'after');
                        setPickerFor(null);
                      }}
                    >
                      <img src={c.photo.thumbnail} alt={c.photo.originalFileName} />
                      <span>
                        {c.photo.originalFileName} · {c.result.baseScore}점
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
