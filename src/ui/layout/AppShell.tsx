import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { usePhotoStore } from '../../state/photoStore';
import { PhotoPanel } from '../photo/PhotoPanel';
import { MatchTestPanel } from '../group/MatchTestPanel';
import { GroupList } from '../group/GroupList';
import { LedgerPreview } from '../preview/LedgerPreview';
import { ExcelUploadPanel } from '../excel/ExcelUploadPanel';
import { ModeBMatchPanel } from '../excel/ModeBMatchPanel';
import { AISettingsPanel } from '../ai/AISettingsPanel';
import { useGroupStore } from '../../state/groupStore';
import { formatFileSize, formatDateTime, formatCoords, formatHeading, formatCameraInfo } from '../../utils/format';
import styles from './AppShell.module.css';

const METADATA_STATUS_LABEL: Record<string, string> = {
  PENDING: '분석 중',
  ANALYZED: '분석 완료',
  FAILED: '분석 실패',
};

type SidebarTab = 'project' | 'excel' | 'photos' | 'groups' | 'preview' | 'ai';

const MODE_LABEL: Record<string, string> = {
  A: '일반 사진 방식',
  B: '기존 전 사진대지 방식',
};

export function AppShell() {
  const project = useProjectStore((s) => s.currentProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const photos = usePhotoStore((s) => s.photos);
  const selectedPhotoId = usePhotoStore((s) => s.selectedPhotoId);
  const groups = useGroupStore((s) => s.groups);
  const [tab, setTab] = useState<SidebarTab>('project');

  if (!project) return null;

  const selectedPhoto = photos.find((p) => p.photoId === selectedPhotoId) ?? null;

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <strong>{project.projectName}</strong>
          <span className={styles.modeBadge}>{MODE_LABEL[project.excelMode]}</span>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.status}>저장됨 · 대기 중</span>
          <button className={styles.closeBtn} onClick={closeProject}>
            프로젝트 닫기
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar}>
          <SidebarItem label="프로젝트" active={tab === 'project'} onClick={() => setTab('project')} />
          {project.excelMode === 'B' && (
            <SidebarItem label="Excel 업로드" active={tab === 'excel'} onClick={() => setTab('excel')} />
          )}
          <SidebarItem
            label="사진"
            active={tab === 'photos'}
            onClick={() => setTab('photos')}
            count={photos.length}
          />
          <SidebarItem
            label="그룹"
            active={tab === 'groups'}
            onClick={() => setTab('groups')}
            count={groups.length}
          />
          <SidebarItem label="미리보기" active={tab === 'preview'} onClick={() => setTab('preview')} />
          <SidebarItem label="AI 설정" active={tab === 'ai'} onClick={() => setTab('ai')} />
        </nav>

        <main className={styles.center}>
          {tab === 'project' && (
            <section className={styles.panel}>
              <h2>프로젝트 정보</h2>
              <dl className={styles.infoGrid}>
                <dt>작업위치</dt>
                <dd>{project.workLocation || '-'}</dd>
                <dt>작업일</dt>
                <dd>{project.workDate || '-'}</dd>
                <dt>작업내용</dt>
                <dd>{project.workDescription || '-'}</dd>
                <dt>방식</dt>
                <dd>{MODE_LABEL[project.excelMode]}</dd>
              </dl>
            </section>
          )}

          {tab === 'excel' && project.excelMode === 'B' && (
            <section className={styles.panel}>
              <ExcelUploadPanel project={project} />
            </section>
          )}

          {tab === 'photos' && (
            <div className={styles.panel} style={{ height: '100%' }}>
              <PhotoPanel project={project} />
            </div>
          )}

          {tab === 'groups' && (
            <section className={styles.panel}>
              {project.excelMode === 'B' && <ModeBMatchPanel />}
              <GroupList />
              <MatchTestPanel />
            </section>
          )}

          {tab === 'preview' && (
            <section className={styles.panel}>
              <LedgerPreview />
            </section>
          )}

          {tab === 'ai' && (
            <section className={styles.panel}>
              <AISettingsPanel />
            </section>
          )}
        </main>

        <aside className={styles.rightPanel}>
          <h3>상세 정보</h3>
          {selectedPhoto ? (
            <div>
              <img
                className={styles.previewImg}
                src={selectedPhoto.thumbnail}
                alt={selectedPhoto.originalFileName}
              />
              <dl className={styles.infoGrid}>
                <dt>파일명</dt>
                <dd>{selectedPhoto.originalFileName}</dd>
                <dt>크기</dt>
                <dd>{formatFileSize(selectedPhoto.fileSize)}</dd>
                <dt>이미지 크기</dt>
                <dd>
                  {selectedPhoto.width && selectedPhoto.height
                    ? `${selectedPhoto.width} × ${selectedPhoto.height}`
                    : '-'}
                </dd>
                <dt>촬영일시</dt>
                <dd>{formatDateTime(selectedPhoto.capturedAt)}</dd>
                <dt>GPS</dt>
                <dd>{formatCoords(selectedPhoto.latitude, selectedPhoto.longitude)}</dd>
                <dt>GPS 정확도</dt>
                <dd>{selectedPhoto.gpsAccuracy !== undefined ? `±${selectedPhoto.gpsAccuracy}m` : '없음'}</dd>
                <dt>방향</dt>
                <dd>{formatHeading(selectedPhoto.heading)}</dd>
                <dt>카메라</dt>
                <dd>{formatCameraInfo(selectedPhoto.cameraMake, selectedPhoto.cameraModel)}</dd>
                <dt>메타데이터</dt>
                <dd>{METADATA_STATUS_LABEL[selectedPhoto.metadataStatus]}</dd>
                <dt>이미지 특징</dt>
                <dd>
                  {METADATA_STATUS_LABEL[selectedPhoto.imageAnalysisStatus]}
                  {selectedPhoto.imageHash && (
                    <span className={styles.hashPreview}> ({selectedPhoto.imageHash})</span>
                  )}
                </dd>
              </dl>
            </div>
          ) : (
            <p className={styles.empty}>사진이나 그룹을 선택하면 여기에 정보가 표시됩니다.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem} onClick={onClick}>
      <span>{label}</span>
      {count !== undefined && <span className={styles.navCount}>{count}</span>}
    </button>
  );
}
