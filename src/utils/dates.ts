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

export function formatDateAlbanian(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${ALBANIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
