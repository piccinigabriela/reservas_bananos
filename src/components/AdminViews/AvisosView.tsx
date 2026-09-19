import React, { useState } from 'react';
import { Reserva } from '../../types';
import { DN, DC, calcFinancials, formatMoney, formatDateEs } from '../../services/cabinConfig';
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
  ExternalLink
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

export const AvisosView: React.FC<AvisosViewProps> = ({ reservas }) => {
  const today = new Date().toISOString().split('T')[0];
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().split('T')[0];

  const upcoming = reservas
    .filter(
      r =>
        !r.icalUid &&
        r.estado !== 'Cancelada' &&
        r.estado !== 'Non show' &&
        r.estado !== 'Devolución' &&
        r.checkin >= today &&
        r.checkin <= in7Str
    )
    .sort((a, b) => a.checkin.localeCompare(b.checkin));

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

  const handleWhatsApp = (r: Reserva) => {
    const fin = calcFinancials(r);
    const diff = Math.round((new Date(r.checkin).getTime() - new Date().getTime()) / 86400000);
    const cuando = diff <= 0 ? 'HOY' : diff === 1 ? 'mañana' : `en ${diff} días`;
    const msg = `🌿 *AVISO CHECK-IN — Cabañas Los Bananos*\n\n` +
      `📍 *Cabaña:* ${DN[r.depto] || r.depto}\n` +
      `👤 *Huésped:* ${r.huesped} ${r.nac ? `(${r.nac})` : ''}\n` +
      `📅 *Check-in:* ${formatDateEs(r.checkin)} (${cuando})\n` +
      `📅 *Check-out:* ${formatDateEs(r.checkout)}\n` +
      `🌙 *Noches:* ${fin.n}\n` +
      `🏨 *Plataforma:* ${r.plataforma}\n` +
      (r.notas ? `📝 *Notas:* ${r.notas}\n` : '') +
      `\n✅ ¡Te esperamos en Iguazú!`;

    const cleanTel = r.tel ? r.tel.replace(/\D/g, '') : '';
    if (cleanTel) {
      window.open(`https://wa.me/${cleanTel}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      const savedWa = localStorage.getItem('bn_wa');
      const adminWa = savedWa ? JSON.parse(savedWa).admin : '';
      if (adminWa) {
        window.open(`https://wa.me/${adminWa.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        alert('No hay teléfono registrado para este huésped ni WhatsApp de administración configurado.');
      }
    }
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

      {/* Banner de Telegram */}
      <div className="bg-gradient-to-r from-[#0088cc]/10 via-[#0088cc]/5 to-transparent border border-[#0088cc]/30 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0088cc] text-white flex items-center justify-center shrink-0 shadow-md">
              <Send className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1E293B]">
                  Notificaciones Automáticas por Telegram
                </h3>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isConfigured 
                    ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                }`}>
                  {isConfigured ? '🟢 Conectado' : '⚪ Sin Configurar'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isConfigured 
                  ? 'Recibí los avisos de check-in y salidas en tu teléfono a costo $0.' 
                  : 'Conectá un bot gratuito en 2 minutos para que las alertas suenen en tu celular.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isConfigured && (
              <button
                onClick={handleTelegramDailySummary}
                disabled={sendingSummary}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs disabled:opacity-50"
                title="Enviar el reporte de quién llega y sale hoy"
              >
                {sendingSummary ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{sendingSummary ? 'Enviando...' : 'Enviar Resumen de Hoy'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setTestStatus({ type: 'idle', msg: '' });
                setShowTgModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-[#334155] border border-[#CBD5E1] font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{isConfigured ? 'Ajustes Bot' : 'Configurar Telegram'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cabecera de Próximas Llegadas */}
      <div className="bg-[#FCF8F2] border border-[#E5D7C5] rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#D2502A]" />
          <h2 className="font-bold text-base text-[#2A2118]">
            Próximas Llegadas (Próximos 7 Días)
          </h2>
        </div>
        <p className="text-xs text-[#7A6752] mt-1">
          Coordiná la limpieza, entrega de llaves y confirmación por WhatsApp o Telegram con los huéspedes que llegan esta semana.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="bg-white border border-[#E5D7C5] rounded-2xl p-12 text-center text-[#8C765C] space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-[#CBB9A5]" />
          <div className="font-bold text-base text-[#2A2118]">Sin llegadas en los próximos 7 días</div>
          <div className="text-xs">No hay reservas programadas para ingresar en esta semana.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map(r => {
            const fin = calcFinancials(r);
            const diff = Math.round((new Date(r.checkin).getTime() - new Date().getTime()) / 86400000);
            const badgeUrgencia = diff <= 0 ? '¡Llega HOY!' : diff === 1 ? 'Llega MAÑANA' : `En ${diff} días`;
            const cl = checklist[r.id] || { limpieza: false, acceso: false, confirmado: false };
            const isSending = sendingId === r.id;

            return (
              <div
                key={r.id}
                className="bg-white border-2 border-[#E5D7C5] rounded-2xl overflow-hidden shadow-sm space-y-3"
              >
                {/* Header de la tarjeta con cabaña */}
                <div
                  className="px-4 py-3 text-white flex items-center justify-between"
                  style={{ backgroundColor: DC[r.depto] || '#2A2118' }}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-bold text-sm sm:text-base truncate">
                      {r.huesped}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/25 font-bold">
                    {badgeUrgencia}
                  </span>
                </div>

                {/* Detalles de la estadía */}
                <div className="px-4 space-y-2 text-xs text-[#4A3C2F]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#8C765C] font-semibold block">Cabaña:</span>
                      <span className="font-bold text-[#2A2118] text-sm">
                        {DN[r.depto] || r.depto}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C765C] font-semibold block">Canal:</span>
                      <span className="font-medium text-[#2A2118]">{r.plataforma}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0E6DA]">
                    <div>
                      <span className="text-[#8C765C] font-semibold block">Entrada:</span>
                      <span className="font-bold text-[#2A2118]">
                        {formatDateEs(r.checkin)} {r.early ? '(Early)' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C765C] font-semibold block">Salida:</span>
                      <span className="font-bold text-[#2A2118]">
                        {formatDateEs(r.checkout)} {r.late ? '(Late)' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#FAF4EB] p-2.5 rounded-lg flex items-center justify-between font-semibold">
                    <span>Líquido a recibir:</span>
                    <span className="text-[#2E7D32] font-bold text-sm">
                      {formatMoney(fin.liq)}
                    </span>
                  </div>

                  {r.notas && (
                    <div className="text-[11px] text-[#5A4836] bg-[#FFF9F2] p-2 rounded-md border border-[#EFE2D2]">
                      📝 <em>"{r.notas}"</em>
                    </div>
                  )}
                </div>

                {/* Checklist de Operación y Botones WhatsApp / Telegram */}
                <div className="bg-[#F8F2E9] p-3 border-t border-[#E5D7C5] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-[#4A3B2C] font-medium">
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

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Botón Telegram */}
                    <button
                      onClick={() => handleTelegramIndividual(r)}
                      disabled={isSending}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs rounded-lg transition shadow-xs disabled:opacity-50"
                      title="Enviar ficha de este huésped a tu canal de Telegram"
                    >
                      {isSending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Telegram</span>
                    </button>

                    {/* Botón WhatsApp */}
                    <button
                      onClick={() => handleWhatsApp(r)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-lg transition shadow-xs"
                      title="Abrir chat de WhatsApp con el huésped o recepción"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
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
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
              {/* Pasos explicativos */}
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
                  <li>
                    Para el Chat ID podés usar el <code>@nombre_del_canal</code> o reenviar un mensaje a <b>@userinfobot</b> para ver tu ID numérico.
                  </li>
                </ol>
              </div>

              {/* Formulario */}
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

              {/* Estado de Prueba */}
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
