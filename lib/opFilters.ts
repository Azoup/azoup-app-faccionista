import type { OpFinalizadoRow, OpRow } from '../types/api';

export type EntregaSortOrder = 'asc' | 'desc';

/** Quais listas de OP exibir no dashboard. */
export type ListaOpFiltro = 'todas' | 'pendentes' | 'finalizados';

export type OpFilters = {
  empresaKey: string | null;
  searchQuery: string;
  sortEntrega: EntregaSortOrder;
  listaOp: ListaOpFiltro;
};

export const defaultOpFilters: OpFilters = {
  empresaKey: null,
  searchQuery: '',
  sortEntrega: 'asc',
  listaOp: 'todas',
};

export function mostrarOpsPendentes(listaOp: ListaOpFiltro): boolean {
  return listaOp === 'todas' || listaOp === 'pendentes';
}

export function mostrarOpsFinalizados(listaOp: ListaOpFiltro): boolean {
  return listaOp === 'todas' || listaOp === 'finalizados';
}

export type EmpresaOption = { key: string; label: string };

export function empresaKeyFromOp(op: { empresa_id?: string; empresa_nome?: string }): string {
  if (op.empresa_id) return `id:${op.empresa_id}`;
  const nome = (op.empresa_nome ?? '').trim();
  return nome ? `nome:${nome}` : '';
}

export function collectEmpresas(ops: OpRow[], finalizados: OpFinalizadoRow[]): EmpresaOption[] {
  const map = new Map<string, string>();
  for (const o of ops) {
    const k = empresaKeyFromOp(o);
    if (k) map.set(k, (o.empresa_nome ?? '').trim() || 'Empresa');
  }
  for (const o of finalizados) {
    const k = empresaKeyFromOp(o);
    if (k) map.set(k, (o.empresa_nome ?? '').trim() || 'Empresa');
  }
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function parseEntregaMs(isoOrText: string | undefined): number {
  if (!isoOrText?.trim()) return Number.POSITIVE_INFINITY;
  const t = Date.parse(isoOrText);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function matchesEmpresa(
  op: { empresa_id?: string; empresa_nome?: string },
  empresaKey: string | null,
): boolean {
  if (!empresaKey) return true;
  return empresaKeyFromOp(op) === empresaKey;
}

function normalizeSearch(q: string): string {
  return q.trim().toLowerCase();
}

function digitsOnly(q: string): string {
  return q.replace(/\D/g, '');
}

function opSearchHaystack(op: OpRow): string {
  const parts: string[] = [
    op.produto_nome ?? '',
    op.produto_sku ?? '',
    op.empresa_nome ?? '',
    op.observacao ?? '',
    op.fase_nome ?? '',
    String(op.numero_op),
  ];
  for (const it of op.itens ?? []) {
    parts.push(it.cor ?? '', it.tamanho ?? '', it.parte ?? '');
  }
  return parts.join(' ').toLowerCase();
}

function finalizadoSearchHaystack(op: OpFinalizadoRow): string {
  const parts: string[] = [
    op.produto_nome ?? '',
    op.produto_sku ?? '',
    op.empresa_nome ?? '',
    String(op.numero_op),
  ];
  for (const it of op.itens ?? []) {
    parts.push(it.cor ?? '', it.tamanho ?? '', it.parte ?? '');
  }
  return parts.join(' ').toLowerCase();
}

export function matchesSearchOp(op: OpRow, searchQuery: string): boolean {
  const q = normalizeSearch(searchQuery);
  if (!q) return true;
  const digits = digitsOnly(q);
  if (digits && String(op.numero_op).includes(digits)) return true;
  return opSearchHaystack(op).includes(q);
}

export function matchesSearchFinalizado(op: OpFinalizadoRow, searchQuery: string): boolean {
  const q = normalizeSearch(searchQuery);
  if (!q) return true;
  const digits = digitsOnly(q);
  if (digits && String(op.numero_op).includes(digits)) return true;
  return finalizadoSearchHaystack(op).includes(q);
}

export function hasActiveFilters(f: OpFilters): boolean {
  return (
    Boolean(f.empresaKey) ||
    Boolean(f.searchQuery.trim()) ||
    f.listaOp !== 'todas'
  );
}

export function isOpEmProducao(op: { status?: string }): boolean {
  return String(op.status ?? '')
    .trim()
    .toUpperCase() === 'EM_PRODUCAO';
}

export function filterAndSortOps(ops: OpRow[], f: OpFilters): OpRow[] {
  const list = ops.filter(
    (op) =>
      isOpEmProducao(op) &&
      matchesEmpresa(op, f.empresaKey) &&
      matchesSearchOp(op, f.searchQuery),
  );
  return sortByEntrega(list, f.sortEntrega, (o) => o.data_entrega);
}

export function filterAndSortFinalizados(
  rows: OpFinalizadoRow[],
  f: OpFilters,
): OpFinalizadoRow[] {
  const list = rows.filter(
    (op) => matchesEmpresa(op, f.empresaKey) && matchesSearchFinalizado(op, f.searchQuery),
  );
  return sortByEntrega(list, f.sortEntrega, (o) => o.ultimo_finalizado_em);
}

function sortByEntrega<T extends { numero_op: number }>(
  list: T[],
  order: EntregaSortOrder,
  getDate: (item: T) => string | undefined,
): T[] {
  return [...list].sort((a, b) => {
    const ta = parseEntregaMs(getDate(a));
    const tb = parseEntregaMs(getDate(b));
    if (ta !== tb) return order === 'asc' ? ta - tb : tb - ta;
    return a.numero_op - b.numero_op;
  });
}
