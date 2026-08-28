import { supabase } from './supabase';
import type { ProdutoImagemDisplay, ProdutoImagemRow } from '../types/api';

export async function loadProdutoImagens(
  produtoId: string,
): Promise<{ ok: true; imagens: ProdutoImagemRow[] } | { ok: false; error: string }> {
  const id = String(produtoId ?? '').trim();
  if (!id) {
    return { ok: false, error: 'Produto não informado.' };
  }

  const { data, error } = await supabase
    .from('produto_imagem')
    .select('id, produto_id, url_imagem, observacao, created_at')
    .eq('produto_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const imagens = (Array.isArray(data) ? data : [])
    .map((row) => ({
      id: String(row.id),
      produto_id: row.produto_id != null ? String(row.produto_id) : id,
      url_imagem: String(row.url_imagem ?? '').trim(),
      observacao: row.observacao != null ? String(row.observacao) : null,
      created_at: row.created_at != null ? String(row.created_at) : undefined,
    }))
    .filter((row) => row.url_imagem.length > 0);

  return { ok: true, imagens };
}

async function loadPedidoIdDaOp(opId: string): Promise<string | number | null> {
  const id = String(opId ?? '').trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from('producao_op')
    .select('pedido_id')
    .eq('id', id)
    .maybeSingle();
  if (error || data?.pedido_id == null || data.pedido_id === '') return null;
  return data.pedido_id as string | number;
}

async function loadVendaImagensExternas(
  pedidoId: string | number,
  produtoId: string,
): Promise<ProdutoImagemDisplay[]> {
  const { data, error } = await supabase
    .from('venda_imagem_externa')
    .select('id, url_imagem, ordem, produto_id, venda_id')
    .eq('venda_id', pedidoId)
    .order('ordem', { ascending: true });

  if (error || !Array.isArray(data)) return [];

  const pid = String(produtoId);
  return data
    .filter((row) => {
      if (!row?.url_imagem) return false;
      if (row.produto_id == null || row.produto_id === '') return true; // legado
      return String(row.produto_id) === pid;
    })
    .map((row) => ({
      id: `ext-${String(row.id)}`,
      produto_id: row.produto_id != null ? String(row.produto_id) : pid,
      url_imagem: String(row.url_imagem).trim(),
      observacao: null,
      origem: 'pedido' as const,
      origem_label: 'Anexo do pedido',
    }))
    .filter((row) => row.url_imagem.length > 0);
}

/**
 * Cadastro do produto (`produto_imagem`) + anexos da venda (`venda_imagem_externa`)
 * quando a OP tiver `pedido_id`.
 */
export async function loadProdutoImagensComPedido(
  produtoId: string,
  opId?: string | null,
): Promise<{ ok: true; imagens: ProdutoImagemDisplay[] } | { ok: false; error: string }> {
  const cadastro = await loadProdutoImagens(produtoId);
  if (!cadastro.ok) return cadastro;

  const fromCadastro: ProdutoImagemDisplay[] = cadastro.imagens.map((img) => ({
    ...img,
    origem: 'cadastro' as const,
    origem_label: 'Cadastro do produto',
  }));

  const op = String(opId ?? '').trim();
  if (!op) {
    return { ok: true, imagens: fromCadastro };
  }

  const pedidoId = await loadPedidoIdDaOp(op);
  if (pedidoId == null) {
    return { ok: true, imagens: fromCadastro };
  }

  const externas = await loadVendaImagensExternas(pedidoId, produtoId);
  return { ok: true, imagens: [...fromCadastro, ...externas] };
}
