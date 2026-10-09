import React, { useState } from 'react';
import { CABANAS, DN, DC, CABANAS_POR_TIPO, TIPOS, formatMoney } from '../services/cabinConfig';
import { fetchOcupadas } from '../services/api';
import { hoyIso, sumarDias } from '../services/fechas';
import { 
  Calendar, 
  Users, 
  Sparkles, 
  MapPin, 
  Waves, 
  Flame, 
  Wifi, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  MessageCircle, 
  ArrowRight, 
  Send, 
  Bot, 
  Lock, 
  X, 
  Heart,
  ChevronRight,
  Phone
} from 'lucide-react';

// Página pública: NO recibe reservas. Solo consulta qué cabañas están ocupadas (sin nombres ni precios).
interface LandingPageViewProps {
  onBackToAdmin: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onBackToAdmin }) => {
  const [searchCheckin, setSearchCheckin] = useState<string>(() => sumarDias(hoyIso(), 1));
  const [searchCheckout, setSearchCheckout] = useState<string>(() => sumarDias(hoyIso(), 3));
  const [searchPax, setSearchPax] = useState<number>(2);
  const [searchResult, setSearchResult] = useState<string | null>(null);

  // Widget de Xenia en la Landing
  const [isXeniaOpen, setIsXeniaOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'bot'; text: string; time: string; toolCalled?: string }>>([
    {
      role: 'bot',
      text: '¡Hola! Soy Xenia, la anfitriona virtual de Cabañas Los Bananos 🍍🌿 ¿En qué fechas te gustaría visitarnos y cuántas personas viajarían? Te puedo consultar disponibilidad y cotizarte al instante.',
      time: 'Ahora',
    },
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const handleSearchAvailability = async () => {
    if (!searchCheckin || !searchCheckout || searchCheckout <= searchCheckin) {
      setSearchResult('Elegí una fecha de salida posterior a la de llegada.');
      return;
    }
    try {
      const ocupadas = await fetchOcupadas(searchCheckin, searchCheckout);
      // Las reservas "sin asignar" (SA_tipo) ocupan un lugar de ese tipo de cabaña
      const libres = (Object.keys(CABANAS_POR_TIPO) as Array<keyof typeof CABANAS_POR_TIPO>).reduce((total, tipo) => {
        const cabanas = CABANAS_POR_TIPO[tipo];
        const ocupadasTipo = cabanas.filter(c => ocupadas.includes(c)).length + ocupadas.filter(o => o === `SA_${tipo}`).length;
        return total + Math.max(0, cabanas.length - ocupadasTipo);
      }, 0);
      if (libres === 0) {
        setSearchResult('No tenemos cabañas disponibles para esas fechas exactas. ¡Probá con otras fechas o consultale a Xenia alternativas!');
      } else {
        setSearchResult(`¡Tenemos ${libres} ${libres === 1 ? 'cabaña disponible' : 'cabañas disponibles'} para esas fechas! Escribinos por WhatsApp o charlá con Xenia para reservar.`);
      }
    } catch (_) {
      setSearchResult('No pudimos consultar la disponibilidad ahora. Escribinos por WhatsApp.');
    }
  };

  const handleSendXenia = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/xenia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages.slice(-6).map(m => ({ role: m.role, text: m.text })),
          channel: 'web',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const toolName = data.toolExecutions?.[0]?.name;


        setChatMessages(prev => [
          ...prev,
          {
            role: 'bot',
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            toolCalled: toolName,
          },
        ]);
        setIsTyping(false);
        return;
      }
    } catch (_) {}

    // Fallback si la API no responde
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: '¡Con gusto! Tenemos opciones ideales tanto para parejas con jacuzzi como para familias. Si querés podés decirme cuántas personas son y las fechas para congelar la tarifa con seña del 50%.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  const quickPrompts = [
    '¿Qué tienen disponible para 2 personas con jacuzzi?',
    'Somos una familia de 4, ¿cuánto saldría el fin de semana?',
    '¿Aceptan perrito educado?',
    '¿Cuáles son los horarios de check-in y salida?',
  ];

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#F1F5F9] font-sans relative selection:bg-emerald-500 selection:text-white pb-20">
      {/* Barra superior de la Landing */}
      <header className="sticky top-0 z-40 bg-[#12161E]/90 backdrop-blur-md border-b border-[#252D3A] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-950 font-bold">
            🌴
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-tight tracking-tight flex items-center gap-2">
              Los Bananos
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                Puerto Iguazú
              </span>
            </h1>
            <p className="text-xs text-[#94A3B8]">Cabañas & Tiny Houses en la Selva</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón WhatsApp Directo */}
          <a
            href="https://wa.me/5493757551234?text=Hola!%20Quiero%20consultar%20por%20caba%C3%B1as%20en%20Los%20Bananos"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold transition"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp</span>
          </a>

          {/* Botón para volver al sistema de gestión interno */}
          <button
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E2530] hover:bg-[#283241] text-[#94A3B8] hover:text-white border border-[#2F3A4A] text-xs font-semibold transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Panel de Gestión</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 pt-12 pb-16 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Atención al instante por WhatsApp, Instagram y Web con Xenia</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none max-w-4xl mx-auto">
          Tu descanso en la naturaleza de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Puerto Iguazú</span>
        </h2>
        
        <p className="mt-4 text-base sm:text-lg text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
          Cabañas amplias para familias y Tiny Houses con jacuzzi privado para parejas. Rodeadas de selva, con piscina, muelle propio y parrillas individuales.
        </p>

        {/* Buscador de disponibilidad rápida */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-[#161B24]/90 border border-[#2A3444] shadow-2xl max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Check-in</label>
              <div className="relative">
                <input
                  type="date"
                  value={searchCheckin}
                  onChange={e => setSearchCheckin(e.target.value)}
                  className="w-full bg-[#0D1017] border border-[#2F3A4A] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Check-out</label>
              <div className="relative">
                <input
                  type="date"
                  value={searchCheckout}
                  onChange={e => setSearchCheckout(e.target.value)}
                  className="w-full bg-[#0D1017] border border-[#2F3A4A] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Huéspedes</label>
              <select
                value={searchPax}
                onChange={e => setSearchPax(Number(e.target.value))}
                className="w-full bg-[#0D1017] border border-[#2F3A4A] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 Huésped</option>
                <option value={2}>2 Huéspedes (Pareja)</option>
                <option value={3}>3 Huéspedes</option>
                <option value={4}>4 Huéspedes (Familia)</option>
                <option value={5}>5 Huéspedes</option>
                <option value={6}>6 Huéspedes</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#232B38]">
            <div className="text-xs text-[#94A3B8] text-left">
              {searchResult ? (
                <span className="text-emerald-400 font-semibold">{searchResult}</span>
              ) : (
                <span>Ingresá tus fechas para ver disponibilidad y tarifas en tiempo real.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleSearchAvailability}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Verificar Disponibilidad</span>
              </button>

              <button
                onClick={() => setIsXeniaOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs sm:text-sm transition shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Bot className="w-4 h-4" />
                <span>Chatear con Xenia</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de Cabañas */}
      <section className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Nuestras Cabañas & Tiny Houses</h3>
          <p className="text-sm text-[#94A3B8] mt-1">Elegí el espacio que mejor se adapte a tu viaje</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Cabaña 7 Tiny Jacuzzi */}
          <div className="rounded-3xl bg-[#141820] border border-[#2B3545] p-5 shadow-xl flex flex-col justify-between hover:border-amber-500/50 transition duration-300">
            <div>
              <div className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-tr from-amber-950/60 to-orange-900/40 border border-[#2F3A4A] flex items-center justify-center p-4 text-center mb-4">
                <span className="text-5xl">🛁🌿</span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 text-amber-950 font-black text-[11px] shadow">
                  EXCLUSIVA PAREJAS
                </span>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-white">Cabaña 7 (Tiny Jacuzzi)</h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800">2 personas</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                Nuestra propuesta romántica más codiciada. Tiny house con hidromasaje/jacuzzi privado en el deck exterior, cama sommier matrimonial, cocina completa y vista a la selva.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[#CBD5E1]">
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">✨ Jacuzzi Privado</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">❄️ Aire Frío/Calor</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🔥 Parrilla</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">📶 Wifi</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#232B38] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Desde</span>
                <span className="text-base font-extrabold text-white">$ 68.000 / USD 45</span>
                <span className="text-[10px] text-[#94A3B8]"> / noche</span>
              </div>
              <button
                onClick={() => {
                  setIsXeniaOpen(true);
                  handleSendXenia('Hola Xenia! Me interesa la Cabaña 7 con jacuzzi para 2 personas, ¿qué disponibilidad tenés?');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>Reservar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Cabañas Big (C2 y C3) */}
          <div className="rounded-3xl bg-[#141820] border border-[#2B3545] p-5 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition duration-300">
            <div>
              <div className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-950/60 to-teal-900/40 border border-[#2F3A4A] flex items-center justify-center p-4 text-center mb-4">
                <span className="text-5xl">🏡👨‍👩‍👧‍👦</span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-black text-[11px] shadow">
                  FAMILIAR
                </span>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-white">Cabañas 2 y 3 (Big)</h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">4 a 6 pax</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                Espaciosas cabañas de 2 dormitorios independientes, amplio living, cocina completa equipada para grupos o familias, galería con parrilla propia y gran comodidad.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[#CBD5E1]">
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🛏️ 2 Habitaciones</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🍽️ Cocina completa</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🔥 Galería & Parrilla</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🚗 Cochera</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#232B38] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Desde</span>
                <span className="text-base font-extrabold text-white">$ 75.000 / USD 50</span>
                <span className="text-[10px] text-[#94A3B8]"> / noche</span>
              </div>
              <button
                onClick={() => {
                  setIsXeniaOpen(true);
                  handleSendXenia('Hola Xenia! Somos una familia de 4 a 6 personas, ¿tenés libre Cabaña Big?');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>Reservar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Cabañas Tiny Estándar (C5, C6, C8, C9) */}
          <div className="rounded-3xl bg-[#141820] border border-[#2B3545] p-5 shadow-xl flex flex-col justify-between hover:border-sky-500/50 transition duration-300">
            <div>
              <div className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-tr from-sky-950/60 to-blue-900/40 border border-[#2F3A4A] flex items-center justify-center p-4 text-center mb-4">
                <span className="text-5xl">🪵✨</span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-sky-500 text-white font-black text-[11px] shadow">
                  MODERNA & COMPACTA
                </span>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-white">Tiny Houses (C5, C6, C8, C9)</h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800">2 a 4 pax</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                Diseño minimalista y moderno integrado a la naturaleza. Equipadas con cama matrimonial + sofá cama, cocina práctica, baño moderno y deck individual para tomar unos mates.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[#CBD5E1]">
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🌲 Deck privado</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">❄️ Climatización</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🔥 Parrilla individual</span>
                <span className="px-2 py-1 rounded-lg bg-[#1B212D]">🐾 Pet Friendly</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#232B38] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Desde</span>
                <span className="text-base font-extrabold text-white">$ 52.000 / USD 35</span>
                <span className="text-[10px] text-[#94A3B8]"> / noche</span>
              </div>
              <button
                onClick={() => {
                  setIsXeniaOpen(true);
                  handleSendXenia('Hola Xenia! Me gustaría consultar por una Tiny House estándar para mis vacaciones.');
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>Reservar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reglas de la casa y Preguntas Frecuentes */}
      <section className="px-4 sm:px-8 py-10 max-w-4xl mx-auto">
        <div className="rounded-3xl bg-[#131720] border border-[#273140] p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Información Importante & Políticas</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#0D1017] border border-[#232C3A]">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Horarios de Estadía</span>
              </div>
              <p className="text-[#94A3B8]">
                • <strong>Check-in:</strong> A partir de las 14:00 hs.<br />
                • <strong>Check-out:</strong> Hasta las 10:00 hs.<br />
                Early check-in y late check-out sujetos a disponibilidad previa.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0D1017] border border-[#232C3A]">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Confirmación con Seña</span>
              </div>
              <p className="text-[#94A3B8]">
                Se solicita el <strong>50% de anticipo</strong> por transferencia bancaria (pesos o dólares) para bloquear las fechas en el calendario. El saldo restante se abona al ingresar.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0D1017] border border-[#232C3A]">
              <div className="font-bold text-teal-400 flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span>Mascotas (Pet Friendly)</span>
              </div>
              <p className="text-[#94A3B8]">
                Aceptamos mascotas educadas en cabañas seleccionadas con aviso previo. Se solicita cuidado del mobiliario y mantenerla con correa en áreas comunes.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0D1017] border border-[#232C3A]">
              <div className="font-bold text-sky-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Políticas de Cancelación</span>
              </div>
              <p className="text-[#94A3B8]">
                Reintegro del 100% de la seña cancelando con al menos 14 días de anticipación a la fecha de llegada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Botón Flotante de Xenia en la Landing */}
      <button
        onClick={() => setIsXeniaOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-2xl hover:scale-105 transition transform cursor-pointer border-2 border-emerald-400/50"
      >
        <span className="text-xl">🍍</span>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-black leading-tight">Chatear con Xenia</p>
          <p className="text-[10px] text-emerald-200">Disponibilidad en vivo</p>
        </div>
      </button>

      {/* Modal / Chat Flotante de Xenia */}
      {isXeniaOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="w-full sm:w-[420px] h-[85vh] sm:h-[580px] bg-[#12161F] border border-[#2B3545] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
            {/* Header del Chat */}
            <div className="bg-gradient-to-r from-emerald-800 to-[#12161F] p-4 flex items-center justify-between border-b border-[#2A3444]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-lg font-bold text-amber-950 border-2 border-white shadow">
                  🍍
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    Xenia de Los Bananos
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h4>
                  <p className="text-[11px] text-emerald-200">Concierge Virtual & Reservas</p>
                </div>
              </div>

              <button
                onClick={() => setIsXeniaOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0E14]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {msg.toolCalled && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>API ejecutada: {msg.toolCalled}</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-[#1C222E] text-[#F1F5F9] border border-[#2E3747] rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[9px] opacity-60 block text-right mt-1">{msg.time}</span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-[#94A3B8] p-2 bg-[#1C222E] rounded-xl w-fit">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200"></div>
                  <span>Xenia está consultando disponibilidad...</span>
                </div>
              )}
            </div>

            {/* Sugerencias Rápidas */}
            <div className="px-3 py-2 bg-[#10141C] border-t border-[#1F2633] overflow-x-auto flex gap-1.5 scrollbar-none">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendXenia(p)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#181E29] hover:bg-[#232B3B] text-[11px] text-[#CBD5E1] border border-[#2B3545] transition shrink-0 cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input para tipear */}
            <div className="p-3 bg-[#12161F] border-t border-[#232B38] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendXenia(chatInput)}
                placeholder="Escribile a Xenia por fechas, cabañas o dudas..."
                className="flex-1 bg-[#0D1017] border border-[#2D3647] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSendXenia(chatInput)}
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
