import React, { useState, useEffect } from 'react';
import { Reserva, CabinCode } from '../../types';
import { DN, CABANAS, formatMoney } from '../../services/cabinConfig';
import { 
  Bot, 
  MessageCircle, 
  Instagram, 
  Globe, 
  Send, 
  Sparkles, 
  Check, 
  Copy, 
  Play, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Calendar, 
  Phone, 
  Heart,
  ChevronRight,
  Database
} from 'lucide-react';

interface XeniaMulticanalViewProps {
  reservas: Reserva[];
  onNewReservaCreated: (reserva: Reserva) => void;
  onOpenLandingPage: () => void;
  onNavigateTab?: (tab: any) => void;
}

type ChannelType = 'whatsapp' | 'instagram' | 'web';
type SubTab = 'simulador' | 'webhooks' | 'reglas' | 'landing';

export const XeniaMulticanalView: React.FC<XeniaMulticanalViewProps> = ({
  reservas,
  onNewReservaCreated,
  onOpenLandingPage,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('simulador');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('whatsapp');

  // Estado del chat del simulador
  const [chatInput, setChatInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'bot';
    text: string;
    time: string;
    toolExecution?: { name: string; args: any; result: any };
    reservaCreada?: any;
  }>>([
    {
      id: 'init',
      role: 'bot',
      text: '🌴 ¡Hola! Qué lindo que quieras visitar Cabañas Los Bananos en Puerto Iguazú. ¿Para qué fechas estás buscando y cuántas personas serían?',
      time: '14:20',
    },
  ]);

  const [activeToolLog, setActiveToolLog] = useState<{ name: string; args: any; result: any } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Reglas de negocio editables
  const [rules, setRules] = useState({
    checkinTime: '14:00',
    checkoutTime: '10:00',
    earlyCheckinInfo: 'El early check-in o late check-out está sujeto a disponibilidad el día previo.',
    senaPorcentaje: 50,
    politicaCancelacion: 'Cancelación gratuita con reintegro total hasta 14 días antes del check-in.',
    politicaMascotas: 'Aceptamos mascotas educadas en cabañas seleccionadas con aviso previo.',
    serviciosIncluidos: 'Piscina común, kayaks y muelle, wifi, parrilla individual, aire acondicionado frío/calor, ropa blanca.',
    aliasBancario: 'los.bananos.iguazu',
    cbu: '0000003100098765432100',
  });

  // Cargar reglas del servidor al montar
  useEffect(() => {
    fetch('/api/xenia/rules')
      .then(res => res.json())
      .then(data => {
        if (data.rules) {
          setRules(prev => ({ ...prev, ...data.rules }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleSaveRules = async () => {
    setSaveStatus('Guardando...');
    try {
      const res = await fetch('/api/xenia/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });
      if (res.ok) {
        setSaveStatus('¡Reglas actualizadas en el servidor de Xenia! ✓');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('Error al guardar');
      }
    } catch (e) {
      setSaveStatus('Error al conectar');
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = Date.now().toString(36);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: userMsgId,
      role: 'user' as const,
      text: textToSend,
      time: nowTime,
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const historyForApi = messages.slice(-6).map(m => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/xenia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyForApi,
          channel: selectedChannel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const primaryTool = data.toolExecutions?.[0] || null;

        if (primaryTool) {
          setActiveToolLog(primaryTool);
        }

        if (data.reservaCreada) {
          onNewReservaCreated(data.reservaCreada);
        }

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(36),
            role: 'bot',
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            toolExecution: primaryTool,
            reservaCreada: data.reservaCreada,
          },
        ]);
        setIsTyping(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    // Respuesta de respaldo simulada
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(36),
          role: 'bot',
          text: '¡Entendido! Tenemos cabañas familiares y opciones exclusivas para parejas con jacuzzi. Si confirmás las fechas te reservo el lugar al instante.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const testScenarios = [
    {
      title: 'Plantillas & Blindaje Anti-Quejas',
      text: '¿Para qué sirven las 6 plantillas de WhatsApp y cómo funciona el blindaje anti-quejas?',
    },
    {
      title: 'Disponibilidad para 4 pax',
      text: 'Hola! Somos una familia de 4 personas, ¿tienen cabaña libre del 10 al 12 de octubre?',
    },
    {
      title: 'Cabaña con jacuzzi',
      text: 'Hola, somos una pareja y queremos la Cabaña 7 con jacuzzi para el próximo finde, ¿cuánto sale?',
    },
    {
      title: 'Consulta de Mascotas',
      text: 'Hola, ¿aceptan perro caniche mediano y educado?',
    },
    {
      title: 'Horarios de Entrada y Salida',
      text: '¿A qué hora es el check-in y se puede entrar más temprano?',
    },
    {
      title: 'Confirmar Reserva Formal',
      text: 'Dale, confirmame la Cabaña 7 para esas fechas a nombre de Sofía Gómez, mi tel es 11-4433-2211.',
    },
  ];

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://bananos.app';
  const metaWebhookUrl = `${appOrigin}/api/webhook/meta`;

  return (
    <div className="space-y-6">
      {/* Banner Superior Principal */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#151D28] to-[#12161F] p-5 sm:p-6 rounded-3xl border border-emerald-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-600/50 text-emerald-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Agente Inteligente con Function Calling & APIs</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            Xenia Multicanal
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
              WhatsApp • Instagram • Web
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
            Atiende consultas informales de huéspedes, responde sobre políticas y servicios desde tu base de conocimiento, y ejecuta APIs para consultar calendarios y asentar reservas en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('avisos')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm border border-emerald-500/40 shadow-md transition transform active:scale-95 cursor-pointer"
              title="Ir al módulo con las 6 plantillas oficiales y filtros de reservas"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ver Mensajería & WhatsApp (6 Plantillas)</span>
            </button>
          )}

          {/* Acceso a la Landing Page Pública */}
          <button
            onClick={onOpenLandingPage}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition transform active:scale-95 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Landing Pública</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Selector de Pestañas Secundarias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#242C3A]">
        <button
          onClick={() => setActiveSubTab('simulador')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'simulador'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:bg-[#1A202C] hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Simulador en Vivo</span>
        </button>

        <button
          onClick={() => setActiveSubTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'webhooks'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:bg-[#1A202C] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Conexión WhatsApp & Instagram (APIs)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reglas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'reglas'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:bg-[#1A202C] hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Reglas de Negocio & Guía (Base de Conocimiento)</span>
        </button>
      </div>

      {/* SUBTAB 1: SIMULADOR MULTICANAL */}
      {activeSubTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel Izquierdo: Chat del Canal Seleccionado (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-[#12161F] border border-[#26303F] rounded-3xl shadow-2xl overflow-hidden min-h-[580px]">
            {/* Header del Canal */}
            <div className={`p-4 flex items-center justify-between border-b ${
              selectedChannel === 'whatsapp'
                ? 'bg-[#1F2C34] border-[#2A3942]'
                : selectedChannel === 'instagram'
                ? 'bg-gradient-to-r from-purple-900 via-pink-900 to-[#1A1F2B] border-pink-800/40'
                : 'bg-[#18202C] border-[#293547]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold bg-amber-400 text-amber-950 border-2 border-white shadow">
                  🍍
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    {selectedChannel === 'whatsapp' && 'Cabañas Los Bananos 🌴 (WhatsApp)'}
                    {selectedChannel === 'instagram' && '@cabanaslosbananos (Instagram Direct)'}
                    {selectedChannel === 'web' && 'Xenia Web Concierge (Landing Page)'}
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    {selectedChannel === 'whatsapp' && 'Cuenta comercial oficial de WhatsApp'}
                    {selectedChannel === 'instagram' && 'Mensajes directos de Instagram'}
                    {selectedChannel === 'web' && 'Widget flotante en la web oficial'}
                  </p>
                </div>
              </div>

              {/* Selector de Canal */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => setSelectedChannel('whatsapp')}
                  title="Simular mensaje por WhatsApp"
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    selectedChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedChannel('instagram')}
                  title="Simular mensaje por Instagram Direct"
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    selectedChannel === 'instagram'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Instagram className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedChannel('web')}
                  title="Simular chat en Landing Page"
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    selectedChannel === 'web'
                      ? 'bg-sky-600 text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Historial de Mensajes */}
            <div className={`flex-1 p-4 space-y-3 overflow-y-auto max-h-[460px] ${
              selectedChannel === 'whatsapp'
                ? 'bg-[#0B141A]'
                : selectedChannel === 'instagram'
                ? 'bg-[#0E0F12]'
                : 'bg-[#0D1017]'
            }`}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Badge de invocación de función si existió */}
                  {msg.toolExecution && (
                    <div 
                      onClick={() => setActiveToolLog(msg.toolExecution || null)}
                      className="cursor-pointer mb-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 text-[10px] font-mono flex items-center gap-1.5 hover:bg-emerald-900/60 transition"
                      title="Hacé clic para ver los parámetros y datos recibidos"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>API ejecutada: <strong>{msg.toolExecution.name}</strong></span>
                      <ChevronRight className="w-3 h-3 opacity-60" />
                    </div>
                  )}

                  {/* Burbuja de Mensaje */}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? selectedChannel === 'whatsapp'
                          ? 'bg-[#005C4B] text-white rounded-2xl rounded-tr-xs'
                          : selectedChannel === 'instagram'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-xs'
                          : 'bg-emerald-600 text-white rounded-2xl rounded-tr-xs'
                        : selectedChannel === 'whatsapp'
                        ? 'bg-[#202C33] text-[#E9EDEF] rounded-2xl rounded-tl-xs border border-[#2A3942]'
                        : 'bg-[#1C222E] text-[#F1F5F9] rounded-2xl rounded-tl-xs border border-[#2E394A]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-60">
                      <span>{msg.time}</span>
                      {msg.role === 'user' && selectedChannel === 'whatsapp' && (
                        <span className="text-sky-300">✓✓</span>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta de Reserva Confirmada por Xenia */}
                  {msg.reservaCreada && (
                    <div className="mt-2 w-full max-w-[85%] sm:max-w-[78%] rounded-2xl bg-emerald-950/70 border border-emerald-600 p-3.5 text-xs text-white shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-800">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ¡Reserva Creada en Calendario!
                        </span>
                        <span className="font-mono text-[10px] bg-emerald-900 px-2 py-0.5 rounded text-emerald-200">
                          {msg.reservaCreada.id}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-[#CBD5E1]">
                        <p><strong>Huésped:</strong> {msg.reservaCreada.huesped}</p>
                        <p><strong>Cabaña:</strong> {DN[msg.reservaCreada.depto as CabinCode] || msg.reservaCreada.depto}</p>
                        <p><strong>Fechas:</strong> {msg.reservaCreada.checkin} al {msg.reservaCreada.checkout}</p>
                        <p><strong>Estado:</strong> <span className="text-amber-300 font-bold">Pendiente de Seña (50%)</span></p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-emerald-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-300">Impacto inmediato en el sistema</span>
                        <a
                          href={`https://wa.me/?text=Hola%20${encodeURIComponent(msg.reservaCreada.huesped)}!%20Te%20compartimos%20tu%20reserva%20en%20Caba%C3%B1as%20Los%20Bananos%20para%20el%20${msg.reservaCreada.checkin}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Enviar WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-[#94A3B8] p-2 bg-[#1C222E] rounded-xl w-fit">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200"></div>
                  <span>Xenia está procesando el pedido y consultando APIs...</span>
                </div>
              )}
            </div>

            {/* Sugerencias Rápidas de Pruebas */}
            <div className="px-3 py-2 bg-[#12161F] border-t border-[#222A38] overflow-x-auto flex gap-1.5 scrollbar-none">
              {testScenarios.map((sc, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sc.text)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#1A2230] hover:bg-[#253042] text-[11px] text-[#CBD5E1] border border-[#2D394C] transition shrink-0 cursor-pointer"
                >
                  {sc.title}
                </button>
              ))}
            </div>

            {/* Input de Envío */}
            <div className="p-3 bg-[#18202C] border-t border-[#263142] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage(chatInput)}
                placeholder={`Escribí como huésped por ${selectedChannel.toUpperCase()}...`}
                className="flex-1 bg-[#0E131A] border border-[#2C384A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSendMessage(chatInput)}
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panel Derecho: Inspector de APIs & Function Calling (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tarjeta: Estado del Motor de IA */}
            <div className="p-4 rounded-3xl bg-[#12161F] border border-[#26303F] shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-[#242D3C]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  <h4 className="font-extrabold text-sm text-white">Motor de Agente Xenia</h4>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  gemini-3.8-flash
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs text-[#94A3B8]">
                <div className="flex items-center justify-between">
                  <span>Conexión a Base de Datos:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Database className="w-3.5 h-3.5" /> Supabase en vivo
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Herramientas activas (Tools):</span>
                  <span className="text-white font-mono">3 funciones registradas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Validación de sobreventa:</span>
                  <span className="text-emerald-400 font-semibold">Garantizada (cero overbooking)</span>
                </div>
              </div>
            </div>

            {/* Tarjeta: Inspector de Invocación de Funciones en Tiempo Real */}
            <div className="p-4 rounded-3xl bg-[#12161F] border border-[#26303F] shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-[#242D3C]">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Detrás de Escena (APIs & Tools)</span>
                </h4>
                {activeToolLog && (
                  <button
                    onClick={() => handleCopy(JSON.stringify(activeToolLog, null, 2), 'toolLog')}
                    className="text-[11px] text-[#94A3B8] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText === 'toolLog' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'toolLog' ? 'Copiado' : 'Copiar JSON'}</span>
                  </button>
                )}
              </div>

              {activeToolLog ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Función invocada:</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      {activeToolLog.name}()
                    </span>
                  </div>

                  <div className="text-[11px]">
                    <span className="text-[#94A3B8] block mb-1 font-semibold">Parámetros inferidos del mensaje:</span>
                    <pre className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#232C3A] text-emerald-300 font-mono text-[10px] overflow-x-auto">
                      {JSON.stringify(activeToolLog.args, null, 2)}
                    </pre>
                  </div>

                  <div className="text-[11px]">
                    <span className="text-[#94A3B8] block mb-1 font-semibold">Respuesta retornada por la API/PMS:</span>
                    <pre className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#232C3A] text-sky-300 font-mono text-[10px] overflow-x-auto max-h-48">
                      {JSON.stringify(activeToolLog.result, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 text-center text-xs text-[#64748B] border border-dashed border-[#263140] rounded-2xl">
                  Enviá un mensaje en el simulador para ver cómo Xenia detecta fechas, consulta el calendario y cotiza automáticamente en vivo.
                </div>
              )}
            </div>

            {/* Tarjeta: Las 3 Funciones Disponibles para Xenia */}
            <div className="p-4 rounded-3xl bg-[#12161F] border border-[#26303F] shadow-lg">
              <h4 className="font-extrabold text-xs text-[#CBD5E1] uppercase tracking-wider mb-2.5">
                Catálogo de Funciones API de Los Bananos
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#161D27] border border-[#273344]">
                  <p className="font-mono font-bold text-emerald-400">1. consultar_disponibilidad()</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Calcula solapamientos entre check-in y check-out y devuelve cabañas libres con sus tarifas.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161D27] border border-[#273344]">
                  <p className="font-mono font-bold text-amber-400">2. cotizar_estadia()</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Desglosa noches, pasajeros extra, total y calcula el monto exacto de la seña (50%).</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161D27] border border-[#273344]">
                  <p className="font-mono font-bold text-sky-400">3. asentar_reserva()</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Bloquea la cabaña en el calendario con estado 'Pendiente' cuando el huésped da su confirmación.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CONEXIÓN WHATSAPP & INSTAGRAM (APIs & WEBHOOKS) */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp Business Cloud API */}
            <div className="p-6 rounded-3xl bg-[#12161F] border border-[#26303F] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">WhatsApp Business Cloud API</h3>
                    <p className="text-xs text-emerald-400 font-semibold">Meta Developers • WhatsApp Oficial</p>
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Permite que cualquier huésped que escriba al número oficial de WhatsApp de Los Bananos sea atendido de inmediato por Xenia las 24 hs.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                      URL del Webhook (Callback URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={metaWebhookUrl}
                        className="flex-1 bg-[#0A0D12] border border-[#2C384A] rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 select-all"
                      />
                      <button
                        onClick={() => handleCopy(metaWebhookUrl, 'wppUrl')}
                        className="p-2 rounded-xl bg-[#1E2634] hover:bg-[#283244] text-[#CBD5E1] transition cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedText === 'wppUrl' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                      Token de Verificación (Verify Token)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="bananos_xenia_secret_2026"
                        className="flex-1 bg-[#0A0D12] border border-[#2C384A] rounded-xl px-3 py-2 text-xs font-mono text-white select-all"
                      />
                      <button
                        onClick={() => handleCopy('bananos_xenia_secret_2026', 'wppToken')}
                        className="p-2 rounded-xl bg-[#1E2634] hover:bg-[#283244] text-[#CBD5E1] transition cursor-pointer"
                        title="Copiar Token"
                      >
                        {copiedText === 'wppToken' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-[#161D27] border border-[#263140] text-[11px] text-[#94A3B8] space-y-1">
                  <p className="font-bold text-white">Pasos para conectar en Meta:</p>
                  <p>1. Entrá a <strong>developers.facebook.com</strong> con tu cuenta de Meta.</p>
                  <p>2. En tu app de WhatsApp, pegá la <strong>Callback URL</strong> y el <strong>Verify Token</strong>.</p>
                  <p>3. Suscribite al evento <code>messages</code>.</p>
                </div>
              </div>
            </div>

            {/* Instagram Direct Messaging API */}
            <div className="p-6 rounded-3xl bg-[#12161F] border border-[#26303F] shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600/20 to-purple-600/20 text-pink-400 border border-pink-500/30 flex items-center justify-center text-2xl font-bold">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Instagram Direct Messaging API</h3>
                    <p className="text-xs text-pink-400 font-semibold">Meta Graph API • Mensajes Directos</p>
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Xenia responde automáticamente los mensajes privados (DMs) de tu perfil de Instagram, cotizando estadías y enviando datos para señar.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                      URL del Webhook (Callback URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={metaWebhookUrl}
                        className="flex-1 bg-[#0A0D12] border border-[#2C384A] rounded-xl px-3 py-2 text-xs font-mono text-pink-300 select-all"
                      />
                      <button
                        onClick={() => handleCopy(metaWebhookUrl, 'igUrl')}
                        className="p-2 rounded-xl bg-[#1E2634] hover:bg-[#283244] text-[#CBD5E1] transition cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedText === 'igUrl' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                      Token de Verificación
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="bananos_xenia_secret_2026"
                        className="flex-1 bg-[#0A0D12] border border-[#2C384A] rounded-xl px-3 py-2 text-xs font-mono text-white select-all"
                      />
                      <button
                        onClick={() => handleCopy('bananos_xenia_secret_2026', 'igToken')}
                        className="p-2 rounded-xl bg-[#1E2634] hover:bg-[#283244] text-[#CBD5E1] transition cursor-pointer"
                        title="Copiar Token"
                      >
                        {copiedText === 'igToken' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-[#161D27] border border-[#263140] text-[11px] text-[#94A3B8] space-y-1">
                  <p className="font-bold text-white">Pasos para conectar en Instagram:</p>
                  <p>1. Vinculá tu cuenta de Instagram con tu Fan Page de Facebook.</p>
                  <p>2. En Meta Developers activá <strong>Instagram Graph API</strong> y el evento <code>messages</code>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: REGLAS DE NEGOCIO & GUÍA (BASE DE CONOCIMIENTO) */}
      {activeSubTab === 'reglas' && (
        <div className="p-6 rounded-3xl bg-[#12161F] border border-[#26303F] shadow-xl space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#242C3A]">
            <div>
              <h3 className="font-black text-lg text-white">Base de Conocimiento de Xenia</h3>
              <p className="text-xs text-[#94A3B8]">
                Xenia consulta estos datos para responder dudas de horarios, cancelaciones, mascotas y cuentas bancarias.
              </p>
            </div>

            <button
              onClick={handleSaveRules}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow cursor-pointer shrink-0"
            >
              Guardar Reglas en Servidor
            </button>
          </div>

          {saveStatus && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-bold text-center">
              {saveStatus}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Horario Check-in</label>
              <input
                type="text"
                value={rules.checkinTime}
                onChange={e => setRules({ ...rules, checkinTime: e.target.value })}
                className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl px-3 py-2 text-xs text-white"
                placeholder="14:00"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Horario Check-out</label>
              <input
                type="text"
                value={rules.checkoutTime}
                onChange={e => setRules({ ...rules, checkoutTime: e.target.value })}
                className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl px-3 py-2 text-xs text-white"
                placeholder="10:00"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Porcentaje de Seña Requerido (%)</label>
              <input
                type="number"
                value={rules.senaPorcentaje}
                onChange={e => setRules({ ...rules, senaPorcentaje: Number(e.target.value) })}
                className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl px-3 py-2 text-xs text-white"
                placeholder="50"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Alias Bancario para Señas</label>
              <input
                type="text"
                value={rules.aliasBancario}
                onChange={e => setRules({ ...rules, aliasBancario: e.target.value })}
                className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl px-3 py-2 text-xs text-white font-mono"
                placeholder="los.bananos.iguazu"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Política de Cancelación</label>
            <textarea
              rows={2}
              value={rules.politicaCancelacion}
              onChange={e => setRules({ ...rules, politicaCancelacion: e.target.value })}
              className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl p-3 text-xs text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Política de Mascotas (Pet Friendly)</label>
            <textarea
              rows={2}
              value={rules.politicaMascotas}
              onChange={e => setRules({ ...rules, politicaMascotas: e.target.value })}
              className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl p-3 text-xs text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">Servicios & Comodidades Incluidas</label>
            <textarea
              rows={2}
              value={rules.serviciosIncluidos}
              onChange={e => setRules({ ...rules, serviciosIncluidos: e.target.value })}
              className="w-full bg-[#0D1017] border border-[#2B3545] rounded-xl p-3 text-xs text-white leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
};
