import { Reserva, Gasto, VolunteerTask, CabinStatusInfo, CabinCode } from '../types';
import { supabase, tokenActual } from './supabase';
import { esBloqueo } from './reservaUtils';
import { cfg } from './settings';
import { hoyIso } from './fechas';
import { feedsDesdeConfig, parsearIcal, planificarSync, ResultadoFeed, PlanSync } from './icalSync';

/**
 * Capa de datos. Reglas nuevas:
 *  - Supabase es la ÚNICA fuente de verdad.
 *  - Cada cambio se guarda de a UNA fila (antes se re-subía la lista entera en cada cambio
 *    y desde cualquier navegador, pisando o resucitando datos).
 *  - Lo que se guarda en el navegador es solo una copia para mostrar si no hay conexión.
 *    Nunca se sube a la base.
 */

const CACHE_RESERVAS = 'lb_bananos_v2_cache_reservas';

const DB_COLUMNS = [
  'id', 'depto', 'huesped', 'tel', 'nac', 'checkin', 'checkout', 'precio', 'pax', 'plus', 'plataforma',
  'destino', 'estado', 'notas', 'early', 'late', 'sena', 'saldo', 'creado', 'limpio', 'comision',
  'ical_uid', 'origen',
] as const;

const num = (v: unknown, def = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return isNaN(n) ? def : n;
};

export function reservaADb(r: Partial<Reserva>): Record<string, any> {
  let notas = (r.notas || '').trim();
  if (r.moneda === 'USD' && r.plataforma !== 'Airbnb' && !notas.includes('[USD]')) notas = `${notas} [USD]`.trim();
  else if (r.moneda === 'ARS' && r.plataforma === 'Airbnb' && !notas.includes('[ARS]')) notas = `${notas} [ARS]`.trim();
  else if (r.moneda === 'ARS') notas = notas.replace(/\s*\[USD\]/g, '').trim();
  else if (r.moneda === 'USD') notas = notas.replace(/\s*\[ARS\]/g, '').trim();

  const row: Record<string, any> = {
    id: String(r.id || nuevoId('res')),
    depto: r.depto || 'C2',
    huesped: (r.huesped || '').trim(),
    tel: (r.tel || '').trim(),
    nac: (r.nac || '').trim(),
    checkin: r.checkin || '',
    checkout: r.checkout || '',
    precio: num(r.precio),
    pax: parseInt(String(r.pax || 2), 10) || 2,
    plus: num(r.plus),
    plataforma: r.plataforma || 'Directo',
    destino: r.destino || '',
    estado: r.estado || 'Confirmada',
    notas,
    early: Boolean(r.early),
    late: Boolean(r.late),
    sena: num(r.sena),
    saldo: num(r.saldo),
    creado: r.creado || new Date().toISOString(),
    limpio: Boolean(r.limpio),
    comision: r.comision !== undefined && r.comision !== null && !isNaN(Number(r.comision)) ? Number(r.comision) : null,
    ical_uid: r.icalRef || null,
    origen: r.origen || null,
  };
  const limpio: Record<string, any> = {};
  for (const c of DB_COLUMNS) limpio[c] = row[c];
  return limpio;
}

export function reservaDesdeDb(r: any): Reserva {
  const notas = r.notas || '';
  let moneda: 'ARS' | 'USD' = r.plataforma === 'Airbnb' ? 'USD' : 'ARS';
  if (notas.includes('[USD]')) moneda = 'USD';
  else if (notas.includes('[ARS]')) moneda = 'ARS';

  const base: Reserva = {
    ...r,
    precio: num(r.precio),
    plus: num(r.plus),
    pax: parseInt(String(r.pax || 2), 10) || 2,
    sena: num(r.sena),
    saldo: num(r.saldo),
    moneda,
    icalRef: r.ical_uid || undefined,
    origen: r.origen || undefined,
  };
  delete (base as any).ical_uid;
  base.icalUid = esBloqueo(base) ? r.ical_uid || r.id : undefined;
  return base;
}

export function nuevoId(prefijo: string): string {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function errorLegible(error: any): Error {
  const msg = error?.message || String(error);
  if (/row-level security|permission denied|42501/i.test(msg)) {
    return new Error('No tenés permiso para hacer esto con tu usuario.');
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return new Error('Sin conexión. El cambio NO se guardó; probá de nuevo.');
  }
  return new Error(msg);
}

/** Al salir, no dejar datos de huéspedes en el navegador (celulares compartidos). */
export function limpiarCacheLocal() {
  try {
    localStorage.removeItem(CACHE_RESERVAS);
    // Restos de la versión vieja (reservas, gastos, PINs, URLs secretas)
    ['bn_r', 'bn_r_backup_safety', 'bn_g', 'bn_p', 'bn_remembered_user', 'bn_pin_fails', 'bn_pin_lock_until'].forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}

// ---------------------------------------------------------------- Reservas

export async function fetchReservas(): Promise<{ reservas: Reserva[]; sinConexion: boolean }> {
  const { data, error } = await supabase.from('reservas_bananos').select('*').order('checkin', { ascending: true });
  if (error) {
    let cache: Reserva[] = [];
    try {
      cache = JSON.parse(localStorage.getItem(CACHE_RESERVAS) || '[]');
    } catch (_) {}
    if (cache.length) return { reservas: cache, sinConexion: true };
    throw errorLegible(error);
  }
  const reservas = (data || []).map(reservaDesdeDb);
  try {
    localStorage.setItem(CACHE_RESERVAS, JSON.stringify(reservas));
  } catch (_) {}
  return { reservas, sinConexion: false };
}

export async function guardarReserva(r: Partial<Reserva>): Promise<Reserva> {
  const fila = reservaADb(r);
  const { data, error } = await supabase.from('reservas_bananos').upsert(fila, { onConflict: 'id' }).select().single();
  if (error) throw errorLegible(error);
  return reservaDesdeDb(data);
}

export async function insertarReservas(lista: Partial<Reserva>[]): Promise<number> {
  if (!lista.length) return 0;
  const filas = lista.map(reservaADb);
  const { error } = await supabase.from('reservas_bananos').insert(filas);
  if (error) throw errorLegible(error);
  return filas.length;
}

export async function eliminarReserva(id: string): Promise<void> {
  const { error } = await supabase.from('reservas_bananos').delete().eq('id', id);
  if (error) throw errorLegible(error);
}

export async function eliminarReservas(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from('reservas_bananos').delete().in('id', ids);
  if (error) throw errorLegible(error);
}

// ---------------------------------------------------------------- Gastos

export async function fetchGastos(): Promise<Gasto[]> {
  const { data, error } = await supabase.from('gastos_bananos').select('*').order('fecha', { ascending: false });
  if (error) throw errorLegible(error);
  return (data || []).map(g => ({ ...g, monto: num(g.monto) }));
}

export async function guardarGasto(g: Gasto): Promise<void> {
  const { error } = await supabase.from('gastos_bananos').upsert(g, { onConflict: 'id' });
  if (error) throw errorLegible(error);
}

export async function eliminarGasto(id: string): Promise<void> {
  const { error } = await supabase.from('gastos_bananos').delete().eq('id', id);
  if (error) throw errorLegible(error);
}

// ---------------------------------------------------------------- Tareas de voluntarios

export async function fetchTareas(): Promise<VolunteerTask[]> {
  const { data, error } = await supabase.from('bananos_tareas').select('*');
  if (error) throw errorLegible(error);
  return (data || []).map(t => ({
    id: t.id,
    voluntarioId: t.voluntario_id,
    fecha: t.fecha,
    titulo: t.titulo,
    tipo: t.tipo,
    completada: t.completada,
    horario: t.horario || undefined,
    notas: t.notas || undefined,
    depto: t.depto || undefined,
  }));
}

export async function guardarTarea(t: VolunteerTask): Promise<void> {
  const { error } = await supabase.from('bananos_tareas').upsert(
    {
      id: t.id,
      voluntario_id: t.voluntarioId,
      fecha: t.fecha,
      titulo: t.titulo || '',
      tipo: t.tipo || 'otro',
      completada: Boolean(t.completada),
      horario: t.horario || null,
      notas: t.notas || null,
      depto: t.depto || null,
      actualizado: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw errorLegible(error);
}

export async function marcarTarea(id: string, completada: boolean): Promise<void> {
  const { error } = await supabase
    .from('bananos_tareas')
    .update({ completada, actualizado: new Date().toISOString() })
    .eq('id', id);
  if (error) throw errorLegible(error);
}

export async function eliminarTarea(id: string): Promise<void> {
  const { error } = await supabase.from('bananos_tareas').delete().eq('id', id);
  if (error) throw errorLegible(error);
}

// ---------------------------------------------------------------- Semáforo de limpieza

export async function fetchEstadosCabanas(): Promise<Partial<Record<CabinCode, CabinStatusInfo>>> {
  const { data, error } = await supabase.from('bananos_estado_cabanas').select('*');
  if (error) throw errorLegible(error);
  const out: Partial<Record<CabinCode, CabinStatusInfo>> = {};
  (data || []).forEach(e => {
    out[e.depto as CabinCode] = {
      depto: e.depto,
      status: e.status,
      updatedAt: e.updated_at,
      updatedBy: e.updated_by || undefined,
      notas: e.notas || undefined,
    };
  });
  return out;
}

export async function guardarEstadoCabana(info: CabinStatusInfo): Promise<void> {
  const { error } = await supabase.from('bananos_estado_cabanas').upsert(
    {
      depto: info.depto,
      status: info.status,
      updated_at: new Date().toISOString(),
      updated_by: info.updatedBy || null,
      notas: info.notas || null,
    },
    { onConflict: 'depto' }
  );
  if (error) throw errorLegible(error);
}

// ---------------------------------------------------------------- iCal

// La app se publica en GitHub Pages (sin servidor propio). Para leer calendarios externos
// sin problemas de CORS se usa el worker de Cloudflare de la cuenta (icalproxy). Si algún día
// la app corre con el servidor Express, primero se intenta /api/fetch-ical (requiere sesión).
const PROXY_ICAL = 'https://icalproxy.huuventa.workers.dev/?url=';

const ES_ICAL_PERMITIDO = (u: string) => {
  try {
    const h = new URL(u).hostname;
    return ['calendar.google.com', 'airbnb.com', 'airbnb.com.ar', 'airbnb.com.br', 'airbnb.es', 'booking.com'].some(d => h === d || h.endsWith('.' + d));
  } catch {
    return false;
  }
};

/** Descarga un .ics (Google Calendar, Airbnb o Booking). */
export async function fetchIcalFromUrl(url: string): Promise<string> {
  const limpia = url.trim();
  if (!limpia) throw new Error('URL vacía');
  if (!/^https:\/\//i.test(limpia) || !ES_ICAL_PERMITIDO(limpia)) {
    throw new Error('Solo se aceptan calendarios de Google Calendar, Airbnb o Booking (https).');
  }

  // 1) Servidor propio, si existe
  try {
    const token = await tokenActual();
    const res = await fetch(`/api/fetch-ical?url=${encodeURIComponent(limpia)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const texto = await res.text();
      if (texto.includes('BEGIN:VCALENDAR')) return texto;
    }
  } catch (_) {}

  // 2) Worker de Cloudflare (GitHub Pages)
  try {
    const res = await fetch(PROXY_ICAL + encodeURIComponent(limpia));
    if (res.ok) {
      const texto = await res.text();
      if (texto.includes('BEGIN:VCALENDAR')) return texto;
    }
  } catch (_) {}

  throw new Error('No se pudo leer el calendario. Verificá que sea la "Dirección secreta en formato iCal" (termina en .ics) y que siga vigente.');
}

export interface ResumenSync {
  creados: number;
  actualizados: number;
  borrados: number;
  sinCabana: PlanSync['sinCabana'];
  feedsConError: string[];
  feeds: number;
}

/**
 * Sincroniza todos los feeds configurados contra la base.
 * Siempre parte de los datos frescos de Supabase (no de lo que haya en pantalla).
 */
export async function sincronizarIcal(): Promise<ResumenSync> {
  const feeds = feedsDesdeConfig(cfg<Record<string, string>>('ical_urls', {}));
  if (!feeds.length) return { creados: 0, actualizados: 0, borrados: 0, sinCabana: [], feedsConError: [], feeds: 0 };

  const hoy = hoyIso();
  const resultados: ResultadoFeed[] = await Promise.all(
    feeds.map(async feed => {
      try {
        const texto = await fetchIcalFromUrl(feed.url);
        return { feed, eventos: parsearIcal(texto, feed.fuente, hoy) };
      } catch (e: any) {
        return { feed, eventos: null, error: e?.message };
      }
    })
  );

  const { reservas, sinConexion } = await fetchReservas();
  if (sinConexion) throw new Error('Sin conexión con la base: no se sincronizó nada.');

  const plan = planificarSync(reservas, resultados, hoy);

  if (plan.upserts.length) {
    const filas = plan.upserts.map(reservaADb);
    const { error } = await supabase.from('reservas_bananos').upsert(filas, { onConflict: 'id' });
    if (error) throw errorLegible(error);
  }
  if (plan.borrar.length) await eliminarReservas(plan.borrar);

  return {
    creados: plan.creados,
    actualizados: plan.actualizados,
    borrados: plan.borrar.length,
    sinCabana: plan.sinCabana,
    feedsConError: plan.feedsConError,
    feeds: feeds.length,
  };
}

// ---------------------------------------------------------------- Público (sin login)

/** Cabañas ocupadas en un rango, sin datos personales (para la landing). */
export async function fetchOcupadas(desde: string, hasta: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('bananos_ocupadas', { p_desde: desde, p_hasta: hasta });
  if (error) throw errorLegible(error);
  return (data || []).map((r: any) => r.depto);
}

export async function fetchInfoPublica(): Promise<{ guia: Record<string, any>; xenia: Record<string, any> }> {
  const { data, error } = await supabase.rpc('bananos_info_publica');
  if (error) throw errorLegible(error);
  return { guia: data?.guia || {}, xenia: data?.xenia || {} };
}
