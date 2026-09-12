import { create } from 'zustand';
import type { Project, ExcelMode } from '../types/project';
import { usePhotoStore } from './photoStore';
import { useGroupStore } from './groupStore';
import { saveProject, listProjects } from '../storage/db';

interface ProjectStore {
  currentProject: Project | null;
  /** True once the initial IndexedDB check (resume-last-project) has finished. */
  isReady: boolean;
  bootstrap: () => Promise<void>;
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
  isReady: false,

  bootstrap: async () => {
    const projects = await listProjects();
    const latest = projects[0];
    if (latest) {
      set({ currentProject: latest });
      await usePhotoStore.getState().loadForProject(latest.projectId);
      await useGroupStore.getState().loadForProject(latest.projectId);
    }
    set({ isReady: true });
  },

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
    saveProject(project);
    return project;
  },

  closeProject: () => {
    usePhotoStore.getState().clear();
    useGroupStore.getState().clear();
    set({ currentProject: null });
  },
}));
