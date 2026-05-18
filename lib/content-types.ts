export const CONTENT_TYPE_LABELS: Record<string, string> = {
  MOVIE: 'Película',
  SERIES: 'Serie',
  ANIME: 'Anime',
  NOVELA: 'Novela',
  DOCUMENTARY: 'Documental',
  SHORT_FILM: 'Cortometraje',
  REALITY_SHOW: 'Reality',
  TALK_SHOW: 'Talk Show',
  VARIETY_SHOW: 'Varieté',
  EDUCATIONAL: 'Educativo',
  KIDS: 'Infantil',
  FAMILY: 'Familiar',
  DOCUDRAMA: 'Docudrama',
};

export const SERIES_TYPES = new Set([
  'SERIES', 'ANIME', 'NOVELA', 'REALITY_SHOW',
  'TALK_SHOW', 'VARIETY_SHOW', 'EDUCATIONAL',
  'KIDS', 'FAMILY', 'DOCUDRAMA',
]);

export const getContentTypeLabel = (type?: string): string =>
  type ? (CONTENT_TYPE_LABELS[type] ?? type) : '';

export const isSeries = (type?: string): boolean =>
  type ? SERIES_TYPES.has(type) : false;
