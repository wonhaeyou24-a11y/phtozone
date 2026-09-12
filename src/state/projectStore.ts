import { create } from 'zustand';
import type { Project, ExcelMode } from '../types/project';

interface ProjectStore {
  currentProject: Project | null;
  createProject: (input: {
    projectName: string;
    workLocation: string;
    workDate: string;
    workDescription: string;
    excelMode: ExcelMode;
  }) => Project;
  closeProject: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,

  createProject: (input) => {
    const now = new Date().toISOString();
    const project: Project = {
      projectId: crypto.randomUUID(),
      projectName: input.projectName,
      workLocation: input.workLocation,
      workDate: input.workDate,
      workDescription: input.workDescription,
      excelMode: input.excelMode,
      createdAt: now,
      updatedAt: now,
    };
    set({ currentProject: project });
    return project;
  },

  closeProject: () => set({ currentProject: null }),
}));
