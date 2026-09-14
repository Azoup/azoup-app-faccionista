import { supabase } from './supabase';

export type ValoresResumo = {
  valorProduzido: number;
  valorRecebido: number;
  valorAReceber: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function valorUnitarioItem(item: {
  quantidade?: unknown;
  valor_mao_obra_unitario?: unknown;
  valor_mao_obra_total?: unknown;
}): number {
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

    let valorProduzido = 0;
    const itemIds = [...qtdPorItem.keys()];
    for (let i = 0; i < itemIds.length; i += 80) {
      const slice = itemIds.slice(i, i + 80);
      const { data, error } = await supabase
        .from('producao_op_item')
        .select('id, quantidade, valor_mao_obra_unitario, valor_mao_obra_total')
        .in('id', slice);
      if (error) throw error;
      for (const item of data ?? []) {
        const qtd = qtdPorItem.get(String(item.id)) ?? 0;
        valorProduzido += qtd * valorUnitarioItem(item);
      }
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
