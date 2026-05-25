export type OpItemRow = {
  op_item_id?: string;
  cor: string;
  tamanho: string;
  quantidade: number | string;
  quantidade_finalizada?: number | string;
  quantidade_pendente?: number | string;
  parte: string;
};

export type FinalizadoItemRow = {
  finalizacao_item_id: string;
  op_item_id: string;
  cor: string;
  tamanho: string;
  parte: string;
  quantidade_finalizada: number | string;
  finalizado_em: string;
};

export type OpFinalizadoRow = {
  op_id: string;
  numero_op: number;
  produto_id?: string | null;
  produto_nome: string;
  produto_sku?: string;
  empresa_id?: string;
  empresa_nome: string;
  ultimo_finalizado_em: string;
  itens: FinalizadoItemRow[];
};

import type { StatusFaccionista } from '../constants/statusFaccionista';

export type OpRow = {
  op_id: string;
  produto_id?: string | null;
  numero_op: number;
  status: string;
  status_faccionista?: StatusFaccionista | string | null;
  produto_nome: string;
  produto_sku?: string;
  empresa_id?: string;
  empresa_nome: string;
  data_entrega: string;
  /** DATE em producao_op — previsão da fase atual (Kanban). */
  data_previsao_finalizacao?: string | null;
  observacao: string;
  fase_nome: string;
  itens?: OpItemRow[];
  /** Cronômetro (mesmo modelo do Kanban em `producao_op`). */
  timer_ativo?: boolean;
  timer_inicio?: string | null;
  tempo_acumulado_segundos?: number | string;
};

export type TimerAtualizarOk = {
  ok: true;
  timer_ativo: boolean;
  timer_inicio: string | null;
  tempo_acumulado_segundos: number | string;
};

export type TimerAtualizarResponse = TimerAtualizarOk | { ok: false; error: string };

export type StatusFaccionistaAtualizarOk = {
  ok: true;
  status_faccionista: string;
};

export type StatusFaccionistaAtualizarResponse =
  | StatusFaccionistaAtualizarOk
  | { ok: false; error: string };

export type FichaLinhaTamanho = {
  tamanho: string;
  consumo: number | string;
  cor?: string;
  produto_cor?: string;
  tamanho_aviamento?: string;
};

export type TecidoCorCadastro = {
  cor: string;
  sku_cor: string;
};

export type AviamentoVariacaoCadastro = {
  cor: string;
  tamanho: string;
  sku_variacao: string;
};

export type FichaConsumoTecido = {
  id: string;
  tipo_consumo: string;
  unidade: string;
  consumo_geral: number | string | null;
  tecido_nome: string;
  tecido_sku?: string;
  tecido_unidade?: string;
  tecido_composicao?: string;
  tecido_largura?: number | string | null;
  tecido_rendimento?: number | string | null;
  tecido_cores_cadastro?: TecidoCorCadastro[];
  linhas_tamanho: FichaLinhaTamanho[];
};

export type FichaConsumoAviamento = {
  id: string;
  tipo_consumo: string;
  unidade: string;
  consumo_geral: number | string | null;
  aviamento_nome: string;
  aviamento_sku?: string;
  aviamento_unidade?: string;
  aviamento_variacoes?: AviamentoVariacaoCadastro[];
  linhas_tamanho: FichaLinhaTamanho[];
};

export type FichaPayload = {
  id: string;
  observacao_ficha_tecnica: string;
  dificuldade: number | null;
  dividido_em_partes: boolean;
  partes: { descricao: string; ordem: number }[];
  consumos_tecido: FichaConsumoTecido[];
  consumos_aviamento: FichaConsumoAviamento[];
};

export type FichaTecnicaOk = {
  ok: true;
  produto_id: string;
  ficha: FichaPayload | null;
};

export type FichaTecnicaErr = {
  ok: false;
  error: string;
};

export type FichaTecnicaResponse = FichaTecnicaOk | FichaTecnicaErr;

export type DashboardOk = {
  ok: true;
  faccionista: { id: string; nome: string; vinculos_count?: number };
  ops: OpRow[];
  finalizados?: OpFinalizadoRow[];
};

export type DashboardErr = {
  ok: false;
  error: string;
};

export type DashboardResponse = DashboardOk | DashboardErr;
