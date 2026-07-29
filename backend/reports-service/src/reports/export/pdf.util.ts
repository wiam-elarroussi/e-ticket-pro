import PDFDocument from 'pdfkit';
import { Column } from './format.util';

/** Rapport tabulaire simple (pas de mise en page avancée) — suffisant pour un export d'archive imprimable. */
export function buildPdfBuffer(title: string, columns: Column[], rows: Array<Record<string, unknown>>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(title, { align: 'left' });
    doc.moveDown();
    doc.fontSize(9).text(`Généré le ${new Date().toLocaleString('fr-FR')} — ${rows.length} ligne(s)`);
    doc.moveDown();

    const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;
    const startX = doc.page.margins.left;
    let y = doc.y;

    const drawRow = (values: string[], bold: boolean) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      values.forEach((value, i) => {
        doc.text(value, startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
      });
      y += 16;
      if (y > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    };

    drawRow(columns.map((c) => c.label), true);
    for (const row of rows) {
      drawRow(
        columns.map((c) => (row[c.key] === null || row[c.key] === undefined ? '' : String(row[c.key]))),
        false,
      );
    }

    doc.end();
  });
}
