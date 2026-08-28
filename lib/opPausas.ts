import { supabase } from './supabase';
import type { OpPausaContext, OpPausaRow } from '../types/api';

export async function loadOpPausaContext(
  opId: string,
  fallbackFaseNome?: string | null,
): Promise<{ ok: true; ctx: OpPausaContext } | { ok: false; error: string }> {
  const id = String(opId ?? '').trim();
  if (!id) return { ok: false, error: 'OP não informada.' };

  const { data: op, error: opErr } = await supabase
    .from('producao_op')
    .select('id, numero_op, cliente_id_tenant, fase_atual_id, faccionista_id')
    .eq('id', id)
    .maybeSingle();

  if (opErr) return { ok: false, error: opErr.message };
  if (!op?.id) return { ok: false, error: 'OP não encontrada.' };
  if (!op.cliente_id_tenant) return { ok: false, error: 'OP sem tenant (cliente_id_tenant).' };
  if (!op.faccionista_id) return { ok: false, error: 'OP sem faccionista vinculado.' };

  let faseNome = 'Fila de Produção';
  const faseId = op.fase_atual_id != null ? String(op.fase_atual_id) : null;

  if (faseId) {
    const { data: fase } = await supabase
      .from('roteiro_producao_fases')
      .select('nome')
      .eq('id', faseId)
      .maybeSingle();
    faseNome =
      String(fase?.nome ?? '').trim() ||
      String(fallbackFaseNome ?? '').trim() ||
      'Fase atual';
  }

  const { data: fac } = await supabase
    .from('fornecedores_cadastros')
    .select('nome')
    .eq('id', op.faccionista_id)
    .maybeSingle();

  const faccionistaNome = String(fac?.nome ?? '').trim() || 'Faccionista';

  return {
    ok: true,
    ctx: {
      op_id: String(op.id),
      numero_op: Number(op.numero_op) || 0,
      cliente_id_tenant: String(op.cliente_id_tenant),
      fase_id: faseId,
      fase_nome: faseNome,
      faccionista_id: String(op.faccionista_id),
      faccionista_nome: faccionistaNome,
    },
  };
}

export async function loadOpPausas(
  clienteIdTenant: string,
  opId: string,
): Promise<{ ok: true; pausas: OpPausaRow[] } | { ok: false; error: string }> {
  const tenant = String(clienteIdTenant ?? '').trim();
  const id = String(opId ?? '').trim();
  if (!tenant || !id) return { ok: false, error: 'Parâmetros inválidos.' };

  const { data, error } = await supabase
    .from('producao_op_pausas')
    .select(
      `id, op_id, numero_op, fase_id, fase_nome, usuario_nome,
       faccionista_id, faccionista_nome, operador_nome,
       duracao_segundos, inicio_em, fim_em, observacao, created_at`,
    )
    .eq('cliente_id_tenant', tenant)
    .eq('op_id', id)
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, pausas: (Array.isArray(data) ? data : []) as OpPausaRow[] };
}

export type InsertOpPausaInput = {
  ctx: OpPausaContext;
  usuarioNome: string;
  duracaoSegundos: number;
  inicioEm?: string | null;
  fimEm?: string | null;
  observacao?: string | null;
};

export async function insertOpPausa(
  input: InsertOpPausaInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { ctx, duracaoSegundos } = input;
  if (!(duracaoSegundos > 0)) {
    return { ok: false, error: 'A duração deve ser maior que zero.' };
  }

  const payload = {
    cliente_id_tenant: ctx.cliente_id_tenant,
    op_id: ctx.op_id,
    numero_op: ctx.numero_op ?? null,
    fase_id: ctx.fase_id,
    fase_nome: ctx.fase_nome,
    usuario_id: null,
    usuario_nome: input.usuarioNome.trim() || ctx.faccionista_nome,
    celula_id: null,
    celula_nome: null,
    faccionista_id: ctx.faccionista_id,
    faccionista_nome: ctx.faccionista_nome,
    operador_id: null,
    operador_nome: null,
    duracao_segundos: Math.floor(duracaoSegundos),
    inicio_em: input.inicioEm ?? null,
    fim_em: input.fimEm ?? null,
    observacao: input.observacao?.trim() || null,
  };

  const { error } = await supabase.from('producao_op_pausas').insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function quemParouLabel(p: OpPausaRow): string {
  const opNome = String(p.operador_nome ?? '').trim();
  if (opNome) return opNome;
  const fac = String(p.faccionista_nome ?? '').trim();
  if (fac) return fac;
  return '—';
}
