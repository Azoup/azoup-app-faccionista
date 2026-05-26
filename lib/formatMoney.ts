export function formatMoneyBRL(value: number | string | null | undefined): string {
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value ?? '').replace(',', '.'));
  if (Number.isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

export function formatQuantidade(value: number | string | null | undefined): string {
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value ?? '').replace(',', '.'));
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n);
}
