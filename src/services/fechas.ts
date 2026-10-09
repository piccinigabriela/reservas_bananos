// Fechas siempre en hora de Argentina. Antes se usaba toISOString() (UTC),
// y a partir de las 21 h la app ya creía que era "mañana".
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/** YYYY-MM-DD de una fecha en hora argentina. */
export function isoLocal(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
}

/** Hoy (YYYY-MM-DD) en hora argentina. */
export function hoyIso(): string {
  return isoLocal(new Date());
}

/** Suma días a una fecha YYYY-MM-DD sin problemas de zona horaria. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
