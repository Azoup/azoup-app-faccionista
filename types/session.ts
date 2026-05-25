import type { OpRow } from './api';

export type SessionInfo = {
  faccionistaId: string;
  nome: string;
  email: string;
  /** Quantidade de vínculos login_faccionista ativos para este auth */
  vinculosCount?: number;
  initialOps: OpRow[];
};
