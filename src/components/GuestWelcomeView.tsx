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
}

export const GuestWelcomeView: React.FC<GuestWelcomeViewProps> = ({
  onBackToAdmin,
  guestNameParam,
  cabinParam,
}) => {
  // Configuración de Wi-Fi y enlaces
  const [config] = useState(() => {
    try {
      const saved = localStorage.getItem('bn_whatsapp_config');
      if (saved) return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_WHATSAPP_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'info' | 'xenia' | 'guia'>('info');
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
        ? `🌴 ¡Hola ${guestName}! Te doy una cálida bienvenida a Cabañas Los Bananos 🍍 Soy Xenia, tu anfitriona virtual 24hs. ¿En qué te puedo ayudar hoy? Podés preguntarme sobre excursiones a Cataratas, delivery de comida, toallas extras o normas del complejo.`
        : '🌴 ¡Hola! Te damos la bienvenida a Cabañas Los Bananos en Puerto Iguazú 🍍 Soy Xenia, tu anfitriona virtual 24hs. Estoy despierta a toda hora para responderte dudas de la cabaña, paseos a Cataratas, recomendaciones de comida o lo que necesites durante tu estadía.',
      time: 'Ahora',
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendXenia = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: q, time: userTime }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/xenia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'web',
          message: q,
          guestName: guestName || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            text: data.reply || '¡Con gusto! Cualquier otra duda que tengas sobre Los Bananos o Puerto Iguazú, avisame.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsTyping(false);
        return;
      }
    } catch (_) {}

    // Fallback inteligente para huéspedes
    setTimeout(() => {
      const qLower = q.toLowerCase();
      let reply = '¡Con gusto te ayudo! Si necesitás asistencia inmediata del equipo en la cabaña, también podés tocar el botón de WhatsApp abajo para hablar directo con recepción.';

      if (qLower.includes('wifi') || qLower.includes('clave') || qLower.includes('internet')) {
        reply = `📶 La red de Wi-Fi es "Los Bananos Huéspedes" y la contraseña es "${config.wifiPass}". Tenés cobertura en todas las cabañas y en la zona de la piscina.`;
      } else if (qLower.includes('catarata') || qLower.includes('parque')) {
        reply = '🌊 Para visitar las Cataratas del Iguazú lado argentino te recomiendo salir temprano (el parque abre a las 08:00 hs). Las entradas se compran con anticipación online en la web de Parques Nacionales. ¡No te pierdas la pasarela de Garganta del Diablo!';
      } else if (qLower.includes('pileta') || qLower.includes('piscina')) {
        reply = '🏊‍♂️ La piscina está habilitada todos los días de 09:00 a 22:00 hs. Les pedimos ducharse antes de ingresar y usar toallas de piscina.';
      } else if (qLower.includes('comida') || qLower.includes('delivery') || qLower.includes('cena') || qLower.includes('restaurant')) {
        reply = '🍕 En Puerto Iguazú hay excelentes opciones de delivery de empanadas, pizzas y comida regional que llegan directo a Los Bananos. También sobre la Av. Brasil y Av. Victoria Aguirre hay muy lindas parrillas y restaurantes.';
      } else if (qLower.includes('check out') || qLower.includes('checkout') || qLower.includes('salida')) {
        reply = '🕒 El horario de check-out es a las 10:00 hs de la mañana para permitir el recambio y limpieza. Si tu vuelo o colectivo sale más tarde, con gusto podemos guardar tu equipaje en recepción.';
      } else if (qLower.includes('toalla') || qLower.includes('sabana') || qLower.includes('limpieza')) {
        reply = '🧺 Si necesitás toallas extras o reposición, por favor tocanos el botón de WhatsApp con recepción y te las acercamos a tu cabaña en unos minutos.';
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
    }, 600);
  };

  const quickQuestions = [
    '¿Cuál es la clave del Wi-Fi?',
    '¿Cómo llegar a las Cataratas?',
    '¿Qué delivery de comida recomiendan?',
    '¿Hasta qué hora funciona la piscina?',
    '¿A qué hora es el check-out?',
    '¿Dónde comprar provisiones o supermercado cerca?',
  ];

  const cabinDisplayName = cabinCode && DN[cabinCode as keyof typeof DN] ? DN[cabinCode as keyof typeof DN] : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2A2118] font-sans pb-16 selection:bg-emerald-500 selection:text-white">
      {/* Barra Superior con Logo y Acceso Administrativo discreto */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#EAE0D2] px-4 sm:px-6 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md font-bold">
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
          {/* Botón WhatsApp Recepción directo */}
          <a
            href="https://wa.me/5493757551234?text=Hola!%20Estoy%20en%20Caba%C3%B1as%20Los%20Bananos%20y%20tengo%20una%20consulta"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            title="Escribir a Recepción por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp Recepción</span>
          </a>

          {/* Botón discreto para volver al panel de propietarios (Gabriela) */}
          {onBackToAdmin && (
            <button
              onClick={onBackToAdmin}
              className="p-2 text-[#7A6752] hover:text-[#2A2118] hover:bg-[#F2ECE1] rounded-xl transition"
              title="Volver al panel interno de gestión (con código 1535)"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Hero Bienvenida Cálida */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-4">
        <div className="bg-gradient-to-br from-emerald-800 to-[#1b4332] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Adorno tropical de fondo */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-0 right-10 -mb-10 w-32 h-32 rounded-full bg-amber-400/10 pointer-events-none" />

          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tu estadía en la selva misionera</span>
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
                Queremos que disfrutes de una estadía inolvidable rodeado de naturaleza, piscina, muelle propio y el sonido de las aves.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Huésped */}
      <div className="max-w-3xl mx-auto px-4 mt-2">
        <div className="grid grid-cols-3 gap-2 bg-[#EFE6D8] p-1.5 rounded-2xl border border-[#DBCAB5]">
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
            <span>Paseos & Tips</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO 1: INFO DE CABAÑA & WI-FI */}
      {activeTab === 'info' && (
        <div className="max-w-3xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          
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
                <span>Horarios Clave</span>
              </div>
              <ul className="text-xs text-[#5A4838] space-y-1.5 leading-relaxed">
                <li>• <strong>Check-in:</strong> a partir de las 14:00 hs.</li>
                <li>• <strong>Check-out:</strong> hasta las 10:00 hs.</li>
                <li>• <strong>Piscina:</strong> habilitada de 09:00 a 22:00 hs.</li>
                <li>• <strong>Horario de Silencio:</strong> 23:00 a 08:00 hs para el descanso en la selva.</li>
              </ul>
            </div>

            {/* Ubicación & GPS */}
            <div className="bg-white border border-[#E5D7C5] rounded-2xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#D2502A] font-bold text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Ubicación GPS</span>
                </div>
                <p className="text-xs text-[#5A4838] mt-1 leading-relaxed">
                  Puerto Iguazú, Misiones. Acceso señalizado y estacionamiento dentro del predio.
                </p>
              </div>

              <a
                href={config.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-[#FAF4EB] hover:bg-[#F0E6D8] border border-[#D8CEBA] text-[#4A3828] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-center mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Google Maps</span>
              </a>
            </div>
          </div>

          {/* Banner de Xenia invitando a chatear */}
          <div 
            onClick={() => setActiveTab('xenia')}
            className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md cursor-pointer hover:brightness-105 transition flex items-center justify-between gap-4"
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
                  Nuestra concierge virtual te responde sobre Cataratas, deliveries, toallas y paseos al instante.
                </p>
              </div>
            </div>

            <ChevronRight className="w-6 h-6 text-purple-300 shrink-0" />
          </div>

          {/* Servicios Incluidos */}
          <div className="bg-white border border-[#E5D7C5] rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-[#2A2118] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Servicios y Comodidades Incluidas</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-[#5A4838]">
              <div className="flex items-center gap-2 p-2 bg-[#FAF5EE] rounded-xl">
                <Waves className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Piscina en el parque</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#FAF5EE] rounded-xl">
                <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Parrilla individual</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#FAF5EE] rounded-xl">
                <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Wi-Fi gratuito</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#FAF5EE] rounded-xl">
                <Compass className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Muelle en la selva</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#FAF5EE] rounded-xl">
                <Utensils className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Cocina y vajilla</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#FAF5EE] rounded-xl">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Estacionamiento</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: CHAT CON XENIA 24HS (CONCIERGE VIRTUAL) */}
      {activeTab === 'xenia' && (
        <div className="max-w-3xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5D7C5] rounded-3xl shadow-sm overflow-hidden flex flex-col h-[70vh] max-h-[620px]">
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
                    Asistente oficial de Cabañas Los Bananos
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
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs leading-relaxed ${
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
                <div className="flex items-center gap-1.5 bg-white border border-[#EAE0D2] rounded-2xl px-4 py-2.5 max-w-[120px] text-xs text-purple-700 font-semibold shadow-xs">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                  <span className="text-[11px] text-slate-400 ml-1">Escribiendo...</span>
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
                placeholder="Escribile tu consulta a Xenia..."
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

      {/* CONTENIDO 3: GUÍA TURÍSTICA & TIPS DE PUERTO IGUAZÚ */}
      {activeTab === 'guia' && (
        <div className="max-w-3xl mx-auto px-4 mt-5 space-y-4 animate-in fade-in duration-200">
          {/* Cataratas Argentinas */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
              <span>🌊</span>
              <h3>Cataratas del Iguazú (Lado Argentino)</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#5A4838] leading-relaxed">
              El Parque Nacional Iguazú abre todos los días de 08:00 a 18:00 hs (último ingreso 16:30 hs). Se recorren tres circuitos principales:
            </p>
            <ul className="text-xs text-[#5A4838] space-y-1.5 pl-3 list-disc">
              <li><strong>Garganta del Diablo:</strong> el salto más imponente del mundo mediante el tren ecológico.</li>
              <li><strong>Circuito Superior:</strong> vistas panorámicas desde arriba de las cascadas.</li>
              <li><strong>Circuito Inferior:</strong> contacto cercano con los saltos y lancha de aventura.</li>
            </ul>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
              💡 <strong>Tip de Los Bananos:</strong> Comprá tus entradas online previamente en la web de Parques Nacionales para evitar filas y llevá calzado cómodo, protector solar y capa impermeable.
            </div>
          </div>

          {/* Cataratas Brasileñas & Parque das Aves */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-blue-800 font-extrabold text-base">
              <span>🇧🇷</span>
              <h3>Cataratas Lado Brasileño & Parque das Aves</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#5A4838] leading-relaxed">
              La vista frontal panorámica de las cataratas. Para cruzar la frontera en Foz do Iguaçu necesitás DNI o Pasaporte vigente. Podés combinar la visita con el <strong>Parque das Aves</strong>, ubicado justo enfrente.
            </p>
          </div>

          {/* Paseos Urbanos en Puerto Iguazú */}
          <div className="bg-white border border-[#E5D7C5] rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-[#D2502A] font-extrabold text-base">
              <span>🌆</span>
              <h3>Hito de las Tres Fronteras & Gastronomía</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#5A4838] leading-relaxed">
              Punto de unión entre Argentina, Brasil y Paraguay sobre los ríos Iguazú y Paraná. Todas las tardes al atardecer hay show de luces y aguas danzantes con feria de artesanías misioneras.
            </p>
          </div>
        </div>
      )}

      {/* Pie de página con opción de compartir enlace */}
      <div className="max-w-3xl mx-auto px-4 mt-8 text-center space-y-3">
        <button
          type="button"
          onClick={handleCopyWelcomeLink}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F2ECE1] border border-[#D4C3AE] text-[#5A4838] text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? '¡Enlace de Bienvenida Copiado!' : 'Copiar enlace de esta Guía'}</span>
        </button>

        <p className="text-[11px] text-[#8C765C]">
          Cabañas Los Bananos · Puerto Iguazú, Misiones · Diseñado con cariño para nuestros huéspedes 🌿
        </p>
      </div>
    </div>
  );
};
