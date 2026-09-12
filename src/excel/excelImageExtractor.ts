import type { Photo } from '../types/photo';
import type { ExtractedExcelImage } from './excelReader';
import { excelImageMimeType } from './excelReader';

/** Converts images extracted from an uploaded ledger Excel into "before" Photo objects (spec section 27). */
export function excelImagesToPhotos(images: ExtractedExcelImage[], projectId: string): Photo[] {
  const now = new Date().toISOString();

  return images.map((img) => {
    const mimeType = excelImageMimeType(img.extension);
    const fileName = `엑셀_${img.sheetName}_이미지${img.imageIndex + 1}.${img.extension}`;
    // `new Uint8Array(data)` copies the bytes into a fresh buffer so the File isn't tied to a
    // detached/shared ArrayBuffer view from the parsed workbook.
    const file = new File([new Uint8Array(img.data)], fileName, { type: mimeType, lastModified: Date.now() });
    const objectUrl = URL.createObjectURL(file);

    return {
      photoId: crypto.randomUUID(),
      projectId,
      originalFileName: fileName,
      mimeType,
      fileSize: file.size,
      capturedAt: now,
      capturedAtSource: 'FILE_MODIFIED',
      metadataStatus: 'PENDING',
      imageAnalysisStatus: 'PENDING',
      thumbnail: objectUrl,
      originalBlob: file,
      excluded: false,
      createdAt: now,
      excelSource: {
        sheetName: img.sheetName,
        sheetIndex: img.sheetIndex,
        imageIndex: img.imageIndex,
        anchorCell: img.anchorCell,
        colSpan: img.colSpan,
        rowSpan: img.rowSpan,
        pageIndex: img.pageIndex,
      },
    };
  });
}
