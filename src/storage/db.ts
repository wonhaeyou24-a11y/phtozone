import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project, Group } from '../types/project';
import type { Photo } from '../types/photo';

// `thumbnail` is a derived object URL (regenerated from originalBlob on load), not persisted.
type StoredPhoto = Omit<Photo, 'thumbnail'>;

interface AppDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updatedAt': string };
  };
  photos: {
    key: string;
    value: StoredPhoto;
    indexes: { 'by-projectId': string };
  };
  groups: {
    key: string;
    value: Group;
    indexes: { 'by-projectId': string };
  };
  excelTemplates: {
    key: string;
    value: { projectId: string; fileName: string; file: File; uploadedAt: string };
  };
}

const DB_NAME = 'photo-ledger-matcher';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

function getDb(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const projects = db.createObjectStore('projects', { keyPath: 'projectId' });
          projects.createIndex('by-updatedAt', 'updatedAt');

          const photos = db.createObjectStore('photos', { keyPath: 'photoId' });
          photos.createIndex('by-projectId', 'projectId');
        }
        if (oldVersion < 2) {
          const groups = db.createObjectStore('groups', { keyPath: 'groupId' });
          groups.createIndex('by-projectId', 'projectId');
        }
        if (oldVersion < 3) {
          db.createObjectStore('excelTemplates', { keyPath: 'projectId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.put('projects', project);
}

/** Most recently updated first. */
export async function listProjects(): Promise<Project[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('projects', 'by-updatedAt');
  return all.reverse();
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDb();
  await db.delete('projects', projectId);

  const photoTx = db.transaction('photos', 'readwrite');
  for await (const cursor of photoTx.store.index('by-projectId').iterate(projectId)) {
    cursor.delete();
  }
  await photoTx.done;

  const groupTx = db.transaction('groups', 'readwrite');
  for await (const cursor of groupTx.store.index('by-projectId').iterate(projectId)) {
    cursor.delete();
  }
  await groupTx.done;

  await db.delete('excelTemplates', projectId);
}

export async function savePhoto(photo: Photo): Promise<void> {
  const db = await getDb();
  const { thumbnail: _thumbnail, ...stored } = photo;
  await db.put('photos', stored);
}

export async function deletePhoto(photoId: string): Promise<void> {
  const db = await getDb();
  await db.delete('photos', photoId);
}

export async function listPhotosByProject(projectId: string): Promise<Photo[]> {
  const db = await getDb();
  const stored = await db.getAllFromIndex('photos', 'by-projectId', projectId);
  return stored.map((p) => ({ ...p, thumbnail: URL.createObjectURL(p.originalBlob) }));
}

export async function saveGroup(group: Group): Promise<void> {
  const db = await getDb();
  await db.put('groups', group);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const db = await getDb();
  await db.delete('groups', groupId);
}

export async function listGroupsByProject(projectId: string): Promise<Group[]> {
  const db = await getDb();
  return db.getAllFromIndex('groups', 'by-projectId', projectId);
}

export async function saveExcelTemplate(projectId: string, file: File): Promise<void> {
  const db = await getDb();
  await db.put('excelTemplates', { projectId, fileName: file.name, file, uploadedAt: new Date().toISOString() });
}

export async function getExcelTemplate(projectId: string): Promise<File | undefined> {
  const db = await getDb();
  const record = await db.get('excelTemplates', projectId);
  return record?.file;
}
