import React, { useState, useEffect, useRef } from 'react';
import { CABANAS, DN, DC } from '../services/cabinConfig';
import { DEFAULT_WHATSAPP_CONFIG } from '../services/whatsappTemplates';
import { 
  Wifi, 
  MapPin, 
  Clock, 
  Sparkles, 
  MessageCircle, 
  Bot, 
  Send, 
  Check, 
  Copy, 
  Compass, 
  Waves, 
  Flame, 
  Phone, 
  Lock, 
  ChevronRight, 
  Info,
  Calendar,
  Coffee,
  Heart,
  ExternalLink,
  ShieldCheck,
  Utensils
} from 'lucide-react';

interface GuestWelcomeViewProps {
  onBackToAdmin?: () => void;
  guestNameParam?: string;
  cabinParam?: string;
  openedFromAdmin?: boolean;
}

export const GuestWelcomeView: React.FC<GuestWelcomeViewProps> = ({
  onBackToAdmin,
  guestNameParam,
  cabinParam,
  openedFromAdmin = false,
}) => {
  // Configuración de Wi-Fi y enlaces
  const [config] = useState(() => {
    try {
      const saved = localStorage.getItem('bn_whatsapp_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mapsLink && parsed.mapsLink.includes('maps.app.goo.gl/losbananosiguazu')) {
          parsed.mapsLink = DEFAULT_WHATSAPP_CONFIG.mapsLink;
        }
        return { ...DEFAULT_WHATSAPP_CONFIG, ...parsed };
      }
    } catch (_) {}
    return DEFAULT_WHATSAPP_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'info' | 'xenia' | 'guia' | 'servicios'>('info');
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Acceso discreto para Gabriela / Recepción al tocar el logo
  const [logoTapCount, setLogoTapCount] = useState<number>(0);
  const lastTapRef = useRef<number>(0);

  const handleLogoSecretTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 2500) {
      setLogoTapCount(1);
    } else {
      const next = logoTapCount + 1;
      setLogoTapCount(next);
      if (next >= 3) {
        setLogoTapCount(0);
        if (onBackToAdmin) {
          onBackToAdmin();
        }
      }
    }
    lastTapRef.current = now;
  };

  // Parámetros de URL si vienen
  const [guestName, setGuestName] = useState<string>(() => {
    if (guestNameParam) return guestNameParam;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('huesped') || urlParams.get('nombre') || '';
  });

  const [cabinCode, setCabinCode] = useState<string>(() => {
    if (cabinParam) return cabinParam;
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get('cabana') || urlParams.get('depto') || '').toUpperCase();
  });

  // Chat de Xenia para Huéspedes
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string; time: string }>>([
    {
      role: 'bot',
      text: guestName 
        ? `🌴 ¡Hola ${guestName}! Te doy una cálida bienvenida a Cabañas Los Bananos 🍍 Soy Xenia, tu anfitriona virtual 24hs. ¿En qué te puedo ayudar hoy? Podés preguntarme sobre excursiones a Cataratas, delivery de comida, supermercados, remises, toallas extras o normas del complejo.`
        : '🌴 ¡Hola! Te damos la bienvenida a Cabañas Los Bananos en Puerto Iguazú 🍍 Soy Xenia, tu anfitriona virtual 24hs. Estoy atenta para responderte dudas de la cabaña, paseos a Cataratas, delivery, supermercados, remises o lo que necesites durante tu estadía.',
      time: 'Ahora',
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Asegurar fondo cálido para la vista de huéspedes
    const prevBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#FAF7F2';
    return () => {
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'xenia') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleCopyWifi = () => {
    navigator.clipboard.writeText(config.wifiPass);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2500);
  };

  const handleCopyWelcomeLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('bienvenida', 'true');
    if (cabinCode) {
      url.searchParams.set('cabana', cabinCode);
    }
    if (guestName) {
      url.searchParams.set('nombre', guestName);
    }
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendXenia = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: q, time: userTime }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s para dar tiempo a Gemini

      const res = await fetch('/api/xenia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'web',
          message: q,
          guestName: guestName || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setMessages(prev => [
            ...prev,
            {
              role: 'bot',
              text: data.reply,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          setIsTyping(false);
          return;
        }
      }
    } catch (_) {}

    // Motor de Base de Conocimiento Exhaustiva de Los Bananos (Fallback instantáneo de alta precisión)
    setTimeout(() => {
      const qLower = q.toLowerCase();
      let reply = '';

      // 1. Wi-Fi y conectividad
      if (qLower.includes('wifi') || qLower.includes('wi-fi') || qLower.includes('clave') || qLower.includes('internet') || qLower.includes('password') || qLower.includes('contraseña')) {
        reply = `📶 La red de Wi-Fi es *"Los Bananos Huéspedes"* y la contraseña es: *${config.wifiPass}*.\nTenés excelente señal y cobertura en todas las cabañas y en el área de la piscina.`;
      }
      // 2. Cataratas Argentinas y entradas
      else if (qLower.includes('catarata') || qLower.includes('garganta') || qLower.includes('parque nacional') || qLower.includes('lado argentino') || qLower.includes('circuito')) {
        reply = `🌊 *Cataratas del Iguazú (Lado Argentino)*:\n\n` +
          `• *Horario*: Todos los días de 08:00 a 18:00 hs (último ingreso 16:30 hs).\n` +
          `• *Circuitos*: Garganta del Diablo (tren ecológico), Circuito Superior y Circuito Inferior.\n` +
          `• *Entradas*: Te recomendamos comprarlas online en la web oficial de Parques Nacionales para ingresar sin filas.\n` +
          `• *Tip*: Salí temprano por la mañana (alrededor de las 08:30 hs), llevá calzado cómodo, protector solar, repelente y capa para la lancha.`;
      }
      // 3. Cataratas Brasileñas, Parque das Aves y Frontera
      else if (qLower.includes('brasil') || qLower.includes('brasileño') || qLower.includes('foz') || qLower.includes('frontera') || qLower.includes('parque das aves') || qLower.includes('aves')) {
        reply = `🇧🇷 *Lado Brasileño & Parque das Aves*:\n\n` +
          `• *Horario*: 09:00 a 16:00 hs.\n` +
          `• *Documentación obligatoria*: DNI tarjeta o Pasaporte vigente de todos los integrantes (menores con partida de nacimiento si viajan con un solo progenitor).\n` +
          `• *Paseo*: La pasarela brasileña ofrece la vista panorámica frontal más espectacular. Justo enfrente del ingreso está el Parque das Aves, ideal para recorrer con niños.\n` +
          `• Si necesitás remis de confianza que te cruce la aduana y te espere, consultanos por WhatsApp.`;
      }
      // 4. Supermercados, almacenes y compras de provisiones
      else if (qLower.includes('super') || qLower.includes('mercado') || qLower.includes('almacen') || qLower.includes('almacén') || qLower.includes('comprar') || qLower.includes('provision') || qLower.includes('despensa') || qLower.includes('carniceria') || qLower.includes('carnicería') || qLower.includes('carbon') || qLower.includes('carbón') || qLower.includes('hielo')) {
        reply = `🛒 *Compras y Provisiones cerca de Los Bananos*:\n\n` +
          `• *Supermercados en Puerto Iguazú*: Supermercado Capitán del Espacio / Ruta 12 y Autoservicio El Árbol (a solo 5 minutos en auto).\n` +
          `• *Carbón y Carnes para la Parrilla*: En los almacenes de la avenida principal conseguís carbón vegetal misionero, hielo y cortes de asado.\n` +
          `• En tu cabaña contás con parrilla individual, tabla, vajilla y cubiertos completos para disfrutar un asado en la selva.`;
      }
      // 5. Delivery de comida, restaurantes y gastronomía
      else if (qLower.includes('delivery') || qLower.includes('comida') || qLower.includes('cenar') || qLower.includes('almorzar') || qLower.includes('restaurant') || qLower.includes('restaurante') || qLower.includes('pizza') || qLower.includes('empanada') || qLower.includes('hamburguesa') || qLower.includes('parrilla') || qLower.includes('pescado')) {
        reply = `🍕 *Gastronomía y Delivery a tu Cabaña*:\n\n` +
          `• *Delivery a Los Bananos*: Pizzerías y casas de empanadas de la zona entregan directo en la entrada del complejo por WhatsApp o PedidosYa.\n` +
          `• *Restaurantes recomendados en el Centro*: En Av. Brasil y Av. Córdoba tenés excelentes parrillas de bife de chorizo, pastas y platos de pescados de río (Surubí y Pacú a la parrilla).\n` +
          `• Si querés los números de teléfono de deliveries directos, tocanos el botón de WhatsApp arriba y te los enviamos.`;
      }
      // 6. Remises, Taxis, Traslados y Aeropuerto
      else if (qLower.includes('remis') || qLower.includes('remís') || qLower.includes('taxi') || qLower.includes('traslado') || qLower.includes('aeropuerto') || qLower.includes('terminal') || qLower.includes('uber') || qLower.includes('chofer') || qLower.includes('colectivo') || qLower.includes('bus')) {
        reply = `🚖 *Transporte y Traslados*:\n\n` +
          `• *Remises de confianza*: Trabajamos con choferes locales habilitados para traslados al Aeropuerto de Iguazú (IGR), Cataratas lado Argentino y lado Brasileño.\n` +
          `• *Colectivos*: La empresa Río Uruguay tiene servicios regulares que salen desde la Terminal del centro hacia el Parque Nacional.\n` +
          `• Escribinos al WhatsApp de Recepción y te pasamos el teléfono directo del remisero de guardia.`;
      }
      // 7. Horarios de check-in, check-out y equipaje
      else if (qLower.includes('check in') || qLower.includes('check-in') || qLower.includes('check out') || qLower.includes('checkout') || qLower.includes('horario') || qLower.includes('hora') || qLower.includes('salida') || qLower.includes('ingreso') || qLower.includes('valija') || qLower.includes('equipaje')) {
        reply = `🕒 *Horarios del Complejo*:\n\n` +
          `• *Check-in*: a partir de las 14:00 hs.\n` +
          `• *Check-out*: hasta las 10:00 hs de la mañana.\n` +
          `• *Piscina*: 09:00 a 22:00 hs.\n` +
          `• *Guarda-equipaje*: Si tu vuelo o colectivo sale más tarde, con mucho gusto guardamos tus valijas en recepción sin costo para que aproveches el día.`;
      }
      // 8. Piscina y normas de agua
      else if (qLower.includes('pileta') || qLower.includes('piscina') || qLower.includes('nadar') || qLower.includes('solarium') || qLower.includes('reposera')) {
        reply = `🏊‍♂️ *Piscina en el Parque*:\n\n` +
          `• La piscina está habilitada todos los días de 09:00 a 22:00 hs.\n` +
          `• Contamos con reposeras en el deck y área parquizada.\n` +
          `• Por seguridad, los menores de edad deben estar siempre acompañados de un adulto responsable. No se permite ingresar con vasos de vidrio.`;
      }
      // 9. Jacuzzi / Hidromasaje (Cabaña 7)
      else if (qLower.includes('jacuzzi') || qLower.includes('hidro') || qLower.includes('cabaña 7') || qLower.includes('cabana 7')) {
        reply = `✨ *Hidromasaje Privado (Cabaña 7)*:\n\n` +
          `• La Cabaña 7 cuenta con jacuzzi exterior exclusivo en el deck privado rodeado de vegetación.\n` +
          `• Se activa con el panel pulsador del deck. Cuenta con agua caliente y regulador de burbujas.\n` +
          `• Se recomienda taparlo luego de usar para mantener la temperatura y la pureza del agua en la selva.`;
      }
      // 10. Toallas, sábanas, limpieza y amenidades
      else if (qLower.includes('toalla') || qLower.includes('sabana') || qLower.includes('sábana') || qLower.includes('limpieza') || qLower.includes('papel') || qLower.includes('jabon') || qLower.includes('jabón') || qLower.includes('shampoo') || qLower.includes('frazada') || qLower.includes('manta')) {
        reply = `🧺 *Ropa Blanca y Elementos*:\n\n` +
          `• Tu cabaña incluye juego completo de sábanas, frazadas y toallas de baño para cada huésped.\n` +
          `• Si necesitás toallas adicionales para la piscina, recambio de sábanas o artículos de baño (papel, jabón), avisanos por el botón de WhatsApp y el equipo de voluntariado te lo acerca enseguida.`;
      }
      // 11. Mascotas (Pet Friendly)
      else if (qLower.includes('mascota') || qLower.includes('perro') || qLower.includes('gato') || qLower.includes('pet')) {
        reply = `🐾 *Política Pet Friendly*:\n\n` +
          `• ¡Aceptamos perritos y mascotas educadas con aviso previo!\n` +
          `• Solicitamos cuidarlas en el parque común manteniéndolas con correa, recoger sus necesidades y no subirlas a camas o sillones.`;
      }
      // 12. Farmacias de turno y Emergencias
      else if (qLower.includes('farmacia') || qLower.includes('medico') || qLower.includes('médico') || qLower.includes('hospital') || qLower.includes('urgencia') || qLower.includes('emergencia') || qLower.includes('remedio') || qLower.includes('salud')) {
        reply = `🏥 *Salud y Farmacias en Puerto Iguazú*:\n\n` +
          `• *Hospital Samic Puerto Iguazú*: Av. Victoria Aguirre 112 (Guardia de emergencias 24hs).\n` +
          `• *Farmacias de turno*: Farmacia del Pueblo y Farmacia Catedral en el centro.\n` +
          `• Ante cualquier indisposición o urgencia, avisanos de inmediato en recepción para coordinar asistencia.`;
      }
      // 13. Hito Tres Fronteras y otros paseos
      else if (qLower.includes('hito') || qLower.includes('tres fronteras') || qLower.includes('3 fronteras') || qLower.includes('paseo') || qLower.includes('aripuca') || qLower.includes('guira') || qLower.includes('wanda') || qLower.includes('san ignacio')) {
        reply = `🌴 *Otros Paseos Imperdibles en Iguazú*:\n\n` +
          `• *Hito de las Tres Fronteras*: Vista a la unión de los ríos Iguazú y Paraná. Todas las tardes al caer el sol hay espectáculo de aguas danzantes y feria de artesanías misioneras.\n` +
          `• *Güirá Oga*: Refugio de rescate y rehabilitación de aves y fauna de la selva misionera.\n` +
          `• *La Aripuca*: Estructura monumental construida con troncos gigantes rescatados.\n` +
          `• *Minas de Wanda*: Yacimiento de piedras semipreciosas (amatistas y cuarzos) a 45 min por Ruta 12.`;
      }
      // 14. Duty Free Shop y Compras en Ciudad del Este
      else if (qLower.includes('duty') || qLower.includes('free') || qLower.includes('compras') || qLower.includes('ciudad del este') || qLower.includes('paraguay') || qLower.includes('shopping')) {
        reply = `🛍️ *Compras en la Frontera*:\n\n` +
          `• *Duty Free Shop Puerto Iguazú*: Ubicado antes de la aduana argentina, con productos importados originales (perfumes, chocolates, electrónica, bebidas).\n` +
          `• *Ciudad del Este (Paraguay)*: Gran centro comercial. Se recomienda cruzar temprano en la mañana y en transportes autorizados. Llevá siempre DNI/Pasaporte al día.`;
      }
      // 15. Repelente, mosquitos y clima
      else if (qLower.includes('mosquito') || qLower.includes('repelente') || qLower.includes('clima') || qLower.includes('calor') || qLower.includes('lluvia') || qLower.includes('temperatura')) {
        reply = `🌿 *Clima y Cuidados en la Selva*:\n\n` +
          `• En Iguazú el clima es subtropical y cálido. Es indispensable usar repelente de mosquitos (especialmente al atardecer y en las pasarelas del Parque).\n` +
          `• Todas nuestras cabañas cuentan con aire acondicionado frío/calor y mosquiteros en las ventanas para que descanses fresco y protegido.`;
      }
      // 16. Agua y electricidad
      else if (qLower.includes('agua') || qLower.includes('potable') || qLower.includes('enchufe') || qLower.includes('toma') || qLower.includes('220') || qLower.includes('corriente')) {
        reply = `💧 *Servicios de la Cabaña*:\n\n` +
          `• *Electricidad*: Corriente estándar argentina 220V con enchufes de tres patas planas (tipo I) y adaptadores.\n` +
          `• *Agua*: La red suministra agua limpia para ducharse y cocinar. Para consumo directo de mesa se sugiere agua envasada mineral.`;
      }
      // 17. Saludo o bienvenida
      else if (qLower.includes('hola') || qLower.includes('buenas') || qLower.includes('buen dia') || qLower.includes('buen día') || qLower.includes('buenas tardes') || qLower.includes('buenas noches') || qLower.includes('hey')) {
        reply = `🌴 ¡Hola! ¡Qué gusto saludarte! 🍍 Soy Xenia, tu asistente virtual 24hs en Cabañas Los Bananos. Podés consultarme sobre la clave de Wi-Fi, paseos a Cataratas, delivery de comida, traslados, supermercados o lo que necesites para disfrutar tu estadía.`;
      }
      // 18. Respuesta cordial amplia
      else {
        reply = `🌴 ¡Con gusto te ayudo! En Cabañas Los Bananos estamos para que disfrutes al máximo. Podés consultarme sobre:\n\n` +
          `• 📶 *Wi-Fi y Clave*: Red y contraseña rápida.\n` +
          `• 🌊 *Cataratas del Iguazú*: Horarios y consejos de visita.\n` +
          `• 🍕 *Deliveries y Supermercados*: Opciones ricas que llegan a tu cabaña.\n` +
          `• 🚖 *Remises y Traslados*: Choferes de confianza.\n` +
          `• 🧺 *Toallas y Elementos*: Pedidos a recepción.\n\n` +
          `¿Sobre cuál de estos temas te gustaría saber más?`;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 300);
  };

  const quickQuestions = [
    '¿Cuál es la clave del Wi-Fi?',
    '¿Cómo llegar a las Cataratas?',
    '¿Qué delivery de comida recomiendan?',
    '¿Dónde comprar en el supermercado?',
    '¿Números de remís o taxi de confianza?',
    '¿Hasta qué hora funciona la piscina?',
    '¿A qué hora es el check-out?',
    '¿Aceptan mascotas?',
    '¿Paseos recomendados en Iguazú?',
    '¿Farmacia de turno o emergencias?',
  ];

  const cabinDisplayName = cabinCode && DN[cabinCode as keyof typeof DN] ? DN[cabinCode as keyof typeof DN] : null;

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#2A2118] font-sans pb-16 selection:bg-emerald-500 selection:text-white relative z-50">
      {/* Barra Superior con Logo y Acceso Huésped */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE0D2] px-4 sm:px-6 py-3 shadow-sm flex items-center justify-between select-none">
        <div 
          onClick={handleLogoSecretTap}
          className="flex items-center gap-2.5 cursor-pointer"
          title="Cabañas Los Bananos"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md font-bold transition active:scale-90">
            🌴
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base sm:text-lg text-[#2A2118] leading-tight">
                Cabañas Los Bananos
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Guía Huésped
              </span>
            </div>
            <p className="text-[11px] text-[#7A6752]">Puerto Iguazú · Misiones</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Si fue abierto desde adentro del panel por Gabriela, botón para volver al calendario */}
          {onBackToAdmin && openedFromAdmin && (
            <button
              onClick={onBackToAdmin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-bold transition shadow-md cursor-pointer active:scale-95"
              title="Volver al panel interno de gestión y calendario"
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>← Volver al Calendario</span>
            </button>
          )}

          {/* Botón WhatsApp Recepción directo */}
          <a
            href="https://wa.me/5493757551234?text=Hola!%20Estoy%20en%20Caba%C3%B1as%20Los%20Bananos%20y%20tengo%20una%20consulta"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            title="Escribir a Recepción por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp Recepción</span>
          </a>
        </div>
      </header>

      {/* Hero Bienvenida Cálida */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="bg-gradient-to-br from-emerald-800 via-[#1b4332] to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Adorno tropical de fondo */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-0 right-10 -mb-10 w-32 h-32 rounded-full bg-amber-400/10 pointer-events-none" />

          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tu estadía en la selva de Puerto Iguazú</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {guestName ? `¡Hola ${guestName}! Bienvenidos a Los Bananos 🍍` : '¡Bienvenidos a Cabañas Los Bananos! 🌴'}
            </h2>

            {cabinDisplayName ? (
              <p className="text-sm sm:text-base text-emerald-100 font-medium flex items-center gap-1.5">
                <span>Tu hospedaje:</span>
                <span className="font-bold underline decoration-amber-400 underline-offset-2">{cabinDisplayName}</span>
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-xl">
                Queremos que disfrutes de una estadía inolvidable rodeado de naturaleza, piscina, muelle propio y el canto de las aves en la selva misionera.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4 Pestañas de Navegación del Huésped */}
      <div className="max-w-4xl mx-auto px-4 mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#EFE6D8] p-1.5 rounded-2xl border border-[#DBCAB5]">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white text-[#2A2118] shadow-sm'
                : 'text-[#6A5745] hover:text-[#2A2118]'
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-600" />
            <span>Wi-Fi & Cabaña</span>
          </button>

          <button
            onClick={() => setActiveTab('xenia')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 'xenia'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md'
                : 'text-[#6A5745] hover:text-[#2A2118]'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span>Xenia 24hs</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('guia')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'guia'
                ? 'bg-white text-[#2A2118] shadow-sm'
                : 'text-[#6A5745] hover:text-[#2A2118]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#D2502A]" />
            <span>Cataratas & Tours</span>
          </button>

          <button
            onClick={() => setActiveTab('servicios')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'servicios'
                ? 'bg-white text-[#2A2118] shadow-sm'
                : 'text-[#6A5745] hover:text-[#2A2118]'
            }`}
          >
            <Utensils className="w-4 h-4 text-rose-600" />
            <span>Delivery & Remís</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO 1: INFO DE CABAÑA & WI-FI */}
      {activeTab === 'info' && (
        <div className="max-w-4xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          
          {/* Tarjeta Destacada Wi-Fi con botón 1 clic */}
          <div className="bg-white border-2 border-emerald-400 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Wifi className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Conexión de Alta Velocidad
                  </span>
                  <h3 className="font-black text-lg text-[#2A2118]">Wi-Fi de las Cabañas</h3>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                Gratis
              </span>
            </div>

            <div className="bg-[#F8F4EC] border border-[#E8DFC8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#8C765C] uppercase block">Nombre de Red:</span>
                <span className="text-base font-bold text-[#2A2118]">Los Bananos Huéspedes</span>
                
                <span className="text-[11px] font-bold text-[#8C765C] uppercase block mt-2">Contraseña:</span>
                <span className="text-lg font-mono font-black text-emerald-800 tracking-wider">
                  {config.wifiPass}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyWifi}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {copiedWifi ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWifi ? '¡Clave Copiada! ✓' : 'Copiar Contraseña'}</span>
              </button>
            </div>
          </div>

          {/* Horarios & Normas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Check-in / Out */}
            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Horarios Clave del Complejo</span>
              </div>
              <ul className="text-xs text-[#5A4838] space-y-1.5 leading-relaxed">
                <li>• <strong>Check-in:</strong> a partir de las 14:00 hs.</li>
                <li>• <strong>Check-out:</strong> hasta las 10:00 hs de la mañana.</li>
                <li>• <strong>Piscina en el Parque:</strong> habilitada de 09:00 a 22:00 hs.</li>
                <li>• <strong>Horario de Silencio:</strong> 23:00 a 08:00 hs para descansar con los sonidos de la selva.</li>
              </ul>
            </div>

            {/* Ubicación & GPS */}
            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#D2502A] font-bold text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Ubicación en Google Maps</span>
                </div>
                <p className="text-xs text-[#5A4838] mt-1 leading-relaxed">
                  Puerto Iguazú, Misiones. Acceso señalizado con estacionamiento seguro dentro del predio.
                </p>
              </div>

              <a
                href={config.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-[#FAF4EB] hover:bg-[#F0E6D8] border border-[#D8CEBA] text-[#4A3828] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-center mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Ubicación en Google Maps</span>
              </a>
            </div>
          </div>

          {/* Banner de Xenia invitando a chatear con preguntas rápidas integradas */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md transition space-y-4">
            <div 
              onClick={() => setActiveTab('xenia')}
              className="flex items-center justify-between gap-4 cursor-pointer hover:brightness-105"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0">
                  🍍
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base sm:text-lg">¿Dudas o pedidos? Preguntale a Xenia</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                      24 Horas
                    </span>
                  </div>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Nuestra concierge virtual te responde sobre Cataratas, deliveries, toallas, supermercados y remises al instante.
                  </p>
                </div>
              </div>

              <ChevronRight className="w-6 h-6 text-purple-300 shrink-0" />
            </div>

            {/* Accesos rápidos de 1 toque */}
            <div className="pt-2 border-t border-purple-800/60">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider block mb-2">
                ⚡ Tocá cualquier consulta para preguntarle a Xenia:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.slice(0, 6).map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveTab('xenia');
                      handleSendXenia(q);
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/25 active:scale-95 border border-white/20 text-purple-100 text-xs font-medium rounded-xl transition cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Servicios y Comodidades Incluidas */}
          <div className="bg-white border border-[#E5D7C5] rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-[#2A2118] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Servicios y Equipamiento Incluido en tu Cabaña</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-[#5A4838]">
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF5EE] rounded-xl">
                <Waves className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Piscina en el parque</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF5EE] rounded-xl">
                <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Parrilla individual</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF5EE] rounded-xl">
                <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Wi-Fi de alta velocidad</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF5EE] rounded-xl">
                <Compass className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Muelle en la selva</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF5EE] rounded-xl">
                <Utensils className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Cocina, heladera y vajilla</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[#FAF5EE] rounded-xl">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Estacionamiento dentro del predio</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: CHAT CON XENIA 24HS (CONCIERGE VIRTUAL) */}
      {activeTab === 'xenia' && (
        <div className="max-w-4xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5D7C5] rounded-3xl shadow-sm overflow-hidden flex flex-col h-[72vh] max-h-[660px]">
            {/* Header del Chat */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl font-bold shadow-xs">
                  🍍
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base leading-tight">Xenia Concierge</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-ping" />
                      En Vivo 24hs
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200">
                    Asistente oficial de Cabañas Los Bananos en Puerto Iguazú
                  </p>
                </div>
              </div>
            </div>

            {/* Área de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF6F0]">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs leading-relaxed whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-emerald-700 text-white rounded-tr-xs'
                        : 'bg-white text-[#2A2118] border border-[#EAE0D2] rounded-tl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-[#A39280] mt-1 px-1">{m.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 bg-white border border-[#EAE0D2] rounded-2xl px-4 py-2.5 max-w-[140px] text-xs text-purple-700 font-semibold shadow-xs">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                  <span className="text-[11px] text-slate-500 ml-1">Xenia pensando...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preguntas Frecuentes Rápidas para tocar con 1 dedo */}
            <div className="p-2.5 bg-white border-t border-[#EAE0D2] overflow-x-auto flex gap-2 shrink-0 scrollbar-none">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendXenia(q)}
                  className="px-3 py-1.5 bg-[#FAF5EE] hover:bg-[#F2ECE1] border border-[#DBCAB5] text-[#5A4838] text-[11px] font-semibold rounded-full whitespace-nowrap transition shrink-0 cursor-pointer active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input de Envío */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendXenia(chatInput);
              }}
              className="p-3 bg-white border-t border-[#EAE0D2] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Preguntale lo que quieras a Xenia sobre tu estadía..."
                className="flex-1 bg-[#FAF5EE] border border-[#D4C3AE] focus:border-purple-600 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#2A2118] outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: CATARATAS, TOURS & PASEOS */}
      {activeTab === 'guia' && (
        <div className="max-w-4xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          {/* Cataratas Argentinas */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base sm:text-lg">
              <span>🌊</span>
              <h3>Cataratas del Iguazú — Lado Argentino</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#5A4838] leading-relaxed">
              El Parque Nacional Iguazú abre todos los días de <strong>08:00 a 18:00 hs</strong> (último ingreso 16:30 hs). Se recorre a través del Tren de la Selva y pasarelas peatonales:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-[#FAF5EE] rounded-2xl border border-[#EAE0D2]">
                <h5 className="font-bold text-xs text-emerald-900">1. Garganta del Diablo</h5>
                <p className="text-[11px] text-[#6A5745] mt-1">El salto más caudaloso e imponente del planeta. Se llega en tren ecológico hasta la pasarela sobre el río.</p>
              </div>
              <div className="p-3 bg-[#FAF5EE] rounded-2xl border border-[#EAE0D2]">
                <h5 className="font-bold text-xs text-emerald-900">2. Circuito Superior</h5>
                <p className="text-[11px] text-[#6A5745] mt-1">Caminata de 1.750m sobre la corona de los saltos principales con vistas panorámicas increíbles.</p>
              </div>
              <div className="p-3 bg-[#FAF5EE] rounded-2xl border border-[#EAE0D2]">
                <h5 className="font-bold text-xs text-emerald-900">3. Circuito Inferior & Lancha</h5>
                <p className="text-[11px] text-[#6A5745] mt-1">Senderos al pie de las cascadas y punto de embarque de la Gran Aventura náutica.</p>
              </div>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium space-y-1">
              <p>💡 <strong>Recomendación clave de Los Bananos:</strong> Comprá tus entradas online previamente en la web de Parques Nacionales para ingresar directo sin filas en boletería.</p>
              <p>🎒 <strong>Qué llevar:</strong> Ropa liviana, calzado antideslizante, protector solar, repelente de mosquitos y funda impermeable para tu teléfono celular.</p>
            </div>
          </div>

          {/* Cataratas Brasileñas & Parque das Aves */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-blue-800 font-extrabold text-base">
              <span>🇧🇷</span>
              <h3>Cataratas Lado Brasileño & Parque das Aves</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#5A4838] leading-relaxed">
              Ofrece la vista panorámica completa y frontal de todas las cataratas. El recorrido se realiza en buses panorámicos hasta la pasarela del Salto Floriano.
            </p>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950">
              📌 <strong>Requisitos de Frontera:</strong> Para cruzar el puente Tancredo Neves hacia Foz do Iguaçu necesitás DNI tarjeta o Pasaporte vigente. Si viajás con menores, presentar partida de nacimiento o libreta de matrimonio.
            </div>
          </div>

          {/* Paseos Imperdibles en Puerto Iguazú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[#D2502A] font-bold text-sm">
                <span>🌆</span>
                <span>Hito de las Tres Fronteras</span>
              </div>
              <p className="text-xs text-[#5A4838] leading-relaxed">
                Punto de unión entre Argentina, Brasil y Paraguay. Todas las tardes al atardecer hay show de luces y aguas danzantes con feria de artesanías misioneras.
              </p>
            </div>

            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <span>🦜</span>
                <span>Güirá Oga & La Aripuca</span>
              </div>
              <p className="text-xs text-[#5A4838] leading-relaxed">
                Refugio de rescate y conservación de animales autóctonos de la selva paranaense y monumento ecológico construido con madera recuperada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 4: DELIVERY, GASTRONOMÍA & SERVICIOS */}
      {activeTab === 'servicios' && (
        <div className="max-w-4xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          
          {/* Deliveries recomendados a la cabaña */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-base">
                <Utensils className="w-5 h-5 text-rose-600" />
                <h3>Delivery de Comida a tu Cabaña</h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Directo a la puerta
              </span>
            </div>

            <p className="text-xs text-[#5A4838] leading-relaxed">
              Si querés quedarte descansando en el parque o la piscina, podés pedir comida por WhatsApp o PedidosYa indicando <em>"Cabañas Los Bananos"</em>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF5EE] rounded-2xl border border-[#EAE0D2] space-y-1">
                <div className="font-bold text-[#2A2118] flex items-center justify-between">
                  <span>🍕 Pizzas & Empanadas Artesanales</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Recomendado</span>
                </div>
                <p className="text-[#6A5745]">Variedad de pizzas a la piedra, empanadas de carne cortada a cuchillo y minutas.</p>
              </div>

              <div className="p-3 bg-[#FAF5EE] rounded-2xl border border-[#EAE0D2] space-y-1">
                <div className="font-bold text-[#2A2118] flex items-center justify-between">
                  <span>🥩 Parrillas & Pescados de Río</span>
                  <span className="text-[10px] text-amber-700 font-bold">Centro</span>
                </div>
                <p className="text-[#6A5745]">Asado criollo, bife de chorizo y platos típicos de Surubí y Pacú misionero en Av. Brasil.</p>
              </div>
            </div>
          </div>

          {/* Supermercados y Provisiones */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
              <span>🛒</span>
              <h3>Supermercados, Carbón y Carnicerías</h3>
            </div>
            <p className="text-xs text-[#5A4838] leading-relaxed">
              A pocos minutos sobre la avenida principal contás con comercios para comprar provisiones, bebidas frescas, hielo y carbón para tu parrilla:
            </p>
            <ul className="text-xs text-[#5A4838] space-y-1 pl-3 list-disc">
              <li><strong>Supermercados:</strong> Autoservicio Capitán del Espacio y El Árbol (abiertos todos los días).</li>
              <li><strong>Carnicerías:</strong> Cortes de asado fresco, chorizos y carbón vegetal de leña misionera.</li>
            </ul>
          </div>

          {/* Remises y Salud */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[#2A2118] font-bold text-sm">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Remises y Traslados de Confianza</span>
              </div>
              <p className="text-xs text-[#5A4838] leading-relaxed">
                Choferes locales habilitados para esperarte en el aeropuerto o llevarte y buscarte en Cataratas. Solicitá el contacto directo por el botón de WhatsApp.
              </p>
            </div>

            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[#2A2118] font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>Farmacias & Emergencias</span>
              </div>
              <p className="text-xs text-[#5A4838] leading-relaxed">
                Farmacias de turno 24hs en el centro de Puerto Iguazú y Hospital Samic (Av. Victoria Aguirre 112). Ante cualquier necesidad el equipo está a disposición.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pie de página con opción de compartir enlace */}
      <div className="max-w-4xl mx-auto px-4 mt-8 text-center space-y-3 pb-8">
        <button
          type="button"
          onClick={handleCopyWelcomeLink}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F2ECE1] border border-[#D4C3AE] text-[#5A4838] text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? '¡Enlace de Bienvenida Copiado!' : 'Copiar enlace de esta Guía'}</span>
        </button>

        <div className="flex items-center justify-center gap-3 text-[11px] text-[#8C765C]">
          <span>Cabañas Los Bananos · Puerto Iguazú, Misiones 🌿</span>
          {onBackToAdmin && (
            <button
              type="button"
              onClick={onBackToAdmin}
              className="text-[#B09E88] hover:text-[#5A4838] transition font-medium cursor-pointer"
              title="Acceso Personal / Administración"
            >
              🔒 Acceso Personal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
