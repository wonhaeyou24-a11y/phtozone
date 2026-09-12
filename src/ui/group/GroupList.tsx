import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { usePhotoStore } from '../../state/photoStore';
import { useGroupStore } from '../../state/groupStore';
import type { ReviewStatus, Group } from '../../types/project';
import type { Photo } from '../../types/photo';
import styles from './GroupList.module.css';

const STATUS_LABEL: Record<ReviewStatus, string> = {
  HIGH_CONFIDENCE: '🟢 높은 신뢰도',
  NEEDS_REVIEW: '🟠 검토 필요',
  UNMATCHED: '🔴 미매칭',
  MANUAL: '✏️ 수동 수정',
  FINALIZED: '🔒 최종 확정',
};

export function GroupList() {
  const project = useProjectStore((s) => s.currentProject);
  const photos = usePhotoStore((s) => s.photos);
  const {
    groups,
    isGrouping,
    runAutoGrouping,
    setRepresentative,
    swapBeforeAfter,
    removePhotoFromGroup,
    disbandGroup,
    addPhotoToGroup,
    createGroupFromPhotos,
    mergeGroups,
    splitGroup,
    finalizeGroup,
    unlockGroup,
    setAfterInsertAnchor,
  } = useGroupStore();

  const [selectedUnmatched, setSelectedUnmatched] = useState<Set<string>>(new Set());
  const [addTargetGroupId, setAddTargetGroupId] = useState('');
  const [addTargetSide, setAddTargetSide] = useState<'before' | 'after'>('before');

  const photoById = new Map(photos.map((p) => [p.photoId, p]));
  const groupedPhotoIds = new Set(groups.flatMap((g) => g.photoIds));
  const unmatchedPhotos = photos.filter((p) => !groupedPhotoIds.has(p.photoId));

  function toggleUnmatchedSelection(photoId: string) {
    setSelectedUnmatched((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function handleCreateGroup() {
    if (!project || selectedUnmatched.size < 2) return;
    createGroupFromPhotos(project.projectId, [...selectedUnmatched]);
    setSelectedUnmatched(new Set());
  }

  function handleAddToGroup() {
    if (!addTargetGroupId || selectedUnmatched.size === 0) return;
    for (const photoId of selectedUnmatched) addPhotoToGroup(addTargetGroupId, photoId, addTargetSide);
    setSelectedUnmatched(new Set());
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <h2>그룹 ({groups.length})</h2>
        {project?.excelMode === 'A' && (
          <button
            className={styles.runBtn}
            disabled={isGrouping || !project || photos.length < 2}
            onClick={() => project && runAutoGrouping(project.projectId)}
          >
            {isGrouping ? '분석 중...' : '자동 그룹화 실행'}
          </button>
        )}
      </div>

      {groups.length === 0 && unmatchedPhotos.length === 0 && (
        <p className={styles.empty}>아직 그룹화 결과가 없습니다. 사진을 올린 뒤 자동 그룹화를 실행하세요.</p>
      )}

      <div className={styles.groupGrid}>
        {groups.map((group) => (
          <GroupCard
            key={group.groupId}
            group={group}
            isModeB={project?.excelMode === 'B'}
            otherGroups={groups.filter((g) => g.groupId !== group.groupId)}
            photoById={photoById}
            onSetRepresentative={(side, id) => setRepresentative(group.groupId, side, id)}
            onRemovePhoto={(id) => removePhotoFromGroup(group.groupId, id)}
            onSwap={() => swapBeforeAfter(group.groupId)}
            onDisband={() => disbandGroup(group.groupId)}
            onMerge={(otherId) => mergeGroups(group.groupId, otherId)}
            onSplit={(photoIds) => splitGroup(group.groupId, photoIds)}
            onFinalize={() => finalizeGroup(group.groupId)}
            onUnlock={() => unlockGroup(group.groupId)}
            onSetAfterInsertAnchor={(anchor) => setAfterInsertAnchor(group.groupId, anchor)}
          />
        ))}
      </div>

      {unmatchedPhotos.length > 0 && (
        <div className={styles.unmatchedSection}>
          <h3>미매칭 사진 ({unmatchedPhotos.length})</h3>
          <div className={styles.thumbRow}>
            {unmatchedPhotos.map((photo) => (
              <button
                key={photo.photoId}
                className={
                  selectedUnmatched.has(photo.photoId)
                    ? `${styles.unmatchedThumb} ${styles.unmatchedThumbSelected}`
                    : styles.unmatchedThumb
                }
                onClick={() => toggleUnmatchedSelection(photo.photoId)}
              >
                <img src={photo.thumbnail} alt={photo.originalFileName} />
                {selectedUnmatched.has(photo.photoId) && <span className={styles.checkBadge}>✓</span>}
              </button>
            ))}
          </div>

          <div className={styles.unmatchedActions}>
            <button
              className={styles.actionBtn}
              disabled={selectedUnmatched.size < 2}
              onClick={handleCreateGroup}
            >
              선택한 {selectedUnmatched.size}장으로 그룹 생성
            </button>

            {groups.length > 0 && (
              <div className={styles.addToGroupForm}>
                <select value={addTargetGroupId} onChange={(e) => setAddTargetGroupId(e.target.value)}>
                  <option value="">그룹 선택</option>
                  {groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      GROUP {g.groupId.slice(0, 8)}
                    </option>
                  ))}
                </select>
                <select value={addTargetSide} onChange={(e) => setAddTargetSide(e.target.value as 'before' | 'after')}>
                  <option value="before">전</option>
                  <option value="after">후</option>
                </select>
                <button
                  className={styles.actionBtn}
                  disabled={!addTargetGroupId || selectedUnmatched.size === 0}
                  onClick={handleAddToGroup}
                >
                  선택한 사진 추가
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function GroupCard({
  group,
  isModeB,
  otherGroups,
  photoById,
  onSetRepresentative,
  onRemovePhoto,
  onSwap,
  onDisband,
  onMerge,
  onSplit,
  onFinalize,
  onUnlock,
  onSetAfterInsertAnchor,
}: {
  group: Group;
  isModeB: boolean;
  otherGroups: Group[];
  photoById: Map<string, Photo>;
  onSetRepresentative: (side: 'before' | 'after', photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onSwap: () => void;
  onDisband: () => void;
  onMerge: (otherGroupId: string) => void;
  onSplit: (photoIds: string[]) => void;
  onFinalize: () => void;
  onUnlock: () => void;
  onSetAfterInsertAnchor: (anchor: string | undefined) => void;
}) {
  const locked = group.locked;
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelection, setSplitSelection] = useState<Set<string>>(new Set());
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [anchorInput, setAnchorInput] = useState(group.afterInsertAnchor ?? '');
  const beforePhoto = photoById.get(group.representativeBeforePhotoId ?? '');

  function toggleSplitSelection(photoId: string) {
    setSplitSelection((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function handleSplit() {
    onSplit([...splitSelection]);
    setSplitSelection(new Set());
    setSplitMode(false);
  }

  function handleMerge() {
    if (!mergeTargetId) return;
    onMerge(mergeTargetId);
    setMergeTargetId('');
  }

  return (
    <div className={styles.groupCard}>
      <div className={styles.groupCardHeader}>
        <span>GROUP {group.groupId.slice(0, 8)}</span>
        <span className={styles.groupStatus}>{STATUS_LABEL[group.reviewStatus]}</span>
      </div>

      <BeforeAfterRow
        label="전"
        photoIds={group.beforePhotoIds}
        representativeId={group.representativeBeforePhotoId}
        photoById={photoById}
        onSetRepresentative={(id) => onSetRepresentative('before', id)}
        onRemovePhoto={onRemovePhoto}
        splitMode={splitMode}
        splitSelection={splitSelection}
        onToggleSplitSelection={toggleSplitSelection}
        locked={locked}
      />
      <BeforeAfterRow
        label="후"
        photoIds={group.afterPhotoIds}
        representativeId={group.representativeAfterPhotoId}
        photoById={photoById}
        onSetRepresentative={(id) => onSetRepresentative('after', id)}
        onRemovePhoto={onRemovePhoto}
        splitMode={splitMode}
        splitSelection={splitSelection}
        onToggleSplitSelection={toggleSplitSelection}
        locked={locked}
      />

      {isModeB && beforePhoto?.excelSource && (
        <div className={styles.anchorRow}>
          <span>삽입 위치</span>
          <input
            className={styles.anchorInput}
            placeholder={`기본값: 전 사진 오른쪽`}
            value={anchorInput}
            disabled={locked}
            onChange={(e) => setAnchorInput(e.target.value)}
            onBlur={() => onSetAfterInsertAnchor(anchorInput.trim() || undefined)}
          />
        </div>
      )}

      <div className={styles.groupFooter}>
        <span className={styles.groupScore}>
          종합점수: {group.matchScore ?? '-'} · 사진 {group.photoIds.length}장
        </span>
        {locked ? (
          <div className={styles.groupToolbar}>
            <button className={styles.smallBtn} onClick={onUnlock}>
              잠금 해제
            </button>
          </div>
        ) : splitMode ? (
          <div className={styles.groupToolbar}>
            <button className={styles.smallBtn} disabled={splitSelection.size === 0} onClick={handleSplit}>
              선택 {splitSelection.size}장 분리
            </button>
            <button
              className={styles.smallBtn}
              onClick={() => {
                setSplitMode(false);
                setSplitSelection(new Set());
              }}
            >
              취소
            </button>
          </div>
        ) : (
          <div className={styles.groupToolbar}>
            <button className={styles.smallBtn} onClick={onSwap}>
              전/후 교체
            </button>
            {group.photoIds.length > 2 && (
              <button className={styles.smallBtn} onClick={() => setSplitMode(true)}>
                그룹 분리
              </button>
            )}
            {otherGroups.length > 0 && (
              <>
                <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
                  <option value="">합칠 그룹</option>
                  {otherGroups
                    .filter((g) => !g.locked)
                    .map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        GROUP {g.groupId.slice(0, 8)}
                      </option>
                    ))}
                </select>
                <button className={styles.smallBtn} disabled={!mergeTargetId} onClick={handleMerge}>
                  합치기
                </button>
              </>
            )}
            <button className={styles.smallBtnDanger} onClick={onDisband}>
              그룹 해제
            </button>
            <button className={styles.finalizeBtn} onClick={onFinalize}>
              🔒 최종 확정
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BeforeAfterRow({
  label,
  photoIds,
  representativeId,
  photoById,
  onSetRepresentative,
  onRemovePhoto,
  splitMode,
  splitSelection,
  onToggleSplitSelection,
  locked,
}: {
  label: string;
  photoIds: string[];
  representativeId?: string;
  photoById: Map<string, Photo>;
  onSetRepresentative: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  splitMode: boolean;
  splitSelection: Set<string>;
  onToggleSplitSelection: (photoId: string) => void;
  locked: boolean;
}) {
  if (photoIds.length === 0) return null;
  return (
    <div className={styles.beforeAfterRow}>
      <span className={styles.beforeAfterLabel}>{label}</span>
      <div className={styles.thumbRow}>
        {photoIds.map((id) => {
          const photo = photoById.get(id);
          if (!photo) return null;
          const isRepresentative = id === representativeId;
          const isSelected = splitSelection.has(id);
          const interactive = !locked;
          return (
            <div
              key={id}
              className={`${isRepresentative ? styles.thumbRepresentative : styles.thumbEditable}${interactive ? '' : ` ${styles.thumbLocked}`}`}
              onClick={interactive ? () => (splitMode ? onToggleSplitSelection(id) : onSetRepresentative(id)) : undefined}
              title={
                !interactive
                  ? '최종 확정된 그룹입니다. 수정하려면 잠금을 해제하세요.'
                  : splitMode
                    ? '클릭하면 분리 대상으로 선택됩니다'
                    : '클릭하면 대표 사진으로 지정됩니다'
              }
            >
              <img src={photo.thumbnail} alt={photo.originalFileName} />
              {isRepresentative && <span className={styles.repBadge}>대표</span>}
              {splitMode && isSelected && <span className={styles.checkBadge}>✓</span>}
              {interactive && !splitMode && (
                <span
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto(id);
                  }}
                >
                  ×
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
