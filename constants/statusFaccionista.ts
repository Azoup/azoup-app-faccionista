/** Valores em `producao_op.status_faccionista` (CHECK no Postgres). */
export const STATUS_FACCIONISTA = {
  EM_PRODUCAO: 'EM_PRODUCAO',
  PARCIALMENTE_FINALIZADO: 'PARCIALMENTE_FINALIZADO',
  FINALIZADO: 'FINALIZADO',
} as const;

export type StatusFaccionista =
  (typeof STATUS_FACCIONISTA)[keyof typeof STATUS_FACCIONISTA];

const LABELS: Record<StatusFaccionista, string> = {
  EM_PRODUCAO: 'Em produção',
  PARCIALMENTE_FINALIZADO: 'Parcialmente finalizado',
  FINALIZADO: 'Finalizado',
};

export function normalizeStatusFaccionista(raw: string | null | undefined): StatusFaccionista {
  const v = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (v === STATUS_FACCIONISTA.PARCIALMENTE_FINALIZADO) {
    return STATUS_FACCIONISTA.PARCIALMENTE_FINALIZADO;
  }
  if (v === STATUS_FACCIONISTA.FINALIZADO) {
    return STATUS_FACCIONISTA.FINALIZADO;
  }
  return STATUS_FACCIONISTA.EM_PRODUCAO;
}

export function labelStatusFaccionista(status: StatusFaccionista): string {
  return LABELS[status];
}

export function isStatusFaccionistaClosed(status: StatusFaccionista): boolean {
  return status === STATUS_FACCIONISTA.FINALIZADO;
}
