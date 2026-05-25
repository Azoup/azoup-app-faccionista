import type { OpRow } from '../types/api';

/**
 * Mesma regra do Kanban de produção (campos em `producao_op`):
 * - `tempo_acumulado_segundos`: segundos já consolidados quando pausa.
 * - Com `timer_ativo` true, soma ainda o trecho em andamento desde `timer_inicio`.
 * - Com `timer_ativo` false, devolve só o acumulado.
 *
 * Valores vêm do dashboard (`app_faccionista_dashboard`); play/pause persistem via
 * `app_producao_op_timer_atualizar` na mesma linha da OP.
 */
export function displayElapsedSeconds(op: OpRow, nowMs: number = Date.now()): number {
  const base = Math.floor(Number(op.tempo_acumulado_segundos ?? 0));
  if (!op.timer_ativo) return base;
  if (!op.timer_inicio) return base;
  const t0 = Date.parse(op.timer_inicio);
  if (Number.isNaN(t0)) return base;
  return base + Math.floor((nowMs - t0) / 1000);
}
