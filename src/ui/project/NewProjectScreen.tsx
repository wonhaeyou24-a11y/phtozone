import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import type { ExcelMode } from '../../types/project';
import styles from './NewProjectScreen.module.css';

export function NewProjectScreen() {
  const createProject = useProjectStore((s) => s.createProject);

  const [projectName, setProjectName] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workDescription, setWorkDescription] = useState('');
  const [excelMode, setExcelMode] = useState<ExcelMode>('A');

  const canSubmit = projectName.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    createProject({ projectName, workLocation, workDate, workDescription, excelMode });
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>새 프로젝트</h1>
        <p className={styles.subtitle}>현장 사진을 정리해 전/후 사진대지 Excel을 만듭니다.</p>

        <label className={styles.field}>
          <span>현장명 *</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="예: 옹벽 보수공사"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>작업위치</span>
          <input
            value={workLocation}
            onChange={(e) => setWorkLocation(e.target.value)}
            placeholder="예: 3구간 2번 옹벽"
          />
        </label>

        <label className={styles.field}>
          <span>작업일</span>
          <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>작업내용</span>
          <textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="예: 균열 보수 및 방수 처리"
            rows={3}
          />
        </label>

        <div className={styles.field}>
          <span>작업 방식</span>
          <div className={styles.modeGrid}>
            <button
              type="button"
              className={excelMode === 'A' ? `${styles.modeCard} ${styles.modeCardActive}` : styles.modeCard}
              onClick={() => setExcelMode('A')}
            >
              <strong>일반 사진 방식</strong>
              <span>전/후 사진을 한꺼번에 올리면 자동으로 매칭하고 새 사진대지 Excel을 만듭니다.</span>
            </button>
            <button
              type="button"
              className={excelMode === 'B' ? `${styles.modeCard} ${styles.modeCardActive}` : styles.modeCard}
              onClick={() => setExcelMode('B')}
            >
              <strong>기존 전 사진대지 방식</strong>
              <span>이미 만들어진 전 사진대지 Excel에 후 사진을 자동으로 채워 넣습니다.</span>
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          프로젝트 시작
        </button>
      </form>
    </div>
  );
}
