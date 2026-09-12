import ExcelJS from 'exceljs';
import type { Group } from '../types/project';
import type { Photo } from '../types/photo';
import { toExportImage, containFit } from './imageExport';

// Approximate Excel unit -> pixel conversions (96dpi, default Calibri 11 font). Excel itself uses
// slightly different rounding per font/platform, so this is deliberately conservative — good
// enough to size the "after" photo to roughly the space the "before" photo already occupies,
// without ever overflowing it (spec section 33).
const DEFAULT_COL_WIDTH_CHARS = 8.43;
const DEFAULT_ROW_HEIGHT_PT = 15;

function colWidthToPx(chars: number): number {
  return Math.round(chars * 7 + 5);
}

function rowHeightPtToPx(pt: number): number {
  return Math.round((pt * 96) / 72);
}

/** Parses "B2" -> { col: 1, row: 1 } (0-based), matching exceljs's own anchor coordinate system. */
function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col: col - 1, row: parseInt(match[2], 10) - 1 };
}

function measureBoxPx(worksheet: ExcelJS.Worksheet, col0: number, row0: number, colSpan: number, rowSpan: number) {
  let widthPx = 0;
  for (let c = col0; c < col0 + colSpan; c++) {
    widthPx += colWidthToPx(worksheet.getColumn(c + 1).width ?? DEFAULT_COL_WIDTH_CHARS);
  }
  let heightPx = 0;
  for (let r = row0; r < row0 + rowSpan; r++) {
    heightPx += rowHeightPtToPx(worksheet.getRow(r + 1).height ?? DEFAULT_ROW_HEIGHT_PT);
  }
  return { widthPx: Math.max(1, widthPx), heightPx: Math.max(1, heightPx) };
}

export interface InsertResult {
  workbook: ExcelJS.Workbook;
  inserted: number;
  skipped: { groupId: string; reason: string }[];
}

/**
 * Loads the original MODE B ledger Excel and inserts each group's "after" photo into the area
 * immediately to the right of its matched "before" photo — preserving everything else about the
 * original file untouched (spec section 34): sheets, merges, borders, fonts, the existing
 * "before" photos. Never distorts the inserted photo and never lets it spill past the space the
 * "before" photo already occupied (spec section 33).
 */
export async function insertAfterPhotosIntoTemplate(
  templateFile: File,
  groups: Group[],
  photoById: Map<string, Photo>,
): Promise<InsertResult> {
  const buffer = await templateFile.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const skipped: InsertResult['skipped'] = [];
  let inserted = 0;

  for (const group of groups) {
    const beforePhoto = photoById.get(group.representativeBeforePhotoId ?? '');
    const afterPhoto = photoById.get(group.representativeAfterPhotoId ?? '');

    if (!beforePhoto?.excelSource) {
      skipped.push({ groupId: group.groupId, reason: '전 사진의 원본 Excel 위치 정보 없음' });
      continue;
    }
    if (!afterPhoto) {
      skipped.push({ groupId: group.groupId, reason: '후 사진 미지정' });
      continue;
    }

    const worksheet = workbook.worksheets[beforePhoto.excelSource.sheetIndex];
    if (!worksheet) {
      skipped.push({ groupId: group.groupId, reason: `시트를 찾을 수 없음 (${beforePhoto.excelSource.sheetName})` });
      continue;
    }

    const anchor = parseCellRef(beforePhoto.excelSource.anchorCell);
    if (!anchor) {
      skipped.push({ groupId: group.groupId, reason: `앵커 셀 인식 실패 (${beforePhoto.excelSource.anchorCell})` });
      continue;
    }

    const { colSpan, rowSpan } = beforePhoto.excelSource;

    // Default heuristic: immediately to the right of the "before" photo. If that doesn't match
    // this template's layout, the user can override it explicitly (spec section 43).
    let afterCol = anchor.col + colSpan;
    let afterRow = anchor.row;
    if (group.afterInsertAnchor) {
      const manual = parseCellRef(group.afterInsertAnchor);
      if (manual) {
        afterCol = manual.col;
        afterRow = manual.row;
      }
    }

    const exported = await toExportImage(afterPhoto.originalBlob);
    if (!exported) {
      skipped.push({ groupId: group.groupId, reason: '후 사진 이미지 처리 실패' });
      continue;
    }

    const box = measureBoxPx(worksheet, afterCol, afterRow, colSpan, rowSpan);
    const fit = containFit(exported.width, exported.height, box.widthPx, box.heightPx);

    const imageId = workbook.addImage({ base64: exported.dataUrl, extension: 'jpeg' });
    worksheet.addImage(imageId, {
      tl: { col: afterCol + 0.05, row: afterRow + 0.05 },
      ext: fit,
    });
    inserted++;
  }

  return { workbook, inserted, skipped };
}

export function ledgerCompletedFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `사진대지_자동완성_${today}.xlsx`;
}
