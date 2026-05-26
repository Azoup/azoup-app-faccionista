import { supabase } from './supabase';
import type { ResumoFinanceiroOk, ResumoFinanceiroResponse } from '../types/api';

export async function loadResumoFaccionista(): Promise<
  { ok: true; data: ResumoFinanceiroOk } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc('app_faccionista_resumo_financeiro');
  if (error) {
    return { ok: false, error: error.message };
  }
  const payload = data as unknown as ResumoFinanceiroResponse;
  if (!payload || typeof payload !== 'object' || !('ok' in payload) || !payload.ok) {
    const msg =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: string }).error)
        : 'Erro ao carregar resumo.';
    return { ok: false, error: msg };
  }
  return { ok: true, data: payload as ResumoFinanceiroOk };
}
