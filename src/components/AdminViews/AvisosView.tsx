import React, { useState, useMemo } from 'react';
import { Reserva } from '../../types';
import { 
  DN, 
  DC, 
  calcFinancials, 
  formatMoney, 
  formatDateEs, 
  getVolunteerTasks, 
  getVolunteerNames, 
  VOLUNTEER_TASK_META, 
  VOLUNTEER_IDS 
} from '../../services/cabinConfig';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppTemplate,
  cleanPhoneNumber,
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_CONFIG
} from '../../services/whatsappTemplates';
import { 
  Bell, 
  MessageSquare, 
  Send, 
  Calendar, 
  User, 
  Settings, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  X,
  ExternalLink,
  Users,
  CheckCircle2,
  Search,
  Copy,
  Sparkles,
  ShieldCheck,
  Phone,
  MessageCircle,
  Eye,
  Edit3
} from 'lucide-react';
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  formatTelegramCheckin,
  formatTelegramDailySummary,
  TelegramConfig
} from '../../services/telegramService';

interface AvisosViewProps {
  reservas: Reserva[];
}

type FilterMode = 'proximas_hoy' | 'en_estadia' | '7_dias' | 'todas';

export const AvisosView: React.FC<AvisosViewProps> = ({ reservas }) => {
  const today = new Date().toISOString().split('T')[0];
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().split('T')[0];

  // 1. Filtros y Búsqueda
  const [filterMode, setFilterMode] = useState<FilterMode>('proximas_hoy');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 2. Plantilla seleccionada por cada reserva (reservaId -> templateId)
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, WhatsAppTemplate['id']>>({});
  
  // Mensajes editados en vivo por cada reserva (reservaId -> texto personalizado)
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Estado local para checkboxes de checklist por reserva
  const [checklist, setChecklist] = useState<Record<string, { limpieza: boolean; acceso: boolean; confirmado: boolean }>>({});

  // Telegram state
  const [tgCfg, setTgCfg] = useState<TelegramConfig>(() => getTelegramConfig());
  const [showTgModal, setShowTgModal] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; msg: string }>({
    type: 'idle',
    msg: '',
  });
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  const toggleCheck = (id: string, field: 'limpieza' | 'acceso' | 'confirmado') => {
    setChecklist(prev => {
      const current = prev[id] || { limpieza: false, acceso: false, confirmado: false };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: !current[field],
        },
      };
    });
  };

  // Filtrado inteligente de reservas
  const filteredReservas = useMemo(() => {
    const valid = reservas.filter(
      r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.estado !== 'Devolución'
    );

    let list = valid;

    if (filterMode === 'proximas_hoy') {
      // Oculta pasadas: muestra llegadas de hoy en adelante O estadías en curso hoy
      list = valid.filter(r => r.checkout >= today);
    } else if (filterMode === 'en_estadia') {
      // Huéspedes actualmente alojados (ingresaron y aún no se fueron)
      list = valid.filter(r => r.checkin <= today && r.checkout >= today);
    } else if (filterMode === '7_dias') {
      // Llegadas o salidas dentro de los próximos 7 días
      list = valid.filter(r => (r.checkin >= today && r.checkin <= in7Str) || (r.checkout >= today && r.checkout <= in7Str));
    }

    // Buscador en tiempo real
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(r => {
        const guest = (r.huesped || '').toLowerCase();
        const tel = (r.tel || '').replace(/\D/g, '');
        const unit = (r.depto || '').toLowerCase();
        const unitName = (DN[r.depto] || '').toLowerCase();
        return guest.includes(term) || tel.includes(term) || unit.includes(term) || unitName.includes(term);
      });
    }

    // Ordenar cronológicamente por checkin
    return list.sort((a, b) => a.checkin.localeCompare(b.checkin));
  }, [reservas, filterMode, searchTerm, today, in7Str]);

  // Obtener plantilla activa para una reserva
  const getActiveTemplate = (r: Reserva): WhatsAppTemplate => {
    const selectedId = selectedTemplates[r.id];
    if (selectedId) {
      const found = WHATSAPP_TEMPLATES.find(t => t.id === selectedId);
      if (found) return found;
    }

    // Por defecto sugerir la plantilla más adecuada según el momento de la reserva
    if (r.checkin === today) {
      return WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-2') || WHATSAPP_TEMPLATES[0]; // Check-in
    } else if (r.checkout === today) {
      return WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-3') || WHATSAPP_TEMPLATES[0]; // Check-out
    } else if (r.checkin <= today && r.checkout > today) {
      return WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-6') || WHATSAPP_TEMPLATES[0]; // En estadía -> Control de Confort
    } else {
      return WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-1') || WHATSAPP_TEMPLATES[0]; // Futura -> Bienvenida
    }
  };

  // Obtener texto del mensaje para enviar
  const getMessageText = (r: Reserva): string => {
    if (customMessages[r.id] !== undefined) {
      return customMessages[r.id];
    }
    const tpl = getActiveTemplate(r);
    return tpl.generateText(r);
  };

  // Cambiar de plantilla para una reserva
  const handleSelectTemplate = (reservaId: string, templateId: WhatsAppTemplate['id'], r: Reserva) => {
    setSelectedTemplates(prev => ({ ...prev, [reservaId]: templateId }));
    const tpl = WHATSAPP_TEMPLATES.find(t => t.id === templateId);
    if (tpl) {
      setCustomMessages(prev => ({ ...prev, [reservaId]: tpl.generateText(r) }));
    }
  };

  // Enviar por WhatsApp real con link https://wa.me/...
  const handleSendWhatsAppReal = (r: Reserva) => {
    const text = getMessageText(r);
    const cleanTel = cleanPhoneNumber(r.tel);

    if (cleanTel) {
      const url = buildWhatsAppUrl(cleanTel, text);
      window.open(url, '_blank');
      showToast(`¡Abriendo WhatsApp para ${r.huesped}! 💬`);
    } else {
      const savedWa = localStorage.getItem('bn_wa');
      const adminWa = savedWa ? JSON.parse(savedWa).admin : '';
      if (adminWa) {
        const url = buildWhatsAppUrl(adminWa, text);
        window.open(url, '_blank');
        showToast('Abriendo WhatsApp del administrador...');
      } else {
        alert('Este huésped no tiene teléfono registrado. Podés editar la reserva para agregar su número o copiar el mensaje.');
      }
    }
  };

  // Copiar mensaje al portapapeles
  const handleCopyMessage = (reservaId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(reservaId);
    showToast('¡Mensaje copiado al portapapeles! 📋');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Enviar aviso individual de una reserva a Telegram
  const handleTelegramIndividual = async (r: Reserva) => {
    if (!tgCfg.botToken || !tgCfg.chatId) {
      setShowTgModal(true);
      return;
    }

    setSendingId(r.id);
    const text = formatTelegramCheckin(r);
    const res = await sendTelegramMessage(tgCfg.botToken, tgCfg.chatId, text);
    setSendingId(null);

    if (res.success) {
      showToast(`¡Aviso de ${r.huesped} enviado a Telegram! ✈️`);
    } else {
      alert(`Error al enviar a Telegram: ${res.error}`);
    }
  };

  // Enviar resumen del día completo a Telegram
  const handleTelegramDailySummary = async () => {
    if (!tgCfg.botToken || !tgCfg.chatId) {
      setShowTgModal(true);
      return;
    }

    setSendingSummary(true);
    const text = formatTelegramDailySummary(reservas, today);
    const res = await sendTelegramMessage(tgCfg.botToken, tgCfg.chatId, text);
    setSendingSummary(false);

    if (res.success) {
      showToast('¡Resumen diario enviado con éxito a Telegram! 🍍✈️');
    } else {
      alert(`Error al enviar resumen: ${res.error}`);
    }
  };

  // Probar conexión en el modal
  const handleTestConnection = async () => {
    if (!tgCfg.botToken.trim() || !tgCfg.chatId.trim()) {
      setTestStatus({ type: 'error', msg: 'Ingresá el Bot Token y el Chat ID primero.' });
      return;
    }

    setTestStatus({ type: 'loading', msg: 'Enviando mensaje de prueba...' });
    const text = `🌴 <b>¡Hola Gabriela! Conexión exitosa con Los Bananos</b> 🍍\n\nEste canal está correctamente vinculado con el sistema de reservas. A partir de ahora vas a poder recibir aquí los avisos de check-in, check-out y resúmenes diarios.\n\n✨ <i>Xenia de Los Bananos</i>`;
    
    const res = await sendTelegramMessage(tgCfg.botToken, tgCfg.chatId, text);
    if (res.success) {
      setTestStatus({ type: 'success', msg: '¡Mensaje de prueba recibido en Telegram con éxito! 🎉' });
      saveTelegramConfig({ ...tgCfg, enabled: true });
    } else {
      setTestStatus({ type: 'error', msg: `Error: ${res.error}` });
    }
  };

  const handleSaveModalConfig = () => {
    saveTelegramConfig({ ...tgCfg, enabled: !!(tgCfg.botToken && tgCfg.chatId) });
    setShowTgModal(false);
    showToast('Configuración de Telegram guardada ✓');
  };

  const isConfigured = !!(tgCfg.botToken && tgCfg.chatId);

  return (
    <div className="space-y-6">
      {/* Toast flotante de notificación */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#1E293B] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500/40 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold">{notificationToast}</span>
        </div>
      )}

      {/* BANNER PRINCIPAL DE MENSAJERÍA INTELIGENTE WHATSAPP */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#151D28] to-[#12161F] p-5 sm:p-6 rounded-3xl border border-emerald-800/40 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Módulo Oficial de WhatsApp & Mensajería Inteligente</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
            Mensajería WhatsApp & Avisos
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
              6 Plantillas Oficiales
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
            Enviá mensajes directos a tus huéspedes en 1 clic con redacción profesional, bienvenida anticipada, instrucciones de acceso, blindaje anti-quejas y solicitud de 5 estrellas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConfigured && (
            <button
              onClick={handleTelegramDailySummary}
              disabled={sendingSummary}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md disabled:opacity-50 active:scale-95"
              title="Enviar el reporte de quién llega y sale hoy por Telegram"
            >
              {sendingSummary ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{sendingSummary ? 'Enviando...' : 'Resumen Telegram Hoy'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setTestStatus({ type: 'idle', msg: '' });
              setShowTgModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1E293B] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white border border-[#334155] font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isConfigured ? 'Telegram Conectado 🟢' : 'Ajustes Telegram'}</span>
          </button>
        </div>
      </div>

      {/* GUÍA RÁPIDA DE LAS 6 PLANTILLAS INTELIGENTES */}
      <div className="bg-[#FCF8F2] border border-[#E5D7C5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-[#2A2118]">
              Las 6 Plantillas Inteligentes del Ciclo del Huésped
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            Plural de Cortesía • Redacción Cálida
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {WHATSAPP_TEMPLATES.map(tpl => (
            <div 
              key={tpl.id}
              className="p-2.5 bg-white border border-[#E5D7C5] rounded-xl text-left space-y-1 hover:border-emerald-500 transition shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#D2502A]">{tpl.id.toUpperCase()}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {tpl.badge.split('•')[0].trim()}
                </span>
              </div>
              <div className="font-bold text-xs text-[#2A2118] line-clamp-1 leading-tight">
                {tpl.title.split('(')[0].trim()}
              </div>
              <div className="text-[10px] text-[#7A6752] line-clamp-2 leading-tight">
                {tpl.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA DE FILTROS INTELIGENTES Y BUSCADOR (EVITA SCROLL INFINITO) */}
      <div className="bg-white border-2 border-[#E5D7C5] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Botones de Filtro Rápido */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterMode('proximas_hoy')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
                filterMode === 'proximas_hoy'
                  ? 'bg-emerald-600 text-white shadow-emerald-700/20'
                  : 'bg-[#FAF5EE] text-[#4A3C2F] hover:bg-[#F0E6DA] border border-[#E5D7C5]'
              }`}
            >
              <span>⭐ Próximas & Hoy</span>
            </button>

            <button
              onClick={() => setFilterMode('en_estadia')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
                filterMode === 'en_estadia'
                  ? 'bg-amber-600 text-white shadow-amber-700/20'
                  : 'bg-[#FAF5EE] text-[#4A3C2F] hover:bg-[#F0E6DA] border border-[#E5D7C5]'
              }`}
            >
              <span>🏠 En Estadía</span>
            </button>

            <button
              onClick={() => setFilterMode('7_dias')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
                filterMode === '7_dias'
                  ? 'bg-blue-600 text-white shadow-blue-700/20'
                  : 'bg-[#FAF5EE] text-[#4A3C2F] hover:bg-[#F0E6DA] border border-[#E5D7C5]'
              }`}
            >
              <span>📅 7 Días</span>
            </button>

            <button
              onClick={() => setFilterMode('todas')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs ${
                filterMode === 'todas'
                  ? 'bg-slate-700 text-white shadow-slate-800/20'
                  : 'bg-[#FAF5EE] text-[#4A3C2F] hover:bg-[#F0E6DA] border border-[#E5D7C5]'
              }`}
            >
              <span>📂 Todas</span>
            </button>
          </div>

          {/* Buscador en Tiempo Real */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C765C]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de huésped, teléfono o cabaña..."
              className="w-full pl-9 pr-8 py-2 bg-[#FAF5EE] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#2A2118] placeholder-[#8C765C] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C765C] hover:text-[#2A2118]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Resumen de resultados */}
        <div className="flex items-center justify-between text-xs text-[#7A6752] pt-1 border-t border-[#F0E6DA]">
          <span>
            Mostrando <b>{filteredReservas.length}</b> reservas {filterMode === 'proximas_hoy' ? '(ocultando reservas pasadas)' : ''}
          </span>
          {searchTerm && (
            <span className="text-emerald-700 font-semibold">
              Filtrado por: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* LISTADO DE TARJETAS DE MENSAJERÍA WHATSAPP */}
      {filteredReservas.length === 0 ? (
        <div className="bg-white border border-[#E5D7C5] rounded-3xl p-12 text-center text-[#8C765C] space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-[#CBB9A5]" />
          <div className="font-extrabold text-base sm:text-lg text-[#2A2118]">
            No se encontraron reservas con los filtros aplicados
          </div>
          <p className="text-xs max-w-md mx-auto text-[#7A6752]">
            Probá seleccionando el filtro "📂 Todas" o borrando el término de búsqueda para ver el listado completo.
          </p>
          <button
            onClick={() => {
              setFilterMode('todas');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-sm"
          >
            Ver Todas las Reservas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredReservas.map(r => {
            const fin = calcFinancials(r);
            const diffIn = Math.round((new Date(r.checkin).getTime() - new Date(today).getTime()) / 86400000);
            const isTodayIn = r.checkin === today;
            const isTodayOut = r.checkout === today;
            const isInStay = r.checkin <= today && r.checkout > today;
            
            const badgeUrgencia = isTodayIn 
              ? '🟢 ¡Llega HOY!' 
              : isTodayOut 
              ? '🔴 Salida HOY' 
              : isInStay 
              ? '🏠 En Estadía' 
              : diffIn === 1 
              ? '🟡 Llega MAÑANA' 
              : diffIn > 1 
              ? `Llega en ${diffIn} días` 
              : `Check-in: ${formatDateEs(r.checkin)}`;

            const cl = checklist[r.id] || { limpieza: false, acceso: false, confirmado: false };
            const isSendingTg = sendingId === r.id;
            const activeTpl = getActiveTemplate(r);
            const activeMessage = getMessageText(r);
            const hasPhone = Boolean(cleanPhoneNumber(r.tel));
            const isEditing = editingMessageId === r.id;

            return (
              <div
                key={r.id}
                className="bg-white border-2 border-[#E5D7C5] hover:border-emerald-500/70 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
              >
                {/* Header de la tarjeta */}
                <div
                  className="px-4 sm:px-5 py-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: DC[r.depto] || '#2A2118' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="font-extrabold text-sm sm:text-base truncate">
                      {r.huesped}
                    </span>
                    {r.nac && (
                      <span className="text-[11px] bg-white/20 px-1.5 py-0.2 rounded font-medium shrink-0">
                        {r.nac}
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/25 font-black shrink-0">
                    {badgeUrgencia}
                  </span>
                </div>

                {/* Detalles de Cabaña y Fechas */}
                <div className="px-4 sm:px-5 space-y-3 text-xs text-[#4A3C2F]">
                  <div className="grid grid-cols-3 gap-2 bg-[#FAF5EE] p-2.5 rounded-xl border border-[#EFE2D2]">
                    <div>
                      <span className="text-[#8C765C] font-semibold block text-[10px]">Cabaña</span>
                      <span className="font-black text-[#2A2118] text-xs sm:text-sm">
                        {DN[r.depto] || r.depto}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C765C] font-semibold block text-[10px]">Estadía</span>
                      <span className="font-bold text-[#2A2118]">
                        {formatDateEs(r.checkin)} → {formatDateEs(r.checkout)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C765C] font-semibold block text-[10px]">Teléfono / WhatsApp</span>
                      <span className={`font-bold flex items-center gap-1 ${hasPhone ? 'text-emerald-700' : 'text-rose-600'}`}>
                        <Phone className="w-3 h-3 shrink-0" />
                        <span className="truncate">{r.tel || 'Sin teléfono'}</span>
                      </span>
                    </div>
                  </div>

                  {/* SELECTOR DE LAS 6 PLANTILLAS INTELIGENTES */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#2A2118] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Elegir Plantilla Inteligente:
                      </span>
                      <span className="text-[10px] text-[#8C765C]">
                        Momento: <b>{activeTpl.moment}</b>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                      {WHATSAPP_TEMPLATES.map(tpl => {
                        const isSelected = activeTpl.id === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => handleSelectTemplate(r.id, tpl.id, r)}
                            className={`px-2 py-1.5 rounded-lg text-[10.5px] font-bold transition flex flex-col items-center text-center justify-center gap-0.5 border ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-[#FAF5EE] text-[#4A3C2F] hover:bg-[#F0E6DA] border-[#E5D7C5]'
                            }`}
                            title={`${tpl.title} — ${tpl.description}`}
                          >
                            <span className="text-[9px] opacity-80 uppercase">{tpl.id}</span>
                            <span className="truncate w-full">{tpl.badge.split('•')[0].trim()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CAJA DE VISTA PREVIA Y EDICIÓN DEL MENSAJE WHATSAPP */}
                  <div className="bg-[#F0FDF4] border border-emerald-200 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Mensaje pre-cargado: <strong>{activeTpl.title}</strong></span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingMessageId(isEditing ? null : r.id)}
                          className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditing ? 'Listo' : 'Editar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(r.id, activeMessage)}
                          className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition flex items-center gap-1"
                          title="Copiar texto"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedId === r.id ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={activeMessage}
                        onChange={e => setCustomMessages(prev => ({ ...prev, [r.id]: e.target.value }))}
                        rows={6}
                        className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-xs text-[#2A2118] font-sans focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      />
                    ) : (
                      <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5 text-xs text-[#2A2118] whitespace-pre-wrap font-sans max-h-36 overflow-y-auto leading-relaxed select-text shadow-2xs">
                        {activeMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* FOOTER DE ACCIÓN: BOTÓN VERDE WHATSAPP REAL + TELEGRAM + CHECKLIST */}
                <div className="bg-[#F8F2E9] p-3.5 border-t border-[#E5D7C5] flex flex-wrap items-center justify-between gap-3">
                  {/* Checklist operativa */}
                  <div className="flex items-center gap-3 text-xs text-[#4A3B2C] font-semibold">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cl.limpieza}
                        onChange={() => toggleCheck(r.id, 'limpieza')}
                        className="w-3.5 h-3.5 accent-[#D2502A] rounded"
                      />
                      <span>Limpio</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cl.acceso}
                        onChange={() => toggleCheck(r.id, 'acceso')}
                        className="w-3.5 h-3.5 accent-[#D2502A] rounded"
                      />
                      <span>Llaves</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cl.confirmado}
                        onChange={() => toggleCheck(r.id, 'confirmado')}
                        className="w-3.5 h-3.5 accent-[#D2502A] rounded"
                      />
                      <span>Confirmó</span>
                    </label>
                  </div>

                  {/* Botones de Envío */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Botón Telegram */}
                    <button
                      onClick={() => handleTelegramIndividual(r)}
                      disabled={isSendingTg}
                      className="flex items-center gap-1 px-3 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50 active:scale-95"
                      title="Enviar ficha técnica de este huésped al canal de Telegram"
                    >
                      {isSendingTg ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Telegram</span>
                    </button>

                    {/* BOTÓN VERDE: ENVIAR POR WHATSAPP REAL */}
                    <button
                      onClick={() => handleSendWhatsAppReal(r)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md shadow-emerald-950/20 active:scale-95"
                      title={hasPhone ? `Abrir chat oficial con ${r.huesped}` : 'Abrir chat (sin número registrado)'}
                    >
                      <MessageSquare className="w-4 h-4 fill-white" />
                      <span>Enviar por WhatsApp Real</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Configuración de Telegram */}
      {showTgModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Conectar Notificaciones de Telegram</h3>
                  <p className="text-xs text-white/80">Alertas automáticas y gratuitas al celular</p>
                </div>
              </div>
              <button
                onClick={() => setShowTgModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs sm:text-sm text-[#334155]">
              <div className="bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span>📋 Cómo obtener tu Token y Chat ID en 2 minutos:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#475569] leading-relaxed">
                  <li>
                    En Telegram buscá a <b>@BotFather</b> y enviale el comando <code>/newbot</code>.
                  </li>
                  <li>
                    Elegí un nombre (ej. <i>Xenia Los Bananos</i>) y un usuario terminado en bot (ej. <i>XeniaBananosBot</i>).
                  </li>
                  <li>
                    Copiá el <b>HTTP API Token</b> que te entrega y pegalo abajo.
                  </li>
                  <li>
                    Creá un grupo o canal en Telegram, agregá a tu bot, o simplemente abrí chat privado con tu bot y tocá <b>Iniciar</b>.
                  </li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1">
                    Bot Token (de @BotFather)
                  </label>
                  <input
                    type="text"
                    value={tgCfg.botToken}
                    onChange={e => setTgCfg(prev => ({ ...prev, botToken: e.target.value }))}
                    placeholder="Ej: 7584920184:AAHk1_w1q9..."
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0088cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1">
                    Chat ID o Canal
                  </label>
                  <input
                    type="text"
                    value={tgCfg.chatId}
                    onChange={e => setTgCfg(prev => ({ ...prev, chatId: e.target.value }))}
                    placeholder="Ej: -1001234567890 o @MiCanalBananos o tu ID numérico"
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0088cc]"
                  />
                </div>
              </div>

              {testStatus.msg && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  testStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : testStatus.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                  {testStatus.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                  {testStatus.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {testStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{testStatus.msg}</span>
                </div>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus.type === 'loading'}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-[#0088cc] border border-[#0088cc] font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {testStatus.type === 'loading' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Probar Conexión</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTgModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-[#334155] font-semibold text-xs sm:text-sm rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalConfig}
                  className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
