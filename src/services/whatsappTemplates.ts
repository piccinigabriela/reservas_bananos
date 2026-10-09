import { Reserva, CabinCode } from '../types';
import { DN, formatDateEs } from './cabinConfig';

export interface WhatsAppTemplate {
  id: 'tpl-1' | 'tpl-5' | 'tpl-2' | 'tpl-6' | 'tpl-3' | 'tpl-4';
  title: string;
  category: 'anticipada' | 'viaje' | 'checkin' | 'confort' | 'checkout' | 'resena';
  moment: string;
  badge: string;
  description: string;
  generateText: (r: Reserva, customData?: { wifiPass?: string; guiaLink?: string; mapsLink?: string; resenaLink?: string }) => string;
}

export const DEFAULT_WHATSAPP_CONFIG = {
  wifiPass: '', // se configura en Avisos → Configurar enlaces (antes venía una clave inventada)
  guiaLink: typeof window !== 'undefined' ? `${window.location.origin}/?bienvenida=1` : 'https://losbananosiguazu.com/?bienvenida=1',
  mapsLink: 'https://www.google.com/maps/search/?api=1&query=Caba%C3%B1as+Los+Bananos+Puerto+Iguaz%C3%BA',
  resenaLink: 'https://www.google.com/maps/search/?api=1&query=Caba%C3%B1as+Los+Bananos+Puerto+Iguaz%C3%BA',
  codigoDescuento: 'BANANOS10',
};

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Confirmación y Bienvenida Anticipada (Día 1)',
    category: 'anticipada',
    moment: 'Al reservar o días previos al viaje',
    badge: 'Día 1 • Bienvenida',
    description: 'Bienvenida cálida en plural de cortesía con enlace a la Guía Digital del Huésped y Concierge Xenia 24hs.',
    generateText: (r, customData) => {
      const cfg = { ...DEFAULT_WHATSAPP_CONFIG, ...customData };
      const cabinName = DN[r.depto] || r.depto;
      const baseGuia = cfg.guiaLink.includes('?') ? cfg.guiaLink : `${cfg.guiaLink}?bienvenida=1`;
      const personalizedLink = `${baseGuia}&huesped=${encodeURIComponent(r.huesped || '')}&cabana=${r.depto || ''}`;

      return (
        `🌴 *¡Hola ${r.huesped}! Les damos la bienvenida a Cabañas Los Bananos en Puerto Iguazú* 🍍\n\n` +
        `Estamos muy felices de recibirles para su estadía del *${formatDateEs(r.checkin)}* al *${formatDateEs(r.checkout)}* en *${cabinName}*.\n\n` +
        `Para que vayan planificando su viaje, clave de Wi-Fi y recomendaciones locales en la selva, les compartimos nuestra *Página de Bienvenida y Guía Digital* (donde también pueden consultar dudas las 24 horas con nuestra anfitriona virtual Xenia):\n` +
        `👉 ${personalizedLink}\n\n` +
        `Cualquier duda que tengan con el itinerario o la llegada, nos pueden escribir directamente por acá. ¡Nos vemos muy pronto! 🌿✨`
      );
    },
  },
  {
    id: 'tpl-5',
    title: 'Coordinación en Ruta / Día de Viaje',
    category: 'viaje',
    moment: 'Mañana del viaje / En camino a Iguazú',
    badge: 'En Ruta • Día de Viaje',
    description: 'Para coordinar demoras en la ruta y pedir ubicación en tiempo real en viajes largos para esperarlos con el aire fresco y la cabaña lista.',
    generateText: (r, customData) => {
      const cfg = { ...DEFAULT_WHATSAPP_CONFIG, ...customData };
      const cabinName = DN[r.depto] || r.depto;
      return (
        `🚗 *¡Buen día ${r.huesped}! ¿Cómo vienen con el viaje hacia Puerto Iguazú?* 🌿\n\n` +
        `Les escribimos desde *Cabañas Los Bananos* para coordinar su llegada a *${cabinName}*. El check-in oficial es a partir de las *14:00 hs*.\n\n` +
        `Si vienen en ruta o en vuelo y tienen algún horario estimado de llegada, ¿nos podrían avisar por aquí? Si quieren, también nos pueden enviar su *ubicación en tiempo real* cuando estén a unos 30-40 minutos del complejo para esperarlos en recepción con el aire fresco y todo impecable.\n\n` +
        `📍 *Ubicación en Google Maps:* ${cfg.mapsLink}\n\n` +
        `¡Buen viaje y nos vemos en un ratito! 🌴`
      );
    },
  },
  {
    id: 'tpl-2',
    title: 'Instrucciones de Auto Check-in y Clave Wi-Fi',
    category: 'checkin',
    moment: 'Horas antes o al momento del ingreso',
    badge: 'Check-in • Acceso & Wi-Fi',
    description: 'Dirección exacta, indicaciones de acceso / cerradura, estacionamiento y clave de Wi-Fi de alta velocidad.',
    generateText: (r, customData) => {
      const cfg = { ...DEFAULT_WHATSAPP_CONFIG, ...customData };
      const cabinName = DN[r.depto] || r.depto;
      return (
        `🔑 *¡Instrucciones de Ingreso y Wi-Fi — Cabañas Los Bananos!* 🏡\n\n` +
        `¡Hola ${r.huesped}! Su cabaña *${cabinName}* ya está lista, limpia y climatizada para su ingreso.\n\n` +
        `📍 *Dirección & Acceso:*\n` +
        `• Complejo: Cabañas Los Bananos, Puerto Iguazú, Misiones.\n` +
        `• Ubicación GPS: ${cfg.mapsLink}\n` +
        `• Ingreso: Portón principal y acceso directo a *${cabinName}*.\n` +
        `• Llaves: Las llaves se encuentran colocadas en la cerradura de la cabaña o en la caja de seguridad con código.\n\n` +
        `📶 *Wi-Fi de Alta Velocidad:*\n` +
        `• Red: *Los Bananos Huéspedes*\n` +
        `• Contraseña: *${cfg.wifiPass}*\n\n` +
        `🚗 Cuentan con estacionamiento gratuito dentro del predio. ¡Pónganse cómodos y disfruten de la selva y la piscina! 🏊‍♂️🌴`
      );
    },
  },
  {
    id: 'tpl-6',
    title: 'Control de Confort (2hs Post-Ingreso) - Blindaje Anti-Quejas',
    category: 'confort',
    moment: '2 horas después del check-in',
    badge: '🛡️ Blindaje Anti-Quejas',
    description: 'Chequeo proactivo para validar que todo esté impecable y resolver cualquier detalle en privado antes de que se transforme en una mala reseña.',
    generateText: (r) => {
      const cabinName = DN[r.depto] || r.depto;
      return (
        `✨ *Control de Confort — ¿Cómo se sienten en ${cabinName}?* 🌿\n\n` +
        `¡Hola ${r.huesped}! Les escribimos para consultarles si ya pudieron acomodarse bien y si encontraron todo en perfectas condiciones (temperatura del aire acondicionado, toallas, agua caliente y vajilla).\n\n` +
        `Nuestro compromiso es que su descanso sea de 10 puntos. Si hace falta cualquier cosita adicional (más toallas, una frazada extra, asesoramiento turístico o lo que necesiten), por favor nos avisan por acá y se los resolvemos al instante.\n\n` +
        `¡Que tengan una hermosa estadía en Los Bananos! 🌴🍍`
      );
    },
  },
  {
    id: 'tpl-3',
    title: 'Recordatorio de Check-out Amable',
    category: 'checkout',
    moment: 'Noche anterior a la salida (20:00 hs)',
    badge: 'Noche Previa • Check-out',
    description: 'Recordatorio de salida a las 10:00 hs para organizar la rotación de mucamas, con opción de guarda-equipaje si su viaje es más tarde.',
    generateText: (r) => {
      const cabinName = DN[r.depto] || r.depto;
      return (
        `🌙 *Buenas noches ${r.huesped}. Esperamos que hayan tenido un día increíble en Cataratas* 🌿\n\n` +
        `Les recordamos que mañana *${formatDateEs(r.checkout)}* el horario de check-out en *${cabinName}* es hasta las *10:00 hs*, para que nuestro equipo de mucamas pueda preparar la cabaña para los próximos pasajeros.\n\n` +
        `🎒 *¿Su vuelo o bus sale más tarde?* Con gusto pueden dejar su equipaje en recepción y seguir disfrutando de las áreas comunes y la piscina hasta la hora de su traslado.\n\n` +
        `🔑 Para la entrega de llaves, pueden dejarlas en la cerradura / recepción o avisarnos por este medio. ¡Muchas gracias por elegirnos! 🙏`
      );
    },
  },
  {
    id: 'tpl-4',
    title: 'Solicitud de Reseña 5 Estrellas y Descuento Directo',
    category: 'resena',
    moment: '2 horas después del check-out',
    badge: 'Post-Salida • 5 Estrellas ⭐',
    description: 'Agradecimiento de estadía, solicitud de reseña 5 estrellas y código de 10% de descuento directo para su próximo viaje o recomendados.',
    generateText: (r, customData) => {
      const cfg = { ...DEFAULT_WHATSAPP_CONFIG, ...customData };
      return (
        `⭐ *¡Muchas gracias por su visita a Cabañas Los Bananos, ${r.huesped}!* 🍍💚\n\n` +
        `Fue un auténtico placer recibirles en Puerto Iguazú. Esperamos que hayan disfrutado cada momento en contacto con la naturaleza.\n\n` +
        `🌟 Nos ayudaría muchísimo de corazón si pudieran dedicarnos 1 minuto para dejarnos su opinión y calificación de *5 estrellas*:\n` +
        `👉 ${cfg.resenaLink}\n\n` +
        `🎁 *Regalo para su próximo viaje:* Para su próxima estadía (o para amigos y familiares que quieran visitarnos), tienen un *10% de descuento directo* reservando con nosotros con el código *${cfg.codigoDescuento}*.\n\n` +
        `¡Buen regreso a casa y hasta la próxima! ✈️🌴`
      );
    },
  },
];

export function cleanPhoneNumber(tel?: string): string {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

export function buildWhatsAppUrl(tel: string, text: string): string {
  const clean = cleanPhoneNumber(tel);
  if (!clean) return '';
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
