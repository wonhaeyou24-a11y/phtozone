import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { usePhotoStore } from '../../state/photoStore';
import { PhotoPanel } from '../photo/PhotoPanel';
import { formatFileSize, formatDateTime, formatCoords, formatHeading, formatCameraInfo } from '../../utils/format';
import styles from './AppShell.module.css';

const METADATA_STATUS_LABEL: Record<string, string> = {
  PENDING: '분석 중',
  ANALYZED: '분석 완료',
  FAILED: '분석 실패',
};

type SidebarTab = 'project' | 'photos' | 'groups';

const MODE_LABEL: Record<string, string> = {
  A: '일반 사진 방식',
  B: '기존 전 사진대지 방식',
};

export function AppShell() {
  const project = useProjectStore((s) => s.currentProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const photos = usePhotoStore((s) => s.photos);
  const selectedPhotoId = usePhotoStore((s) => s.selectedPhotoId);
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
          <SidebarItem
            label="사진"
            active={tab === 'photos'}
            onClick={() => setTab('photos')}
            count={photos.length}
          />
          <SidebarItem label="그룹" active={tab === 'groups'} onClick={() => setTab('groups')} count={0} />
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
              <p className={styles.nextStep}>
                다음 단계: 사진 업로드 기능이 이어서 추가됩니다.
              </p>
            </section>
          )}

          {tab === 'photos' && (
            <div className={styles.panel} style={{ height: '100%' }}>
              <PhotoPanel project={project} />
            </div>
          )}

          {tab === 'groups' && (
            <section className={styles.panel}>
              <h2>그룹</h2>
              <p className={styles.empty}>아직 생성된 그룹이 없습니다.</p>
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
                <dt>분석 상태</dt>
                <dd>{METADATA_STATUS_LABEL[selectedPhoto.metadataStatus]}</dd>
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
