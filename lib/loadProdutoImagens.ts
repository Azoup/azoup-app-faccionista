import { supabase } from './supabase';
import type { ProdutoImagemRow } from '../types/api';

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
