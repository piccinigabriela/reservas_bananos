import { Reserva, Gasto } from '../types';
import { SB_URL, SB_KEY, SB_HDR, SB_TABLE, SB_TABLE_G, CABANAS, DN } from './cabinConfig';

const RESERVA_TEMPLATE = {
  id: '',
  depto: 'C2',
  huesped: '',
  tel: '',
  nac: '',
  checkin: '',
  checkout: '',
  precio: 0,
  pax: 2,
  plus: 0,
  plataforma: 'Directo',
  destino: '',
  estado: 'Confirmada',
  notas: '',
  early: false,
  late: false,
  sena: 0,
  saldo: 0,
  creado: '',
  limpio: false,
  comision: null,
};

function normalizeReserva(r: Partial<Reserva>): any {
  const { icalUid, ...rest } = r;
  return { ...RESERVA_TEMPLATE, ...rest };
}

function rebuildIcalUid(r: any): Reserva {
  if (r.id && typeof r.id === 'string' && r.id.startsWith('ical-') && r.notas && r.notas.includes('Bloqueo iCal')) {
    return { ...r, icalUid: r.id };
  }
  return r;
}

export async function fetchReservas(): Promise<Reserva[]> {
  const localRaw = localStorage.getItem('bn_r');
  const local: Reserva[] = localRaw ? JSON.parse(localRaw).map(rebuildIcalUid) : [];

  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?select=*&order=creado.asc`, {
      headers: SB_HDR,
    });
    if (res.ok) {
      const remoto: any[] = await res.json();
      if (remoto.length === 0 && local.length > 0) {
        console.warn('Supabase devolvió 0 reservas pero hay locales. Conservando local.');
        return local;
      }
      const parsed = remoto.map(rebuildIcalUid);
      localStorage.setItem('bn_r', JSON.stringify(parsed));
      return parsed;
    }
  } catch (err) {
    console.warn('Supabase no disponible, usando localStorage:', err);
  }
  return local;
}

export async function saveReservas(data: Reserva[]): Promise<boolean> {
  const normalized = data.map(normalizeReserva);
  localStorage.setItem('bn_r', JSON.stringify(normalized));

  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method: 'POST',
      headers: {
        ...SB_HDR,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(normalized),
    });

    if (res.ok) {
      // Eliminar registros que ya no existen
      const ids = normalized.map((r: any) => r.id);
      if (ids.length > 0) {
        await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?id=not.in.(${ids.map((id: string) => `"${id}"`).join(',')})`, {
          method: 'DELETE',
          headers: SB_HDR,
        });
      }
      return true;
    }
  } catch (err) {
    console.error('Error guardando en Supabase:', err);
  }
  return false;
}

export async function fetchGastos(): Promise<Gasto[]> {
  const localRaw = localStorage.getItem('bn_g');
  const local: Gasto[] = localRaw ? JSON.parse(localRaw) : [];

  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE_G}?select=*&order=fecha.desc`, {
      headers: SB_HDR,
    });
    if (res.ok) {
      const remoto: Gasto[] = await res.json();
      if (remoto.length === 0 && local.length > 0) {
        return local;
      }
      localStorage.setItem('bn_g', JSON.stringify(remoto));
      return remoto;
    }
  } catch (err) {
    console.warn('Supabase gastos no disponible, usando local:', err);
  }
  return local;
}

export async function saveGastos(data: Gasto[]): Promise<boolean> {
  localStorage.setItem('bn_g', JSON.stringify(data));
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE_G}`, {
      method: 'POST',
      headers: {
        ...SB_HDR,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      if (data.length > 0) {
        const ids = data.map(g => g.id);
        await fetch(`${SB_URL}/rest/v1/${SB_TABLE_G}?id=not.in.(${ids.map(id => `"${id}"`).join(',')})`, {
          method: 'DELETE',
          headers: SB_HDR,
        });
      }
      return true;
    }
  } catch (err) {
    console.error('Error guardando gastos en Supabase:', err);
  }
  return false;
}

// iCal synchronization
export function parseIcal(text: string, plat: string): Array<{ ci: string; co: string; summary: string; uid: string }> {
  const blocks = text.split('BEGIN:VEVENT');
  const events: Array<{ ci: string; co: string; summary: string; uid: string }> = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const getVal = (key: string) => {
      const m = b.match(new RegExp(key + '(?:;[^:]*)?:([^\\r\\n]+)'));
      return m ? m[1].trim() : null;
    };

    const status = getVal('STATUS');
    if (status && status.toUpperCase() === 'CANCELLED') continue;

    const dtstart = getVal('DTSTART');
    const dtend = getVal('DTEND');
    const summary = getVal('SUMMARY') || 'Bloqueado';
    const uid = getVal('UID') || `ical-${Math.random().toString(36).substr(2, 6)}`;

    if (!dtstart || !dtend) continue;

    const parseDate = (s: string) => {
      if (!s) return null;
      const clean = s.split(':').pop()?.replace(/T\d{6}Z?$/, '') || '';
      if (/^\d{8}$/.test(clean)) {
        return `${clean.substr(0, 4)}-${clean.substr(4, 2)}-${clean.substr(6, 2)}`;
      }
      return clean;
    };

    const ci = parseDate(dtstart);
    const co = parseDate(dtend);
    if (!ci || !co) continue;

    if (plat === 'airbnb') {
      const isAuto =
        summary.toLowerCase().includes('not available') ||
        summary.toLowerCase().includes('no disponible') ||
        summary.toLowerCase().includes('bloqueado');
      const isSingleDay = ci === co || new Date(co).getTime() - new Date(ci).getTime() <= 86400000;
      if (isAuto || isSingleDay || co <= today) continue;
    } else {
      if (co <= today) continue;
    }
    events.push({ ci, co, summary, uid });
  }
  return events;
}

export async function syncIcalFeeds(currentReservas: Reserva[]): Promise<{ count: number; updatedReservas: Reserva[] }> {
  const savedUrlsRaw = localStorage.getItem('bn_ical');
  const urls: Record<string, string> = savedUrlsRaw ? JSON.parse(savedUrlsRaw) : {};
  const tasks: Array<{ code: string; url: string; src: string }> = [];

  CABANAS.forEach(code => {
    if (urls['ab_' + code]) tasks.push({ code, url: urls['ab_' + code], src: 'airbnb' });
    if (urls['bk_' + code]) tasks.push({ code, url: urls['bk_' + code], src: 'booking' });
  });

  if (!tasks.length) {
    return { count: 0, updatedReservas: currentReservas };
  }

  const PROXY = 'https://icalproxy.huuventa.workers.dev/?url=';
  let nuevasReservas = [...currentReservas];
  const today = new Date().toISOString().split('T')[0];
  let totalBloqueos = 0;

  for (const t of tasks) {
    try {
      const res = await fetch(PROXY + encodeURIComponent(t.url));
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes('BEGIN:VCALENDAR')) continue;

      const events = parseIcal(text, t.src);
      // Remove old ical blocks for this cabin
      nuevasReservas = nuevasReservas.filter(
        r => !(r.depto === t.code && (r.icalUid || (r.id && r.id.startsWith('ical-' + t.code + '-'))))
      );

      events.forEach(ev => {
        if (ev.co < today) return;
        const exists = nuevasReservas.find(
          r =>
            r.depto === t.code &&
            r.estado !== 'Cancelada' &&
            r.estado !== 'Non show' &&
            r.estado !== 'Devolución' &&
            !(ev.co <= r.checkin || ev.ci >= r.checkout)
        );

        if (!exists || (exists && exists.icalUid)) {
          nuevasReservas.push({
            id: 'ical-' + t.code + '-' + ev.uid.replace(/[^a-z0-9]/gi, '-').substr(0, 20),
            icalUid: ev.uid,
            depto: t.code as any,
            huesped:
              ev.summary.includes('Not available') ||
              ev.summary.includes('Bloqueado') ||
              ev.summary.includes('Airbnb') ||
              ev.summary.includes('Booking')
                ? '🔒 Bloqueado'
                : '🔒 ' + ev.summary,
            tel: '',
            nac: '',
            checkin: ev.ci,
            checkout: ev.co,
            precio: 0,
            pax: 0,
            plus: 0,
            plataforma: t.src === 'booking' ? 'Booking' : 'Airbnb',
            destino: '',
            estado: 'Confirmada',
            notas: 'Bloqueo iCal · ' + t.src,
            early: false,
            late: false,
            sena: 0,
            saldo: 0,
            creado: new Date().toISOString(),
          });
          totalBloqueos++;
        }
      });
    } catch (err) {
      console.warn(`Error en sync de feed ${t.code} ${t.src}:`, err);
    }
  }

  await saveReservas(nuevasReservas);
  return { count: totalBloqueos, updatedReservas: nuevasReservas };
}
