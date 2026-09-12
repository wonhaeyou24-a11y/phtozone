import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import type { ExcelMode } from '../../types/project';
import styles from './NewProjectScreen.module.css';

function defaultProjectName(): string {
  return `사진대지_${new Date().toISOString().slice(0, 10)}`;
}

export function NewProjectScreen() {
  const createProject = useProjectStore((s) => s.createProject);
  const [excelMode, setExcelMode] = useState<ExcelMode>('A');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createProject({
      projectName: defaultProjectName(),
      workLocation: '',
      workDate: new Date().toISOString().slice(0, 10),
      workDescription: '',
      excelMode,
    });
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>사진대지 작업(전, 후 사진 정리)</h1>

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

        <button type="submit" className={styles.submit}>
          프로젝트 시작
        </button>
      </form>
    </div>
  );
}
