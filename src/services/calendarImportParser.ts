import { CabinCode, Plataforma, EstadoReserva } from '../types';
import { CABANAS } from './cabinConfig';

export interface ParsedImportItem {
  id: string;
  depto: CabinCode;
  huesped: string;
  tel?: string;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  precio: number;
  plataforma: Plataforma | string;
  estado: EstadoReserva;
  notas: string;
  pax?: number;
  selected: boolean;
  rawSource?: string;
  isUncertainCabin?: boolean;
}

/**
 * Normaliza cualquier formato de fecha a YYYY-MM-DD
 */
export function normalizeDateToIso(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().split(' ')[0].split('T')[0];

  // Formato compacto YYYYMMDD (común en iCal DTSTART:20260710)
  if (/^\d{8}$/.test(clean)) {
    return `${clean.substr(0, 4)}-${clean.substr(4, 2)}-${clean.substr(6, 2)}`;
  }

  // YYYY-MM-DD o YYYY/MM/DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // DD/MM/YYYY o MM/DD/YYYY o DD-MM-YYYY
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const year = parts[2];

    // Si el primer número > 12 es inequívocamente Día (DD/MM/YYYY)
    if (p0 > 12) {
      return `${year}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
    }
    // Si el segundo número > 12 es inequívocamente Día (MM/DD/YYYY)
    if (p1 > 12) {
      return `${year}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Por convención en Argentina / español: DD/MM/YYYY
    return `${year}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Normaliza un string quitando tildes y caracteres especiales para búsqueda de cabeceras
 */
export function normalizeHeaderKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detecta la cabaña desde texto libre o código explícito
 */
export function detectCabinFromText(
  text: string,
  rawCabinVal?: string
): { cabin: CabinCode; isUncertain: boolean } {
  // 1. Si viene columna de cabaña explícita
  if (rawCabinVal) {
    const cleanCol = rawCabinVal.trim().toUpperCase();
    if (cleanCol === 'C2' || cleanCol === '2') return { cabin: 'C2', isUncertain: false };
    if (cleanCol === 'C3' || cleanCol === '3') return { cabin: 'C3', isUncertain: false };
    if (cleanCol === 'C5' || cleanCol === '5') return { cabin: 'C5', isUncertain: false };
    if (cleanCol === 'C6' || cleanCol === '6') return { cabin: 'C6', isUncertain: false };
    if (cleanCol === 'C7' || cleanCol === '7') return { cabin: 'C7', isUncertain: false };
    if (cleanCol === 'C8' || cleanCol === '8') return { cabin: 'C8', isUncertain: false };
    if (cleanCol === 'C9' || cleanCol === '9') return { cabin: 'C9', isUncertain: false };
    // Históricas
    if (cleanCol === 'C4' || cleanCol === '4') return { cabin: 'C5', isUncertain: false };
    if (cleanCol === 'C1' || cleanCol === '1') return { cabin: 'C2', isUncertain: false };

    // Si coincide con alguna de CABANAS
    if (CABANAS.some(c => c.toLowerCase() === cleanCol.toLowerCase())) {
      return { cabin: cleanCol as CabinCode, isUncertain: false };
    }
  }

  const t = (text || '').toLowerCase().trim();

  // 2. Patrones con C o Cabaña o Casa o Depto seguidos del número
  // Ejemplos: "C6miguel", "C5x2 noelia", "C7x2 erica", "C2José", "C3lucioan", "C8x1daniela", "C 9mrie", "Casa 3", "C4candelária"
  const m1 = t.match(/(?:^|[\s,.\-_/(])(?:cabaña|cabañas|cab\.|cab|depto|casa|c)\s*[-_]?\s*([1-9])(?=[^\d]|$)/i);
  if (m1) {
    const num = m1[1];
    if (num === '2') return { cabin: 'C2', isUncertain: false };
    if (num === '3') return { cabin: 'C3', isUncertain: false };
    if (num === '7') return { cabin: 'C7', isUncertain: false };
    if (num === '5') return { cabin: 'C5', isUncertain: false };
    if (num === '6') return { cabin: 'C6', isUncertain: false };
    if (num === '8') return { cabin: 'C8', isUncertain: false };
    if (num === '9') return { cabin: 'C9', isUncertain: false };
    if (num === '4') return { cabin: 'C5', isUncertain: false }; // Histórica C4 -> Tiny C5
    if (num === '1') return { cabin: 'C2', isUncertain: false };
  }

  // 3. Patrón donde empieza con el número directamente: "5 Noelia", "5 Jorge", "3 Mariana", etc.
  const m2 = t.match(/(?:^|[\s,.\-_/(])([2356789])\s+(?=[a-záéíóú])/i);
  if (m2) {
    const num = m2[1];
    if (num === '2') return { cabin: 'C2', isUncertain: false };
    if (num === '3') return { cabin: 'C3', isUncertain: false };
    if (num === '7') return { cabin: 'C7', isUncertain: false };
    if (num === '5') return { cabin: 'C5', isUncertain: false };
    if (num === '6') return { cabin: 'C6', isUncertain: false };
    if (num === '8') return { cabin: 'C8', isUncertain: false };
    if (num === '9') return { cabin: 'C9', isUncertain: false };
  }

  // 4. Por palabras clave
  if (t.includes('jacuzzi') || t.includes('spa')) return { cabin: 'C7', isUncertain: false };
  if (t.includes('big')) return { cabin: 'C2', isUncertain: true };
  if (t.includes('tiny')) return { cabin: 'C5', isUncertain: true };

  // 5. Si no se detectó ninguna cabaña en el texto
  return { cabin: 'C2', isUncertain: true };
}

/**
 * Limpia el nombre del huésped quitando prefijos de cabaña, seña, pax, etc.
 */
export function cleanGuestName(text: string): string {
  if (!text) return 'Huésped';

  let cleaned = text
    // Quitar prefijos de cabaña como "C6miguel" -> "miguel", "C5x2 noelia" -> "x2 noelia"
    .replace(/^(?:cabaña|cabañas|cab\.|cab|depto|casa|c)\s*[-_]?\s*[1-9]\s*/gi, '')
    .replace(/\b(?:cabaña|cabañas|cab\.|cab|depto|casa|c)\s*[-_]?\s*[1-9]\b/gi, '')
    // Si empieza con número seguido de espacio: "5 Noelia" -> "Noelia"
    .replace(/^[1-9]\s+(?=[a-záéíóú])/gi, '')
    // Quitar pax "x2", "x 4", "(3)"
    .replace(/\bx\s*[1-9]\d*\b/gi, '')
    .replace(/\([0-9]+\)/g, '')
    // Quitar montos y señas
    .replace(/\b[0-9]+(?:\.[0-9]+)?\s*mil\b/gi, '')
    .replace(/\b[0-9]+\s*d[oó]lares?\b/gi, '')
    .replace(/\b[0-9]+\s*us\$\b/gi, '')
    .replace(/\b(?:seña|seño|señ|sena|senas|señas|saldo|pago|pagado|pagooo?|falta pagar|por noche|por dia|por d[ií]a|x noche|xnoche|x dia|xdia|x d|xd|total|cancel[oó]|cancelado|afip|flypar|avión|avion|spa|check|chek|ya pago|todo)\b/gi, '')
    // Quitar canales
    .replace(/\b(?:booking|boo|airbnb|arb|airbn|google|voluntario\/?a?|voluntaria|voluntario)\b/gi, '')
    // Quitar números sueltos (montos de seña como 55, 75, 40, etc.)
    .replace(/\b[0-9]{2,6}\b/g, '')
    .replace(/[-–—:|()#$👍👎]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return text.trim() || 'Huésped';

  // Capitalizar cada palabra
  return cleaned
    .split(' ')
    .map(word => (word.length > 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

/**
 * Parsea importes como "164 mil", "25 mil", "180.000", "$50000", etc.
 */
export function parseDetectedPrice(str: string): number {
  if (!str) return 0;
  const s = str.toLowerCase().trim();

  // Patrón "164 mil" o "25mil"
  const milMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*mil\b/);
  if (milMatch) {
    const n = parseFloat(milMatch[1].replace(',', '.'));
    if (!isNaN(n)) return Math.round(n * 1000);
  }

  // Patrón número común
  const cleaned = s.replace(/[$\sarsusd]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  if (!isNaN(n)) return n;

  return 0;
}

/**
 * Determina si una fila corresponde a un evento personal, recuento de noches o tarea,
 * para no importarlo como reserva falsa de cabaña.
 */
export function isPersonalOrTaskEvent(
  title: string,
  desc: string,
  cabinCol: string,
  checkin: string,
  checkout: string
): boolean {
  const full = `${title} ${desc} ${cabinCol}`.toLowerCase();

  // Si tiene cabaña explícita (C2, C3, etc.), es una reserva
  if (cabinCol && /^[cC]?[1-9]$/.test(cabinCol.trim())) {
    return false;
  }

  // Recuentos mensuales de noches (ej: "81N", "154  N", "32 N", "39 N", "46N", "102N", "N 78 36 n", "N137 61f 23m", etc.)
  if (/^\s*(?:n\s*\d+|\d+\s*n)(?:\s+\d+\s*n|\s+[a-z0-9\s]+)*$/i.test(title.trim())) {
    return true;
  }

  // Eventos personales evidentes
  const personalKeywords = [
    'dentista',
    'médico',
    'medico',
    'oculista',
    'sangre',
    'junta médica',
    'junta medica',
    'flight',
    'vuelo',
    'aerolineas',
    'jetsmart',
    'defensoría',
    'defensoria',
    'vacuna',
    'zoom',
    'cumple',
    'graduación',
    'graduacion',
    'pastilla',
    'bomba',
    'técnico',
    'tecnico',
    'seguro',
    'publicidad',
    'mercado pago',
    'mercadopago',
    'heladera',
    'hormigón',
    'hormigon',
    'cerradura',
    'agua ras',
    'soldar',
    'purgar',
    'vidrio',
    'vasos',
    'pintura',
    'tiner',
    'internet',
  ];

  if (personalKeywords.some(kw => full.includes(kw))) {
    return true;
  }

  // Si la fecha de checkin es igual al checkout Y no hay ninguna mención a cabaña
  if (checkin === checkout && !/(?:cabaña|c\s*[1-9]|depto|casa)/i.test(full)) {
    return true;
  }

  return false;
}

/**
 * Parsea un archivo .ics (iCalendar / Google Calendar / Airbnb / Booking)
 */
export function parseIcsContent(icsText: string): ParsedImportItem[] {
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT');
  const results: ParsedImportItem[] = [];

  const calNameMatch = unfolded.match(/X-WR-CALNAME:(?:[^\r\n]+)/);
  const calName = calNameMatch ? calNameMatch[0].replace('X-WR-CALNAME:', '').trim() : '';

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const getVal = (key: string): string | null => {
      const m = block.match(new RegExp(`^${key}(?:;[^:\\r\\n]*)?:(.*)$`, 'm'));
      if (!m) return null;
      let val = m[1].trim();
      val = val.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
      return val;
    };

    const status = getVal('STATUS');
    if (status && status.toUpperCase() === 'CANCELLED') continue;

    const summary = getVal('SUMMARY') || '';
    const dtstart = getVal('DTSTART');
    const dtend = getVal('DTEND');
    const description = getVal('DESCRIPTION') || '';
    const location = getVal('LOCATION') || '';

    if (!dtstart) continue;

    const ci = normalizeDateToIso(dtstart);
    let co = dtend ? normalizeDateToIso(dtend) : null;

    if (!ci) continue;

    // Si es una nota o evento personal, omitirlo
    if (isPersonalOrTaskEvent(summary, description, '', ci, co || ci)) {
      continue;
    }

    if (!co || co <= ci) {
      const d = new Date(ci + 'T12:00:00Z');
      d.setDate(d.getDate() + 1);
      co = d.toISOString().split('T')[0];
    }

    const fullContext = `${calName} ${summary} ${description} ${location}`;
    const { cabin, isUncertain } = detectCabinFromText(fullContext);

    // Canal
    let plat: Plataforma = 'Directo';
    const lower = fullContext.toLowerCase();
    if (lower.includes('airbnb') || lower.includes('arb')) plat = 'Airbnb';
    else if (lower.includes('booking') || lower.includes('boo')) plat = 'Booking';
    else if (lower.includes('google')) plat = 'Google';

    // Teléfono
    let tel = '';
    const telMatch = description.match(/(?:tel|cel|telefono|teléfono|whatsapp|wa|wpp)[:\s]+([+0-9\s\-()]{7,20})/i);
    if (telMatch) tel = telMatch[1].trim();

    // Precio
    const precio = parseDetectedPrice(description);

    // Huésped
    const huesped = cleanGuestName(summary);

    results.push({
      id: `import-ics-${Date.now().toString(36)}-${i}`,
      depto: cabin,
      huesped,
      tel,
      checkin: ci,
      checkout: co,
      precio,
      plataforma: plat,
      estado: 'Confirmada',
      notas: description ? `iCal: ${description.slice(0, 150)}` : 'Importado de Google Calendar (.ics)',
      pax: 2,
      selected: true,
      rawSource: summary,
      isUncertainCabin: isUncertain,
    });
  }

  return results;
}

/**
 * Parsea un archivo CSV (tanto de Google Calendar como de reservas de Los Bananos / Excel)
 */
export function parseCsvContent(csvText: string): ParsedImportItem[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let curVal = '';

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' || c === ';') && !inQuotes) {
      row.push(curVal.trim());
      curVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(curVal.trim());
      curVal = '';
      if (row.some(val => val.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      curVal += c;
    }
  }
  if (curVal.length > 0 || row.length > 0) {
    row.push(curVal.trim());
    if (row.some(val => val.length > 0)) lines.push(row);
  }

  if (lines.length < 2) return [];

  // Normalizar cabeceras quitando acentos y signos
  const rawHeaders = lines[0].map(h => normalizeHeaderKey(h));

  const findCol = (candidates: string[]): number => {
    return rawHeaders.findIndex(h => candidates.some(c => h.includes(c)));
  };

  // Identificación precisa de columnas
  const colCi = findCol(['fechainicio', 'checkin', 'ingreso', 'entrada', 'desde', 'startdate', 'inicio', 'start']);
  const colCo = findCol(['fechafin', 'checkout', 'egreso', 'salida', 'hasta', 'enddate', 'fin', 'end']);
  const colCabin = findCol(['cabana', 'cabaa', 'depto', 'habitacion', 'alojamiento', 'unidad', 'unit', 'room']);
  const colGuest = findCol(['huesped', 'cliente', 'pasajero', 'nombre', 'guest', 'name']);
  const colTitulo = findCol(['titulooriginal', 'titulo', 'summary', 'resumen', 'subject', 'asunto']);
  const colPax = findCol(['personas', 'pax', 'huespedes']);
  const colPlat = findCol(['canal', 'plataforma', 'origen', 'source', 'channel']);
  const colPrecio = findCol(['importedetectado', 'importe', 'precio', 'monto', 'total', 'tarifa', 'valor', 'price', 'amount']);
  const colNotas = findCol(['descripcion', 'notas', 'observaciones', 'detalle', 'notes', 'description']);
  const colEstado = findCol(['estado', 'status']);
  const colTel = findCol(['tel', 'telefono', 'cel', 'celular', 'whatsapp', 'phone']);

  const results: ParsedImportItem[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];

    const rawStart = colCi !== -1 ? row[colCi] : row[0] || '';
    const rawEnd = colCo !== -1 ? row[colCo] : (row[1] || '');
    const rawCabin = colCabin !== -1 ? row[colCabin] || '' : '';
    const rawGuest = colGuest !== -1 ? row[colGuest] || '' : '';
    const rawTitulo = colTitulo !== -1 ? row[colTitulo] || '' : '';
    const rawPax = colPax !== -1 ? row[colPax] || '' : '';
    const rawPlat = colPlat !== -1 ? row[colPlat] || '' : '';
    const rawPrecio = colPrecio !== -1 ? row[colPrecio] || '' : '';
    const rawNotas = colNotas !== -1 ? row[colNotas] || '' : '';
    const rawEstado = colEstado !== -1 ? row[colEstado] || '' : '';
    const rawTel = colTel !== -1 ? row[colTel] || '' : '';

    if (!rawStart && !rawGuest && !rawTitulo) continue;

    const ci = normalizeDateToIso(rawStart);
    let co = normalizeDateToIso(rawEnd);

    if (!ci) continue;

    // Omitir eventos personales y recuentos de noches
    if (isPersonalOrTaskEvent(rawTitulo || rawGuest, rawNotas, rawCabin, ci, co || ci)) {
      continue;
    }

    if (!co || co <= ci) {
      const nextDay = new Date(ci + 'T12:00:00Z');
      nextDay.setDate(nextDay.getDate() + 1);
      co = nextDay.toISOString().split('T')[0];
    }

    // Detectar Cabaña
    const combinedContext = `${rawCabin} ${rawGuest} ${rawTitulo} ${rawNotas}`.trim();
    const { cabin, isUncertain } = detectCabinFromText(combinedContext, rawCabin);

    // Limpiar Huésped
    const guestSource = rawGuest || rawTitulo;
    const huesped = cleanGuestName(guestSource);

    // Detectar Pax
    let pax = 2;
    const pNum = parseInt(rawPax, 10);
    if (!isNaN(pNum) && pNum > 0) {
      pax = pNum;
    } else {
      const paxMatch = combinedContext.match(/\bx\s*([1-9]|1[0-2])\b/i);
      if (paxMatch) {
        pax = parseInt(paxMatch[1], 10);
      }
    }

    // Detectar Canal
    let plat: Plataforma = 'Directo';
    const platSource = `${rawPlat} ${rawGuest} ${rawTitulo}`.toLowerCase();
    if (platSource.includes('airbnb') || platSource.includes('arb') || platSource.includes('airbn')) {
      plat = 'Airbnb';
    } else if (platSource.includes('booking') || platSource.includes('boo')) {
      plat = 'Booking';
    } else if (platSource.includes('google')) {
      plat = 'Google';
    } else if (platSource.includes('instagram')) {
      plat = 'Instagram';
    } else if (platSource.includes('facebook')) {
      plat = 'Facebook';
    }

    // Detectar Precio
    let precio = parseDetectedPrice(rawPrecio);
    if (precio === 0) {
      precio = parseDetectedPrice(combinedContext);
    }

    // Estado
    let estado: EstadoReserva = 'Confirmada';
    const estLow = (rawEstado || '').toLowerCase();
    if (estLow.includes('cancel') || combinedContext.toLowerCase().includes('canceló') || combinedContext.toLowerCase().includes('cancelado')) {
      estado = 'Cancelada';
    } else if (estLow.includes('pend')) {
      estado = 'Pendiente';
    } else if (estLow.includes('stand')) {
      estado = 'Stand by';
    }

    // Notas
    let notas = rawNotas ? rawNotas.trim() : '';
    if (rawPlat && rawPlat.toLowerCase().includes('voluntario')) {
      notas = notas ? `Voluntario/a - ${notas}` : 'Voluntario/a';
    }

    results.push({
      id: `import-csv-${Date.now().toString(36)}-${r}`,
      depto: cabin,
      huesped,
      tel: rawTel.replace(/"/g, '').trim(),
      checkin: ci,
      checkout: co,
      precio,
      plataforma: plat,
      estado,
      notas: notas || `Importado vía CSV (${rawTitulo || ''})`.trim(),
      pax,
      selected: true,
      rawSource: rawTitulo || rawGuest,
      isUncertainCabin: isUncertain,
    });
  }

  return results;
}

/**
 * Mapeo de nombres de meses en español
 */
const SPANISH_MONTHS: Record<string, string> = {
  ene: '01', enero: '01',
  feb: '02', febrero: '02',
  mar: '03', marzo: '03',
  abr: '04', abril: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06',
  jul: '07', julio: '07',
  ago: '08', agosto: '08',
  sep: '09', sept: '09', set: '09', septiembre: '09',
  oct: '10', octubre: '10',
  nov: '11', noviembre: '11',
  dic: '12', diciembre: '12',
};

/**
 * Extrae rango de fechas (checkin, checkout) desde una línea o texto libre
 */
export function extractDatesFromFreeText(text: string): { checkin: string; checkout: string } | null {
  const currentYear = new Date().getFullYear();
  const t = text.toLowerCase();

  // 1. Formato tipo Booking / Airbnb: "Check-in: 12/10/2026 ... Check-out: 15/10/2026"
  const mBooking = t.match(/(?:check-?in|llegada|entrada|desde)[:\s]+([0-9]{1,2}[-/][0-9]{1,2}(?:[-/][0-9]{2,4})?|\d{4}-\d{2}-\d{2}).*?(?:check-?out|salida|egreso|hasta)[:\s]+([0-9]{1,2}[-/][0-9]{1,2}(?:[-/][0-9]{2,4})?|\d{4}-\d{2}-\d{2})/i);
  if (mBooking) {
    const ci = normalizeDateToIso(mBooking[1]);
    let co = normalizeDateToIso(mBooking[2]);
    if (ci) {
      if (!co || co <= ci) {
        const d = new Date(ci + 'T12:00:00Z');
        d.setDate(d.getDate() + 1);
        co = d.toISOString().split('T')[0];
      }
      return { checkin: ci, checkout: co };
    }
  }

  // 2. Nombres de meses: "12 de octubre al 15 de octubre" o "12 al 15 de octubre" o "12 oct - 15 oct"
  const mMonthFull = t.match(/(\d{1,2})\s*(?:de\s*)?([a-záéíóú]{3,10})\s*(?:al?|-|a|hasta)\s*(\d{1,2})\s*(?:de\s*)?([a-záéíóú]{3,10})?(?:\s*(?:de\s*)?(\d{4}))?/i);
  if (mMonthFull) {
    const d1 = mMonthFull[1].padStart(2, '0');
    const m1Raw = mMonthFull[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 3);
    const d2 = mMonthFull[3].padStart(2, '0');
    const m2Raw = mMonthFull[4] ? mMonthFull[4].normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 3) : m1Raw;
    const yr = mMonthFull[5] || String(currentYear);

    const m1 = SPANISH_MONTHS[m1Raw] || SPANISH_MONTHS[mMonthFull[2]];
    const m2 = SPANISH_MONTHS[m2Raw] || (mMonthFull[4] ? SPANISH_MONTHS[mMonthFull[4]] : m1);

    if (m1 && m2) {
      let ci = `${yr}-${m1}-${d1}`;
      let co = `${yr}-${m2}-${d2}`;
      if (co <= ci) {
        // En caso de cambio de año (ej dic a ene)
        const yrNext = String(parseInt(yr, 10) + 1);
        co = `${yrNext}-${m2}-${d2}`;
      }
      return { checkin: ci, checkout: co };
    }
  }

  // 3. Rango numérico con barra o guión: "15/10 al 18/10", "15/10/2026 al 18/10/2026", "15-10 a 18-10"
  const mNumRange = t.match(/(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{2,4}))?\s*(?:al?|-|a|hasta)\s*(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{2,4}))?/i);
  if (mNumRange) {
    const d1 = mNumRange[1].padStart(2, '0');
    const m1 = mNumRange[2].padStart(2, '0');
    let y1 = mNumRange[3] || String(currentYear);
    if (y1.length === 2) y1 = '20' + y1;

    const d2 = mNumRange[4].padStart(2, '0');
    const m2 = mNumRange[5].padStart(2, '0');
    let y2 = mNumRange[6] || y1;
    if (y2.length === 2) y2 = '20' + y2;

    let ci = `${y1}-${m1}-${d1}`;
    let co = `${y2}-${m2}-${d2}`;
    if (co <= ci) {
      const dObj = new Date(ci + 'T12:00:00Z');
      dObj.setDate(dObj.getDate() + 1);
      co = dObj.toISOString().split('T')[0];
    }
    return { checkin: ci, checkout: co };
  }

  // 4. Formato ISO: "2026-10-15 al 2026-10-18" o "2026-10-15 a 2026-10-18"
  const mIso = t.match(/(\d{4}-\d{2}-\d{2})\s*(?:al?|-|a|hasta)\s*(\d{4}-\d{2}-\d{2})/i);
  if (mIso) {
    return { checkin: mIso[1], checkout: mIso[2] };
  }

  return null;
}

/**
 * Parsea texto libre de WhatsApp, mensajes copiados, confirmaciones de Booking/Airbnb
 */
export function parseFreeText(rawText: string): ParsedImportItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: ParsedImportItem[] = [];

  // Ver si cada línea contiene una reserva independiente
  lines.forEach((line, idx) => {
    // Si la línea es demasiado corta o parece solo un separador
    if (line.length < 5) return;

    const dates = extractDatesFromFreeText(line);
    if (!dates) return;

    // Detectar cabaña
    const { cabin, isUncertain } = detectCabinFromText(line);

    // Detectar plataforma
    let plat: Plataforma = 'Directo';
    const lower = line.toLowerCase();
    if (lower.includes('airbnb') || lower.includes('arb') || lower.includes('airbn')) {
      plat = 'Airbnb';
    } else if (lower.includes('booking') || lower.includes('boo')) {
      plat = 'Booking';
    } else if (lower.includes('whatsapp') || lower.includes('wpp') || lower.includes('wa')) {
      plat = 'Directo';
    }

    // Detectar precio
    const precio = parseDetectedPrice(line);

    // Detectar teléfono
    let tel = '';
    const telMatch = line.match(/(?:tel|cel|telefono|teléfono|whatsapp|wa|wpp)?[:\s]*([+0-9\s\-()]{7,18})/i);
    if (telMatch && telMatch[1].replace(/\D/g, '').length >= 7) {
      tel = telMatch[1].trim();
    }

    // Limpiar huésped
    // Quitar marcas de WhatsApp como "[12/10, 14:22] Juan:"
    const cleanLine = line.replace(/^\[.*?\]\s*[^:]+:\s*/i, '');
    const huesped = cleanGuestName(cleanLine);

    // Pax
    let pax = 2;
    const paxMatch = line.match(/\bx\s*([1-9]|1[0-2])\b|(\d{1,2})\s*(?:personas?|pax|huespedes?)/i);
    if (paxMatch) {
      pax = parseInt(paxMatch[1] || paxMatch[2], 10);
    }

    results.push({
      id: `import-text-${Date.now().toString(36)}-${idx}`,
      depto: cabin,
      huesped,
      tel,
      checkin: dates.checkin,
      checkout: dates.checkout,
      precio,
      plataforma: plat,
      estado: 'Confirmada',
      notas: `Texto importado: ${line.slice(0, 100)}`,
      pax,
      selected: true,
      rawSource: line,
      isUncertainCabin: isUncertain,
    });
  });

  // Si no se encontró ninguna por línea individual, intentar procesar el bloque entero como una sola reserva
  if (results.length === 0) {
    const singleDates = extractDatesFromFreeText(rawText);
    if (singleDates) {
      const { cabin, isUncertain } = detectCabinFromText(rawText);
      let plat: Plataforma = 'Directo';
      const lower = rawText.toLowerCase();
      if (lower.includes('airbnb') || lower.includes('arb')) plat = 'Airbnb';
      else if (lower.includes('booking') || lower.includes('boo')) plat = 'Booking';

      const precio = parseDetectedPrice(rawText);
      const huesped = cleanGuestName(lines[0] || 'Huésped Detectado');

      results.push({
        id: `import-text-block-${Date.now().toString(36)}`,
        depto: cabin,
        huesped,
        checkin: singleDates.checkin,
        checkout: singleDates.checkout,
        precio,
        plataforma: plat,
        estado: 'Confirmada',
        notas: `Mensaje: ${rawText.slice(0, 120)}...`,
        pax: 2,
        selected: true,
        rawSource: rawText.slice(0, 80),
        isUncertainCabin: isUncertain,
      });
    }
  }

  return results;
}

/**
 * Parsea un archivo JSON (por ejemplo un backup de Los Bananos o lista de reservas exportadas)
 */
export function parseJsonContent(jsonText: string): ParsedImportItem[] {
  try {
    const data = JSON.parse(jsonText);
    const list: any[] = Array.isArray(data)
      ? data
      : data.reservas && Array.isArray(data.reservas)
      ? data.reservas
      : [];
    if (!Array.isArray(list) || list.length === 0) return [];

    return list
      .map((item: any, idx: number) => {
        const { cabin, isUncertain } = detectCabinFromText(item.depto || item.cabana || '', item.depto);
        const ci = normalizeDateToIso(item.checkin || item.desde || item.fechaInicio || '');
        const co = normalizeDateToIso(item.checkout || item.hasta || item.fechaFin || '');
        if (!ci || !co) return null;

        return {
          id: `import-json-${Date.now().toString(36)}-${idx}`,
          depto: cabin,
          huesped: item.huesped || item.cliente || item.nombre || 'Reserva Importada',
          tel: item.tel || item.telefono || '',
          checkin: ci,
          checkout: co,
          precio: Number(item.precio || item.importe || 0),
          plataforma: item.plataforma || 'Directo',
          estado: (item.estado as EstadoReserva) || 'Confirmada',
          notas: item.notas || 'Importado desde archivo JSON',
          pax: Number(item.pax || 2),
          selected: true,
          isUncertainCabin: isUncertain,
        } as ParsedImportItem;
      })
      .filter((item): item is ParsedImportItem => item !== null);
  } catch {
    return [];
  }
}

/**
 * Función universal para procesar el texto de un archivo (.ics, .csv, .json)
 */
export function parseImportFile(content: string, fileName: string): ParsedImportItem[] {
  const lower = fileName.toLowerCase();
  const trimmed = content.trim();

  // Si es JSON
  if (lower.endsWith('.json') || trimmed.startsWith('[') || (trimmed.startsWith('{') && trimmed.includes('"reservas"'))) {
    const jsonItems = parseJsonContent(content);
    if (jsonItems.length > 0) return jsonItems;
  }

  // Si es iCal / ICS
  const isIcs = lower.endsWith('.ics') || content.includes('BEGIN:VCALENDAR');
  if (isIcs) {
    return parseIcsContent(content);
  }

  // Por defecto procesar como CSV / Planilla
  return parseCsvContent(content);
}
