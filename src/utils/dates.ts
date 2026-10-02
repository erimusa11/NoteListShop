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

export function formatDateAlbanian(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()} ${ALBANIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
