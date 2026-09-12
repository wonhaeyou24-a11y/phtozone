import { useRef, useState } from 'react';
import { readExcelStructure, type ExcelStructure, type ExtractedExcelImage } from '../../excel/excelReader';
import { excelImagesToPhotos } from '../../excel/excelImageExtractor';
import { saveExcelTemplate } from '../../storage/db';
import { usePhotoStore } from '../../state/photoStore';
import { useGroupStore } from '../../state/groupStore';
import type { Project } from '../../types/project';
import styles from './ExcelUploadPanel.module.css';

export function ExcelUploadPanel({ project }: { project: Project }) {
  const addPhotos = usePhotoStore((s) => s.addPhotos);
  const photos = usePhotoStore((s) => s.photos);
  const createGroupForBeforePhoto = useGroupStore((s) => s.createGroupForBeforePhoto);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [structure, setStructure] = useState<ExcelStructure | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Map<number, string>>(new Map());
  const [status, setStatus] = useState<'idle' | 'reading' | 'error'>('idle');
  const [imported, setImported] = useState(false);

  const alreadyImportedCount = photos.filter((p) => p.excelSource).length;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus('reading');
    setImported(false);
    setStructure(null);
    try {
      const { structure: parsed } = await readExcelStructure(file);
      setFileName(file.name);
      setStructure(parsed);
      const urls = new Map<number, string>();
      for (const img of parsed.images) {
        urls.set(img.pageIndex, URL.createObjectURL(new Blob([new Uint8Array(img.data)])));
      }
      setThumbUrls(urls);
      await saveExcelTemplate(project.projectId, file);
      setStatus('idle');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  function handleImport() {
    if (!structure) return;
    const newPhotos = excelImagesToPhotos(structure.images, project.projectId);
    addPhotos(newPhotos);
    for (const photo of newPhotos) createGroupForBeforePhoto(project.projectId, photo.photoId);
    setImported(true);
  }

  return (
    <section className={styles.wrap}>
      <h2>기존 전 사진대지 Excel 업로드</h2>
      <p className={styles.hint}>
        전 사진이 들어있는 기존 사진대지 Excel(.xlsx)을 업로드하면 내부에 삽입된 사진을 자동으로 추출합니다.
      </p>

      <div
        className={styles.dropzone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {fileName ? <span>{fileName}</span> : <span>클릭하거나 파일을 끌어다 놓으세요 (.xlsx)</span>}
      </div>

      {status === 'reading' && <p className={styles.status}>Excel 구조 분석 중...</p>}
      {status === 'error' && (
        <p className={styles.errorText}>
          Excel 파일을 읽지 못했습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다.
        </p>
      )}

      {structure && (
        <div className={styles.result}>
          <div className={styles.summary}>
            시트 {structure.sheets.length}개 · 추출된 이미지 {structure.images.length}장
          </div>

          <ul className={styles.sheetList}>
            {structure.sheets.map((sheet) => (
              <li key={sheet.index}>
                <strong>{sheet.name}</strong> — {sheet.rowCount}행 × {sheet.colCount}열, 병합 {sheet.merges.length}개
              </li>
            ))}
          </ul>

          {structure.images.length === 0 ? (
            <p className={styles.errorText}>
              이 Excel에서 삽입된 이미지를 찾지 못했습니다. 사진이 이미지 객체가 아닌 링크로만 들어있을 수
              있습니다.
            </p>
          ) : (
            <>
              <div className={styles.imageGrid}>
                {structure.images.map((img: ExtractedExcelImage) => (
                  <div key={img.pageIndex} className={styles.imageCard}>
                    <img src={thumbUrls.get(img.pageIndex)} alt={`${img.sheetName} ${img.anchorCell}`} />
                    <span className={styles.imageMeta}>
                      {img.sheetName} · {img.anchorCell}
                    </span>
                  </div>
                ))}
              </div>

              <button className={styles.importBtn} disabled={imported} onClick={handleImport}>
                {imported ? `전 사진 ${structure.images.length}장 가져옴` : `전 사진 ${structure.images.length}장 가져오기`}
              </button>
            </>
          )}
        </div>
      )}

      {alreadyImportedCount > 0 && !structure && (
        <p className={styles.status}>이미 가져온 전 사진 {alreadyImportedCount}장이 있습니다 (사진 탭에서 확인).</p>
      )}
    </section>
  );
}
