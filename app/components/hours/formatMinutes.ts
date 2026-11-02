export function formatMinutes(minutes: number): string {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const sign = minutes < 0 ? '-' : '';
  if (hours === 0) return `${sign}${rest} min`;
  if (rest === 0) return `${sign}${hours} h`;
  return `${sign}${hours} h ${rest} min`;
}

function localIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthBounds(value = new Date()): { from: string; to: string } {
  const year = value.getFullYear();
  const month = value.getMonth();
  return { from: localIso(new Date(year, month, 1)), to: localIso(new Date(year, month + 1, 0)) };
}
