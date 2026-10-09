import { 
  CabinCode, 
  CabinType, 
  Plataforma, 
  Reserva, 
  CalcResult, 
  TemporadaRango, 
  VolunteerId, 
  VolunteerTaskType, 
  VolunteerTask,
  CabinCleaningStatus,
  CabinStatusInfo,
  CalendarColorMode
} from '../types';
import { cfg, guardarCfg } from './settings';
import { hoyIso } from './fechas';

export const CABANAS: CabinCode[] = ['C2', 'C3', 'C5', 'C6', 'C7', 'C8', 'C9'];

export const VOLUNTEER_IDS: VolunteerId[] = ['vol1', 'vol2'];

// Configuración del Semáforo de Limpieza y Ocupación
export const SEMAFORO_CONFIG: Record<CabinCleaningStatus, {
  label: string;
  shortLabel: string;
  color: string;
  hex: string;
  bgDark: string;
  borderDark: string;
  textDark: string;
  bgLight: string;
  borderLight: string;
  textLight: string;
  icon: string;
  desc: string;
}> = {
  ocupada: {
    label: 'Cabaña Ocupada',
    shortLabel: 'Ocupada',
    color: 'amarillo',
    hex: '#F59E0B', // Amarillo ámbar de alto contraste
    bgDark: 'bg-amber-500/20',
    borderDark: 'border-amber-500/50',
    textDark: 'text-amber-300',
    bgLight: 'bg-amber-100',
    borderLight: 'border-amber-400',
    textLight: 'text-amber-900',
    icon: '🟡',
    desc: 'Huéspedes alojados en la cabaña',
  },
  limpia: {
    label: 'Cabaña Limpia (Lista)',
    shortLabel: 'Limpia',
    color: 'verde',
    hex: '#10B981', // Verde esmeralda
    bgDark: 'bg-emerald-500/20',
    borderDark: 'border-emerald-500/50',
    textDark: 'text-emerald-300',
    bgLight: 'bg-emerald-100',
    borderLight: 'border-emerald-400',
    textLight: 'text-emerald-900',
    icon: '🟢',
    desc: 'Limpia, armada y lista para recibir huéspedes',
  },
  pendiente: {
    label: 'Desocupada / Pendiente de Limpieza',
    shortLabel: 'Pendiente',
    color: 'roja',
    hex: '#EF4444', // Rojo
    bgDark: 'bg-rose-500/20',
    borderDark: 'border-rose-500/50',
    textDark: 'text-rose-300',
    bgLight: 'bg-rose-100',
    borderLight: 'border-rose-400',
    textLight: 'text-rose-900',
    icon: '🔴',
    desc: 'Desocupada. Requiere limpieza y preparación',
  },
};

export function getInitialCabinCleaningStatuses(): Record<CabinCode, CabinStatusInfo> {
  return {
    C2: { depto: 'C2', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    C3: { depto: 'C3', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    C5: { depto: 'C5', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    C6: { depto: 'C6', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    C7: { depto: 'C7', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    C8: { depto: 'C8', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    C9: { depto: 'C9', status: 'limpia', updatedAt: new Date().toISOString(), updatedBy: 'Sistema' },
    SA_big: { depto: 'SA_big', status: 'limpia' },
    SA_tj: { depto: 'SA_tj', status: 'limpia' },
    SA_te: { depto: 'SA_te', status: 'limpia' },
  };
}

/**
 * Calcula el estado efectivo de limpieza y ocupación de cada cabaña para el día actual
 * sincronizando automáticamente los check-outs del día, estadías activas y tareas de limpieza realizadas.
 */
export function getEffectiveCabinStatuses(
  manualStatuses: Partial<Record<CabinCode, CabinStatusInfo>>,
  reservas: Reserva[],
  volunteerTasks: VolunteerTask[] = [],
  todayIso: string = hoyIso()
): Record<CabinCode, CabinStatusInfo> {
  const result: Record<CabinCode, CabinStatusInfo> = { ...getInitialCabinCleaningStatuses(), ...manualStatuses };

  CABANAS.forEach(cabinCode => {
    const manual = manualStatuses[cabinCode];
    const isManualModifiedToday = manual?.updatedAt && manual.updatedAt.startsWith(todayIso) && manual?.updatedBy !== 'Sistema';

    // Tarea de limpieza completada para hoy en esta cabaña
    const completedCleaningToday = volunteerTasks.some(
      t => t.depto === cabinCode && t.fecha === todayIso && t.completada
    );

    // Checkouts / Salidas hoy
    const hasCheckoutToday = reservas.some(
      r => r.depto === cabinCode && r.checkout === todayIso && r.estado !== 'Cancelada' && r.estado !== 'Non show'
    );

    // Estadía activa hoy (noche ocupada)
    const isOccupiedTonight = reservas.some(
      r => r.depto === cabinCode && r.checkin <= todayIso && r.checkout > todayIso && r.estado !== 'Cancelada' && r.estado !== 'Non show'
    );

    let status: CabinCleaningStatus = manual?.status || 'limpia';

    if (hasCheckoutToday) {
      if (completedCleaningToday || (isManualModifiedToday && manual?.status === 'limpia')) {
        status = isOccupiedTonight ? 'ocupada' : 'limpia';
      } else {
        // En día de check-out, la cabaña requiere limpieza por defecto
        status = 'pendiente';
      }
    } else if (isOccupiedTonight) {
      status = manual?.status === 'pendiente' ? 'pendiente' : 'ocupada';
    } else if (completedCleaningToday || (isManualModifiedToday && manual?.status === 'limpia')) {
      status = 'limpia';
    }

    result[cabinCode] = {
      depto: cabinCode,
      status,
      updatedAt: manual?.updatedAt || new Date().toISOString(),
      updatedBy: manual?.updatedBy || 'Sistema',
      notas: manual?.notas,
    };
  });

  return result;
}

export const DEFAULT_VOLUNTEER_NAMES: Record<VolunteerId, string> = {
  vol1: 'Voluntario 1 (Worldpackers)',
  vol2: 'Voluntario 2 (Worldpackers)',
};

export const DEFAULT_VOLUNTEER_SHORT_NAMES: Record<VolunteerId, string> = {
  vol1: 'Vol. 1',
  vol2: 'Vol. 2',
};

export const VOLUNTEER_TASK_META: Record<VolunteerTaskType, { 
  label: string; 
  icon: string; 
  color: string;
  bgLight: string;
  textLight: string;
  borderLight: string;
  bgDark: string;
  textDark: string;
  borderDark: string;
}> = {
  limpieza: {
    label: 'Limpieza / Habitación',
    icon: '🧹',
    color: '#10B981',
    bgLight: '#DCFCE7',
    textLight: '#166534',
    borderLight: '#86EFAC',
    bgDark: '#064E3B',
    textDark: '#A7F3D0',
    borderDark: '#059669',
  },
  parque: {
    label: 'Parque / Cortar Pasto / Selva',
    icon: '🌿',
    color: '#059669',
    bgLight: '#ECFDF5',
    textLight: '#065F46',
    borderLight: '#6EE7B7',
    bgDark: '#047857',
    textDark: '#D1FAE5',
    borderDark: '#10B981',
  },
  mantenimiento: {
    label: 'Mantenimiento / Reparación',
    icon: '🔧',
    color: '#D97706',
    bgLight: '#FEF3C7',
    textLight: '#92400E',
    borderLight: '#FCD34D',
    bgDark: '#78350F',
    textDark: '#FDE68A',
    borderDark: '#B45309',
  },
  checkin: {
    label: 'Preparar Check-in / Huéspedes',
    icon: '🔑',
    color: '#2563EB',
    bgLight: '#DBEAFE',
    textLight: '#1E40AF',
    borderLight: '#93C5FD',
    bgDark: '#1E3A8A',
    textDark: '#BFDBFE',
    borderDark: '#3B82F6',
  },
  libre: {
    label: 'Día Libre / Descanso',
    icon: '🌴',
    color: '#8B5CF6',
    bgLight: '#F3E8FF',
    textLight: '#6B21A8',
    borderLight: '#D8B4FE',
    bgDark: '#4C1D95',
    textDark: '#E9D5FF',
    borderDark: '#7C3AED',
  },
  otro: {
    label: 'Otra Tarea / General',
    icon: '📋',
    color: '#6B7280',
    bgLight: '#F3F4F6',
    textLight: '#374151',
    borderLight: '#D1D5DB',
    bgDark: '#1F2937',
    textDark: '#E5E7EB',
    borderDark: '#4B5563',
  },
};

export function getVolunteerNames(): Record<VolunteerId, string> {
  return { ...DEFAULT_VOLUNTEER_NAMES, ...cfg<Partial<Record<VolunteerId, string>>>('voluntarios', {}) };
}

export async function saveVolunteerNames(names: Record<VolunteerId, string>): Promise<void> {
  await guardarCfg('voluntarios', names);
}

export const DC: Record<CabinCode, string> = {
  C2: '#3d7a25', // Verde bosque
  C3: '#c55a11', // Óxido cálido
  C5: '#c00000', // Rojo intenso
  C6: '#1f4e79', // Azul noche
  C7: '#833c00', // Castaño jacuzzi
  C8: '#1a5276', // Azul petróleo
  C9: '#7030a0', // Púrpura selva
  SA_big: '#9b1c1c',
  SA_tj: '#0e7490',
  SA_te: '#6d28d9',
};

export const DN: Record<CabinCode, string> = {
  C2: 'Cabaña 2 (Big)',
  C3: 'Cabaña 3 (Big)',
  C5: 'Cabaña 5 (Tiny Estándar)',
  C6: 'Cabaña 6 (Tiny Estándar)',
  C7: 'Cabaña 7 (Tiny Jacuzzi)',
  C8: 'Cabaña 8 (Tiny Estándar)',
  C9: 'Cabaña 9 (Tiny Estándar)',
  SA_big: 'Sin asignar (Big)',
  SA_tj: 'Sin asignar (Tiny Jacuzzi)',
  SA_te: 'Sin asignar (Tiny Estándar)',
};

export const SHORT_DN: Record<CabinCode, string> = {
  C2: 'C2',
  C3: 'C3',
  C5: 'C5',
  C6: 'C6',
  C7: 'C7',
  C8: 'C8',
  C9: 'C9',
  SA_big: 'S/A',
  SA_tj: 'S/A',
  SA_te: 'S/A',
};

export const TIPOS: Record<CabinType, string> = {
  big: 'Big (4 a 6 pax)',
  tj: 'Tiny Jacuzzi (2 pax)',
  te: 'Tiny Estándar (2 a 4 pax)',
};

export const TIPO_DE_CABANA: Record<string, CabinType> = {
  C2: 'big',
  C3: 'big',
  C7: 'tj',
  C5: 'te',
  C6: 'te',
  C8: 'te',
  C9: 'te',
};

export const CABANAS_POR_TIPO: Record<CabinType, CabinCode[]> = {
  big: ['C2', 'C3'],
  tj: ['C7'],
  te: ['C5', 'C6', 'C8', 'C9'],
};

export const TIPO_COLOR: Record<CabinType, string> = {
  big: '#c55a11',
  tj: '#833c00',
  te: '#1f4e79',
};

export const PLATAFORMA_COLORES: Record<string, string> = {
  Airbnb: '#ff5a5f',
  Booking: '#003580',
  Directo: '#2e7d32',
  Google: '#d97706',
  Instagram: '#c026d3',
  Facebook: '#2563eb',
  Otro: '#4b5563',
};

export const USER_META: Record<string, { name: string; role: string }> = {
  admin: { name: 'Propietario', role: 'Modo Completo' },
  recepcion: { name: 'Recepción', role: 'Día a Día (Solo Calendario)' },
  vol: { name: 'Recepción', role: 'Día a Día (Solo Calendario)' },
  vol1: { name: 'Voluntario 1', role: 'Mi Agenda Worldpackers' },
  vol2: { name: 'Voluntario 2', role: 'Mi Agenda Worldpackers' },
};

export const esSinAsignar = (dep: string) => typeof dep === 'string' && dep.startsWith('SA_');
export const tipoDeSinAsignar = (dep: string): CabinType => dep.replace('SA_', '') as CabinType;

export const nightsCount = (ci: string, co: string): number => {
  if (!ci || !co) return 0;
  const start = new Date(ci);
  const end = new Date(co);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(0, diff);
};

export function getComisionesCfg(): { airbnb: number; booking: number } {
  return { airbnb: 15, booking: 15, ...cfg<Partial<{ airbnb: number; booking: number }>>('comisiones', {}) };
}

export function getMonedaPlatCfg(): Record<string, string> {
  return { Airbnb: 'USD', Booking: 'ARS', Directo: 'ARS', ...cfg<Record<string, string>>('moneda_plataforma', {}) };
}

export function getTipoCambioVal(): number {
  const v = Number(cfg<number | string>('tipo_cambio', 1550));
  return v > 0 ? v : 1550;
}

export function getFechaCorteCfg(): string {
  return String(cfg<string>('fecha_corte', '2026-09-01') ?? '').trim();
}

export function aARS(monto: number, plat: string, moneda?: string): number {
  const m = moneda || (getMonedaPlatCfg()[plat] || 'ARS');
  return m === 'USD' ? (monto || 0) * getTipoCambioVal() : (monto || 0);
}

export function formatMoney(amount: number | null | undefined, currency: string = 'ARS'): string {
  if (amount == null || isNaN(amount)) return '—';
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('es-AR');
  return currency === 'USD' ? `USD ${formatted}` : `$ ${formatted}`;
}

export function formatDateEs(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDateExtended(isoDate: string): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getTemporada(fecha: string): 'Alta' | 'Baja' {
  if (!fecha) return 'Baja';
  try {
    const ranges: TemporadaRango[] = cfg<TemporadaRango[]>('temporadas', []);
    const [y, m, d] = fecha.split('-').map(Number);
    const mes = m - 1;
    for (const r of ranges) {
      if (r.tipo === 'mes' && r.mes != null && mes === Number(r.mes) - 1) {
        return 'Alta';
      } else if (r.tipo === 'rango' && r.mesDesde && r.diaDesde && r.mesHasta && r.diaHasta) {
        const dInicio = new Date(y, Number(r.mesDesde) - 1, Number(r.diaDesde));
        const dFin = new Date(y, Number(r.mesHasta) - 1, Number(r.diaHasta));
        const dFecha = new Date(y, m - 1, d);
        if (dFin >= dInicio) {
          if (dFecha >= dInicio && dFecha <= dFin) return 'Alta';
        } else {
          if (dFecha >= dInicio || dFecha <= dFin) return 'Alta';
        }
      }
    }
  } catch (_) {}
  return 'Baja';
}

export function calcFinancials(r: Partial<Reserva>): CalcResult {
  const n = nightsCount(r.checkin || '', r.checkout || '');
  const precioARS = aARS(r.precio || 0, r.plataforma || 'Directo', r.moneda);
  const plusARS = aARS(r.plus || 0, r.plataforma || 'Directo', r.moneda);
  const extraPax = Math.max(0, (r.pax || 2) - 2);
  const plusTotal = extraPax * plusARS * n;
  const sub = n * precioARS;
  const subTotal = sub + plusTotal;

  const comCfg = getComisionesCfg();
  let pct = 0;
  if (r.comision != null && !isNaN(Number(r.comision))) {
    pct = Number(r.comision);
  } else if (r.plataforma === 'Airbnb') {
    pct = comCfg.airbnb ?? 15;
  } else if (r.plataforma === 'Booking') {
    pct = comCfg.booking ?? 15;
  } else {
    pct = 0;
  }
  const com = subTotal * (pct / 100);
  const bkCom = r.plataforma === 'Booking' && r.estado === 'Shown' ? subTotal * ((comCfg.booking || 15) / 100) : 0;

  return {
    n,
    sub,
    plusTotal,
    subTotal,
    com,
    liq: subTotal - com,
    bkCom,
  };
}

/**
 * Parsea fechas en formatos comunes de Google Calendar (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.)
 */
export function normalizeDateToIso(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().split(' ')[0].split('T')[0];
  
  // YYYY-MM-DD o YYYY/MM/DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // MM/DD/YYYY o DD/MM/YYYY
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const year = parts[2];

    // Si p0 > 12, es DD/MM/YYYY
    if (p0 > 12) {
      return `${year}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
    }
    // Si p1 > 12, es MM/DD/YYYY (formato estándar de Google Calendar en EE.UU.)
    if (p1 > 12) {
      return `${year}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Por defecto en Google Calendar CSV export suele ser MM/DD/YYYY
    return `${year}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Detecta la cabaña a partir del título o descripción de un evento de Google Calendar
 */
export function detectCabinFromText(text: string): CabinCode {
  const t = text.toLowerCase();

  // Coincidencias específicas
  if (t.includes('cabaña 2') || t.includes('cab 2') || t.includes('cab. 2') || /\bc2\b/.test(t) || /\bc-2\b/.test(t)) return 'C2';
  if (t.includes('cabaña 3') || t.includes('cab 3') || t.includes('cab. 3') || /\bc3\b/.test(t) || /\bc-3\b/.test(t)) return 'C3';
  if (t.includes('cabaña 7') || t.includes('cab 7') || t.includes('cab. 7') || /\bc7\b/.test(t) || /\bc-7\b/.test(t) || t.includes('jacuzzi')) return 'C7';
  if (t.includes('cabaña 5') || t.includes('cab 5') || t.includes('cab. 5') || /\bc5\b/.test(t) || /\bc-5\b/.test(t)) return 'C5';
  if (t.includes('cabaña 6') || t.includes('cab 6') || t.includes('cab. 6') || /\bc6\b/.test(t) || /\bc-6\b/.test(t)) return 'C6';
  if (t.includes('cabaña 8') || t.includes('cab 8') || t.includes('cab. 8') || /\bc8\b/.test(t) || /\bc-8\b/.test(t)) return 'C8';
  if (t.includes('cabaña 9') || t.includes('cab 9') || t.includes('cab. 9') || /\bc9\b/.test(t) || /\bc-9\b/.test(t)) return 'C9';

  // Tipos genéricos
  if (t.includes('big')) return 'C2';
  if (t.includes('tiny')) return 'C5';

  return 'C2'; // Valor por defecto sugerido
}

export interface GoogleCalendarParsedEvent {
  id: string;
  subject: string;
  huesped: string;
  depto: CabinCode;
  checkin: string;
  checkout: string;
  plataforma: Plataforma;
  precio: number;
  notas: string;
  selected: boolean;
}

/**
 * Parsea un archivo CSV exportado de Google Calendar
 */
export function parseGoogleCalendarCSV(csvText: string): GoogleCalendarParsedEvent[] {
  // Manejo de líneas respetando comillas
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

  // Buscar índices de columnas
  const header = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const getIdx = (candidates: string[]) => {
    return header.findIndex(h => candidates.some(c => h.includes(c)));
  };

  let subjectIdx = getIdx(['subject', 'title', 'titulo', 'nombre', 'resumen', 'summary']);
  let startDateIdx = getIdx(['startdate', 'fechainicio', 'inicio', 'start', 'desde', 'in']);
  let endDateIdx = getIdx(['enddate', 'fechafin', 'fin', 'end', 'hasta', 'out']);
  let descIdx = getIdx(['description', 'descripcion', 'notas', 'notes', 'detalle']);

  // Fallback si no tiene cabeceras canónicas (formato típico Google Calendar: 0:Subject, 1:Start Date, 3:End Date, 6:Description)
  if (subjectIdx === -1) subjectIdx = 0;
  if (startDateIdx === -1) startDateIdx = 1;
  if (endDateIdx === -1) endDateIdx = 3 < lines[0].length ? 3 : 1;
  if (descIdx === -1) descIdx = 6 < lines[0].length ? 6 : -1;

  const results: GoogleCalendarParsedEvent[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const rawSubject = row[subjectIdx] || '';
    const rawStart = row[startDateIdx] || '';
    const rawEnd = row[endDateIdx] || '';
    const rawDesc = descIdx !== -1 ? row[descIdx] || '' : '';

    if (!rawSubject && !rawStart) continue;

    const ci = normalizeDateToIso(rawStart);
    let co = normalizeDateToIso(rawEnd);

    if (!ci) continue;
    // Si la fecha de salida es igual a la de llegada o no existe, asumimos 1 noche
    if (!co || co <= ci) {
      const nextDay = new Date(ci);
      nextDay.setDate(nextDay.getDate() + 1);
      co = nextDay.toISOString().split('T')[0];
    }

    const fullText = `${rawSubject} ${rawDesc}`;
    const detectedCabin = detectCabinFromText(fullText);

    // Detectar plataforma
    let plat: Plataforma = 'Directo';
    if (fullText.toLowerCase().includes('airbnb')) plat = 'Airbnb';
    else if (fullText.toLowerCase().includes('booking')) plat = 'Booking';

    // Limpiar nombre del huésped
    let cleanGuest = rawSubject
      .replace(/cabaña\s*[2356789]/gi, '')
      .replace(/cab\s*[2356789]/gi, '')
      .replace(/c-?[2356789]/gi, '')
      .replace(/tiny\s*(jacuzzi|est[aá]ndar|[56789])/gi, '')
      .replace(/big/gi, '')
      .replace(/reserva/gi, '')
      .replace(/airbnb/gi, '')
      .replace(/booking/gi, '')
      .replace(/[-–—:|()]/g, ' ')
      .trim();

    if (!cleanGuest) cleanGuest = rawSubject.trim() || 'Huésped Google Calendar';

    results.push({
      id: `gcal-${Date.now().toString(36)}-${r}`,
      subject: rawSubject,
      huesped: cleanGuest,
      depto: detectedCabin,
      checkin: ci,
      checkout: co,
      plataforma: plat,
      precio: 0,
      notas: rawDesc ? `Google Calendar: ${rawDesc}` : 'Importado de Google Calendar',
      selected: true,
    });
  }

  return results;
}
