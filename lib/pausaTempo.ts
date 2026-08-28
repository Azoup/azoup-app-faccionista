/** Formata segundos como HH:MM:SS */
export function formatTimerHHMMSS(totalSeconds: number | string | null | undefined): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Máscara de digitação HH:MM:SS (até 6 dígitos). */
export function maskTempoHms(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-6);
  if (!digits) return '';
  const padded = digits.padStart(6, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

/** Máscara HH:MM para hora de início/fim. */
export function maskTempoHm(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-4);
  if (!digits) return '';
  const padded = digits.padStart(4, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
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

/** Data AAAA-MM-DD + hora HH:MM[:SS] → ISO UTC. */
export function combineDateAndTime(dateIso: string, timeHm: string): string | null {
  const day = String(dateIso || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
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

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
