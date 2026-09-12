import { useEffect } from 'react';
import { useProjectStore } from './state/projectStore';
import { NewProjectScreen } from './ui/project/NewProjectScreen';
import { AppShell } from './ui/layout/AppShell';

export default function App() {
  const project = useProjectStore((s) => s.currentProject);
  const isReady = useProjectStore((s) => s.isReady);
  const bootstrap = useProjectStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!isReady) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
        불러오는 중...
      </div>
    );
  }

  return project ? <AppShell /> : <NewProjectScreen />;
}
