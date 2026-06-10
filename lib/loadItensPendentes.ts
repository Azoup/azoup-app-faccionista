import {
  itemIncluirNoModalFinalizar,
  itemVariavelComQuantidade,
  parseQuantidade,
  quantidadePendente,
} from './opQuantidades';
import { supabase } from './supabase';
import type { DashboardOk, DashboardResponse, OpItemRow } from '../types/api';

type RpcItensResponse =
  | { ok: true; itens: OpItemRow[] }
  | { ok: false; error: string };

function isRpcMissing(error: { code?: string; message?: string; details?: string } | null): boolean {
  if (!error) return false;
  const msg = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('pgrst202') ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
}

function normalizeOpItemId(it: OpItemRow): string {
  const v = it.op_item_id;
  if (v == null) return '';
  return String(v).trim();
}

function itemDedupeKey(it: OpItemRow): string {
  const id = normalizeOpItemId(it);
  if (id) return `id:${id}`;
  const cor = (it.cor ?? '').trim().toLowerCase();
  const tam = (it.tamanho ?? '').trim().toLowerCase();
  const parte = (it.parte ?? '').trim().toLowerCase();
  return `k:${cor}|${tam}|${parte}`;
}

function pickBetterItem(a: OpItemRow, b: OpItemRow): OpItemRow {
  const idA = normalizeOpItemId(a);
  const idB = normalizeOpItemId(b);
  const merged: OpItemRow = { ...a, ...b };
  if (idA) merged.op_item_id = idA;
  else if (idB) merged.op_item_id = idB;

  const pendA = quantidadePendente(a);
  const pendB = quantidadePendente(b);
  if (pendB > pendA + 0.0001) {
    merged.quantidade_pendente = b.quantidade_pendente ?? pendB;
    merged.quantidade_finalizada = b.quantidade_finalizada;
  } else if (pendA > pendB + 0.0001) {
    merged.quantidade_pendente = a.quantidade_pendente ?? pendA;
    merged.quantidade_finalizada = a.quantidade_finalizada;
  }

  if (parseQuantidade(merged.quantidade) <= 0) {
    merged.quantidade = parseQuantidade(a.quantidade) > 0 ? a.quantidade : b.quantidade;
  }

  return merged;
}

function mergeItemLists(...sources: OpItemRow[][]): OpItemRow[] {
  const byKey = new Map<string, OpItemRow>();
  for (const src of sources) {
    for (const it of src) {
      if (!itemVariavelComQuantidade(it)) continue;
      const key = itemDedupeKey(it);
      const existing = byKey.get(key);
      byKey.set(key, existing ? pickBetterItem(existing, it) : it);
    }
  }
  return Array.from(byKey.values());
}

function mergeOpItemIds(
  itens: OpItemRow[],
  idsFromDb: { id: string; cor: string; tamanho: string; parte: string }[],
): OpItemRow[] {
  if (idsFromDb.length === 0) return itens;
  return itens.map((it) => {
    if (normalizeOpItemId(it)) return it;
    const cor = (it.cor ?? '').trim().toLowerCase();
    const tam = (it.tamanho ?? '').trim().toLowerCase();
    const parte = (it.parte ?? '').trim().toLowerCase();
    const match = idsFromDb.find(
      (r) =>
        (r.cor ?? '').trim().toLowerCase() === cor &&
        (r.tamanho ?? '').trim().toLowerCase() === tam &&
        (r.parte ?? '').trim().toLowerCase() === parte,
    );
    return match ? { ...it, op_item_id: match.id } : it;
  });
}

async function loadFromRpc(opId: string): Promise<{ itens: OpItemRow[]; warn?: string; rpcMissing: boolean }> {
  const { data, error } = await supabase.rpc('app_faccionista_op_itens_pendentes', {
    p_op_id: opId,
  });

  if (isRpcMissing(error)) {
    return {
      itens: [],
      warn: 'Função app_faccionista_op_itens_pendentes não encontrada. Rode sql/08 no Supabase (ou o final do sql/07).',
      rpcMissing: true,
    };
  }

  if (!error && data) {
    const payload = data as unknown as RpcItensResponse;
    if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok) {
      const list = Array.isArray(payload.itens) ? payload.itens : [];
      return { itens: list, rpcMissing: false };
    }
  }

  return {
    itens: [],
    warn: error?.message,
    rpcMissing: false,
  };
}

async function loadFromDashboard(opId: string): Promise<OpItemRow[]> {
  const { data, error } = await supabase.rpc('app_faccionista_dashboard');
  if (error || !data) return [];
  const payload = data as unknown as DashboardResponse;
  if (!payload || typeof payload !== 'object' || !('ok' in payload) || !payload.ok) return [];
  const ok = payload as DashboardOk;
  const op = (ok.ops ?? []).find((o) => o.op_id === opId);
  return Array.isArray(op?.itens) ? op.itens : [];
}

async function loadFromProducaoOpItemTable(opId: string): Promise<OpItemRow[]> {
  const { data, error } = await supabase
    .from('producao_op_item')
    .select('id, cor, tamanho, parte, quantidade')
    .eq('op_id', opId);
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    op_item_id: String(r.id),
    cor: String(r.cor ?? ''),
    tamanho: String(r.tamanho ?? ''),
    parte: String(r.parte ?? ''),
    quantidade: r.quantidade,
    quantidade_finalizada: 0,
    quantidade_pendente: r.quantidade,
  }));
}

/**
 * Carrega itens pendentes da OP unindo RPC, dashboard, itens do cartão e tabela producao_op_item.
 */
export async function loadItensPendentesOp(
  opId: string,
  fallbackItens?: OpItemRow[],
): Promise<{ itens: OpItemRow[]; warn?: string }> {
  const [{ itens: rpcItens, warn: rpcWarn }, dashboardItens, tableRows] = await Promise.all([
    loadFromRpc(opId),
    loadFromDashboard(opId),
    loadFromProducaoOpItemTable(opId),
  ]);

  const fallback = Array.isArray(fallbackItens) ? fallbackItens : [];

  let list = mergeItemLists(rpcItens, dashboardItens, fallback, tableRows);
  list = mergeOpItemIds(
    list,
    tableRows.map((r) => ({
      id: r.op_item_id!,
      cor: r.cor,
      tamanho: r.tamanho,
      parte: r.parte,
    })),
  );

  list = list.filter(itemIncluirNoModalFinalizar);

  const comId = list.filter((it) => normalizeOpItemId(it));
  if (comId.length === 0 && list.length > 0) {
    return {
      itens: list,
      warn:
        rpcWarn ??
        'Itens sem op_item_id. Reaplique sql/01_app_faccionista_dashboard.sql no Supabase e atualize a lista.',
    };
  }

  if (list.length === 0 && rpcWarn) {
    return { itens: [], warn: rpcWarn };
  }

  return { itens: comId.length > 0 ? comId : list, warn: rpcWarn };
}
