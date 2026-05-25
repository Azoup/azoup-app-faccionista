import { itemIncluirNoModalFinalizar, parseQuantidade } from './opQuantidades';
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

function mergeOpItemIds(itens: OpItemRow[], idsFromDb: { id: string; cor: string; tamanho: string; parte: string }[]): OpItemRow[] {
  if (idsFromDb.length === 0) return itens;
  return itens.map((it) => {
    if (it.op_item_id) return it;
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

async function loadFromDashboard(opId: string): Promise<OpItemRow[]> {
  const { data, error } = await supabase.rpc('app_faccionista_dashboard');
  if (error || !data) return [];
  const payload = data as unknown as DashboardResponse;
  if (!payload || typeof payload !== 'object' || !('ok' in payload) || !payload.ok) return [];
  const ok = payload as DashboardOk;
  const op = (ok.ops ?? []).find((o) => o.op_id === opId);
  return Array.isArray(op?.itens) ? op.itens.filter(itemIncluirNoModalFinalizar) : [];
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
 * Carrega itens pendentes da OP. Tenta RPC dedicada; se 404, dashboard e tabela producao_op_item.
 */
export async function loadItensPendentesOp(
  opId: string,
  fallbackItens?: OpItemRow[],
): Promise<{ itens: OpItemRow[]; warn?: string }> {
  const { data, error } = await supabase.rpc('app_faccionista_op_itens_pendentes', {
    p_op_id: opId,
  });

  if (!error && data) {
    const payload = data as unknown as RpcItensResponse;
    if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok) {
      const list = Array.isArray(payload.itens) ? payload.itens : [];
      if (list.length > 0) return { itens: list };
    }
  }

  let list: OpItemRow[] = [];
  let warn: string | undefined;

  if (isRpcMissing(error)) {
    warn =
      'Função app_faccionista_op_itens_pendentes não encontrada. Rode sql/08 no Supabase (ou o final do sql/07).';
  }

  list = await loadFromDashboard(opId);

  if (list.length === 0 && Array.isArray(fallbackItens)) {
    list = fallbackItens.filter(itemIncluirNoModalFinalizar);
  }

  const tableRows = await loadFromProducaoOpItemTable(opId);
  if (tableRows.length > 0) {
    if (list.length === 0) {
      list = tableRows;
    } else {
      list = mergeOpItemIds(list, tableRows.map((r) => ({
        id: r.op_item_id!,
        cor: r.cor,
        tamanho: r.tamanho,
        parte: r.parte,
      })));
    }
  }

  const comId = list.filter((it) => it.op_item_id);
  if (comId.length === 0 && list.length > 0) {
    return {
      itens: list,
      warn:
        warn ??
        'Itens sem op_item_id. Reaplique sql/01_app_faccionista_dashboard.sql no Supabase e atualize a lista.',
    };
  }

  if (list.length === 0 && error && !isRpcMissing(error)) {
    return { itens: [], warn: error.message };
  }

  return { itens: comId.length > 0 ? comId : list, warn };
}
