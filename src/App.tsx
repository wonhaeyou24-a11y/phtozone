import { useProjectStore } from './state/projectStore';
import { NewProjectScreen } from './ui/project/NewProjectScreen';
import { AppShell } from './ui/layout/AppShell';

export default function App() {
  const project = useProjectStore((s) => s.currentProject);
  return project ? <AppShell /> : <NewProjectScreen />;
}
