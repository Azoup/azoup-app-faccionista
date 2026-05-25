import { parseQuantidade } from './opQuantidades';
import { supabase } from './supabase';
import type { OpFinalizadoRow } from '../types/api';

type FinalizadosRpcResponse =
  | { ok: true; finalizados: OpFinalizadoRow[] }
  | { ok: false; error: string };

export async function loadFinalizadosFaccionista(): Promise<{
  finalizados: OpFinalizadoRow[];
  error?: string;
}> {
  const { data, error } = await supabase.rpc('app_faccionista_finalizados');

  if (!error && data) {
    const payload = data as unknown as FinalizadosRpcResponse;
    if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok) {
      return {
        finalizados: Array.isArray(payload.finalizados) ? payload.finalizados : [],
      };
    }
    if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok === false && 'error' in payload) {
      return { finalizados: [], error: String((payload as { error: string }).error) };
    }
  }

  if (error) {
    return { finalizados: [], error: error.message };
  }

  return { finalizados: [] };
}

/** Soma finalizado por op_item_id (para corrigir pendente no cartão). */
export function mapQuantidadeFinalizadaPorItem(
  finalizados: OpFinalizadoRow[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const op of finalizados) {
    for (const it of op.itens ?? []) {
      const id = it.op_item_id?.trim();
      if (!id) continue;
      const q = parseQuantidade(it.quantidade_finalizada);
      map.set(id, (map.get(id) ?? 0) + q);
    }
  }
  return map;
}
