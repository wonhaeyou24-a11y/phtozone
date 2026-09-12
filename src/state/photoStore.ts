import { create } from 'zustand';
import type { Photo } from '../types/photo';
import { filesToPhotos } from '../photo/photoLoader';
import { parseExif } from '../photo/exifParser';

interface PhotoStore {
  photos: Photo[];
  selectedPhotoId: string | null;
  addFiles: (files: File[], projectId: string) => void;
  updatePhoto: (photoId: string, patch: Partial<Photo>) => void;
  removePhoto: (photoId: string) => void;
  selectPhoto: (photoId: string | null) => void;
  clear: () => void;
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  photos: [],
  selectedPhotoId: null,

  addFiles: (files, projectId) => {
    const newPhotos = filesToPhotos(files, projectId);
    if (newPhotos.length === 0) return;
    set({ photos: [...get().photos, ...newPhotos] });

    for (const photo of newPhotos) {
      parseExif(photo.originalBlob)
        .then((metadata) => get().updatePhoto(photo.photoId, metadata))
        .catch(() => get().updatePhoto(photo.photoId, { metadataStatus: 'FAILED' }));
    }
  },

  updatePhoto: (photoId, patch) => {
    set({
      photos: get().photos.map((p) => (p.photoId === photoId ? { ...p, ...patch } : p)),
    });
  },

  removePhoto: (photoId) => {
    const target = get().photos.find((p) => p.photoId === photoId);
    if (target) URL.revokeObjectURL(target.thumbnail);
    set({
      photos: get().photos.filter((p) => p.photoId !== photoId),
      selectedPhotoId: get().selectedPhotoId === photoId ? null : get().selectedPhotoId,
    });
  },

  selectPhoto: (photoId) => set({ selectedPhotoId: photoId }),

  clear: () => {
    for (const p of get().photos) URL.revokeObjectURL(p.thumbnail);
    set({ photos: [], selectedPhotoId: null });
  },
}));
