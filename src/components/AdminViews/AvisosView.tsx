import React, { useState, useMemo, useEffect } from 'react';
import { Reserva } from '../../types';
import { 
  DN, 
  DC, 
  formatDateEs,
  nightsCount 
} from '../../services/cabinConfig';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppTemplate,
  cleanPhoneNumber,
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_CONFIG
} from '../../services/whatsappTemplates';
import { 
  MessageSquare, 
  Send, 
  Check, 
  Search, 
  Copy, 
  ExternalLink,
  Phone,
  Sparkles,
  Settings,
  CheckCircle2,
  Lock,
  Calendar,
  Share2,
  Edit3,
  RefreshCw,
  SendHorizontal,
  Bot
} from 'lucide-react';
import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  formatTelegramCheckin,
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

  // 2. Reserva seleccionada
  const [selectedReservaId, setSelectedReservaId] = useState<string>('');

  // 3. Plantilla seleccionada
  const [selectedTemplateId, setSelectedTemplateId] = useState<WhatsAppTemplate['id']>('tpl-1');

  // 4. Edición manual del mensaje en el simulador
  const [customText, setCustomText] = useState<string>('');
  const [isEditingMessage, setIsEditingMessage] = useState<boolean>(false);

  // 5. Configuración de enlaces y Wi-Fi (personalizable)
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('bn_whatsapp_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_WHATSAPP_CONFIG;
  });
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // 6. Notificaciones / Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSimulatedSent, setIsSimulatedSent] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Guardar configuración personalizada de enlaces/wifi
  const handleSaveConfig = (newCfg: typeof config) => {
    setConfig(newCfg);
    localStorage.setItem('bn_whatsapp_config', JSON.stringify(newCfg));
    setShowConfigModal(false);
    showToast('Configuración de enlaces y Wi-Fi actualizada ✓');
  };

  // Conteo de reservas válidas (sin bloqueos iCal ni canceladas)
  const validReservas = useMemo(() => {
    return reservas.filter(
      r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.estado !== 'Devolución'
    );
  }, [reservas]);

  // Conteos para los botones de filtro rápido
  const counts = useMemo(() => {
    return {
      proximas_hoy: validReservas.filter(r => r.checkout >= today).length,
      en_estadia: validReservas.filter(r => r.checkin <= today && r.checkout >= today).length,
      siete_dias: validReservas.filter(r => (r.checkin >= today && r.checkin <= in7Str) || (r.checkout >= today && r.checkout <= in7Str)).length,
      todas: validReservas.length,
    };
  }, [validReservas, today, in7Str]);

  // Lista filtrada de reservas según pestaña y buscador
  const filteredReservas = useMemo(() => {
    let list = validReservas;

    if (filterMode === 'proximas_hoy') {
      list = validReservas.filter(r => r.checkout >= today);
    } else if (filterMode === 'en_estadia') {
      list = validReservas.filter(r => r.checkin <= today && r.checkout >= today);
    } else if (filterMode === '7_dias') {
      list = validReservas.filter(r => (r.checkin >= today && r.checkin <= in7Str) || (r.checkout >= today && r.checkout <= in7Str));
    }

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

    return list.sort((a, b) => a.checkin.localeCompare(b.checkin));
  }, [validReservas, filterMode, searchTerm, today, in7Str]);

  // Seleccionar automáticamente la primera reserva disponible si no hay una seleccionada
  useEffect(() => {
    if (filteredReservas.length > 0) {
      const exists = filteredReservas.some(r => r.id === selectedReservaId);
      if (!exists) {
        setSelectedReservaId(filteredReservas[0].id);
      }
    } else {
      setSelectedReservaId('');
    }
  }, [filteredReservas, selectedReservaId]);

  // Objeto de la reserva seleccionada actualmente
  const selectedReserva = useMemo(() => {
    return validReservas.find(r => r.id === selectedReservaId) || filteredReservas[0] || null;
  }, [validReservas, selectedReservaId, filteredReservas]);

  // Plantilla seleccionada actual
  const activeTemplate = useMemo(() => {
    return WHATSAPP_TEMPLATES.find(t => t.id === selectedTemplateId) || WHATSAPP_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Sugerir la mejor plantilla según la fecha de la reserva seleccionada
  useEffect(() => {
    if (selectedReserva) {
      if (selectedReserva.checkin === today) {
        setSelectedTemplateId('tpl-2'); // Check-in hoy
      } else if (selectedReserva.checkout === today) {
        setSelectedTemplateId('tpl-3'); // Check-out hoy
      } else if (selectedReserva.checkin <= today && selectedReserva.checkout > today) {
        setSelectedTemplateId('tpl-6'); // En estadía -> Control de confort
      } else {
        setSelectedTemplateId('tpl-1'); // Futura -> Bienvenida
      }
    }
  }, [selectedReservaId]);

  // Regenerar el texto del mensaje cuando cambia la reserva, la plantilla o la configuración
  useEffect(() => {
    if (selectedReserva && activeTemplate) {
      const text = activeTemplate.generateText(selectedReserva, config);
      setCustomText(text);
      setIsEditingMessage(false);
      setIsSimulatedSent(false);
    }
  }, [selectedReserva, activeTemplate, config]);

  // Acción: Copiar mensaje al portapapeles
  const handleCopyText = () => {
    if (!customText) return;
    navigator.clipboard.writeText(customText);
    setIsCopied(true);
    showToast('¡Texto copiado al portapapeles! 📋');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Acción: Simular envío en pantalla
  const handleSimulateSend = () => {
    setIsSimulatedSent(true);
    showToast('¡Simulación completada! Mensaje enviado en el visor.');
  };

  // Acción: Enviar por WhatsApp real
  const handleSendRealWhatsApp = () => {
    if (!selectedReserva) return;
    const cleanTel = cleanPhoneNumber(selectedReserva.tel);

    if (cleanTel) {
      const url = buildWhatsAppUrl(cleanTel, customText);
      window.open(url, '_blank');
      showToast(`¡Abriendo WhatsApp para ${selectedReserva.huesped}! 💬`);
    } else {
      // Si no tiene teléfono, permitir abrir WhatsApp web con el texto pre-cargado
      const url = `https://wa.me/?text=${encodeURIComponent(customText)}`;
      window.open(url, '_blank');
      showToast('Abriendo WhatsApp para seleccionar contacto...');
    }
  };

  // Helper para generar etiqueta de estado/fecha para el select
  const getReservaSelectLabel = (r: Reserva) => {
    let tag = 'FUTURA';
    if (r.checkin === today) tag = 'HOY';
    else if (r.checkout === today) tag = 'CHECKOUT';
    else if (r.checkin < today && r.checkout > today) tag = 'EN ESTADÍA';

    const cabin = DN[r.depto] || r.depto;
    const plat = (r.plataforma || 'Directo').toUpperCase();
    return `[${tag}] ${r.huesped || 'Huésped'} (${plat}) • ${cabin} (${formatDateEs(r.checkin)} al ${formatDateEs(r.checkout)})`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notificación */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#1E293B] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500/50 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* BANNER PRINCIPAL EXACTO DE LA CAPTURA */}
      <div className="bg-[#FAF7F2] dark:bg-[#12161F] border border-[#E8DFC8] dark:border-[#2D3540] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#2A2118] dark:text-white tracking-tight">
              Simulador y Envío Directo de WhatsApp
            </h2>
            <p className="text-xs sm:text-sm text-[#7A6752] dark:text-slate-400 mt-0.5 leading-relaxed">
              Elegí el huésped y la plantilla inteligente. Los datos de la reserva, wifi, fechas y cerraduras se rellenan automáticamente listos para enviar en 1 toque.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-[#1C2430] hover:bg-amber-50 dark:hover:bg-[#253040] text-[#4A3828] dark:text-slate-200 border border-[#D8CEBA] dark:border-[#384455] rounded-xl transition shadow-xs shrink-0"
        >
          <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Configurar Wi-Fi & Enlaces</span>
        </button>
      </div>

      {/* LAYOUT PRINCIPAL DE 2 COLUMNAS (IZQUIERDA: CONTROLES Y PLANTILLAS, DERECHA: SMARTPHONE WHATSAPP) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: SELECCIÓN DE HUÉSPED Y PLANTILLAS (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* PASO 1: SELECCIONA EL HUÉSPED O RESERVA */}
          <div className="bg-white dark:bg-[#151A22] border border-[#E5D7C5] dark:border-[#2D3540] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2A2118] dark:text-white flex items-center gap-2">
                <span>1. SELECCIONA EL HUÉSPED O RESERVA</span>
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] dark:bg-[#1F2733] text-[#7A624A] dark:text-slate-300 border border-[#E5D7C5] dark:border-[#2D3540]">
                {filteredReservas.length} reservas
              </span>
            </div>

            {/* Píldoras de filtro rápido */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterMode('proximas_hoy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  filterMode === 'proximas_hoy'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'bg-[#FAF5EE] dark:bg-[#1C232E] hover:bg-[#F0E6D8] dark:hover:bg-[#253040] text-[#5A4634] dark:text-slate-300 border border-[#E5D7C5] dark:border-[#2D3540]'
                }`}
              >
                <span>⭐ Próximas & Hoy</span>
                <span className="opacity-80 font-mono">({counts.proximas_hoy})</span>
              </button>

              <button
                onClick={() => setFilterMode('en_estadia')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  filterMode === 'en_estadia'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'bg-[#FAF5EE] dark:bg-[#1C232E] hover:bg-[#F0E6D8] dark:hover:bg-[#253040] text-[#5A4634] dark:text-slate-300 border border-[#E5D7C5] dark:border-[#2D3540]'
                }`}
              >
                <span>🏠 En Estadía</span>
                <span className="opacity-80 font-mono">({counts.en_estadia})</span>
              </button>

              <button
                onClick={() => setFilterMode('7_dias')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  filterMode === '7_dias'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'bg-[#FAF5EE] dark:bg-[#1C232E] hover:bg-[#F0E6D8] dark:hover:bg-[#253040] text-[#5A4634] dark:text-slate-300 border border-[#E5D7C5] dark:border-[#2D3540]'
                }`}
              >
                <span>📅 7 Días</span>
                <span className="opacity-80 font-mono">({counts.siete_dias})</span>
              </button>

              <button
                onClick={() => setFilterMode('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  filterMode === 'todas'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'bg-[#FAF5EE] dark:bg-[#1C232E] hover:bg-[#F0E6D8] dark:hover:bg-[#253040] text-[#5A4634] dark:text-slate-300 border border-[#E5D7C5] dark:border-[#2D3540]'
                }`}
              >
                <span>📁 Todas (con pasadas)</span>
                <span className="opacity-80 font-mono">({counts.todas})</span>
              </button>
            </div>

            {/* Buscador de texto */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C765C] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nombre de huésped, teléfono o depto..."
                className="w-full bg-[#FAF5EE] dark:bg-[#1C232E] border border-[#D4C3AE] dark:border-[#384455] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#2A2118] dark:text-white placeholder-[#8C765C] dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            {/* Select Desplegable Principal de Huéspedes */}
            {filteredReservas.length > 0 ? (
              <select
                value={selectedReservaId}
                onChange={e => setSelectedReservaId(e.target.value)}
                className="w-full bg-white dark:bg-[#1C232E] border-2 border-amber-500/60 dark:border-amber-400/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#2A2118] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                {filteredReservas.map(r => (
                  <option key={r.id} value={r.id} className="py-1">
                    {getReservaSelectLabel(r)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-[#1A222C] border border-amber-200 dark:border-amber-900/40 text-center text-xs text-[#7A624A] dark:text-slate-300">
                No hay reservas encontradas con los filtros actuales.
              </div>
            )}

            {/* Fila de Contacto Rápido del Huésped Seleccionado */}
            {selectedReserva && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF5EE] dark:bg-[#1A202A] border border-[#E5D7C5] dark:border-[#2D3540]">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E293B] dark:text-white">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {selectedReserva.tel ? selectedReserva.tel : 'Sin teléfono cargado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#6A533E] dark:text-slate-400 border-l border-[#D8CEBA] dark:border-[#384455] pl-3">
                    <span>Cabaña:</span>
                    <span className="font-bold text-[#2A2118] dark:text-slate-200">
                      {DN[selectedReserva.depto] || selectedReserva.depto}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSendRealWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs active:scale-95"
                >
                  <Send className="w-3 h-3" />
                  <span>Abrir WhatsApp</span>
                </button>
              </div>
            )}
          </div>

          {/* PASO 2: ELIGE EL DISPARADOR O PLANTILLA */}
          <div className="bg-white dark:bg-[#151A22] border border-[#E5D7C5] dark:border-[#2D3540] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2A2118] dark:text-white flex items-center gap-2">
                <span>2. ELIGE EL DISPARADOR O PLANTILLA</span>
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                {WHATSAPP_TEMPLATES.length} Plantillas Listas
              </span>
            </div>

            {/* Grid / Lista de Plantillas Inteligentes */}
            <div className="space-y-2.5">
              {WHATSAPP_TEMPLATES.map((tpl, idx) => {
                const isSelected = selectedTemplateId === tpl.id;
                const icon = 
                  tpl.category === 'anticipada' ? '👋' :
                  tpl.category === 'viaje' ? '🚗' :
                  tpl.category === 'checkin' ? '🔑' :
                  tpl.category === 'confort' ? '🛡️' :
                  tpl.category === 'checkout' ? '☕' : '⭐';

                // Vista previa de texto dinámico
                const sampleText = selectedReserva 
                  ? tpl.generateText(selectedReserva, config).slice(0, 110) + '...'
                  : `¡Hola {nombre_huesped}! ${tpl.description}`;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative group ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 shadow-sm ring-1 ring-amber-500/50'
                        : 'bg-[#FAF7F2] dark:bg-[#1A212B] border-[#E8DFC8] dark:border-[#2D3540] hover:border-amber-400 dark:hover:border-amber-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{icon}</span>
                        <span className={`font-bold text-xs sm:text-sm truncate ${
                          isSelected ? 'text-amber-950 dark:text-amber-200' : 'text-[#2A2118] dark:text-white'
                        }`}>
                          {tpl.title}
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 border ${
                        isSelected 
                          ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-700'
                          : 'bg-[#EFE7DC] dark:bg-[#253040] text-[#6A543E] dark:text-slate-300 border-[#D8CEBA] dark:border-[#384455]'
                      }`}>
                        {tpl.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#7A6752] dark:text-slate-400 mt-1.5 leading-snug line-clamp-2">
                      {sampleText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: SIMULADOR SMARTPHONE DE WHATSAPP REAL (5 columnas) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="mx-auto max-w-[360px] bg-[#111B21] border-4 border-[#2A3942] rounded-[40px] shadow-2xl overflow-hidden p-2.5 flex flex-col">
            
            {/* Altavoz / Cámara Frontal del Celular */}
            <div className="flex justify-center items-center py-1 mb-1">
              <div className="w-16 h-4 bg-[#202C33] rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#111B21]" />
              </div>
            </div>

            {/* Cabecera de la App de WhatsApp */}
            <div className="bg-[#202C33] text-white px-3 py-2.5 rounded-t-2xl flex items-center justify-between border-b border-[#2A3942]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs border border-emerald-400/40">
                  {selectedReserva?.huesped ? selectedReserva.huesped.charAt(0).toUpperCase() : 'H'}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs sm:text-sm block truncate leading-tight">
                    {selectedReserva?.huesped || 'Huésped'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    {selectedReserva?.tel ? selectedReserva.tel : '+54 9 11 ...'}
                  </span>
                </div>
              </div>

              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#111B21] text-emerald-400 border border-emerald-500/40 shrink-0">
                Los Bananos Bot
              </span>
            </div>

            {/* Lienzo del Chat (Fondo con patrón sutil de WhatsApp) */}
            <div className="bg-[#0B141A] p-3 min-h-[320px] max-h-[440px] overflow-y-auto scrollbar-thin flex flex-col justify-end space-y-3">
              
              {/* Píldora de Fecha */}
              <div className="flex justify-center">
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-[#182229] text-slate-400 shadow-xs border border-[#222E35]">
                  Hoy
                </span>
              </div>

              {/* Burbuja Verde de WhatsApp */}
              <div className="self-end max-w-[94%] bg-[#005C4B] text-slate-100 rounded-2xl rounded-tr-xs p-3 shadow-md border border-[#025143] relative">
                {isEditingMessage ? (
                  <textarea
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    rows={8}
                    className="w-full bg-[#025143] text-slate-100 p-2 text-xs rounded-lg border border-emerald-400/40 focus:outline-none leading-relaxed font-sans"
                  />
                ) : (
                  <div className="text-xs leading-relaxed whitespace-pre-wrap select-text font-sans">
                    {customText || 'Selecciona un huésped para generar el mensaje automático.'}
                  </div>
                )}

                {/* Hora y Tildes Azules */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-200/80 font-mono">
                  <span>10:14 AM</span>
                  <span className="text-cyan-400 font-bold">✓✓</span>
                </div>
              </div>

              {isSimulatedSent && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 text-center animate-in fade-in">
                  ✓ Mensaje simulado con éxito en el visor
                </div>
              )}
            </div>

            {/* Botones de Acción del Celular */}
            <div className="bg-[#202C33] p-3 rounded-b-2xl border-t border-[#2A3942] space-y-2 mt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyText}
                  className="py-2 px-3 bg-[#111B21] hover:bg-[#2A3942] text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition border border-[#2A3942] active:scale-95"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsEditingMessage(!isEditingMessage)}
                  className="py-2 px-3 bg-[#111B21] hover:bg-[#2A3942] text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition border border-[#2A3942] active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEditingMessage ? 'Listo' : 'Editar'}</span>
                </button>
              </div>

              {/* Botón Principal Prominente: Enviar por WhatsApp Real */}
              <button
                onClick={handleSendRealWhatsApp}
                className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20BD5A] active:scale-98 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/40"
              >
                <ExternalLink className="w-4 h-4 text-slate-950" />
                <span>Enviar por WhatsApp Real</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA CONFIGURAR ENLACES & WI-FI */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161D26] border border-[#E5D7C5] dark:border-[#2D3540] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E8DFC8] dark:border-[#2D3540] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-black text-[#2A2118] dark:text-white">
                  Configurar Enlaces & Wi-Fi
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-[#4A3828] dark:text-slate-300 mb-1">
                  📶 Contraseña de Wi-Fi de las Cabañas
                </label>
                <input
                  type="text"
                  value={config.wifiPass}
                  onChange={e => setConfig({ ...config, wifiPass: e.target.value })}
                  className="w-full bg-[#FAF5EE] dark:bg-[#11161D] border border-[#D4C3AE] dark:border-[#384455] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A3828] dark:text-slate-300 mb-1">
                  📍 Enlace de Google Maps (Ubicación GPS)
                </label>
                <input
                  type="text"
                  value={config.mapsLink}
                  onChange={e => setConfig({ ...config, mapsLink: e.target.value })}
                  className="w-full bg-[#FAF5EE] dark:bg-[#11161D] border border-[#D4C3AE] dark:border-[#384455] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A3828] dark:text-slate-300 mb-1">
                  📖 Enlace a la Guía Digital del Huésped
                </label>
                <input
                  type="text"
                  value={config.guiaLink}
                  onChange={e => setConfig({ ...config, guiaLink: e.target.value })}
                  className="w-full bg-[#FAF5EE] dark:bg-[#11161D] border border-[#D4C3AE] dark:border-[#384455] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A3828] dark:text-slate-300 mb-1">
                  ⭐ Enlace para Calificación en Google Reviews (5 Estrellas)
                </label>
                <input
                  type="text"
                  value={config.resenaLink}
                  onChange={e => setConfig({ ...config, resenaLink: e.target.value })}
                  className="w-full bg-[#FAF5EE] dark:bg-[#11161D] border border-[#D4C3AE] dark:border-[#384455] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A3828] dark:text-slate-300 mb-1">
                  🎁 Código de Descuento para Próximas Reservas
                </label>
                <input
                  type="text"
                  value={config.codigoDescuento}
                  onChange={e => setConfig({ ...config, codigoDescuento: e.target.value })}
                  className="w-full bg-[#FAF5EE] dark:bg-[#11161D] border border-[#D4C3AE] dark:border-[#384455] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E8DFC8] dark:border-[#2D3540]">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveConfig(config)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
