/** Linhas de producao_op.adicionais_pedido (snapshot do pedido, separadas por quebra de linha). */
export function parseAdicionaisPedido(text?: string | null): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
