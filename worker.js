// Worker de Cloudflare "bananos-ical": calendario de salida por cabaña para Airbnb/Booking.
// Versión 2: ya no lee la tabla completa (con nombres y teléfonos). Usa la función pública
// bananos_ical_feed, que devuelve solo fechas y canal. Sigue funcionando después de cerrar
// el acceso público a la base.
const SB_URL = 'https://vnfgitgadadjjjciftsa.supabase.co';
const SB_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';

const CABANAS = {
  C2: 'Cabaña 2 (Big)',
  C3: 'Cabaña 3 (Big)',
  C5: 'Cabaña 5 (Tiny)',
  C6: 'Cabaña 6 (Tiny)',
  C7: 'Cabaña 7 (Tiny Jacuzzi)',
  C8: 'Cabaña 8 (Tiny)',
  C9: 'Cabaña 9 (Tiny)',
};
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export default {
  async fetch(request) {
    const code = (new URL(request.url).pathname.split('/').pop() || '').replace('.ics', '').toUpperCase();
    if (!CABANAS[code]) return new Response('Cabaña no válida', { status: 404 });

    const r = await fetch(`${SB_URL}/rest/v1/rpc/bananos_ical_feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
      body: JSON.stringify({ p_depto: code }),
    });
    if (!r.ok) return new Response('Error leyendo reservas', { status: 502 });
    const filas = await r.json();

    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cabanas Los Bananos//Calendario iCal v2//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Los Bananos - ${CABANAS[code]}`,
      'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
    ];
    for (const f of filas) {
      if (!FECHA.test(f.checkin) || !FECHA.test(f.checkout)) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:reserva-${f.id}@woodcabiniguazu.com.ar`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${f.checkin.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${f.checkout.replace(/-/g, '')}`,
        `SUMMARY:${f.plataforma === 'Airbnb' ? 'Reserva Airbnb' : 'Reservado'}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    return new Response(lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  },
};
