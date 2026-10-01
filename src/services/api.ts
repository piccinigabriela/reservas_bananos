import { Reserva, Gasto } from '../types';
import { SB_URL, SB_KEY, SB_HDR, SB_TABLE, SB_TABLE_G, CABANAS, DN } from './cabinConfig';

// Exact columns present in the Supabase 'reservas_bananos' table
const DB_COLUMNS = [
  'id',
  'depto',
  'huesped',
  'tel',
  'nac',
  'checkin',
  'checkout',
  'precio',
  'pax',
  'plus',
  'plataforma',
  'destino',
  'estado',
  'notas',
  'early',
  'late',
  'sena',
  'saldo',
  'creado',
  'limpio',
  'comision',
] as const;

function sanitizeReservaForDb(r: Partial<Reserva>): Record<string, any> {
  const precio = typeof r.precio === 'number' ? r.precio : (parseFloat(String(r.precio)) || 0);
  const plus = typeof r.plus === 'number' ? r.plus : (parseFloat(String(r.plus)) || 0);
  const pax = parseInt(String(r.pax || 2), 10) || 2;
  const sena = typeof r.sena === 'number' ? r.sena : (parseFloat(String(r.sena)) || 0);
  const saldo = typeof r.saldo === 'number' ? r.saldo : (parseFloat(String(r.saldo)) || 0);
  const comision = r.comision !== undefined && r.comision !== null && !isNaN(Number(r.comision)) ? Number(r.comision) : null;

  // Preserve custom currency in notas if it differs from the platform default
  let notas = (r.notas || '').trim();
  if (r.moneda === 'USD' && r.plataforma !== 'Airbnb' && !notas.includes('[USD]')) {
    notas = `${notas} [USD]`.trim();
  } else if (r.moneda === 'ARS' && r.plataforma === 'Airbnb' && !notas.includes('[ARS]')) {
    notas = `${notas} [ARS]`.trim();
  }

  const row: Record<string, any> = {
    id: String(r.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 4))),
    depto: r.depto || 'C2',
    huesped: (r.huesped || '').trim(),
    tel: (r.tel || '').trim(),
    nac: (r.nac || '').trim(),
    checkin: r.checkin || '',
    checkout: r.checkout || '',
    precio: isNaN(precio) ? 0 : precio,
    pax: pax,
    plus: isNaN(plus) ? 0 : plus,
    plataforma: r.plataforma || 'Directo',
    destino: r.destino || '',
    estado: r.estado || 'Confirmada',
    notas: notas,
    early: Boolean(r.early),
    late: Boolean(r.late),
    sena: isNaN(sena) ? 0 : sena,
    saldo: isNaN(saldo) ? 0 : saldo,
    creado: r.creado || new Date().toISOString(),
    limpio: Boolean(r.limpio),
    comision: comision,
  };

  // Ensure ONLY valid Supabase columns are present in the object sent to Postgres
  const cleanRow: Record<string, any> = {};
  for (const col of DB_COLUMNS) {
    cleanRow[col] = row[col];
  }
  return cleanRow;
}

function parseReservaFromDb(r: any): Reserva {
  const notas = r.notas || '';
  let moneda: 'ARS' | 'USD' = r.plataforma === 'Airbnb' ? 'USD' : 'ARS';
  if (notas.includes('[USD]')) {
    moneda = 'USD';
  } else if (notas.includes('[ARS]')) {
    moneda = 'ARS';
  }

  const precio = typeof r.precio === 'number' ? r.precio : (parseFloat(String(r.precio)) || 0);
  const plus = typeof r.plus === 'number' ? r.plus : (parseFloat(String(r.plus)) || 0);
  const pax = parseInt(String(r.pax || 2), 10) || 2;
  const sena = typeof r.sena === 'number' ? r.sena : (parseFloat(String(r.sena)) || 0);
  const saldo = typeof r.saldo === 'number' ? r.saldo : (parseFloat(String(r.saldo)) || 0);

  const isLockPlaceholder = 
    typeof r.id === 'string' && 
    r.id.startsWith('ical-') && 
    notas.includes('Bloqueo iCal') && 
    precio === 0 && 
    (!r.huesped || r.huesped.startsWith('🔒') || r.huesped.toLowerCase().includes('bloqueado') || r.huesped.toLowerCase().includes('not available'));

  return {
    ...r,
    precio: isNaN(precio) ? 0 : precio,
    plus: isNaN(plus) ? 0 : plus,
    pax: pax,
    sena: isNaN(sena) ? 0 : sena,
    saldo: isNaN(saldo) ? 0 : saldo,
    moneda: r.moneda || moneda,
    icalUid: isLockPlaceholder ? r.id : undefined,
  };
}

export async function fetchReservas(): Promise<Reserva[]> {
  const localRaw = localStorage.getItem('bn_r');
  const local: Reserva[] = localRaw ? JSON.parse(localRaw).map(parseReservaFromDb) : [];

  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?select=*&order=creado.asc`, {
      headers: SB_HDR,
    });
    if (res.ok) {
      const remoto: any[] = await res.json();
      const parsedRemoto = remoto.map(parseReservaFromDb);

      // Smart Merge: Nunca pisar reservas creadas localmente que aún no hayan impactado en remoto
      const remoteIds = new Set(parsedRemoto.map(r => r.id));
      const localUnsynced = local.filter(l => !remoteIds.has(l.id) && !l.id.startsWith('ical-'));

      let finalReservas = parsedRemoto;
      if (localUnsynced.length > 0) {
        console.log(`Detectadas ${localUnsynced.length} reservas locales pendientes de sincronizar con Supabase. Preservando y guardando.`);
        finalReservas = [...parsedRemoto, ...localUnsynced];
        // Enviar a Supabase para persistir definitivamente
        saveReservas(finalReservas).catch(err => console.warn('Error sincronizando reservas locales a Supabase:', err));
      }

      localStorage.setItem('bn_r', JSON.stringify(finalReservas));
      try {
        localStorage.setItem('bn_r_backup_safety', JSON.stringify(finalReservas));
      } catch (_) {}

      return finalReservas;
    }
  } catch (err) {
    console.warn('Supabase no disponible, usando localStorage:', err);
  }
  return local;
}

export async function saveReservas(data: Reserva[]): Promise<boolean> {
  // Always save complete state to localStorage for offline reliability and immediate UI responsiveness
  localStorage.setItem('bn_r', JSON.stringify(data));
  try {
    localStorage.setItem('bn_r_backup_safety', JSON.stringify(data));
  } catch (_) {}

  // Sanitize exact payload for Supabase database table
  const dbPayload = data.map(sanitizeReservaForDb);

  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method: 'POST',
      headers: {
        ...SB_HDR,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(dbPayload),
    });

    if (res.ok) {
      return true;
    } else {
      const errText = await res.text();
      console.error('Error guardando en Supabase reservas (status ' + res.status + '):', errText);
    }
  } catch (err) {
    console.error('Error de red guardando en Supabase:', err);
  }
  return false;
}

// Eliminación puntual y segura de una única reserva (NUNCA borra en bloque)
export async function deleteReservaFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: SB_HDR,
    });
    return res.ok;
  } catch (err) {
    console.error('Error eliminando reserva en Supabase:', err);
    return false;
  }
}

// Limpieza total explícita (solo cuando el usuario escribe "BORRAR" en el modal)
export async function clearAllReservasFromDb(): Promise<boolean> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?id=neq.placeholder_none`, {
      method: 'DELETE',
      headers: SB_HDR,
    });
    return res.ok;
  } catch (err) {
    console.error('Error vaciando reservas en Supabase:', err);
    return false;
  }
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
    return res.ok;
  } catch (err) {
    console.error('Error guardando gastos en Supabase:', err);
  }
  return false;
}

// Eliminación puntual y segura de un único gasto
export async function deleteGastoFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TABLE_G}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: SB_HDR,
    });
    return res.ok;
  } catch (err) {
    console.error('Error eliminando gasto en Supabase:', err);
    return false;
  }
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

/**
 * Descarga el contenido iCal (.ics) desde una URL (Google Calendar, Airbnb, Booking)
 * usando el backend proxy para evitar restricciones CORS
 */
export async function fetchIcalFromUrl(targetUrl: string): Promise<string> {
  const cleanUrl = targetUrl.trim();
  if (!cleanUrl) throw new Error('URL vacía');

  // 1. Probar primero el endpoint local del servidor Express
  try {
    const res = await fetch(`/api/fetch-ical?url=${encodeURIComponent(cleanUrl)}`);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('BEGIN:VCALENDAR')) return text;
    }
  } catch (e) {
    console.warn('Fallo proxy local /api/fetch-ical, intentando alternativo:', e);
  }

  // 2. Fallback a proxy Cloudflare Worker
  try {
    const proxyUrl = `https://icalproxy.huuventa.workers.dev/?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('BEGIN:VCALENDAR')) return text;
    }
  } catch (e) {
    console.warn('Fallo proxy secundario Cloudflare:', e);
  }

  // 3. Intento directo
  try {
    const res = await fetch(cleanUrl);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('BEGIN:VCALENDAR')) return text;
    }
  } catch (e) {
    console.warn('Fallo fetch directo:', e);
  }

  throw new Error('No se pudo obtener el calendario desde la URL provista. Verificá que el enlace sea una "Dirección secreta en formato iCal" válida que termine en .ics');
}

export async function syncIcalFeeds(currentReservas: Reserva[]): Promise<{ count: number; updatedReservas: Reserva[] }> {
  const savedUrlsRaw = localStorage.getItem('bn_ical');
  const urls: Record<string, string> = savedUrlsRaw ? JSON.parse(savedUrlsRaw) : {};
  const tasks: Array<{ code: string; url: string; src: string }> = [];

  CABANAS.forEach(code => {
    if (urls['ab_' + code]) tasks.push({ code, url: urls['ab_' + code], src: 'airbnb' });
    if (urls['bk_' + code]) tasks.push({ code, url: urls['bk_' + code], src: 'booking' });
    if (urls['gc_' + code]) tasks.push({ code, url: urls['gc_' + code], src: 'google' });
  });

  if (urls['gc_general']) {
    tasks.push({ code: 'general', url: urls['gc_general'], src: 'google' });
  }

  if (!tasks.length) {
    return { count: 0, updatedReservas: currentReservas };
  }

  let nuevasReservas = [...currentReservas];
  const today = new Date().toISOString().split('T')[0];
  let totalBloqueos = 0;

  for (const t of tasks) {
    try {
      const text = await fetchIcalFromUrl(t.url);
      if (!text.includes('BEGIN:VCALENDAR')) continue;

      const events = parseIcal(text, t.src);
      // Remove ONLY unpriced lock placeholders for this cabin (never touch reservations with guest names, prices, or user edits)
      nuevasReservas = nuevasReservas.filter(r => {
        if (t.code !== 'general' && r.depto !== t.code) return true;
        const isSyntheticLock = 
          (r.icalUid || (r.id && r.id.startsWith('ical-'))) &&
          (!r.precio || r.precio === 0) &&
          (!r.huesped || r.huesped.startsWith('🔒') || r.huesped.toLowerCase().includes('bloqueado') || r.huesped.toLowerCase().includes('not available'));
        return !isSyntheticLock;
      });

      events.forEach(ev => {
        if (ev.co < today) return;
        const targetCabin = t.code === 'general' ? 'C2' : t.code;
        const conflict = nuevasReservas.find(
          r =>
            r.depto === targetCabin &&
            r.estado !== 'Cancelada' &&
            r.estado !== 'Non show' &&
            r.estado !== 'Devolución' &&
            !(ev.co <= r.checkin || ev.ci >= r.checkout)
        );

        // Only create an automated lock if there is no confirmed/priced reservation occupying those dates
        if (!conflict) {
          nuevasReservas.push({
            id: 'ical-' + targetCabin + '-' + ev.uid.replace(/[^a-z0-9]/gi, '-').substr(0, 20),
            icalUid: ev.uid,
            depto: targetCabin as any,
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
            pax: 2,
            plus: 0,
            plataforma: t.src === 'booking' ? 'Booking' : t.src === 'airbnb' ? 'Airbnb' : 'Google',
            destino: '',
            estado: 'Confirmada',
            notas: 'Bloqueo iCal · ' + (t.src === 'google' ? 'Google Calendar' : t.src),
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
