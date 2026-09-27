export type CabinCode = 'C2' | 'C3' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9' | 'SA_big' | 'SA_tj' | 'SA_te';

export type CabinType = 'big' | 'tj' | 'te';

export type Plataforma = 'Directo' | 'Airbnb' | 'Booking' | 'Google' | 'Instagram' | 'Facebook' | 'Otro';

export type EstadoReserva = 
  | 'Confirmada'
  | 'Pendiente'
  | 'Stand by'
  | 'Shown'
  | 'Non show'
  | 'Cancelada'
  | 'Cortesía'
  | 'Devolución';

export interface Reserva {
  id: string;
  depto: CabinCode;
  huesped: string;
  tel?: string;
  nac?: string;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  precio: number; // Por noche
  moneda?: 'ARS' | 'USD';
  pax?: number;
  plus?: number; // Plus por pasajero adicional
  plataforma: Plataforma | string;
  destino?: string;
  estado: EstadoReserva;
  notas?: string;
  early?: boolean;
  late?: boolean;
  sena?: number;
  saldo?: number;
  creado?: string;
  limpio?: boolean;
  comision?: number | null; // e.g. 15 or 3 for Airbnb
  icalUid?: string; // Flag for iCal blocked slots
}

export interface Gasto {
  id: string;
  fecha: string;
  depto: string;
  categoria: string;
  descripcion: string;
  monto: number;
  comprobante?: string;
}

export interface CalcResult {
  n: number;
  sub: number;
  plusTotal: number;
  subTotal: number;
  com: number;
  liq: number;
  bkCom: number;
}

export interface UserRoleInfo {
  name: string;
  role: string;
}

export type UserKey = 'admin' | 'recepcion' | 'vol' | 'vol1' | 'vol2';

export type AppView = 'calendario' | 'reservas' | 'gastos' | 'rendimiento' | 'avisos' | 'config' | 'xenia';

export interface TemporadaRango {
  tipo: 'mes' | 'rango';
  mes?: number;
  diaDesde?: number;
  mesDesde?: number;
  diaHasta?: number;
  mesHasta?: number;
}

export type VolunteerId = 'vol1' | 'vol2';

export type CabinCleaningStatus = 'limpia' | 'pendiente' | 'ocupada';

export interface CabinStatusInfo {
  depto: CabinCode;
  status: CabinCleaningStatus; // 'limpia' (Verde), 'pendiente' (Roja), 'ocupada' (Amarilla)
  updatedAt?: string; // ISO string
  updatedBy?: string; // Ej: "Voluntario 1", "Recepción"
  notas?: string;
}

export type CalendarColorMode = 'plataforma' | 'semaforo_limpieza';

export type VolunteerTaskType = 
  | 'limpieza' 
  | 'parque' 
  | 'mantenimiento' 
  | 'checkin' 
  | 'libre' 
  | 'otro';

export interface VolunteerTask {
  id: string;
  voluntarioId: VolunteerId; // 'vol1' | 'vol2'
  fecha: string; // YYYY-MM-DD
  titulo: string; // Ej: "Limpieza C5 y C6", "Cortar pasto sector pileta"
  tipo: VolunteerTaskType;
  completada?: boolean;
  horario?: string; // Ej: "09:00 a 13:00"
  notas?: string;
  depto?: string; // Opcional vinculación con cabaña
}
