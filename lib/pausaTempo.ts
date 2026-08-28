/** Formata segundos como HH:MM:SS */
export function formatTimerHHMMSS(totalSeconds: number | string | null | undefined): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Máscara de digitação HH:MM:SS (cresce com os dígitos; sem pad à esquerda). */
export function maskTempoHms(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 6);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
}

/** Máscara HH:MM (cresce com os dígitos; sem pad à esquerda). */
export function maskTempoHm(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseManualTempoToSeconds(raw: string): number | null {
  const t = String(raw || '').trim();
  if (!t) return null;
  if (t.includes(':')) {
    const parts = t.split(':').map((p) => parseInt(p, 10));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    if (parts.length === 2) {
      return parts[0] * 60 + Math.min(59, parts[1]);
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + Math.min(59, parts[1]) * 60 + Math.min(59, parts[2]);
    }
    return null;
  }
  const digits = t.replace(/\D/g, '');
  if (!digits) return null;
  const padded = digits.padStart(Math.min(6, Math.max(2, digits.length)), '0').slice(-6);
  const len = digits.length;
  if (len <= 2) return parseInt(digits, 10);
  if (len <= 4) {
    const mm = parseInt(padded.slice(-4, -2) || '0', 10);
    const ss = Math.min(59, parseInt(padded.slice(-2), 10));
    return mm * 60 + ss;
  }
  const hh = parseInt(padded.slice(0, 2), 10);
  const mm = Math.min(59, parseInt(padded.slice(2, 4), 10));
  const ss = Math.min(59, parseInt(padded.slice(4, 6), 10));
  return hh * 3600 + mm * 60 + ss;
}

/** Máscara de digitação DD/MM/AAAA (até 8 dígitos). */
export function maskDateBr(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA ou AAAA-MM-DD → AAAA-MM-DD. */
export function toIsoDate(raw: string): string | null {
  const t = String(raw || '').trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
  const day = String(dd).padStart(2, '0');
  const month = String(mo).padStart(2, '0');
  const iso = `${yyyy}-${month}-${day}`;
  const check = new Date(`${iso}T12:00:00`);
  if (
    Number.isNaN(check.getTime()) ||
    check.getFullYear() !== yyyy ||
    check.getMonth() + 1 !== mo ||
    check.getDate() !== dd
  ) {
    return null;
  }
  return iso;
}

/** Data DD/MM/AAAA ou AAAA-MM-DD + hora HH:MM[:SS] → ISO UTC. */
export function combineDateAndTime(dateRaw: string, timeHm: string): string | null {
  const day = toIsoDate(dateRaw);
  if (!day) return null;
  const t = String(timeHm || '').trim();
  let hh = '00';
  let mm = '00';
  let ss = '00';
  if (t) {
    const parts = t.split(':');
    hh = String(parseInt(parts[0] || '0', 10) || 0).padStart(2, '0');
    mm = String(Math.min(59, parseInt(parts[1] || '0', 10) || 0)).padStart(2, '0');
    ss = String(Math.min(59, parseInt(parts[2] || '0', 10) || 0)).padStart(2, '0');
  }
  const local = new Date(`${day}T${hh}:${mm}:${ss}`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function formatDateTimeBr(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mo}/${yyyy} ${hh}:${mm}`;
}

export function todayBrDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${dd}/${m}/${y}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
