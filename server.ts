import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Configuración de Supabase para leer las reservas en vivo
const SB_URL = 'https://vnfgitgadadjjjciftsa.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';
const SB_TABLE = 'reservas_bananos';

const CABANAS_NOMBRES: Record<string, string> = {
  C2: 'Cabaña 2 (Big)',
  C3: 'Cabaña 3 (Big)',
  C5: 'Cabaña 5 (Tiny)',
  C6: 'Cabaña 6 (Tiny)',
  C7: 'Cabaña 7 (Tiny Jacuzzi)',
  C8: 'Cabaña 8 (Tiny)',
  C9: 'Cabaña 9 (Tiny)',
};

// Endpoint público iCal para que Airbnb o Booking sincronicen automáticamente
app.get('/api/ical/:cabinCode.ics', async (req, res) => {
  const { cabinCode } = req.params;
  const upperCode = (cabinCode || '').toUpperCase();

  try {
    const response = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?depto=eq.${upperCode}&select=*`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
      },
    });

    if (!response.ok) {
      return res.status(500).send('Error leyendo reservas');
    }

    const reservas: any[] = await response.json();
    const cabinName = CABANAS_NOMBRES[upperCode] || upperCode;

    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const lines: string[] = [
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

      const uid = `reserva-${r.id || Math.random().toString(36).substring(2, 9)}@bananos.app`;
      const dtstart = r.checkin.replace(/-/g, '');
      const dtend = r.checkout.replace(/-/g, '');
      const summary = r.plataforma === 'Airbnb' ? 'Reserva Airbnb' : `Reservado (${r.plataforma || 'Directa'})`;

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
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="Los_Bananos_${upperCode}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(icsContent);
  } catch (error) {
    console.error('Error generando iCal feed:', error);
    return res.status(500).send('Error interno generando iCal');
  }
});

// Middleware Vite para desarrollo
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
