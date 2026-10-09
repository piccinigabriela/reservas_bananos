import { Reserva } from '../types';

export const ESTADOS_INACTIVOS = ['Cancelada', 'Non show', 'Devolución'];

export function estaActiva(r: Pick<Reserva, 'estado'>): boolean {
  return !ESTADOS_INACTIVOS.includes(r.estado);
}

/** ¿Es un bloqueo automático creado por la sincronización (no una reserva cargada por alguien)? */
export function esBloqueo(r: Pick<Reserva, 'id' | 'precio' | 'huesped'>): boolean {
  if (!r.id || !r.id.startsWith('ical-')) return false;
  if (r.precio && r.precio > 0) return false;
  const h = (r.huesped || '').trim().toLowerCase();
  return !h || h.startsWith('🔒') || h.includes('bloqueado') || h.includes('not available') || h === 'reserved';
}

export function seSuperponen(a: { checkin: string; checkout: string }, b: { checkin: string; checkout: string }): boolean {
  return a.checkin < b.checkout && b.checkin < a.checkout;
}

/** Nombre normalizado para comparar huéspedes ("🔒 Flávio Ar1710" → "flavio"). */
export function nombreClave(nombre: string): string {
  return (nombre || '')
    .replace(/^🔒\s*/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\b(x\d+|reserved|bloqueado|not available|cabana|cab|c\d)\b/g, ' ')
    .trim()
    .split(/\s+/)[0] || '';
}

export interface Conflicto {
  tipo: 'misma_cabana' | 'mismo_huesped_otra_cabana';
  a: Reserva;
  b: Reserva;
}

/** Superposiciones en la misma cabaña y huéspedes repetidos en otra cabaña con las mismas fechas. */
export function detectarConflictos(reservas: Reserva[], desdeIso: string): Conflicto[] {
  const activas = reservas.filter(r => estaActiva(r) && r.checkout >= desdeIso && !r.depto.startsWith('SA_'));
  const out: Conflicto[] = [];
  for (let i = 0; i < activas.length; i++) {
    for (let j = i + 1; j < activas.length; j++) {
      const a = activas[i];
      const b = activas[j];
      if (a.depto === b.depto && seSuperponen(a, b)) {
        out.push({ tipo: 'misma_cabana', a, b });
      } else if (
        a.depto !== b.depto &&
        a.checkin === b.checkin &&
        a.checkout === b.checkout &&
        nombreClave(a.huesped) &&
        nombreClave(a.huesped) === nombreClave(b.huesped)
      ) {
        out.push({ tipo: 'mismo_huesped_otra_cabana', a, b });
      }
    }
  }
  return out;
}
