export interface Column {
  key: string;
  label: string;
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function formatCsv(columns: Column[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

function xmlEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatXml(rootTag: string, rowTag: string, columns: Column[], rows: Array<Record<string, unknown>>): string {
  const body = rows
    .map((row) => {
      const fields = columns.map((c) => `    <${c.key}>${xmlEscape(row[c.key])}</${c.key}>`).join('\n');
      return `  <${rowTag}>\n${fields}\n  </${rowTag}>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${body}\n</${rootTag}>`;
}
