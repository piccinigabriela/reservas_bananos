import { Reserva, CabinCode } from '../types';
import { CABANAS } from './cabinConfig';
import { cleanGuestName } from './calendarImportParser';
import { esBloqueo, estaActiva, nombreClave, seSuperponen } from './reservaUtils';

/**
 * Sincronización iCal SIN duplicados.
 *
 * Reglas:
 *  1. Cada evento externo tiene un ID estable que NO incluye la cabaña: ical-<fuente>-<hash(uid)>.
 *     Si Fer mueve el evento de C5 a C8 en Google Calendar, se ACTUALIZA la misma fila.
 *  2. Las filas viejas (formato ical-C5-<uid recortado>) se reconocen y se reutilizan o se borran.
 *  3. Lo que la sincronización borra, se borra de verdad en Supabase (antes solo se borraba en pantalla).
 *  4. Solo se crean/borran BLOQUEOS automáticos. Nunca se toca una reserva cargada por una persona.
 *  5. Si un feed falla, no se borra nada de ese feed.
 */

export type Fuente = 'airbnb' | 'booking' | 'google';

export interface Feed {
  origen: string; // 'airbnb:C5' | 'booking:C7' | 'google:C2' | 'google:general'
  fuente: Fuente;
  cabana: CabinCode | 'general';
  url: string;
}

export interface EventoIcal {
  uid: string;
  ci: string;
  co: string;
  summary: string;
}

export interface ResultadoFeed {
  feed: Feed;
  eventos: EventoIcal[] | null; // null = no se pudo leer
  error?: string;
}

export interface PlanSync {
  upserts: Reserva[];
  borrar: string[];
  sinCabana: Array<{ feed: string; evento: EventoIcal }>;
  creados: number;
  actualizados: number;
  feedsConError: string[];
}

export function feedsDesdeConfig(urls: Record<string, string>): Feed[] {
  const feeds: Feed[] = [];
  const add = (fuente: Fuente, cabana: CabinCode | 'general', url?: string) => {
    if (url && /^https?:\/\//i.test(url.trim())) {
      feeds.push({ origen: `${fuente}:${cabana}`, fuente, cabana, url: url.trim() });
    }
  };
  CABANAS.forEach(code => {
    add('airbnb', code, urls['ab_' + code]);
    add('booking', code, urls['bk_' + code]);
    add('google', code, urls['gc_' + code]);
  });
  add('google', 'general', urls['gc_general']);
  return feeds;
}

/** Hash FNV-1a de 64 bits en base36: ID corto, estable y sin caracteres raros. */
export function hashUid(uid: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < uid.length; i++) {
    h ^= BigInt(uid.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(36);
}

export function idEstable(fuente: Fuente, uid: string): string {
  return `ical-${fuente}-${hashUid(uid)}`;
}

/** Clave con la que la versión anterior armaba el ID: ical-<cabaña>-<uid recortado a 20>. */
export function claveLegada(uid: string): string {
  return uid.replace(/[^a-z0-9]/gi, '-').substr(0, 20);
}

/**
 * Cabaña según el TÍTULO del evento de Google. Más estricto que el detector del importador:
 * la cabaña tiene que estar al principio ("C5 María", "C6miguel", "Cabaña 3 …", "5 Noelia")
 * o ser el jacuzzi/spa (C7). "Juan 2 noches" ya NO cae en C2.
 */
export function cabanaDelTitulo(titulo: string): CabinCode | null {
  const t = (titulo || '').trim().toLowerCase();
  const m = /^(?:cabañas?|cab\.?|casa|depto|c)\s*[-_.]?\s*([1-9])(?!\d)/.exec(t) || /^([2356789])(?=\s*[a-záéíóúñx])/.exec(t);
  if (m) {
    const mapa: Record<string, CabinCode> = { '1': 'C2', '2': 'C2', '3': 'C3', '4': 'C5', '5': 'C5', '6': 'C6', '7': 'C7', '8': 'C8', '9': 'C9' };
    const n = m[1];
    if (n === '1' || n === '4') return null; // cabañas históricas: mejor que lo revise una persona
    return mapa[n] || null;
  }
  if (/\b(jacuzzi|spa)\b/.test(t)) return 'C7';
  return null;
}

function coincideLegado(r: Reserva, uid: string): boolean {
  const m = /^ical-(C\d|SA_[a-z]+)-(.+)$/.exec(r.id);
  return !!m && m[2] === claveLegada(uid);
}

export function parsearIcal(texto: string, fuente: Fuente, hoy: string): EventoIcal[] {
  const desplegado = texto.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const bloques = desplegado.split('BEGIN:VEVENT');
  const eventos: EventoIcal[] = [];

  for (let i = 1; i < bloques.length; i++) {
    const b = bloques[i].split('END:VEVENT')[0];
    const val = (clave: string): string | null => {
      const m = b.match(new RegExp(`^${clave}(?:;[^:\\r\\n]*)?:(.*)$`, 'm'));
      return m ? m[1].trim().replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ') : null;
    };
    const status = val('STATUS');
    if (status && status.toUpperCase() === 'CANCELLED') continue;

    const fecha = (s: string | null) => {
      if (!s) return null;
      const limpio = s.replace(/T\d{6}Z?$/, '');
      return /^\d{8}$/.test(limpio) ? `${limpio.slice(0, 4)}-${limpio.slice(4, 6)}-${limpio.slice(6, 8)}` : null;
    };
    const ci = fecha(val('DTSTART'));
    const co = fecha(val('DTEND'));
    const uid = val('UID');
    const summary = val('SUMMARY') || 'Bloqueado';
    if (!ci || !co || !uid || co <= ci) continue;
    if (co <= hoy) continue; // ya terminó

    if (fuente === 'airbnb') {
      const s = summary.toLowerCase();
      const esBloqueoManual = s.includes('not available') || s.includes('no disponible') || s.includes('bloqueado');
      if (esBloqueoManual) continue; // Airbnb exporta como "Not available" fechas bloqueadas, no reservas
    }
    eventos.push({ uid, ci, co, summary });
  }
  return eventos;
}

function datosBloqueo(feed: Feed, ev: EventoIcal, cabana: CabinCode) {
  const s = ev.summary;
  const generico = /not available|bloqueado|no disponible|^reserved$|^closed/i.test(s.trim());
  let huesped = '🔒 Bloqueado';
  if (!generico) {
    const nombre = feed.cabana === 'general' ? cleanGuestName(s) || s : s;
    huesped = nombre.startsWith('🔒') ? nombre : `🔒 ${nombre}`;
  } else if (/^reserved$/i.test(s.trim())) {
    huesped = '🔒 Reserved';
  }
  let plataforma = feed.fuente === 'booking' ? 'Booking' : feed.fuente === 'airbnb' ? 'Airbnb' : 'Google';
  if (/airbnb|\barb\b/i.test(s)) plataforma = 'Airbnb';
  if (/booking|\bboo\b/i.test(s)) plataforma = 'Booking';
  return {
    depto: cabana,
    huesped,
    checkin: ev.ci,
    checkout: ev.co,
    plataforma,
    notas: `Bloqueo iCal · ${feed.origen} · ${s}`.slice(0, 300),
    origen: feed.origen,
    icalRef: ev.uid,
  };
}

/** De qué calendario vino un bloqueo creado por la versión vieja (null = no se sabe). */
export function fuenteLegada(r: Pick<Reserva, 'notas' | 'plataforma'>): Fuente | null {
  const n = (r.notas || '').toLowerCase();
  if (n.includes('google calendar')) return 'google';
  if (n.includes('bloqueo ical · airbnb')) return 'airbnb';
  if (n.includes('bloqueo ical · booking')) return 'booking';
  return null;
}

/**
 * Decide qué crear, actualizar y borrar. Función pura (se testea sin red ni base).
 */
export function planificarSync(reservas: Reserva[], resultados: ResultadoFeed[], hoy: string): PlanSync {
  const porId = new Map(reservas.map(r => [r.id, { ...r }]));
  const upserts = new Map<string, Reserva>();
  const borrar = new Set<string>();
  const usadas = new Set<string>(); // filas respaldadas por algún evento vigente
  const sinCabana: PlanSync['sinCabana'] = [];
  const feedsConError: string[] = [];
  let creados = 0;
  let actualizados = 0;

  const vivas = () => Array.from(porId.values()).filter(r => !borrar.has(r.id));

  /**
   * ¿Ya hay una reserva cargada por una persona que representa este evento, EN ESA CABAÑA?
   * Si el mismo huésped está cargado en OTRA cabaña, no cuenta: se crea el bloqueo igual y
   * el calendario lo marca como "mismo huésped en otra cabaña" para que alguien decida.
   * (Antes eso hacía desaparecer el bloqueo y la cabaña de Google quedaba como libre.)
   */
  const cubiertoPorReal = (cabana: CabinCode, ev: EventoIcal, nombre: string) =>
    vivas().some(
      r =>
        !esBloqueo(r) &&
        estaActiva(r) &&
        r.depto === cabana &&
        ((r.checkin === ev.ci && r.checkout === ev.co) ||
          (seSuperponen(r, { checkin: ev.ci, checkout: ev.co }) && nombre && nombreClave(r.huesped) === nombre))
    );

  /** ¿Ya hay otro bloqueo con exactamente esas fechas en esa cabaña (de otro feed)? */
  const cubiertoPorOtroBloqueo = (cabana: CabinCode, ev: EventoIcal, excluir: Set<string>) =>
    vivas().some(r => esBloqueo(r) && !excluir.has(r.id) && estaActiva(r) && r.depto === cabana && r.checkin === ev.ci && r.checkout === ev.co);

  for (const res of resultados) {
    const { feed, eventos } = res;
    if (!eventos) {
      feedsConError.push(feed.origen);
      continue;
    }
    const usadasEnFeed = new Set<string>();

    for (const ev of eventos) {
      const idNuevo = idEstable(feed.fuente, ev.uid);
      const coincidencias = vivas().filter(
        r => r.id === idNuevo || (r.icalRef === ev.uid && (!r.origen || r.origen.split(':')[0] === feed.fuente)) || coincideLegado(r, ev.uid)
      );

      // Cabaña destino
      let cabana: CabinCode | null = null;
      if (feed.cabana !== 'general') {
        cabana = feed.cabana;
      } else {
        cabana = cabanaDelTitulo(ev.summary);
      }

      const reales = coincidencias.filter(r => !esBloqueo(r));
      const bloqueos = coincidencias.filter(r => esBloqueo(r));

      // a) El evento ya fue convertido en reserva real: los bloqueos sobran
      if (reales.length > 0) {
        reales.forEach(r => {
          usadas.add(r.id);
          usadasEnFeed.add(r.id);
        });
        bloqueos.forEach(b => borrar.add(b.id));
        continue;
      }

      if (!cabana) {
        // Sin cabaña detectable: si ya existía un bloqueo, se respeta su cabaña actual
        if (bloqueos.length > 0) {
          cabana = bloqueos[0].depto as CabinCode;
        } else {
          sinCabana.push({ feed: feed.origen, evento: ev });
          continue;
        }
      }

      const datos = datosBloqueo(feed, ev, cabana);
      const nombre = nombreClave(datos.huesped);

      // b) Ya hay una reserva real que representa lo mismo: no hace falta bloqueo
      if (cubiertoPorReal(cabana, ev, nombre)) {
        bloqueos.forEach(b => borrar.add(b.id));
        continue;
      }

      if (bloqueos.length > 0) {
        // c) Reutilizar UNA fila y borrar las copias (ej: Flávio en C5 y en C8)
        const conservar = bloqueos.find(b => b.id === idNuevo) || bloqueos.find(b => b.depto === cabana) || bloqueos[0];
        bloqueos.filter(b => b.id !== conservar.id).forEach(b => borrar.add(b.id));
        const actualizado: Reserva = { ...conservar, ...datos, estado: conservar.estado === 'Cancelada' ? 'Confirmada' : conservar.estado };
        const cambio =
          conservar.depto !== actualizado.depto ||
          conservar.checkin !== actualizado.checkin ||
          conservar.checkout !== actualizado.checkout ||
          conservar.huesped !== actualizado.huesped ||
          conservar.icalRef !== actualizado.icalRef ||
          conservar.origen !== actualizado.origen;
        if (cambio) {
          upserts.set(actualizado.id, actualizado);
          porId.set(actualizado.id, actualizado);
          actualizados++;
        }
        usadas.add(conservar.id);
        usadasEnFeed.add(conservar.id);
        continue;
      }

      // d) Evento nuevo
      if (cubiertoPorOtroBloqueo(cabana, ev, new Set())) continue;
      const nueva: Reserva = {
        id: idNuevo,
        ...datos,
        tel: '',
        nac: '',
        precio: 0,
        pax: 2,
        plus: 0,
        destino: '',
        estado: 'Confirmada',
        early: false,
        late: false,
        sena: 0,
        saldo: 0,
        creado: new Date().toISOString(),
        icalUid: ev.uid,
      } as Reserva;
      upserts.set(nueva.id, nueva);
      porId.set(nueva.id, nueva);
      usadas.add(nueva.id);
      usadasEnFeed.add(nueva.id);
      creados++;
    }

    // Bloqueos de ESTE feed que ya no están en el calendario externo → se borran (solo futuros)
    vivas()
      .filter(r => esBloqueo(r) && r.origen === feed.origen && !usadasEnFeed.has(r.id) && !usadas.has(r.id) && r.checkout > hoy)
      .forEach(r => borrar.add(r.id));
  }

  // Bloqueos viejos SIN origen: se limpian solo si el calendario del que vinieron
  // está configurado y se leyó bien. Si ese calendario no está cargado (o no se sabe
  // de dónde vino el bloqueo), se deja: puede ser una reserva real anotada en Google.
  if (feedsConError.length === 0) {
    const leidos = new Set(resultados.filter(x => x.eventos).map(x => x.feed.origen));
    vivas()
      .filter(r => esBloqueo(r) && !usadas.has(r.id) && r.checkout > hoy && !r.origen)
      .filter(r => {
        const fuente = fuenteLegada(r);
        if (!fuente) return false;
        if (fuente === 'google') return leidos.has('google:general') || leidos.has(`google:${r.depto}`);
        return leidos.has(`${fuente}:${r.depto}`);
      })
      .forEach(r => borrar.add(r.id));
  }

  // Seguridad: jamás borrar algo que no sea un bloqueo automático
  const borrarFinal = Array.from(borrar).filter(id => {
    const r = reservas.find(x => x.id === id);
    return r && esBloqueo(r);
  });
  borrarFinal.forEach(id => upserts.delete(id));

  return { upserts: Array.from(upserts.values()), borrar: borrarFinal, sinCabana, creados, actualizados, feedsConError };
}
