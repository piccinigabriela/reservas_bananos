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

export type UserKey = 'admin' | 'recepcion' | 'gabi' | 'vol';

export type AppView = 'calendario' | 'reservas' | 'gastos' | 'rendimiento' | 'avisos' | 'config';

export interface TemporadaRango {
  tipo: 'mes' | 'rango';
  mes?: number;
  diaDesde?: number;
  mesDesde?: number;
  diaHasta?: number;
  mesHasta?: number;
}
