import { supabase } from './supabase';
import { getBackendUrl } from './passwordResetApi';

export type ConsumoTipo = 'tecido' | 'aviamento';

export type ConsumoLinha = {
  uid: string;
  item_id: string;
  variacao_id?: string | null;
  variacao_id_mov?: string | null;
  nome: string;
  unidade?: string | null;
  cor_estoque?: string | null;
  tamanho_estoque?: string | null;
  custo_unitario?: number | string | null;
  consumo_inicial: number | string;
  consumo_atual: string;
  consumo_baixado: number | string;
  excluded?: boolean;
  from_ficha?: boolean;
};

export type ConsumoCatalogItem = {
  id: string;
  nome: string;
  custo?: number | string | null;
  custo_por_variacao?: boolean | null;
};

export type ConsumoVariacao = {
  id: string;
  cor?: string | null;
  tamanho?: string | null;
  sku_cor?: string | null;
  custo?: number | string | null;
};

async function authHeaders(): Promise<Record<string, string> | { error: string }> {
  const base = getBackendUrl();
  if (!base) {
    return { error: 'Servidor não configurado. Defina EXPO_PUBLIC_BACKEND_URL.' };
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'Sessão inválida. Faça login novamente.' };
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function apiUrl(path: string): string | null {
  const base = getBackendUrl();
  if (!base) return null;
  return `${base}${path}`;
}

export async function loadOpConsumo(
  opId: string,
  tipo: ConsumoTipo,
): Promise<
  | { ok: true; linhas: ConsumoLinha[]; catalog: ConsumoCatalogItem[]; numero_op: number }
  | { ok: false; error: string }
> {
  const headers = await authHeaders();
  if ('error' in headers) return { ok: false, error: headers.error };
  const url = apiUrl(
    `/api/faccionista/op-consumo?op_id=${encodeURIComponent(opId)}&tipo=${tipo}`,
  );
  if (!url) return { ok: false, error: 'Servidor não configurado.' };
  const res = await fetch(url, { headers });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body || body.ok !== true) {
    return {
      ok: false,
      error: String(body?.error || 'Não foi possível carregar o consumo.'),
    };
  }
  return {
    ok: true,
    linhas: (Array.isArray(body.linhas) ? body.linhas : []) as ConsumoLinha[],
    catalog: (Array.isArray(body.catalog) ? body.catalog : []) as ConsumoCatalogItem[],
    numero_op: Number(body.numero_op) || 0,
  };
}

export async function loadConsumoVariacoes(
  opId: string,
  tipo: ConsumoTipo,
  itemId: string,
): Promise<{ ok: true; variacoes: ConsumoVariacao[] } | { ok: false; error: string }> {
  const headers = await authHeaders();
  if ('error' in headers) return { ok: false, error: headers.error };
  const url = apiUrl(
    `/api/faccionista/op-consumo?op_id=${encodeURIComponent(opId)}&tipo=${tipo}&item_id=${encodeURIComponent(itemId)}`,
  );
  if (!url) return { ok: false, error: 'Servidor não configurado.' };
  const res = await fetch(url, { headers });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body || body.ok !== true) {
    return { ok: false, error: String(body?.error || 'Não foi possível carregar as variações.') };
  }
  return {
    ok: true,
    variacoes: (Array.isArray(body.variacoes) ? body.variacoes : []) as ConsumoVariacao[],
  };
}

export async function salvarOpConsumo(
  opId: string,
  tipo: ConsumoTipo,
  linhas: ConsumoLinha[],
): Promise<{ ok: true; movimentou_estoque: boolean } | { ok: false; error: string }> {
  const headers = await authHeaders();
  if ('error' in headers) return { ok: false, error: headers.error };
  const url = apiUrl('/api/faccionista/op-consumo');
  if (!url) return { ok: false, error: 'Servidor não configurado.' };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ op_id: opId, tipo, linhas }),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body || body.ok !== true) {
    return { ok: false, error: String(body?.error || 'Não foi possível salvar o consumo.') };
  }
  return { ok: true, movimentou_estoque: body.movimentou_estoque === true };
}
