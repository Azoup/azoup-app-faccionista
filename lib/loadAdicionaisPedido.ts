import { supabase } from './supabase';

/**
 * Lê producao_op.adicionais_pedido direto (mesmo campo do Kanban ERP).
 * Não depende de mudança na RPC do dashboard.
 */
export async function loadAdicionaisPedidoByOpIds(
  opIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(opIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('producao_op')
      .select('id, adicionais_pedido')
      .in('id', chunk);

    if (error || !Array.isArray(data)) {
      if (error) {
        console.warn('[adicionais_pedido]', error.message);
      }
      continue;
    }

    for (const row of data) {
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      const texto = String(row.adicionais_pedido ?? '').trim();
      if (texto) map.set(id, texto);
    }
  }

  return map;
}

export async function attachAdicionaisPedido<T extends { op_id: string; adicionais_pedido?: string | null }>(
  rows: T[],
): Promise<T[]> {
  if (!rows.length) return rows;

  const needFetch = rows.some((r) => !String(r.adicionais_pedido ?? '').trim());
  if (!needFetch) return rows;

  const map = await loadAdicionaisPedidoByOpIds(rows.map((r) => r.op_id));
  if (map.size === 0) return rows;

  return rows.map((r) => {
    const fromDb = map.get(r.op_id);
    if (!fromDb) return r;
    if (String(r.adicionais_pedido ?? '').trim()) return r;
    return { ...r, adicionais_pedido: fromDb };
  });
}
