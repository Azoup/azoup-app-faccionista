import type { OpRow } from './api';

export type SessionInfo = {
  faccionistaId: string;
  nome: string;
  email: string;
  initialOps: OpRow[];
};
