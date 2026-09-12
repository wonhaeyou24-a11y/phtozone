import ExcelJS from 'exceljs';

export interface ExtractedExcelImage {
  sheetName: string;
  sheetIndex: number;
  /** Order this image was encountered within its sheet. */
  imageIndex: number;
  /** Order this image was encountered across the whole workbook — used as the MODE B "page" number. */
  pageIndex: number;
  anchorCell: string;
  colSpan: number;
  rowSpan: number;
  extension: string;
  data: Uint8Array;
}

export interface ExcelSheetInfo {
  name: string;
  index: number;
  rowCount: number;
  colCount: number;
  merges: string[];
}

export interface ExcelStructure {
  sheets: ExcelSheetInfo[];
  images: ExtractedExcelImage[];
}

/** Converts 0-based (col, row) to an A1-style cell reference, e.g. (1, 1) -> "B2". */
function colRowToRef(col0: number, row0: number): string {
  let col = col0 + 1;
  let letters = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    col = Math.floor((col - 1) / 26);
  }
  return `${letters}${row0 + 1}`;
}

const EXTENSION_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  gif: 'image/gif',
};

export function excelImageMimeType(extension: string): string {
  return EXTENSION_TO_MIME[extension.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Parses an uploaded .xlsx and extracts every embedded image (not cell values/links) along with
 * the sheet structure (spec sections 25-26). Never throws on structural surprises — an unreadable
 * or image-less workbook just yields an empty `images` list (spec section 42/43: don't block the
 * user, let them fall back to manual handling).
 */
export async function readExcelStructure(file: File): Promise<{ workbook: ExcelJS.Workbook; structure: ExcelStructure }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: ExcelSheetInfo[] = [];
  const images: ExtractedExcelImage[] = [];
  let pageIndex = 0;

  workbook.worksheets.forEach((worksheet, sheetIndex) => {
    sheets.push({
      name: worksheet.name,
      index: sheetIndex,
      rowCount: worksheet.rowCount,
      colCount: worksheet.columnCount,
      merges: worksheet.model.merges ?? [],
    });

    let imagesInSheet: ReturnType<typeof worksheet.getImages> = [];
    try {
      imagesInSheet = worksheet.getImages();
    } catch {
      imagesInSheet = [];
    }

    imagesInSheet.forEach((imgRef, imageIndex) => {
      try {
        const media = workbook.getImage(Number(imgRef.imageId));
        if (!media?.buffer) return;
        const buf = media.buffer as unknown;
        const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayBufferLike);

        const tl = imgRef.range.tl;
        const br = imgRef.range.br;
        images.push({
          sheetName: worksheet.name,
          sheetIndex,
          imageIndex,
          pageIndex: pageIndex++,
          anchorCell: colRowToRef(Math.floor(tl.nativeCol), Math.floor(tl.nativeRow)),
          colSpan: Math.max(1, Math.round(br.nativeCol - tl.nativeCol)),
          rowSpan: Math.max(1, Math.round(br.nativeRow - tl.nativeRow)),
          extension: media.extension,
          data,
        });
      } catch {
        // one bad image shouldn't take down the whole extraction
      }
    });
  });

  return { workbook, structure: { sheets, images } };
}
