export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatCoords(lat?: number, lon?: number): string {
  if (lat === undefined || lon === undefined) return '없음';
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export function formatHeading(heading?: number): string {
  return heading === undefined ? '없음' : `${heading.toFixed(0)}°`;
}

export function formatCameraInfo(make?: string, model?: string): string {
  const parts = [make, model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '없음';
}
