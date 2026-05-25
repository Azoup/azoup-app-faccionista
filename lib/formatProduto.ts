/** Título do produto no card: SKU antes do nome quando existir. */
export function formatProdutoComSku(nome: string, sku?: string | null): string {
  const s = sku?.trim();
  const n = (nome ?? '').trim() || 'Produto';
  return s ? `${s} · ${n}` : n;
}
