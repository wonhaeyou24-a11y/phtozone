import ExcelJS from 'exceljs';
import type { Project, Group } from '../types/project';
import type { Photo } from '../types/photo';
import { toExportImage, containFit } from './imageExport';

// Target photo box, in pixels — column/row sizes below are picked to roughly match this
// (spec section 33: contain-fit, never distorted, never overflowing its cell area).
const TARGET_W = 300;
const TARGET_H = 220;

const COL_LABEL_WIDTH = 14;
const COL_PHOTO_WIDTH = 44;
const COL_GAP_WIDTH = 3;
const IMAGE_ROW_HEIGHT_PT = 180;
const SPACER_ROW_HEIGHT_PT = 12;

async function placePhoto(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  photo: Photo | undefined,
  colIndex0: number,
  rowIndex1: number,
) {
  if (!photo) return;
  const exported = await toExportImage(photo.originalBlob);
  if (!exported) return;

  const imageId = workbook.addImage({ base64: exported.dataUrl, extension: 'jpeg' });
  const fit = containFit(exported.width, exported.height, TARGET_W, TARGET_H);
  sheet.addImage(imageId, {
    tl: { col: colIndex0 + 0.08, row: rowIndex1 - 1 + 0.06 },
    ext: fit,
  });
}

/** Builds a new photo-ledger workbook: one page per group, with the group's representative before/after photos. */
export async function buildLedgerWorkbook(
  project: Project,
  groups: Group[],
  photoById: Map<string, Photo>,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'photo-ledger-matcher';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('사진대지', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [{ width: COL_LABEL_WIDTH }, { width: COL_PHOTO_WIDTH }, { width: COL_GAP_WIDTH }, { width: COL_PHOTO_WIDTH }];

  let row = 1;

  for (const group of groups) {
    const beforePhoto = photoById.get(group.representativeBeforePhotoId ?? '');
    const afterPhoto = photoById.get(group.representativeAfterPhotoId ?? '');

    sheet.mergeCells(row, 1, row, 4);
    const infoCell1 = sheet.getCell(row, 1);
    infoCell1.value = `현장명: ${project.projectName}    작업위치: ${project.workLocation || '-'}    작업일: ${project.workDate || '-'}`;
    infoCell1.font = { bold: true, size: 11 };
    row++;

    sheet.mergeCells(row, 1, row, 4);
    sheet.getCell(row, 1).value = `작업내용: ${project.workDescription || '-'}`;
    row++;

    const labelRow = row;
    const beforeLabelCell = sheet.getCell(labelRow, 2);
    beforeLabelCell.value = '전';
    beforeLabelCell.font = { bold: true };
    beforeLabelCell.alignment = { horizontal: 'center' };
    const afterLabelCell = sheet.getCell(labelRow, 4);
    afterLabelCell.value = '후';
    afterLabelCell.font = { bold: true };
    afterLabelCell.alignment = { horizontal: 'center' };
    row++;

    const imageRow = row;
    sheet.getRow(imageRow).height = IMAGE_ROW_HEIGHT_PT;
    if (!beforePhoto) sheet.getCell(imageRow, 2).value = '사진 없음';
    if (!afterPhoto) sheet.getCell(imageRow, 4).value = '사진 없음';
    await placePhoto(workbook, sheet, beforePhoto, 1, imageRow);
    await placePhoto(workbook, sheet, afterPhoto, 3, imageRow);
    row++;

    const spacerRow = sheet.getRow(row);
    spacerRow.height = SPACER_ROW_HEIGHT_PT;
    spacerRow.addPageBreak();
    row++;
  }

  return workbook;
}

export function ledgerFileName(project: Project): string {
  const today = new Date().toISOString().slice(0, 10);
  const safeName = project.projectName.replace(/[\\/:*?"<>|]/g, '_');
  return `사진대지_${safeName}_${today}.xlsx`;
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
