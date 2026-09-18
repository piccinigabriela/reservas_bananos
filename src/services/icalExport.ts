import { Reserva } from '../types';
import { CABANAS, DN } from './cabinConfig';

/**
 * Genera el contenido de un archivo .ics para una cabaña específica
 * con todas sus reservas confirmadas (excluyendo canceladas y no shows).
 */
export function generateIcsForCabin(cabinCode: string, reservas: Reserva[]): string {
  const cabinReservas = reservas.filter(
    r => r.depto === cabinCode &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'Non show' &&
      r.checkin &&
      r.checkout
  );

  const now = new Date();
  const formatUtcDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  const dtstamp = formatUtcDate(now);

  const formatIcalDateOnly = (dateStr: string) => {
    // Formato YYYYMMDD
    return dateStr.replace(/-/g, '');
  };

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cabanas Los Bananos//Calendario iCal v1.0//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Los Bananos - ${DN[cabinCode as keyof typeof DN] || cabinCode}`,
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
  ];

  for (const r of cabinReservas) {
    const uid = `reserva-${r.id || Math.random().toString(36).substr(2, 9)}@woodcabiniguazu.com.ar`;
    const dtstart = formatIcalDateOnly(r.checkin);
    const dtend = formatIcalDateOnly(r.checkout);

    // En iCal standard para Airbnb, el resumen "Reserved" o "Reservado" es universalmente reconocido como bloqueo
    const summary = r.plataforma === 'Airbnb' ? 'Reserva Airbnb' : `Reservado (${r.plataforma})`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:Reserva en Los Bananos (${DN[cabinCode as keyof typeof DN] || cabinCode})`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE'); // Indica que bloquea el tiempo (no disponible)
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Descarga directamente el archivo .ics en el navegador
 */
export function downloadIcsFile(cabinCode: string, reservas: Reserva[]) {
  const icsContent = generateIcsForCabin(cabinCode, reservas);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Los_Bananos_${cabinCode}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
