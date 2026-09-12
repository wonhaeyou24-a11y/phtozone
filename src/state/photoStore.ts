import { create } from 'zustand';
import type { Photo } from '../types/photo';
import { filesToPhotos } from '../photo/photoLoader';
import { parseExif } from '../photo/exifParser';
import { analyzeImage } from '../photo/imageAnalyzer';
import { savePhoto, deletePhoto, listPhotosByProject } from '../storage/db';

interface PhotoStore {
  photos: Photo[];
  selectedPhotoId: string | null;
  addFiles: (files: File[], projectId: string) => void;
  addPhotos: (photos: Photo[]) => void;
  updatePhoto: (photoId: string, patch: Partial<Photo>) => void;
  removePhoto: (photoId: string) => void;
  selectPhoto: (photoId: string | null) => void;
  clear: () => void;
  /** Replaces in-memory photos with what's persisted for this project (used when resuming a saved project). */
  loadForProject: (projectId: string) => Promise<void>;
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  photos: [],
  selectedPhotoId: null,

  addFiles: (files, projectId) => {
    get().addPhotos(filesToPhotos(files, projectId));
  },

  addPhotos: (newPhotos) => {
    if (newPhotos.length === 0) return;
    set({ photos: [...get().photos, ...newPhotos] });

    for (const photo of newPhotos) {
      savePhoto(photo);
      parseExif(photo.originalBlob)
        .then((metadata) => get().updatePhoto(photo.photoId, metadata))
        .catch(() => get().updatePhoto(photo.photoId, { metadataStatus: 'FAILED' }));
      analyzeImage(photo.originalBlob)
        .then((features) => get().updatePhoto(photo.photoId, features))
        .catch(() => get().updatePhoto(photo.photoId, { imageAnalysisStatus: 'FAILED' }));
    }
  },

  updatePhoto: (photoId, patch) => {
    let merged: Photo | undefined;
    set({
      photos: get().photos.map((p) => {
        if (p.photoId !== photoId) return p;
        merged = { ...p, ...patch };
        return merged;
      }),
    });
    if (merged) savePhoto(merged);
  },

  removePhoto: (photoId) => {
    const target = get().photos.find((p) => p.photoId === photoId);
    if (target) URL.revokeObjectURL(target.thumbnail);
    set({
      photos: get().photos.filter((p) => p.photoId !== photoId),
      selectedPhotoId: get().selectedPhotoId === photoId ? null : get().selectedPhotoId,
    });
    deletePhoto(photoId);
  },

  selectPhoto: (photoId) => set({ selectedPhotoId: photoId }),

  clear: () => {
    for (const p of get().photos) URL.revokeObjectURL(p.thumbnail);
    set({ photos: [], selectedPhotoId: null });
  },

  loadForProject: async (projectId) => {
    for (const p of get().photos) URL.revokeObjectURL(p.thumbnail);
    set({ photos: [], selectedPhotoId: null });
    const photos = await listPhotosByProject(projectId);
    set({ photos });
  },
}));
