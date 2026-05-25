export function getBackendUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL?.trim().replace(/\/$/, '');
  return url || null;
}

export const backendUrlMissingMessage =
  'Servidor de recuperação de senha não configurado. Defina EXPO_PUBLIC_BACKEND_URL no ambiente do app.';

type RequestOk = {
  ok: true;
  message: string;
  emailCadastrado: boolean;
};

type RequestErr = { ok: false; message: string };

export type PasswordResetRequestResult = RequestOk | RequestErr;

type CompleteOk = { ok: true; success: true; message: string };

type CompleteErr = { ok: false; message: string };

export type PasswordResetCompleteResult = CompleteOk | CompleteErr;

async function parseJsonResponse(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
  const base = getBackendUrl();
  if (!base) {
    return { ok: false, message: backendUrlMissingMessage };
  }

  const res = await fetch(`${base}/api/faccionista/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  const data = (await parseJsonResponse(res)) as Record<string, unknown> | null;
  const message =
    data && typeof data.message === 'string'
      ? data.message
      : res.ok
        ? 'Se o e-mail estiver cadastrado, você receberá um código em instantes.'
        : 'Não foi possível solicitar o código. Tente novamente.';

  if (!res.ok) {
    return { ok: false, message };
  }

  return {
    ok: true,
    message,
    emailCadastrado: data?.emailCadastrado !== false,
  };
}

export async function completePasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<PasswordResetCompleteResult> {
  const base = getBackendUrl();
  if (!base) {
    return { ok: false, message: backendUrlMissingMessage };
  }

  const res = await fetch(`${base}/api/faccionista/auth/password-reset/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      newPassword,
    }),
  });

  const data = (await parseJsonResponse(res)) as Record<string, unknown> | null;
  const message =
    data && typeof data.message === 'string'
      ? data.message
      : res.ok
        ? 'Senha alterada com sucesso.'
        : 'Código inválido ou expirado. Solicite um novo.';

  if (!res.ok || data?.success !== true) {
    return { ok: false, message };
  }

  return { ok: true, success: true, message };
}

export function isPasswordStrongEnough(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

export function isResetCodeValid(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
