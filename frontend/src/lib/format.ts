const madFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' });

export function formatMad(value: number | string): string {
  return madFormatter.format(typeof value === 'string' ? Number(value) : value);
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatRelativeToNow(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) return `${diffMinutes > 0 ? 'dans ' : 'il y a '}${Math.abs(diffMinutes)} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return `${diffHours > 0 ? 'dans ' : 'il y a '}${Math.abs(diffHours)} h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays > 0 ? 'dans ' : 'il y a '}${Math.abs(diffDays)} j`;
}
