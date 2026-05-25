import { itemTemPendente, parseQuantidade, quantidadePendente } from './opQuantidades';
import type { OpFinalizadoRow, OpRow } from '../types/api';
import { mapQuantidadeFinalizadaPorItem } from './loadFinalizados';

/** Alinha cartão com modal: pendente = total − soma finalizada (dashboard + histórico). */
export function enrichOpsComPendenteCorreto(
  ops: OpRow[],
  finalizados: OpFinalizadoRow[],
): OpRow[] {
  const finMap = mapQuantidadeFinalizadaPorItem(finalizados);

  return ops
    .map((op) => {
      const itens = (op.itens ?? [])
        .map((it) => {
          const id = it.op_item_id?.trim();
          const fin = id ? (finMap.get(id) ?? parseQuantidade(it.quantidade_finalizada)) : parseQuantidade(it.quantidade_finalizada);
          const pend = quantidadePendente(it, fin);
          return {
            ...it,
            quantidade_finalizada: fin,
            quantidade_pendente: pend,
          };
        })
        .filter((it) => itemTemPendente(it));

      return { ...op, itens };
    })
    .filter((op) => (op.itens?.length ?? 0) > 0);
}
