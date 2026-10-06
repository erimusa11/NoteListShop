const ALBANIAN_MONTHS = [
  'Janar',
  'Shkurt',
  'Mars',
  'Prill',
  'Maj',
  'Qershor',
  'Korrik',
  'Gusht',
  'Shtator',
  'Tetor',
  'Nëntor',
  'Dhjetor',
];

export function formatDateTimeAlbanian(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateAlbanian(timestamp)}, ${hh}:${mm}`;
}

// Day over a three-letter month ("6\nTet"), small enough to sit under a narrow chart column.
export function formatDayMonthShort(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()}\n${ALBANIAN_MONTHS[date.getMonth()].slice(0, 3)}`;
}

export function formatDateAlbanian(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${ALBANIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
