import type { OpItemRow } from '../types/api';

export function parseQuantidade(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).trim().replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

export function quantidadeTotalItem(it: OpItemRow): number {
  return parseQuantidade(it.quantidade);
}

/**
 * Pendente = total − já finalizado.
 * Não usa fallback “total inteiro” quando já existe finalização parcial.
 */
export function quantidadePendente(
  it: OpItemRow,
  qtdFinalizadaExterna?: number,
): number {
  const total = quantidadeTotalItem(it);
  const finInformada =
    qtdFinalizadaExterna !== undefined
      ? qtdFinalizadaExterna
      : parseQuantidade(it.quantidade_finalizada);

  if (
    qtdFinalizadaExterna === undefined &&
    it.quantidade_pendente !== undefined &&
    it.quantidade_pendente !== null &&
    it.quantidade_pendente !== ''
  ) {
    const pendSrv = parseQuantidade(it.quantidade_pendente);
    if (pendSrv >= 0 && pendSrv <= total + 0.0001) {
      return Math.max(0, pendSrv);
    }
  }

  return Math.max(0, total - finInformada);
}

export function itemTemPendente(it: OpItemRow, qtdFinalizadaExterna?: number): boolean {
  return quantidadePendente(it, qtdFinalizadaExterna) > 0.0001;
}

/** Variação com quantidade total > 0 (linhas zeradas são ignoradas). */
export function itemVariavelComQuantidade(it: OpItemRow): boolean {
  return quantidadeTotalItem(it) > 0.0001;
}

/** Modal / finalização: total > 0 e ainda há saldo pendente. */
export function itemIncluirNoModalFinalizar(it: OpItemRow, qtdFinalizadaExterna?: number): boolean {
  return itemVariavelComQuantidade(it) && itemTemPendente(it, qtdFinalizadaExterna);
}

/** Pelo menos uma variação com quantidade > 0 e pendente > 0. */
export function opPodeSerFinalizada(itens: OpItemRow[]): boolean {
  return itens.some((it) => itemIncluirNoModalFinalizar(it));
}

/** Máximo digitável no modal de finalizar. */
export function quantidadeMaxInput(it: OpItemRow, qtdFinalizadaExterna?: number): number {
  return quantidadePendente(it, qtdFinalizadaExterna);
}

/** Aceita só dígitos e um separador decimal (, ou .); limita ao máximo. */
export function filtrarEntradaQuantidade(text: string, max: number): string {
  if (text === '') return '';
  let s = text.replace(/[^\d,.]/g, '');
  const sepIdx = s.search(/[,.]/);
  if (sepIdx >= 0) {
    const sep = s[sepIdx];
    const antes = s.slice(0, sepIdx).replace(/[^\d]/g, '');
    const depois = s.slice(sepIdx + 1).replace(/[^\d]/g, '');
    s = `${antes}${sep}${depois}`;
  }
  const n = parseQuantidade(s);
  if (max > 0 && n > max) {
    return formatQuantidadeInput(max);
  }
  return s;
}

export function formatQuantidadeInput(n: number): string {
  if (n <= 0) return '';
  const arred = Math.round(n * 1000) / 1000;
  if (Number.isInteger(arred)) return String(arred);
  return String(arred).replace('.', ',');
}

export function formatQuantidadeLabel(n: number | string | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(parseQuantidade(n));
}
