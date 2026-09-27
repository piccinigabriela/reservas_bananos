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

export function getCabinCleaningStatuses(): Record<CabinCode, CabinStatusInfo> {
  try {
    const saved = localStorage.getItem('bn_cabin_cleaning_statuses');
    if (saved) {
      return { ...getInitialCabinCleaningStatuses(), ...JSON.parse(saved) };
    }
  } catch (_) {}
  return getInitialCabinCleaningStatuses();
}

export function saveCabinCleaningStatuses(statuses: Record<CabinCode, CabinStatusInfo>): void {
  try {
    localStorage.setItem('bn_cabin_cleaning_statuses', JSON.stringify(statuses));
  } catch (_) {}
}

export function updateCabinCleaningStatus(
  depto: CabinCode, 
  status: CabinCleaningStatus, 
  updatedBy?: string, 
  notas?: string
): Record<CabinCode, CabinStatusInfo> {
  const current = getCabinCleaningStatuses();
  current[depto] = {
    depto,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || 'Usuario',
    notas: notas || current[depto]?.notas,
  };
  saveCabinCleaningStatuses(current);
  return current;
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
  try {
    const saved = localStorage.getItem('bn_vol_names');
    if (saved) return { ...DEFAULT_VOLUNTEER_NAMES, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...DEFAULT_VOLUNTEER_NAMES };
}

export function saveVolunteerNames(names: Record<VolunteerId, string>): void {
  try {
    localStorage.setItem('bn_vol_names', JSON.stringify(names));
  } catch (_) {}
}

export function getVolunteerTasks(): VolunteerTask[] {
  try {
    const saved = localStorage.getItem('bn_vol_tasks');
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return [];
}

export function saveVolunteerTasks(tasks: VolunteerTask[]): void {
  try {
    localStorage.setItem('bn_vol_tasks', JSON.stringify(tasks));
  } catch (_) {}
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

export const DEFAULT_PINS: Record<string, string> = {
  admin: '1234',
  recepcion: '0000',
  gabi: '2345',
  vol: '0000',
  vol1: '1111',
  vol2: '2222',
};

export function getAppPins(): Record<string, string> {
  try {
    const saved = localStorage.getItem('bn_p');
    if (saved) return { ...DEFAULT_PINS, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...DEFAULT_PINS };
}

export function saveAppPins(pins: Record<string, string>): void {
  try {
    localStorage.setItem('bn_p', JSON.stringify(pins));
  } catch (_) {}
}

export const USER_META: Record<string, { name: string; role: string }> = {
  admin: { name: 'Propietario', role: 'Modo Completo' },
  recepcion: { name: 'Recepción', role: 'Día a Día (Solo Calendario)' },
  gabi: { name: 'Gabi', role: 'Administración' },
  vol: { name: 'Recepción', role: 'Día a Día (Solo Calendario)' },
  vol1: { name: 'Voluntario 1', role: 'Mi Agenda Worldpackers' },
  vol2: { name: 'Voluntario 2', role: 'Mi Agenda Worldpackers' },
};

// Supabase config
export const SB_URL = 'https://vnfgitgadadjjjciftsa.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';
export const SB_HDR = {
  'Content-Type': 'application/json',
  apikey: SB_KEY,
  Authorization: 'Bearer ' + SB_KEY,
};
export const SB_TABLE = 'reservas_bananos';
export const SB_TABLE_G = 'gastos_bananos';

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
  try {
    const saved = localStorage.getItem('bn_com');
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return { airbnb: 15, booking: 15 };
}

export function getMonedaPlatCfg(): Record<string, string> {
  try {
    const saved = localStorage.getItem('bn_moneda_plat');
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return { Airbnb: 'USD', Booking: 'ARS', Directo: 'ARS' };
}

export function getTipoCambioVal(): number {
  try {
    const saved = localStorage.getItem('bn_tc');
    if (saved) return parseFloat(saved) || 1550;
  } catch (_) {}
  return 1550;
}

export function getFechaCorteCfg(): string {
  try {
    const saved = localStorage.getItem('bn_fecha_corte');
    if (saved) return saved.trim();
  } catch (_) {}
  return '2026-09-01'; // Por defecto 1 de septiembre de 2026
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
    const ranges: TemporadaRango[] = JSON.parse(localStorage.getItem('bn_temp') || '[]');
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
