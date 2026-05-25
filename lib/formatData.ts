/** Formata data (ISO ou YYYY-MM-DD) para exibição em pt-BR. */
export function formatDataLabel(isoOrText: string | null | undefined): string | null {
  const raw = (isoOrText ?? '').trim();
  if (!raw) return null;
  const t = Date.parse(raw.length === 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(t)) return raw;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(t));
}
