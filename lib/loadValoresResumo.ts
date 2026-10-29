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

function valorUnitarioDoItem(item: OpItemMo): number {
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
  const fase = faseKey(faseAtualId);
  const sameFase = logs.filter((l) => faseKey(l.fase_id) === fase);
  if (!sameFase.length) return null;
  const abertos = sameFase.filter((l) => l.saida_em == null || String(l.saida_em).trim() === '');
  const pool = abertos.length ? abertos : sameFase;
  pool.sort((a, b) => {
    const ta = Date.parse(String(a.created_at ?? '')) || 0;
    const tb = Date.parse(String(b.created_at ?? '')) || 0;
    return tb - ta;
  });
  return pool[0] ?? null;
}

async function fetchInChunks<T>(
  ids: string[],
  loadSlice: (slice: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const slice = ids.slice(i, i + 80);
    const rows = await loadSlice(slice);
    out.push(...rows);
  }
  return out;
}

/**
 * R$ un. do card do kanban: M.O. do log da fase atual ÷ soma das quantidades da OP.
 * Só preenche OPs cujo item está com unitário 0.
 */
async function loadUnitarioDoLogFaseAtual(opIds: string[]): Promise<Map<string, number>> {
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

  const qtdPorOp = new Map<string, number>();
  for (const item of itensOp) {
    const opId = String(item.op_id ?? '').trim();
    if (!opId) continue;
    qtdPorOp.set(opId, (qtdPorOp.get(opId) ?? 0) + toNumber(item.quantidade));
  }

  for (const opId of unique) {
    const log = pickLogFaseAtual(logsPorOp.get(opId) ?? [], fasePorOp.get(opId) ?? null);
    const moLog = toNumber(log?.valor_mao_obra_total);
    const qtdOp = qtdPorOp.get(opId) ?? 0;
    if (moLog > 0 && qtdOp > 0.0001) {
      unitPorOp.set(opId, moLog / qtdOp);
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

/**
 * Valor produzido = soma das peças finalizadas × mão de obra do item.
 * Se o item estiver com R$ un. 0, usa o M.O. do log da fase atual (mesmo do card do kanban).
 * Valor recebido = soma dos pagamentos do faccionista.
 * Valor a receber = produzido − recebido (nunca negativo).
 */
export async function loadValoresResumo(
  fallbackFaccionistaId?: string | null,
): Promise<{ ok: true; data: ValoresResumo } | { ok: false; error: string }> {
  try {
    const ids = await faccionistaIds(fallbackFaccionistaId);
    if (!ids.length) {
      return { ok: false, error: 'Faccionista não identificado.' };
    }

    const qtdPorItem = new Map<string, number>();
    const pageSize = 1000;
    for (let from = 0; from < 20000; from += pageSize) {
      const { data, error } = await supabase
        .from('producao_op_faccionista_finalizacao_item')
        .select('op_item_id, quantidade_finalizada')
        .in('faccionista_id', ids)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        const itemId = String(row.op_item_id ?? '').trim();
        if (!itemId) continue;
        qtdPorItem.set(
          itemId,
          (qtdPorItem.get(itemId) ?? 0) + toNumber(row.quantidade_finalizada),
        );
      }
      if (rows.length < pageSize) break;
    }

    const itemIds = [...qtdPorItem.keys()];
    const itens = await fetchInChunks(itemIds, async (slice) => {
      const { data, error } = await supabase
        .from('producao_op_item')
        .select('id, op_id, quantidade, valor_mao_obra_unitario, valor_mao_obra_total')
        .in('id', slice);
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as OpItemMo[];
    });

    const opsSemUnitario: string[] = [];
    for (const item of itens) {
      if (valorUnitarioDoItem(item) > 0) continue;
      const opId = String(item.op_id ?? '').trim();
      if (opId) opsSemUnitario.push(opId);
    }
    const unitarioLogPorOp = await loadUnitarioDoLogFaseAtual(opsSemUnitario);

    let valorProduzido = 0;
    for (const item of itens) {
      const qtd = qtdPorItem.get(String(item.id)) ?? 0;
      let unit = valorUnitarioDoItem(item);
      if (!(unit > 0)) {
        const opId = String(item.op_id ?? '').trim();
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
