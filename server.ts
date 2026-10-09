import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

/**
 * Servidor de Los Bananos (corre en AI Studio / Cloud Run).
 *
 * Cambios de seguridad respecto de la versión anterior:
 *  - Sin claves escritas en el código: todo sale de variables de entorno (secretos de AI Studio).
 *  - Lee la base solo a través de funciones públicas acotadas (sin nombres ni teléfonos).
 *  - /api/xenia/rules ya NO acepta cambios sin login (antes cualquiera podía cambiar el CBU).
 *  - /api/fetch-ical exige sesión del personal y solo baja calendarios de Google/Airbnb/Booking.
 *  - El chat público tiene límite de mensajes por IP.
 *  - El webhook de Meta valida la firma antes de responder por WhatsApp.
 */

const app = express();
const PORT = 3000; // AI Studio / Cloud Run espera este puerto (igual que la versión anterior)

const SB_URL = process.env.SUPABASE_URL || 'https://vnfgitgadadjjjciftsa.supabase.co';
// La anon key es pública por diseño (la protección son las políticas RLS)
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';
// Solo para que Xenia pueda registrar reservas pendientes. Si no está, Xenia deriva a una persona.
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SB_TABLE = 'reservas_bananos';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(
  express.json({
    limit: '100kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---------------------------------------------------------------- Datos de las cabañas (sin precios inventados)
type Tipo = 'big' | 'te' | 'tj';
const CABANAS: Record<string, { nombre: string; tipo: Tipo }> = {
  C2: { nombre: 'Cabaña 2 (Big)', tipo: 'big' },
  C3: { nombre: 'Cabaña 3 (Big)', tipo: 'big' },
  C5: { nombre: 'Cabaña 5 (Tiny)', tipo: 'te' },
  C6: { nombre: 'Cabaña 6 (Tiny)', tipo: 'te' },
  C7: { nombre: 'Cabaña 7 (Tiny Jacuzzi)', tipo: 'tj' },
  C8: { nombre: 'Cabaña 8 (Tiny)', tipo: 'te' },
  C9: { nombre: 'Cabaña 9 (Tiny)', tipo: 'te' },
};
const CAPACIDAD_DEFECTO: Record<Tipo, { paxBase: number; capacidadMax: number }> = {
  big: { paxBase: 4, capacidadMax: 6 },
  te: { paxBase: 2, capacidadMax: 4 },
  tj: { paxBase: 2, capacidadMax: 2 },
};

// ---------------------------------------------------------------- Helpers Supabase
async function rpc<T>(nombre: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`RPC ${nombre}: ${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}

interface ReglasXenia {
  checkinTime?: string;
  checkoutTime?: string;
  earlyCheckinInfo?: string;
  senaPorcentaje?: number;
  politicaCancelacion?: string;
  politicaMascotas?: string;
  serviciosIncluidos?: string;
  formasPago?: string;
  aliasBancario?: string;
  cbu?: string;
  contactoHumano?: string;
  ubicacion?: string;
  tarifas?: Partial<Record<Tipo, { precioARS?: number | ''; precioUSD?: number | ''; plusARS?: number | ''; plusUSD?: number | ''; paxBase?: number | ''; capacidadMax?: number | '' }>>;
}

let cacheReglas: { valor: ReglasXenia; hasta: number } | null = null;
async function reglasXenia(): Promise<ReglasXenia> {
  if (cacheReglas && cacheReglas.hasta > Date.now()) return cacheReglas.valor;
  try {
    const info = await rpc<{ xenia?: ReglasXenia }>('bananos_info_publica');
    cacheReglas = { valor: info?.xenia || {}, hasta: Date.now() + 60_000 };
  } catch (e) {
    console.warn('No se pudieron leer las reglas de Xenia:', e);
    cacheReglas = { valor: cacheReglas?.valor || {}, hasta: Date.now() + 15_000 };
  }
  return cacheReglas.valor;
}

const numOrNull = (v: unknown) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));

function capacidad(reglas: ReglasXenia, tipo: Tipo) {
  const t = reglas.tarifas?.[tipo] || {};
  return {
    paxBase: numOrNull(t.paxBase) ?? CAPACIDAD_DEFECTO[tipo].paxBase,
    capacidadMax: numOrNull(t.capacidadMax) ?? CAPACIDAD_DEFECTO[tipo].capacidadMax,
  };
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Cabañas libres entre dos fechas (las "sin asignar" ocupan un lugar de su tipo). */
async function cabanasLibres(checkin: string, checkout: string): Promise<string[]> {
  const filas = await rpc<Array<{ depto: string }>>('bananos_ocupadas', { p_desde: checkin, p_hasta: checkout });
  const ocupadas = new Set(filas.map(f => (f.depto || '').toUpperCase()));
  const libres = Object.keys(CABANAS).filter(c => !ocupadas.has(c));
  // Restar los "sin asignar" de cada tipo
  for (const tipo of ['big', 'te', 'tj'] as Tipo[]) {
    let sinAsignar = filas.filter(f => f.depto === `SA_${tipo}`).length;
    for (let i = libres.length - 1; i >= 0 && sinAsignar > 0; i--) {
      if (CABANAS[libres[i]].tipo === tipo) {
        libres.splice(i, 1);
        sinAsignar--;
      }
    }
  }
  return libres;
}

// ---------------------------------------------------------------- Auth del personal
async function usuarioDeToken(req: Request): Promise<{ id: string; rol: string } | null> {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u: any = await r.json();
  // El rol vive en la tabla bananos_usuarios: se consulta con el token del propio usuario
  const rr = await fetch(`${SB_URL}/rest/v1/rpc/bananos_mi_rol`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_ANON, Authorization: `Bearer ${token}` },
    body: '{}',
  });
  const rol = rr.ok ? await rr.json() : '';
  return { id: u.id, rol: typeof rol === 'string' ? rol : '' };
}

function requiereStaff(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const u = await usuarioDeToken(req);
      if (!u || !roles.includes(u.rol)) return res.status(401).json({ error: 'Necesitás iniciar sesión.' });
      (req as any).usuario = u;
      next();
    } catch {
      res.status(401).json({ error: 'Necesitás iniciar sesión.' });
    }
  };
}

// ---------------------------------------------------------------- Límite simple por IP
const visitas = new Map<string, number[]>();
function limitePorIp(max: number, ventanaMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'desconocida';
    const ahora = Date.now();
    const lista = (visitas.get(ip) || []).filter(t => ahora - t < ventanaMs);
    if (lista.length >= max) {
      return res.status(429).json({ error: 'Demasiados mensajes seguidos. Probá en unos minutos o escribinos por WhatsApp.' });
    }
    lista.push(ahora);
    visitas.set(ip, lista);
    if (visitas.size > 5000) visitas.clear();
    next();
  };
}

// ---------------------------------------------------------------- iCal de salida (para Airbnb / Booking)
app.get('/api/ical/:cabinCode.ics', async (req, res) => {
  const code = String(req.params.cabinCode || '').toUpperCase();
  if (!CABANAS[code]) return res.status(404).send('Cabaña no válida');
  try {
    const filas = await rpc<Array<{ id: string; checkin: string; checkout: string; plataforma: string }>>('bananos_ical_feed', { p_depto: code });
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cabanas Los Bananos//Calendario iCal v2//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Los Bananos - ${CABANAS[code].nombre}`,
      'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
    ];
    for (const r of filas) {
      if (!FECHA.test(r.checkin) || !FECHA.test(r.checkout)) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:reserva-${r.id}@woodcabiniguazu.com.ar`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${r.checkin.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${r.checkout.replace(/-/g, '')}`,
        `SUMMARY:${r.plataforma === 'Airbnb' ? 'Reserva Airbnb' : 'Reservado'}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(lines.join('\r\n'));
  } catch (e) {
    console.error('Error generando iCal:', e);
    res.status(500).send('Error interno');
  }
});

// ---------------------------------------------------------------- Proxy iCal de entrada (solo personal logueado)
const HOSTS_ICAL = [
  'calendar.google.com',
  'airbnb.com',
  'airbnb.com.ar',
  'airbnb.com.br',
  'airbnb.es',
  'booking.com',
  ...(process.env.ICAL_HOSTS_EXTRA || '').split(',').map(h => h.trim()).filter(Boolean),
];
const hostPermitido = (host: string) => HOSTS_ICAL.some(h => host === h || host.endsWith('.' + h));

app.get('/api/fetch-ical', requiereStaff(['admin', 'recepcion']), async (req, res) => {
  const url = String(req.query.url || '').trim();
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL no válida' });
  }
  if (destino.protocol !== 'https:' || !hostPermitido(destino.hostname)) {
    return res.status(400).json({ error: 'Solo se aceptan calendarios de Google Calendar, Airbnb o Booking (https).' });
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    const r = await fetch(destino, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LosBananosPMS/2.0', Accept: 'text/calendar, text/plain, */*' },
    });
    clearTimeout(t);
    const final = new URL(r.url);
    if (!hostPermitido(final.hostname)) return res.status(400).json({ error: 'El calendario redirigió a un sitio no permitido.' });
    if (!r.ok) return res.status(502).json({ error: `El calendario respondió ${r.status}. ¿La URL secreta sigue vigente?` });
    const texto = await r.text();
    if (texto.length > 5_000_000) return res.status(413).json({ error: 'Calendario demasiado grande' });
    if (!texto.includes('BEGIN:VCALENDAR')) return res.status(422).json({ error: 'La URL no devolvió un calendario iCal.' });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.status(200).send(texto);
  } catch (e: any) {
    res.status(502).json({ error: e?.name === 'AbortError' ? 'El calendario tardó demasiado en responder.' : 'No se pudo descargar el calendario.' });
  }
});

// ---------------------------------------------------------------- Reglas de Xenia (solo lectura)
app.get('/api/xenia/rules', async (_req, res) => {
  res.json({ rules: await reglasXenia(), cabanas: CABANAS });
});
app.post('/api/xenia/rules', (_req, res) => {
  res.status(410).json({ error: 'Las reglas se editan desde la app (Xenia → Reglas), con sesión de propietario.' });
});

// ---------------------------------------------------------------- Herramientas de Xenia
async function toolDisponibilidad(checkin: string, checkout: string, pax?: number) {
  if (!FECHA.test(checkin) || !FECHA.test(checkout) || checkout <= checkin) {
    return { error: 'Fechas inválidas. Usar YYYY-MM-DD y salida posterior a la llegada.' };
  }
  const reglas = await reglasXenia();
  const libres = await cabanasLibres(checkin, checkout);
  const detalle = libres.map(code => {
    const tipo = CABANAS[code].tipo;
    const cap = capacidad(reglas, tipo);
    return { codigo: code, nombre: CABANAS[code].nombre, tipo, capacidadMax: cap.capacidadMax, aptaParaPax: pax ? pax <= cap.capacidadMax : true };
  });
  const aptas = pax ? detalle.filter(c => c.aptaParaPax) : detalle;
  return { fechas: { checkin, checkout }, paxSolicitados: pax || 'no especificado', totalCabanasDisponibles: aptas.length, cabanasDisponibles: aptas };
}

async function toolCotizar(cabana: string, checkin: string, checkout: string, pax = 2, moneda: 'ARS' | 'USD' = 'ARS') {
  const code = String(cabana || '').toUpperCase();
  if (!CABANAS[code]) return { error: 'Cabaña inexistente' };
  if (!FECHA.test(checkin) || !FECHA.test(checkout) || checkout <= checkin) return { error: 'Fechas inválidas' };
  const reglas = await reglasXenia();
  const tipo = CABANAS[code].tipo;
  const t = reglas.tarifas?.[tipo] || {};
  const precioNoche = numOrNull(moneda === 'USD' ? t.precioUSD : t.precioARS);
  if (precioNoche === null || precioNoche <= 0) {
    return { sinTarifa: true, mensaje: 'No hay tarifa cargada para esa cabaña/moneda: derivar a una persona para cotizar.' };
  }
  const plusNoche = numOrNull(moneda === 'USD' ? t.plusUSD : t.plusARS) ?? 0;
  const cap = capacidad(reglas, tipo);
  if (pax > cap.capacidadMax) return { error: `La cabaña admite hasta ${cap.capacidadMax} personas.` };
  const noches = Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86_400_000);
  const extra = Math.max(0, pax - cap.paxBase);
  const porNoche = precioNoche + extra * plusNoche;
  const total = porNoche * noches;
  const senaPct = Number(reglas.senaPorcentaje) || 50;
  const sena = Math.round((total * senaPct) / 100);
  return {
    cabana: CABANAS[code].nombre,
    codigo: code,
    fechas: { checkin, checkout },
    noches,
    pasajeros: pax,
    moneda,
    tarifaFinalPorNoche: porNoche,
    montoTotal: total,
    senaPorcentaje: senaPct,
    montoSena: sena,
    saldoAlIngreso: total - sena,
    aliasTransferencia: reglas.aliasBancario || null,
  };
}

async function toolAsentar(args: any, canal: string) {
  if (!SB_SERVICE) {
    return { exito: false, guardadoEnBaseDeDatos: false, mensaje: 'El registro automático no está activado: tomá los datos y avisá que una persona confirma por WhatsApp.' };
  }
  const code = String(args.cabana || '').toUpperCase();
  const huesped = String(args.huesped || '').trim().slice(0, 120);
  const telefono = String(args.telefono || '').trim().slice(0, 40);
  if (!CABANAS[code] || !huesped || !telefono) return { exito: false, error: 'Faltan datos (cabaña, nombre o teléfono).' };
  const moneda: 'ARS' | 'USD' = args.moneda === 'USD' ? 'USD' : 'ARS';
  const pax = Math.max(1, Math.min(12, Number(args.pax) || 2));
  const cot: any = await toolCotizar(code, args.checkin, args.checkout, pax, moneda);
  if (cot.error || cot.sinTarifa) return { exito: false, ...cot };

  // Re-chequear disponibilidad justo antes de grabar
  const libres = await cabanasLibres(args.checkin, args.checkout);
  if (!libres.includes(code)) return { exito: false, error: 'Esa cabaña ya no está disponible para esas fechas.' };

  const id = 'XN-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex');
  const plataforma = canal === 'instagram' ? 'Instagram' : 'Directo';
  const nueva = {
    id,
    depto: code,
    huesped,
    tel: telefono,
    checkin: args.checkin,
    checkout: args.checkout,
    precio: cot.tarifaFinalPorNoche, // ya incluye el plus por pasajeros extra
    plus: 0,
    pax,
    plataforma,
    estado: 'Pendiente',
    sena: 0,
    saldo: 0,
    notas: `[Xenia ${canal}] ${String(args.notas || '').slice(0, 300)} Seña pedida: ${cot.montoSena} ${moneda}.${moneda === 'USD' ? ' [USD]' : ''}`.trim(),
    creado: new Date().toISOString(),
  };
  const r = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, Prefer: 'return=minimal' },
    body: JSON.stringify(nueva),
  });
  if (!r.ok) {
    console.error('Xenia no pudo grabar la reserva:', r.status, await r.text());
    return { exito: false, guardadoEnBaseDeDatos: false, error: 'No se pudo registrar. Derivar a una persona.' };
  }
  return {
    exito: true,
    guardadoEnBaseDeDatos: true,
    reservaId: id,
    reserva: nueva,
    resumen: { ...cot, estado: 'Pendiente de seña', instruccionesPago: cot.aliasTransferencia ? `Transferir la seña al alias ${cot.aliasTransferencia} y mandar el comprobante.` : 'Una persona te pasa los datos para la seña.' },
  };
}

function promptSistema(reglas: ReglasXenia, canal: string) {
  const v = (x?: string) => (x && x.trim() ? x.trim() : null);
  const lineas = [
    `Sos Xenia, la anfitriona virtual de "Cabañas Los Bananos" (Wood Cabin Iguazú) en Puerto Iguazú, Misiones. Atendés por ${canal.toUpperCase()}.`,
    'Respondé cálida y breve, en español rioplatense. Hoy es ' + new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) + '.',
    'REGLA DE ORO: nunca inventes datos (precios, servicios, cuentas bancarias, políticas). Si algo no figura abajo o una herramienta no lo devuelve, decí que lo confirma una persona' +
      (v(reglas.contactoHumano) ? ` por WhatsApp al ${reglas.contactoHumano}` : '') + '.',
    '',
    'DATOS CARGADOS POR EL PROPIETARIO:',
    `- Check-in desde las ${v(reglas.checkinTime) || '(no cargado)'} · Check-out hasta las ${v(reglas.checkoutTime) || '(no cargado)'}.`,
    v(reglas.earlyCheckinInfo) ? `- ${reglas.earlyCheckinInfo}` : '',
    v(reglas.politicaCancelacion) ? `- Cancelación: ${reglas.politicaCancelacion}` : '- Cancelación: (no cargada)',
    v(reglas.politicaMascotas) ? `- Mascotas: ${reglas.politicaMascotas}` : '- Mascotas: (no cargado)',
    v(reglas.serviciosIncluidos) ? `- Servicios: ${reglas.serviciosIncluidos}` : '- Servicios: (no cargado)',
    reglas.senaPorcentaje ? `- Seña para confirmar: ${reglas.senaPorcentaje}%` : '',
    v(reglas.aliasBancario) ? `- Alias para la seña: ${reglas.aliasBancario}` : '- Datos de pago: los pasa una persona',
    v(reglas.cbu) ? `- CBU/CVU: ${reglas.cbu}` : '',
    '',
    'CABAÑAS: 2 y 3 (Big), 5, 6, 8 y 9 (Tiny), 7 (Tiny con jacuzzi, para parejas).',
    '',
    'HERRAMIENTAS:',
    "1. Para disponibilidad, llamá a 'consultar_disponibilidad'.",
    "2. Para precios, llamá a 'cotizar_estadia'. Si devuelve sinTarifa, NO des un precio: derivá a una persona.",
    "3. SOLO llamá a 'asentar_reserva' si el huésped CONFIRMÓ explícitamente y tenés nombre, teléfono, cabaña y fechas. Queda PENDIENTE hasta que pague la seña. Si la herramienta no la guarda, decí que una persona la confirma.",
  ];
  return lineas.filter(l => l !== '').join('\n');
}

const herramientas: any = [
  {
    functionDeclarations: [
      {
        name: 'consultar_disponibilidad',
        description: 'Cabañas libres entre dos fechas, filtradas por cantidad de huéspedes.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            checkin: { type: Type.STRING, description: 'YYYY-MM-DD' },
            checkout: { type: Type.STRING, description: 'YYYY-MM-DD' },
            pax: { type: Type.NUMBER, description: 'Cantidad de huéspedes (opcional)' },
          },
          required: ['checkin', 'checkout'],
        },
      },
      {
        name: 'cotizar_estadia',
        description: 'Presupuesto con las tarifas cargadas por el propietario. Puede devolver sinTarifa.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            cabana: { type: Type.STRING, description: 'C2, C3, C5, C6, C7, C8 o C9' },
            checkin: { type: Type.STRING },
            checkout: { type: Type.STRING },
            pax: { type: Type.NUMBER },
            moneda: { type: Type.STRING, description: 'ARS o USD' },
          },
          required: ['cabana', 'checkin', 'checkout'],
        },
      },
      {
        name: 'asentar_reserva',
        description: 'Registra una reserva PENDIENTE de seña. Solo con confirmación explícita del huésped.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            huesped: { type: Type.STRING },
            telefono: { type: Type.STRING },
            cabana: { type: Type.STRING },
            checkin: { type: Type.STRING },
            checkout: { type: Type.STRING },
            pax: { type: Type.NUMBER },
            notas: { type: Type.STRING },
            moneda: { type: Type.STRING },
          },
          required: ['huesped', 'telefono', 'cabana', 'checkin', 'checkout'],
        },
      },
    ],
  },
];

async function ejecutarHerramienta(nombre: string, args: any, canal: string) {
  try {
    if (nombre === 'consultar_disponibilidad') return await toolDisponibilidad(args.checkin, args.checkout, args.pax);
    if (nombre === 'cotizar_estadia') return await toolCotizar(args.cabana, args.checkin, args.checkout, args.pax, args.moneda === 'USD' ? 'USD' : 'ARS');
    if (nombre === 'asentar_reserva') return await toolAsentar(args, canal);
  } catch (e: any) {
    console.error(`Error en herramienta ${nombre}:`, e);
    return { error: 'No se pudo consultar ahora.' };
  }
  return { error: 'Herramienta desconocida' };
}

const conTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// ---------------------------------------------------------------- Chat de Xenia (web / landing / guía)
app.post('/api/xenia/chat', limitePorIp(20, 10 * 60_000), async (req, res) => {
  const { message, history = [], channel = 'web' } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 1000) {
    return res.status(400).json({ error: 'Mensaje requerido (máx. 1000 caracteres)' });
  }
  const canal = ['web', 'whatsapp', 'instagram'].includes(channel) ? channel : 'web';
  const toolExecutions: Array<{ name: string; args: any; result: any }> = [];
  let reservaCreada: any = null;
  let guardado = false;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const reglas = await reglasXenia();
      const contents: any[] = (Array.isArray(history) ? history : [])
        .slice(-8)
        .filter((h: any) => h && typeof h.text === 'string')
        .map((h: any) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text.slice(0, 1000) }] }));
      contents.push({ role: 'user', parts: [{ text: message }] });
      const config = { systemInstruction: promptSistema(reglas, canal), tools: herramientas };

      let resp = await conTimeout(ai.models.generateContent({ model: GEMINI_MODEL, contents, config }), 15_000);
      let cand: any = resp.candidates?.[0];
      let llamadas = cand?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
      let vueltas = 3;
      while (llamadas.length && vueltas-- > 0) {
        const respuestas: any[] = [];
        for (const fc of llamadas) {
          const resultado: any = await ejecutarHerramienta(fc.name, fc.args || {}, canal);
          toolExecutions.push({ name: fc.name, args: fc.args, result: resultado });
          if (fc.name === 'asentar_reserva' && resultado?.guardadoEnBaseDeDatos) {
            reservaCreada = resultado.reserva;
            guardado = true;
          }
          respuestas.push({ functionResponse: { name: fc.name, response: { result: resultado } } });
        }
        if (cand?.content) contents.push(cand.content);
        contents.push({ role: 'user', parts: respuestas });
        resp = await conTimeout(ai.models.generateContent({ model: GEMINI_MODEL, contents, config }), 15_000);
        cand = resp.candidates?.[0];
        llamadas = cand?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
      }
      return res.json({
        reply: resp.text || '¡Hola! ¿Para qué fechas y cuántas personas serían?',
        toolExecutions,
        reservaCreada,
        guardadoEnBaseDeDatos: guardado,
        source: GEMINI_MODEL,
      });
    } catch (e) {
      console.error('Error con Gemini:', e);
    }
  }

  // Respaldo sin IA: respuestas solo con datos cargados (nada inventado)
  const reglas = await reglasXenia();
  const q = message.toLowerCase();
  let reply = '¡Hola! Gracias por escribir a Cabañas Los Bananos 🌿 ¿Para qué fechas y cuántas personas serían?';
  if (/check.?in|check.?out|horario|hora/.test(q) && reglas.checkinTime) {
    reply = `El ingreso es a partir de las ${reglas.checkinTime} hs y la salida hasta las ${reglas.checkoutTime || '—'} hs.`;
  } else if (/perro|mascota|gato/.test(q) && reglas.politicaMascotas) {
    reply = reglas.politicaMascotas;
  } else if (/cancel|seña|pago/.test(q) && reglas.politicaCancelacion) {
    reply = reglas.politicaCancelacion;
  }
  if (reglas.contactoHumano) reply += ` Para reservar escribinos por WhatsApp al ${reglas.contactoHumano}.`;
  res.json({ reply, toolExecutions, reservaCreada: null, guardadoEnBaseDeDatos: false, source: 'respaldo' });
});

// ---------------------------------------------------------------- Webhook de Meta (WhatsApp / Instagram)
app.get('/api/webhook/meta', (req, res) => {
  const esperado = process.env.META_VERIFY_TOKEN;
  if (esperado && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === esperado) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  res.status(403).send('Forbidden');
});

function firmaMetaValida(req: any): boolean {
  const secreto = process.env.META_APP_SECRET;
  const firma = String(req.headers['x-hub-signature-256'] || '');
  if (!secreto || !firma.startsWith('sha256=') || !req.rawBody) return false;
  const esperada = 'sha256=' + crypto.createHmac('sha256', secreto).update(req.rawBody).digest('hex');
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/api/webhook/meta', async (req: any, res) => {
  res.status(200).send('EVENT_RECEIVED');
  // Sin firma válida no se responde nada (si no, cualquiera podría hacer que mandemos WhatsApps)
  if (!firmaMetaValida(req)) {
    console.warn('[Meta Webhook] Evento ignorado: firma inválida o META_APP_SECRET no configurado');
    return;
  }
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const texto = msg?.text?.body;
    if (!texto) return;
    const desde = String(msg.from || '');
    const canal = req.body.object === 'instagram' ? 'instagram' : 'whatsapp';
    const reglas = await reglasXenia();
    let reply = '¡Hola! Gracias por escribir a Cabañas Los Bananos. ¿Para qué fechas y cuántas personas?';
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const r = await conTimeout(
          ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: String(texto).slice(0, 1000) }] }],
            config: { systemInstruction: promptSistema(reglas, canal) },
          }),
          15_000
        );
        if (r.text) reply = r.text;
      } catch (e) {
        console.warn('[Meta Webhook] Gemini falló, respuesta por defecto');
      }
    }
    const token = process.env.META_ACCESS_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;
    if (token && phoneId && canal === 'whatsapp') {
      await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: desde, type: 'text', text: { body: reply } }),
      });
    }
  } catch (e) {
    console.error('[Meta Webhook] Error:', e);
  }
});

// ---------------------------------------------------------------- Front
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // No servir el propio código del servidor ni sus mapas
    app.use((req, res, next) => (/^\/server\.cjs/.test(req.path) ? res.status(404).end() : next()));
    app.use(express.static(distPath, { index: 'index.html' }));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en http://0.0.0.0:${PORT}`));
}

startServer();
