import { getBackendUrl } from './passwordResetApi';
import { supabase } from './supabase';

export type ValoresResumo = {
  valorProduzido: number;
  valorRecebido: number;
  valorAReceber: number;
};

type OpItemMo = {
  id: string;
  op_id?: string | null;
  quantidade?: unknown;
  valor_mao_obra_unitario?: unknown;
  valor_mao_obra_total?: unknown;
};

type FaseLogRow = {
  op_id?: string | null;
  fase_id?: string | null;
  valor_mao_obra_total?: unknown;
  created_at?: string | null;
  saida_em?: string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function faseKey(value: unknown): string {
  return String(value ?? '').trim();
}

function valorUnitarioDoItem(item: OpItemMo | undefined): number {
  if (!item) return 0;
  const unitRaw = item.valor_mao_obra_unitario;
  if (unitRaw != null && String(unitRaw).trim() !== '') {
    const unit = toNumber(unitRaw);
    if (unit > 0) return unit;
  }
  const qtd = toNumber(item.quantidade);
  const total = toNumber(item.valor_mao_obra_total);
  if (qtd > 0.0001 && total > 0) return total / qtd;
  return 0;
}

function pickLogFaseAtual(logs: FaseLogRow[], faseAtualId: string | null): FaseLogRow | null {
  const list = Array.isArray(logs) ? logs : [];
  const fase = faseKey(faseAtualId);
  const sameFase = list.filter((l) => faseKey(l.fase_id) === fase);
  const comMo = (rows: FaseLogRow[]) => rows.filter((l) => toNumber(l.valor_mao_obra_total) > 0);
  const abertos = (rows: FaseLogRow[]) =>
    rows.filter((l) => l.saida_em == null || String(l.saida_em).trim() === '');
  const newest = (rows: FaseLogRow[]) =>
    [...rows].sort((a, b) => {
      const ta = Date.parse(String(a.created_at ?? '')) || 0;
      const tb = Date.parse(String(b.created_at ?? '')) || 0;
      return tb - ta;
    })[0] ?? null;

  const poolFase = sameFase.length ? sameFase : list;
  const moAbertosFase = comMo(abertos(poolFase));
  if (moAbertosFase.length) return newest(moAbertosFase);
  const moFase = comMo(poolFase);
  if (moFase.length) return newest(moFase);
  const moAbertos = comMo(abertos(list));
  if (moAbertos.length) return newest(moAbertos);
  const moTodos = comMo(list);
  return moTodos.length ? newest(moTodos) : newest(poolFase);
}

async function fetchInChunks<T>(
  ids: string[],
  loadSlice: (slice: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const slice = ids.slice(i, i + 80);
    try {
      const rows = await loadSlice(slice);
      out.push(...rows);
    } catch {
      /* uma fatia falhou: segue o restante */
    }
  }
  return out;
}

async function loadUnitarioDoLogFaseAtual(
  opIds: string[],
  qtdFinPorOp: Map<string, number>,
  qtdSnapPorOp: Map<string, number>,
): Promise<Map<string, number>> {
  const unitPorOp = new Map<string, number>();
  const unique = [...new Set(opIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!unique.length) return unitPorOp;

  const ops = await fetchInChunks(unique, async (slice) => {
    const { data, error } = await supabase.from('producao_op').select('id, fase_atual_id').in('id', slice);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });

  const fasePorOp = new Map<string, string | null>();
  for (const op of ops) {
    const id = String(op.id ?? '').trim();
    if (!id) continue;
    fasePorOp.set(id, op.fase_atual_id != null ? String(op.fase_atual_id) : null);
  }

  const logs = await fetchInChunks(unique, async (slice) => {
    const { data, error } = await supabase
      .from('producao_op_fases_log')
      .select('op_id, fase_id, valor_mao_obra_total, created_at, saida_em')
      .in('op_id', slice);
    if (error) throw error;
    return (Array.isArray(data) ? data : []) as FaseLogRow[];
  });

  const logsPorOp = new Map<string, FaseLogRow[]>();
  for (const log of logs) {
    const opId = String(log.op_id ?? '').trim();
    if (!opId) continue;
    const list = logsPorOp.get(opId) ?? [];
    list.push(log);
    logsPorOp.set(opId, list);
  }

  const itensOp = await fetchInChunks(unique, async (slice) => {
    const { data, error } = await supabase
      .from('producao_op_item')
      .select('op_id, quantidade')
      .in('op_id', slice);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });

  const qtdAtualPorOp = new Map<string, number>();
  for (const item of itensOp) {
    const opId = String(item.op_id ?? '').trim();
    if (!opId) continue;
    qtdAtualPorOp.set(opId, (qtdAtualPorOp.get(opId) ?? 0) + toNumber(item.quantidade));
  }

  for (const opId of unique) {
    const log = pickLogFaseAtual(logsPorOp.get(opId) ?? [], fasePorOp.get(opId) ?? null);
    const moLog = toNumber(log?.valor_mao_obra_total);
    const atual = qtdAtualPorOp.get(opId) ?? 0;
    const snap = qtdSnapPorOp.get(opId) ?? 0;
    const fin = qtdFinPorOp.get(opId) ?? 0;
    const denom = atual > 0.0001 ? atual : snap > 0.0001 ? snap : fin;
    if (moLog > 0 && denom > 0.0001) {
      unitPorOp.set(opId, moLog / denom);
    }
  }

  return unitPorOp;
}

async function faccionistaIds(fallbackId?: string | null): Promise<string[]> {
  const ids = new Set<string>();
  const fallback = String(fallbackId ?? '').trim();
  if (fallback) ids.add(fallback);

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [...ids];

  const { data, error } = await supabase
    .from('login_faccionista')
    .select('fornecedor_id, status')
    .eq('auth_user_id', uid);

  if (!error && Array.isArray(data)) {
    for (const row of data) {
      if (String(row.status ?? '').trim().toLowerCase() !== 'ativo') continue;
      const id = String(row.fornecedor_id ?? '').trim();
      if (id) ids.add(id);
    }
  }

  return [...ids];
}

async function loadValoresResumoViaBackend(): Promise<ValoresResumo | null> {
  const base = getBackendUrl();
  if (!base) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch(`${base}/api/faccionista/resumo-valores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !body || body.ok !== true) return null;
    return {
      valorProduzido: roundMoney(toNumber(body.valor_produzido)),
      valorRecebido: roundMoney(toNumber(body.valor_recebido)),
      valorAReceber: roundMoney(toNumber(body.valor_a_receber)),
    };
  } catch {
    return null;
  }
}

/**
 * Valor produzido = soma das peças finalizadas × mão de obra.
 * Se o item estiver com R$ un. 0, usa o M.O. do log da fase atual (card do kanban).
 */
export async function loadValoresResumo(
  fallbackFaccionistaId?: string | null,
): Promise<{ ok: true; data: ValoresResumo } | { ok: false; error: string }> {
  const viaApi = await loadValoresResumoViaBackend();
  if (viaApi) {
    return { ok: true, data: viaApi };
  }

  try {
    const ids = await faccionistaIds(fallbackFaccionistaId);
    if (!ids.length) {
      return { ok: false, error: 'Faccionista não identificado.' };
    }

    const qtdPorItem = new Map<string, number>();
    const opPorItem = new Map<string, string>();
    const qtdSnapPorItem = new Map<string, number>();
    const pageSize = 1000;
    for (let from = 0; from < 20000; from += pageSize) {
      const { data, error } = await supabase
        .from('producao_op_faccionista_finalizacao_item')
        .select('op_item_id, op_id, quantidade_finalizada, quantidade_op_item')
        .in('faccionista_id', ids)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        const itemId = String(row.op_item_id ?? '').trim();
        if (!itemId) continue;
        qtdPorItem.set(itemId, (qtdPorItem.get(itemId) ?? 0) + toNumber(row.quantidade_finalizada));
        const opId = String(row.op_id ?? '').trim();
        if (opId) opPorItem.set(itemId, opId);
        qtdSnapPorItem.set(itemId, Math.max(qtdSnapPorItem.get(itemId) ?? 0, toNumber(row.quantidade_op_item)));
      }
      if (rows.length < pageSize) break;
    }

    const itemIds = [...qtdPorItem.keys()];
    let itens: OpItemMo[] = [];
    try {
      itens = await fetchInChunks(itemIds, async (slice) => {
        const { data, error } = await supabase
          .from('producao_op_item')
          .select('id, op_id, quantidade, valor_mao_obra_unitario, valor_mao_obra_total')
          .in('id', slice);
        if (error) throw error;
        return (Array.isArray(data) ? data : []) as OpItemMo[];
      });
    } catch {
      itens = await fetchInChunks(itemIds, async (slice) => {
        const { data, error } = await supabase
          .from('producao_op_item')
          .select('id, op_id, quantidade, valor_mao_obra_unitario')
          .in('id', slice);
        if (error) throw error;
        return (Array.isArray(data) ? data : []) as OpItemMo[];
      });
    }
    const itemById = new Map(itens.map((it) => [String(it.id), it]));

    const qtdFinPorOp = new Map<string, number>();
    const qtdSnapPorOp = new Map<string, number>();
    const opsSemUnitario: string[] = [];
    for (const itemId of itemIds) {
      const item = itemById.get(itemId);
      const opId = String(item?.op_id ?? opPorItem.get(itemId) ?? '').trim();
      if (!opId) continue;
      qtdFinPorOp.set(opId, (qtdFinPorOp.get(opId) ?? 0) + (qtdPorItem.get(itemId) ?? 0));
      qtdSnapPorOp.set(opId, (qtdSnapPorOp.get(opId) ?? 0) + (qtdSnapPorItem.get(itemId) ?? 0));
      if (!(valorUnitarioDoItem(item) > 0)) opsSemUnitario.push(opId);
    }

    let unitarioLogPorOp = new Map<string, number>();
    try {
      unitarioLogPorOp = await loadUnitarioDoLogFaseAtual(opsSemUnitario, qtdFinPorOp, qtdSnapPorOp);
    } catch {
      unitarioLogPorOp = new Map();
    }

    let valorProduzido = 0;
    for (const itemId of itemIds) {
      const qtd = qtdPorItem.get(itemId) ?? 0;
      const item = itemById.get(itemId);
      let unit = valorUnitarioDoItem(item);
      if (!(unit > 0)) {
        const opId = String(item?.op_id ?? opPorItem.get(itemId) ?? '').trim();
        unit = unitarioLogPorOp.get(opId) ?? 0;
      }
      valorProduzido += qtd * unit;
    }

    let valorRecebido = 0;
    for (let from = 0; from < 20000; from += pageSize) {
      const { data, error } = await supabase
        .from('producao_faccionista_pagamento')
        .select('valor_total')
        .in('faccionista_id', ids)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      valorRecebido += rows.reduce((acc, row) => acc + toNumber(row.valor_total), 0);
      if (rows.length < pageSize) break;
    }

    const produzido = roundMoney(valorProduzido);
    const recebido = roundMoney(valorRecebido);
    return {
      ok: true,
      data: {
        valorProduzido: produzido,
        valorRecebido: recebido,
        valorAReceber: roundMoney(Math.max(0, produzido - recebido)),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Não foi possível calcular os valores.';
    return { ok: false, error: message };
  }
}
