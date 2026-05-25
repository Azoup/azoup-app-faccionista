import type { OpFinalizadoRow, OpRow } from '../types/api';

export type EntregaSortOrder = 'asc' | 'desc';

/** asc = entrega mais próxima primeiro; desc = mais distante primeiro */
export type OpFilters = {
  numeroOpSearch: string;
  empresaKey: string | null;
  dataEntregaDe: string;
  dataEntregaAte: string;
  sortEntrega: EntregaSortOrder;
};

export const defaultOpFilters: OpFilters = {
  numeroOpSearch: '',
  empresaKey: null,
  dataEntregaDe: '',
  dataEntregaAte: '',
  sortEntrega: 'asc',
};

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

/** Aceita DD/MM/AAAA ou AAAA-MM-DD */
export function parseDateInput(input: string): Date | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

function matchesEmpresa(
  op: { empresa_id?: string; empresa_nome?: string },
  empresaKey: string | null,
): boolean {
  if (!empresaKey) return true;
  return empresaKeyFromOp(op) === empresaKey;
}

function matchesNumeroOp(numeroOp: number, search: string): boolean {
  const q = search.trim();
  if (!q) return true;
  return String(numeroOp).includes(q.replace(/\D/g, '') || q);
}

function matchesDataEntrega(dataEntrega: string | undefined, de: string, ate: string): boolean {
  const ms = parseEntregaMs(dataEntrega);
  if (ms === Number.POSITIVE_INFINITY) return true;

  const dDe = parseDateInput(de);
  if (dDe && ms < startOfDay(dDe)) return false;

  const dAte = parseDateInput(ate);
  if (dAte && ms > endOfDay(dAte)) return false;

  return true;
}

export function countActiveFilters(f: OpFilters): number {
  let n = 0;
  if (f.numeroOpSearch.trim()) n++;
  if (f.empresaKey) n++;
  if (f.dataEntregaDe.trim()) n++;
  if (f.dataEntregaAte.trim()) n++;
  if (f.sortEntrega !== defaultOpFilters.sortEntrega) n++;
  return n;
}

export function filterAndSortOps(ops: OpRow[], f: OpFilters): OpRow[] {
  const list = ops.filter(
    (op) =>
      matchesNumeroOp(op.numero_op, f.numeroOpSearch) &&
      matchesEmpresa(op, f.empresaKey) &&
      matchesDataEntrega(op.data_entrega, f.dataEntregaDe, f.dataEntregaAte),
  );
  return sortByEntrega(list, f.sortEntrega, (o) => o.data_entrega);
}

export function filterAndSortFinalizados(
  rows: OpFinalizadoRow[],
  f: OpFilters,
): OpFinalizadoRow[] {
  const list = rows.filter(
    (op) =>
      matchesNumeroOp(op.numero_op, f.numeroOpSearch) &&
      matchesEmpresa(op, f.empresaKey),
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
