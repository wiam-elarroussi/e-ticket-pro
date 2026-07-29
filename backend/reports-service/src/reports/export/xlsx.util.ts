import ExcelJS from 'exceljs';
import { Column } from './format.util';

export async function buildXlsxBuffer(
  sheetName: string,
  columns: Column[],
  rows: Array<Record<string, unknown>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
