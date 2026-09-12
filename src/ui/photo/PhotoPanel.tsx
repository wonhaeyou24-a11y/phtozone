import { useRef, useState } from 'react';
import { usePhotoStore } from '../../state/photoStore';
import type { Project } from '../../types/project';
import styles from './PhotoPanel.module.css';

export function PhotoPanel({ project }: { project: Project }) {
  const photos = usePhotoStore((s) => s.photos);
  const addFiles = usePhotoStore((s) => s.addFiles);
  const removePhoto = usePhotoStore((s) => s.removePhoto);
  const selectedPhotoId = usePhotoStore((s) => s.selectedPhotoId);
  const selectPhoto = usePhotoStore((s) => s.selectPhoto);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    addFiles(Array.from(fileList), project.projectId);
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <h2>사진 ({photos.length})</h2>
        <button className={styles.uploadBtn} onClick={() => inputRef.current?.click()}>
          사진 업로드
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div
        className={dragOver ? `${styles.dropzone} ${styles.dropzoneActive}` : styles.dropzone}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {photos.length === 0 ? (
          <p>사진을 여기로 끌어다 놓거나 위의 버튼을 눌러 업로드하세요.</p>
        ) : (
          <div className={styles.grid}>
            {photos.map((photo) => (
              <button
                key={photo.photoId}
                className={
                  photo.photoId === selectedPhotoId ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb
                }
                onClick={() => selectPhoto(photo.photoId)}
              >
                <img src={photo.thumbnail} alt={photo.originalFileName} loading="lazy" />

                <span className={styles.badges}>
                  {(photo.metadataStatus === 'PENDING' || photo.imageAnalysisStatus === 'PENDING') && (
                    <span className={styles.badge}>분석중</span>
                  )}
                  {(photo.metadataStatus === 'FAILED' || photo.imageAnalysisStatus === 'FAILED') && (
                    <span className={`${styles.badge} ${styles.badgeWarn}`}>분석실패</span>
                  )}
                  {photo.metadataStatus === 'ANALYZED' && photo.latitude !== undefined && (
                    <span className={styles.badge}>📍 GPS</span>
                  )}
                </span>

                <span className={styles.thumbName}>{photo.originalFileName}</span>
                <span
                  className={styles.removeBtn}
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(photo.photoId);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
