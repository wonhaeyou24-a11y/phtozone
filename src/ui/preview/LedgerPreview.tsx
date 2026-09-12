import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { usePhotoStore } from '../../state/photoStore';
import { useGroupStore } from '../../state/groupStore';
import { buildLedgerWorkbook, downloadWorkbook, ledgerFileName } from '../../excel/excelWriter';
import { insertAfterPhotosIntoTemplate, ledgerCompletedFileName } from '../../excel/excelInserter';
import { getExcelTemplate } from '../../storage/db';
import styles from './LedgerPreview.module.css';

/**
 * Previews what the photo-ledger Excel will look like, one page per group, before generating
 * the actual file (spec section 36). MODE A builds a brand-new workbook; MODE B inserts "after"
 * photos into the originally-uploaded ledger, leaving everything else in it untouched.
 */
export function LedgerPreview() {
  const project = useProjectStore((s) => s.currentProject);
  const photos = usePhotoStore((s) => s.photos);
  const groups = useGroupStore((s) => s.groups);

  const photoById = new Map(photos.map((p) => [p.photoId, p]));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ groupId: string; reason: string }[]>([]);

  if (!project) return null;
  const isModeB = project.excelMode === 'B';

  async function handleGenerateExcel() {
    if (!project) return;
    setGenerating(true);
    setError(null);
    setSkipped([]);
    try {
      if (isModeB) {
        const template = await getExcelTemplate(project.projectId);
        if (!template) {
          setError('원본 전 사진대지 Excel을 찾을 수 없습니다. Excel 업로드 탭에서 다시 업로드해 주세요.');
          return;
        }
        const { workbook, inserted, skipped: skippedGroups } = await insertAfterPhotosIntoTemplate(
          template,
          groups,
          photoById,
        );
        setSkipped(skippedGroups);
        if (inserted > 0) await downloadWorkbook(workbook, ledgerCompletedFileName());
        else setError('삽입할 수 있는 후 사진이 없습니다. 먼저 매칭 탭에서 후 사진을 적용해 주세요.');
      } else {
        const workbook = await buildLedgerWorkbook(project, groups, photoById);
        await downloadWorkbook(workbook, ledgerFileName(project));
      }
    } catch (e) {
      setError('Excel 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <h2>사진대지 미리보기</h2>
        {groups.length > 0 && <span className={styles.pageCount}>총 {groups.length}페이지</span>}
        {groups.length > 0 && (
          <button className={styles.generateBtn} disabled={generating} onClick={handleGenerateExcel}>
            {generating ? 'Excel 생성 중...' : isModeB ? '완성 Excel 생성' : 'Excel 생성'}
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {skipped.length > 0 && (
        <p className={styles.error}>
          {skipped.length}개 페이지는 건너뛰었습니다: {skipped.map((s) => s.reason).join(', ')}
        </p>
      )}

      {groups.length === 0 ? (
        <p className={styles.empty}>그룹이 없습니다. 먼저 그룹 탭에서 사진을 그룹화하세요.</p>
      ) : (
        <div className={styles.pages}>
          {groups.map((group, index) => {
            const beforePhoto = photoById.get(group.representativeBeforePhotoId ?? '');
            const afterPhoto = photoById.get(group.representativeAfterPhotoId ?? '');
            const incomplete = !beforePhoto || !afterPhoto;

            return (
              <div key={group.groupId} className={styles.page}>
                <div className={styles.pageHeader}>
                  <span>
                    {isModeB && beforePhoto?.excelSource
                      ? `${beforePhoto.excelSource.sheetName} · ${beforePhoto.excelSource.anchorCell}`
                      : `페이지 ${index + 1}`}
                  </span>
                  <span className={styles.badges}>
                    {incomplete && <span className={styles.warnBadge}>⚠ 전/후 사진 필요</span>}
                    {group.locked && <span className={styles.lockBadge}>🔒 최종 확정</span>}
                  </span>
                </div>

                {!isModeB && (
                  <dl className={styles.infoGrid}>
                    <dt>현장명</dt>
                    <dd>{project.projectName}</dd>
                    <dt>작업위치</dt>
                    <dd>{project.workLocation || '-'}</dd>
                    <dt>작업일</dt>
                    <dd>{project.workDate || '-'}</dd>
                    <dt>작업내용</dt>
                    <dd>{project.workDescription || '-'}</dd>
                  </dl>
                )}

                <div className={styles.photoRow}>
                  <PhotoCell label="전" photo={beforePhoto} />
                  <PhotoCell label="후" photo={afterPhoto} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PhotoCell({
  label,
  photo,
}: {
  label: string;
  photo?: { thumbnail: string; originalFileName: string };
}) {
  return (
    <div className={styles.photoCell}>
      <span className={styles.photoLabel}>{label}</span>
      {photo ? (
        <img src={photo.thumbnail} alt={photo.originalFileName} />
      ) : (
        <div className={styles.photoMissing}>사진 없음</div>
      )}
    </div>
  );
}
