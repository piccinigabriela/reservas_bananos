export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const cabinFile = pathParts.pop() || '';
    const cabinCode = cabinFile.replace('.ics', '').toUpperCase();

    const SB_URL = 'https://vnfgitgadadjjjciftsa.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';
    const SB_TABLE = 'reservas_bananos';

    const CABANAS_NOMBRES = {
      C2: 'Cabaña 2 (Big)',
      C3: 'Cabaña 3 (Big)',
      C5: 'Cabaña 5 (Tiny)',
      C6: 'Cabaña 6 (Tiny)',
      C7: 'Cabaña 7 (Tiny Jacuzzi)',
      C8: 'Cabaña 8 (Tiny)',
      C9: 'Cabaña 9 (Tiny)',
    };

    if (!CABANAS_NOMBRES[cabinCode]) {
      return new Response('Cabaña no válida', { status: 400 });
    }

    try {
      const response = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?depto=eq.${cabinCode}&select=*`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
        },
      });

      if (!response.ok) {
        return new Response('Error en base de datos', { status: 500 });
      }

      const reservas = await response.json();
      const cabinName = CABANAS_NOMBRES[cabinCode] || cabinCode;
      const now = new Date();
      const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Cabanas Los Bananos//Calendario iCal v1.0//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:Los Bananos - ${cabinName}`,
        'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
      ];

      for (const r of reservas) {
        if (r.estado === 'Cancelada' || r.estado === 'Non show' || !r.checkin || !r.checkout) {
          continue;
        }

        const uid = `reserva-${r.id || Math.random().toString(36).substring(2, 9)}@woodcabiniguazu.com.ar`;
        const dtstart = r.checkin.replace(/-/g, '');
        const dtend = r.checkout.replace(/-/g, '');
        const summary = r.plataforma === 'Airbnb' ? 'Reserva Airbnb' : `Reservado (${r.plataforma || 'Directo'})`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
        lines.push(`DTEND;VALUE=DATE:${dtend}`);
        lines.push(`SUMMARY:${summary}`);
        lines.push(`DESCRIPTION:Reserva Los Bananos (${cabinName})`);
        lines.push('STATUS:CONFIRMED');
        lines.push('TRANSP:OPAQUE');
        lines.push('END:VEVENT');
      }

      lines.push('END:VCALENDAR');
      const icsContent = lines.join('\r\n');

      return new Response(icsContent, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `inline; filename="Los_Bananos_${cabinCode}.ics"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response('Error interno: ' + err.message, { status: 500 });
    }
  }
};
