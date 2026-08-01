import { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import { Column } from './format.util';

export async function buildDocxBuffer(
  title: string,
  columns: Column[],
  rows: Array<Record<string, unknown>>,
): Promise<Buffer> {
  const headerRow = new TableRow({
    children: columns.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ text: c.label, style: 'strong' })],
          width: { size: Math.round(100 / columns.length), type: WidthType.PERCENTAGE },
        }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: columns.map(
          (c) => new TableCell({ children: [new Paragraph(String(row[c.key] ?? ''))] }),
        ),
      }),
  );

  const doc = new Document({
    styles: { paragraphStyles: [{ id: 'strong', name: 'Strong', run: { bold: true } }] },
    sections: [
      {
        children: [
          new Paragraph({ text: 'E-Ticket Pro', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Généré le ${new Date().toLocaleString('fr-FR')}` }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
