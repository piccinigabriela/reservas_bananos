import express from 'express';
import path from 'path';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Configuración de Supabase para leer y asentar reservas en vivo
const SB_URL = 'https://vnfgitgadadjjjciftsa.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';
const SB_TABLE = 'reservas_bananos';

const CABANAS_INFO: Record<string, { nombre: string; tipo: 'big' | 'tj' | 'te'; capacidadMax: number; paxBase: number; precioARS: number; precioUSD: number; plusARS: number; plusUSD: number; descripcion: string }> = {
  C2: { nombre: 'Cabaña 2 (Big)', tipo: 'big', capacidadMax: 6, paxBase: 4, precioARS: 75000, precioUSD: 50, plusARS: 12000, plusUSD: 8, descripcion: 'Cabaña amplia con 2 habitaciones, living, cocina y terraza privada, ideal para familias de 4 a 6 personas.' },
  C3: { nombre: 'Cabaña 3 (Big)', tipo: 'big', capacidadMax: 6, paxBase: 4, precioARS: 75000, precioUSD: 50, plusARS: 12000, plusUSD: 8, descripcion: 'Cabaña espaciosa con 2 dormitorios, parrilla y vista a la selva misionera.' },
  C5: { nombre: 'Cabaña 5 (Tiny)', tipo: 'te', capacidadMax: 4, paxBase: 2, precioARS: 52000, precioUSD: 35, plusARS: 10000, plusUSD: 7, descripcion: 'Tiny house de diseño compacto y moderno para 2 a 4 personas con cocina completa y deck privado.' },
  C6: { nombre: 'Cabaña 6 (Tiny)', tipo: 'te', capacidadMax: 4, paxBase: 2, precioARS: 52000, precioUSD: 35, plusARS: 10000, plusUSD: 7, descripcion: 'Tiny house acogedora y luminosa rodeada de vegetación autóctona.' },
  C7: { nombre: 'Cabaña 7 (Tiny Jacuzzi)', tipo: 'tj', capacidadMax: 2, paxBase: 2, precioARS: 68000, precioUSD: 45, plusARS: 0, plusUSD: 0, descripcion: 'Nuestra cabaña romántica exclusiva para parejas, con hidromasaje/jacuzzi privado en el deck exterior.' },
  C8: { nombre: 'Cabaña 8 (Tiny)', tipo: 'te', capacidadMax: 4, paxBase: 2, precioARS: 52000, precioUSD: 35, plusARS: 10000, plusUSD: 7, descripcion: 'Tiny house confortable con aire frío/calor, parrilla individual y cocina equipada.' },
  C9: { nombre: 'Cabaña 9 (Tiny)', tipo: 'te', capacidadMax: 4, paxBase: 2, precioARS: 52000, precioUSD: 35, plusARS: 10000, plusUSD: 7, descripcion: 'Tiny house tranquila al final del complejo con excelente privacidad.' },
};

const CABANAS_NOMBRES: Record<string, string> = Object.fromEntries(
  Object.entries(CABANAS_INFO).map(([k, v]) => [k, v.nombre])
);

// Reglas de negocio y Base de Conocimiento de Cabañas Los Bananos
let xeniaRules = {
  checkinTime: '14:00',
  checkoutTime: '10:00',
  earlyCheckinInfo: 'El early check-in o late check-out está sujeto a disponibilidad el día previo y puede tener un costo adicional.',
  senaPorcentaje: 50,
  politicaCancelacion: 'Cancelación gratuita hasta 14 días antes del check-in con reintegro total. Entre 7 y 14 días se reprograma la fecha según disponibilidad. Con menos de 7 días no reembolsable.',
  politicaMascotas: 'Aceptamos mascotas educadas en cabañas seleccionadas con aviso previo. Se solicita cuidado del mobiliario y mantenerla con correa en áreas comunes.',
  serviciosIncluidos: 'Piscina común, kayaks y muelle, wifi de alta velocidad, parrilla individual en cada cabaña, aire acondicionado frío/calor, ropa de cama y toallas, estacionamiento dentro del predio.',
  formasPago: 'Transferencia bancaria en pesos (al tipo de cambio del día para señar), o en efectivo/dólares al llegar.',
  aliasBancario: 'los.bananos.iguazu',
  cbu: '0000003100098765432100',
  contactoHumano: '+54 9 3757 55-1234',
  ubicacion: 'Puerto Iguazú, Misiones, a minutos del Parque Nacional Cataratas y a 5 minutos del centro.',
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

// Proxy seguro para obtener calendarios iCal externos (Google Calendar, Airbnb, Booking) sin problemas de CORS
app.get('/api/fetch-ical', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const cleanUrl = decodeURIComponent(targetUrl).trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'URL no válida' });
    }

    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BananosCalendar/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Error remoto del servidor de calendario (${response.status})` });
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    return res.status(200).send(text);
  } catch (err: any) {
    console.error('Error en /api/fetch-ical proxy:', err);
    return res.status(500).json({ error: err.message || 'Error descargando calendario' });
  }
});

// Helper: Consultar reservas activas desde Supabase
async function fetchSupabaseReservas(): Promise<any[]> {
  try {
    const response = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}?select=*`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
      },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Fallo leyendo Supabase, operando con estado local:', err);
  }
  return [];
}

// Helper: Guardar nueva reserva en Supabase
async function insertSupabaseReserva(reserva: any): Promise<boolean> {
  try {
    const response = await fetch(`${SB_URL}/rest/v1/${SB_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(reserva),
    });
    return response.ok;
  } catch (err) {
    console.error('Error guardando en Supabase:', err);
    return false;
  }
}

// Herramienta 1: Consultar disponibilidad
async function toolConsultarDisponibilidad(checkin: string, checkout: string, pax?: number) {
  const reservas = await fetchSupabaseReservas();
  const cIn = checkin.trim();
  const cOut = checkout.trim();

  // Filtrar cabañas ocupadas
  const ocupadas = new Set<string>();
  for (const r of reservas) {
    if (r.estado === 'Cancelada' || r.estado === 'Non show' || !r.checkin || !r.checkout) continue;
    // Solapamiento: el rango se cruza si !(r.checkout <= cIn || r.checkin >= cOut)
    const seCruzan = !(r.checkout <= cIn || r.checkin >= cOut);
    if (seCruzan && r.depto) {
      ocupadas.add(r.depto.toUpperCase());
    }
  }

  const cabanasCodigos = ['C2', 'C3', 'C5', 'C6', 'C7', 'C8', 'C9'];
  const disponibles = cabanasCodigos
    .filter(code => !ocupadas.has(code))
    .map(code => {
      const info = CABANAS_INFO[code];
      return {
        codigo: code,
        nombre: info.nombre,
        tipo: info.tipo,
        capacidadMax: info.capacidadMax,
        tarifaNocheARS: info.precioARS,
        tarifaNocheUSD: info.precioUSD,
        aptaParaPax: pax ? pax <= info.capacidadMax : true,
        descripcion: info.descripcion,
      };
    });

  const aptas = pax ? disponibles.filter(c => c.aptaParaPax) : disponibles;

  return {
    fechas: { checkin: cIn, checkout: cOut },
    paxSolicitados: pax || 'no especificado',
    totalCabanasDisponibles: aptas.length,
    cabanasDisponibles: aptas,
    todasDisponibles: disponibles,
    ocupadas: Array.from(ocupadas),
  };
}

// Herramienta 2: Cotizar estadía
function toolCotizarEstadia(cabanaCode: string, checkin: string, checkout: string, pax: number = 2, moneda: 'ARS' | 'USD' = 'ARS') {
  const code = (cabanaCode || 'C5').toUpperCase();
  const info = CABANAS_INFO[code] || CABANAS_INFO['C5'];
  const start = new Date(checkin);
  const end = new Date(checkout);
  const noches = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

  const precioNoche = moneda === 'USD' ? info.precioUSD : info.precioARS;
  const plusNoche = moneda === 'USD' ? info.plusUSD : info.plusARS;
  const pasajerosExtra = Math.max(0, pax - info.paxBase);
  const totalPlusNoche = pasajerosExtra * plusNoche;
  const subtotalPorNoche = precioNoche + totalPlusNoche;
  const montoTotal = subtotalPorNoche * noches;
  const montoSena = Math.round((montoTotal * xeniaRules.senaPorcentaje) / 100);
  const saldoAlIngreso = montoTotal - montoSena;

  return {
    cabana: info.nombre,
    codigo: code,
    fechas: { checkin, checkout },
    noches,
    pasajeros: pax,
    moneda,
    tarifaBaseNoche: precioNoche,
    plusPasajeroExtraNoche: totalPlusNoche,
    tarifaFinalPorNoche: subtotalPorNoche,
    montoTotal,
    señaRequeridaPorcentaje: `${xeniaRules.senaPorcentaje}%`,
    montoSena,
    saldoAlIngreso,
    aliasTransferencia: xeniaRules.aliasBancario,
  };
}

// Herramienta 3: Asentar reserva en el sistema
async function toolAsentarReserva(args: {
  huesped: string;
  telefono: string;
  cabana: string;
  checkin: string;
  checkout: string;
  pax?: number;
  notas?: string;
  canal?: string;
  moneda?: 'ARS' | 'USD';
}) {
  const code = (args.cabana || 'C5').toUpperCase();
  const info = CABANAS_INFO[code] || CABANAS_INFO['C5'];
  const moneda = args.moneda || 'ARS';
  const pax = args.pax || info.paxBase;
  const cotizacion = toolCotizarEstadia(code, args.checkin, args.checkout, pax, moneda);

  const reservaId = 'XN-' + Date.now().toString(36).toUpperCase();
  const nuevaReserva = {
    id: reservaId,
    depto: code,
    huesped: args.huesped.trim(),
    tel: args.telefono ? args.telefono.trim() : '',
    checkin: args.checkin.trim(),
    checkout: args.checkout.trim(),
    precio: cotizacion.tarifaBaseNoche,
    moneda: moneda,
    pax: pax,
    plus: cotizacion.plusPasajeroExtraNoche,
    plataforma: args.canal || 'WhatsApp',
    estado: 'Pendiente',
    sena: cotizacion.montoSena,
    saldo: cotizacion.saldoAlIngreso,
    notas: `[Agente Xenia ${args.canal || 'Chat'}] ${args.notas || 'Reserva automática generada con confirmación del huésped'}. Seña pendiente: ${cotizacion.montoSena} ${moneda}`,
    creado: new Date().toISOString(),
  };

  const guardadoEnSupabase = await insertSupabaseReserva(nuevaReserva);

  return {
    exito: true,
    reservaId,
    guardadoEnBaseDeDatos: guardadoEnSupabase,
    reserva: nuevaReserva,
    resumen: {
      huesped: nuevaReserva.huesped,
      cabana: info.nombre,
      checkin: nuevaReserva.checkin,
      checkout: nuevaReserva.checkout,
      noches: cotizacion.noches,
      total: cotizacion.montoTotal,
      seña: cotizacion.montoSena,
      moneda,
      estado: 'Pendiente de seña (50%)',
      instruccionesPago: `Transferir la seña al alias ${xeniaRules.aliasBancario} y enviar el comprobante para confirmar definitivamente.`,
    },
  };
}

// Configuración y reglas de Xenia
app.get('/api/xenia/rules', (req, res) => {
  res.json({ rules: xeniaRules, cabanas: CABANAS_INFO });
});

app.post('/api/xenia/rules', (req, res) => {
  const newRules = req.body;
  xeniaRules = { ...xeniaRules, ...newRules };
  res.json({ ok: true, rules: xeniaRules });
});

// Endpoint principal: Chat del Agente Xenia (para WhatsApp, Instagram o Landing Web)
app.post('/api/xenia/chat', async (req, res) => {
  const { message, history = [], channel = 'web', guestName, guestPhone } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  const toolExecutions: Array<{ name: string; args: any; result: any }> = [];
  let reservaCreada: any = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `Sos Xenia, la anfitriona y agente virtual oficial de "Cabañas Los Bananos" en Puerto Iguazú, Misiones.
Tu rol es atender a futuros huéspedes que escriben por ${channel.toUpperCase()} de manera cordial, cálida, profesional y alegre con acento argentino/misionero sutil.
Podés interpretar mensajes informales, calcular fechas exactas (hoy es ${new Date().toISOString().split('T')[0]}), resolver dudas de la guía y usar tus HERRAMIENTAS estrictamente cuando corresponda.

REGLAS DE NEGOCIO Y GUÍA DE LOS BANANOS:
- Ubicación: Puerto Iguazú, Misiones (cerca de Cataratas y selva).
- Horarios: Check-in a partir de las ${xeniaRules.checkinTime} hs. Check-out hasta las ${xeniaRules.checkoutTime} hs.
- ${xeniaRules.earlyCheckinInfo}
- Políticas de Seña y Cancelación: Se requiere el ${xeniaRules.senaPorcentaje}% de seña para confirmar la reserva. ${xeniaRules.politicaCancelacion}
- Mascotas: ${xeniaRules.politicaMascotas}
- Servicios y comodidades: ${xeniaRules.serviciosIncluidos}
- Pagos: ${xeniaRules.formasPago}. Alias: ${xeniaRules.aliasBancario}. CBU: ${xeniaRules.cbu}.

NUESTRAS CABAÑAS:
- Cabaña 2 y 3 (Big): capacidad de 4 a 6 personas.
- Cabaña 7 (Tiny Jacuzzi): exclusiva parejas, 2 personas, hidromasaje privado en el deck.
- Cabañas 5, 6, 8 y 9 (Tiny): 2 a 4 personas.

LAS 6 PLANTILLAS INTELIGENTES DE WHATSAPP Y BLINDAJE ANTI-QUEJAS:
1. tpl-1: Confirmación y Bienvenida Anticipada (Día 1) -> Bienvenida en plural de cortesía con link a la Guía Digital.
2. tpl-5: Coordinación en Ruta / Día de Viaje -> Para coordinar demoras y pedir ubicación en tiempo real 30-40 min antes.
3. tpl-2: Instrucciones de Auto Check-in y Clave Wi-Fi -> Ubicación GPS, código de cerradura/llave y clave Wi-Fi.
4. tpl-6: Control de Confort (2hs Post-Ingreso) - Blindaje Anti-Quejas -> Para chequear que todo esté impecable (aire, agua caliente, toallas) y resolver cualquier detalle en privado antes de que se transforme en una mala reseña.
5. tpl-3: Recordatorio de Check-out Amable -> Noche anterior a las 20hs para recordar salida 10hs y organizar mucamas.
6. tpl-4: Solicitud de Reseña 5 Estrellas y Descuento Directo -> 2hs post-salida con código BANANOS10 (10% off directo).
Si el usuario pregunta para qué sirven las plantillas de WhatsApp o qué es el blindaje anti-quejas, explicáselo en detalle y con claridad.

POLÍTICA DE INVOCACIÓN DE HERRAMIENTAS:
1. Si el huésped consulta disponibilidad para ciertas fechas o cantidad de personas, LLAMÁ a 'consultar_disponibilidad'.
2. Si quiere saber el precio exacto o cotización para una cabaña, LLAMÁ a 'cotizar_estadia'.
3. CRÍTICO: SOLO llamá a 'asentar_reserva' cuando el huésped haya CONFIRMADO EXPLÍCITAMENTE que quiere reservar, y se cuente con su nombre, teléfono y fechas definidas. Si faltan datos, pedíselos amablemente sin inventar.`;

      const toolsConfig: any = [
        {
          functionDeclarations: [
            {
              name: 'consultar_disponibilidad',
              description: 'Consulta cabañas libres en Los Bananos entre dos fechas y filtra por cantidad de huéspedes.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  checkin: { type: Type.STRING, description: 'Fecha de check-in en formato YYYY-MM-DD' },
                  checkout: { type: Type.STRING, description: 'Fecha de check-out en formato YYYY-MM-DD' },
                  pax: { type: Type.NUMBER, description: 'Cantidad total de huéspedes (opcional)' },
                },
                required: ['checkin', 'checkout'],
              },
            },
            {
              name: 'cotizar_estadia',
              description: 'Calcula el presupuesto exacto, noches, tarifa por noche, monto de seña (50%) y saldo al ingreso.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  cabana: { type: Type.STRING, description: 'Código de la cabaña (C2, C3, C5, C6, C7, C8, C9)' },
                  checkin: { type: Type.STRING, description: 'Fecha de check-in YYYY-MM-DD' },
                  checkout: { type: Type.STRING, description: 'Fecha de check-out YYYY-MM-DD' },
                  pax: { type: Type.NUMBER, description: 'Cantidad de personas' },
                  moneda: { type: Type.STRING, description: 'Moneda preferida: ARS o USD' },
                },
                required: ['cabana', 'checkin', 'checkout'],
              },
            },
            {
              name: 'asentar_reserva',
              description: 'Registra y bloquea una reserva en el calendario oficial de Los Bananos. Solo llamar cuando el huésped confirmó explícitamente.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  huesped: { type: Type.STRING, description: 'Nombre y apellido del huésped' },
                  telefono: { type: Type.STRING, description: 'Número de WhatsApp o teléfono del huésped' },
                  cabana: { type: Type.STRING, description: 'Código de cabaña elegida (C2, C3, C5, C6, C7, C8, C9)' },
                  checkin: { type: Type.STRING, description: 'Fecha de ingreso YYYY-MM-DD' },
                  checkout: { type: Type.STRING, description: 'Fecha de egreso YYYY-MM-DD' },
                  pax: { type: Type.NUMBER, description: 'Cantidad de personas' },
                  notas: { type: Type.STRING, description: 'Aclaraciones, mascota o pedidos' },
                  moneda: { type: Type.STRING, description: 'Moneda: ARS o USD' },
                  canal: { type: Type.STRING, description: 'Canal de origen (WhatsApp, Instagram, Web)' },
                },
                required: ['huesped', 'telefono', 'cabana', 'checkin', 'checkout'],
              },
            },
          ],
        },
      ];

      // Formatear historial para Gemini
      const formattedContents: any[] = [];
      for (const h of history.slice(-8)) {
        formattedContents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      }
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // Primer llamado a Gemini
      let geminiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          tools: toolsConfig,
        },
      });

      // Si Gemini decide llamar a herramientas (Function Calling)
      let candidate = geminiRes.candidates?.[0];
      let functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall);

      let loopLimit = 3;
      while (functionCalls && functionCalls.length > 0 && loopLimit > 0) {
        loopLimit--;
        const toolResponsesParts: any[] = [];

        for (const fc of functionCalls) {
          const fnName = fc.name;
          const fnArgs = fc.args || {};
          let resultData: any = null;

          if (fnName === 'consultar_disponibilidad') {
            resultData = await toolConsultarDisponibilidad(fnArgs.checkin, fnArgs.checkout, fnArgs.pax);
          } else if (fnName === 'cotizar_estadia') {
            resultData = toolCotizarEstadia(fnArgs.cabana, fnArgs.checkin, fnArgs.checkout, fnArgs.pax, fnArgs.moneda);
          } else if (fnName === 'asentar_reserva') {
            resultData = await toolAsentarReserva({
              ...fnArgs,
              canal: fnArgs.canal || channel,
            });
            reservaCreada = resultData.reserva;
          }

          toolExecutions.push({ name: fnName, args: fnArgs, result: resultData });

          toolResponsesParts.push({
            functionResponse: {
              name: fnName,
              response: { result: resultData },
            },
          });
        }

        // Agregar el turno del modelo con sus llamados a funciones
        if (candidate?.content) {
          formattedContents.push(candidate.content);
        }
        // Agregar la respuesta de las herramientas
        formattedContents.push({
          role: 'user',
          parts: toolResponsesParts,
        });

        // Volver a llamar a Gemini para que elabore la respuesta natural al huésped
        geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction,
            tools: toolsConfig,
          },
        });

        candidate = geminiRes.candidates?.[0];
        functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall);
      }

      const replyText = geminiRes.text || '¡Hola! En Los Bananos estamos a tu disposición. ¿En qué fechas tenías pensado visitarnos?';

      return res.json({
        reply: replyText,
        toolExecutions,
        reservaCreada,
        source: 'gemini-3.8-flash',
      });
    }
  } catch (err: any) {
    console.error('Error invocando Gemini API en Xenia:', err);
  }

  // Motor Heurístico Resiliente (Fallback inteligente si no hay API key o hay error de red)
  const qLower = message.toLowerCase();
  let botReply = '';

  if (qLower.includes('check in') || qLower.includes('check-in') || qLower.includes('horario') || qLower.includes('hora')) {
    botReply = `¡Hola! Nuestro horario de ingreso (check-in) es a partir de las ${xeniaRules.checkinTime} hs y la salida (check-out) es hasta las ${xeniaRules.checkoutTime} hs para que el equipo pueda dejar la cabaña impecable. ${xeniaRules.earlyCheckinInfo}`;
  } else if (qLower.includes('perro') || qLower.includes('mascota') || qLower.includes('gato')) {
    botReply = `¡Sí! ${xeniaRules.politicaMascotas} 🐾 ¿Cuántos viajarían y qué tamaño tiene?`;
  } else if (qLower.includes('cancel') || qLower.includes('seña') || qLower.includes('pago')) {
    botReply = `Para confirmar una estadía solicitamos el ${xeniaRules.senaPorcentaje}% de seña por transferencia bancaria (Alias: ${xeniaRules.aliasBancario}). ${xeniaRules.politicaCancelacion}`;
  } else {
    // Simular consulta de disponibilidad básica
    const mockDisp = await toolConsultarDisponibilidad('2026-10-10', '2026-10-12', 2);
    toolExecutions.push({
      name: 'consultar_disponibilidad',
      args: { checkin: '2026-10-10', checkout: '2026-10-12', pax: 2 },
      result: mockDisp,
    });
    botReply = `¡Hola! Qué lindo que quieras venir a Los Bananos 🍍🌿 Tenemos cabañas para parejas con jacuzzi privado (Cabaña 7) y opciones familiares de hasta 6 personas (Cabañas Big y Tiny). ¿Para qué fechas estás buscando y cuántas personas serían?`;
  }

  return res.json({
    reply: botReply,
    toolExecutions,
    reservaCreada: null,
    source: 'heuristic-fallback',
  });
});

// Webhook de Meta (WhatsApp Business Cloud API e Instagram Direct)
// 1. Verificación GET
app.get('/api/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.META_VERIFY_TOKEN || 'bananos_xenia_secret_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta Webhook] Verificado con éxito');
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden: Token mismatch');
});

// 2. Recepción de mensajes POST (WhatsApp / Instagram)
app.post('/api/webhook/meta', async (req, res) => {
  const body = req.body;
  console.log('[Meta Webhook] Evento recibido:', JSON.stringify(body).slice(0, 200));

  // Responder 200 OK inmediatamente a Meta para cumplir el SLA
  res.status(200).send('EVENT_RECEIVED');

  // Procesamiento asíncrono
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.text?.body) {
      const fromPhone = message.from;
      const text = message.text.body;
      const channel = body.object === 'instagram' ? 'instagram' : 'whatsapp';

      console.log(`[Xenia ${channel.toUpperCase()}] Mensaje entrante de ${fromPhone}: "${text}"`);

      // Procesar con Xenia AI
      let replyText = '¡Hola! Gracias por comunicarte con Cabañas Los Bananos en Puerto Iguazú. ¿En qué fechas tenías pensado visitarnos y para cuántas personas?';
      
      try {
        if (process.env.GEMINI_API_KEY) {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [{ role: 'user', parts: [{ text }] }],
            config: {
              systemInstruction: `Sos Xenia, la Asistente Virtual Oficial de Cabañas Los Bananos en Puerto Iguazú. El huésped te escribe por ${channel} desde el teléfono ${fromPhone}. Responde de forma cálida, profesional y orientada a confirmar la estadía.`,
            },
          });
          if (geminiRes.text) {
            replyText = geminiRes.text;
          }
        }
      } catch (aiErr) {
        console.warn('[Xenia Webhook AI] Fallback a respuesta predeterminada:', aiErr);
      }

      // Enviar respuesta real saliente si las credenciales de Meta están configuradas
      const metaToken = process.env.META_ACCESS_TOKEN;
      const phoneId = process.env.META_PHONE_NUMBER_ID;

      if (metaToken && phoneId && channel === 'whatsapp') {
        try {
          const resMeta = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${metaToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: fromPhone,
              type: 'text',
              text: { preview_url: true, body: replyText },
            }),
          });
          const metaData = await resMeta.json();
          console.log('[Xenia WhatsApp Outbound] Respuesta enviada:', metaData);
        } catch (sendErr) {
          console.error('[Xenia WhatsApp Outbound] Error enviando mensaje a WhatsApp:', sendErr);
        }
      } else {
        console.log(`[Xenia Simulación] Respuesta lista para ${fromPhone}: "${replyText.slice(0, 100)}..." (Para envío real configure META_ACCESS_TOKEN y META_PHONE_NUMBER_ID)`);
      }
    }
  } catch (err) {
    console.error('Error procesando webhook de Meta:', err);
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
