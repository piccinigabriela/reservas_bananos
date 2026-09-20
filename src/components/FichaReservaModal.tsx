import React from 'react';
import { Reserva } from '../types';
import { 
  DN, 
  DC, 
  formatDateEs, 
  formatDateExtended,
  formatMoney, 
  calcFinancials, 
  nightsCount,
  esSinAsignar,
  tipoDeSinAsignar,
  TIPOS
} from '../services/cabinConfig';
import { 
  X, 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  MessageSquare, 
  Edit3, 
  Home, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Send
} from 'lucide-react';
import { getTelegramConfig, sendTelegramMessage, formatTelegramCheckin } from '../services/telegramService';

interface FichaReservaModalProps {
  reserva: Reserva | null;
  onClose: () => void;
  onEdit: (reserva: Reserva) => void;
  onAssignCabin?: (reserva: Reserva) => void;
  onConvertIcal?: (reserva: Reserva) => void;
  onDelete?: (id: string) => void;
  isDyslexiaMode: boolean;
}

export const FichaReservaModal: React.FC<FichaReservaModalProps> = ({
  reserva,
  onClose,
  onEdit,
  onAssignCabin,
  onConvertIcal,
  onDelete,
  isDyslexiaMode,
}) => {
  if (!reserva) return null;

  const isIcal = !!reserva.icalUid;
  const isUnassigned = esSinAsignar(reserva.depto);
  const fin = calcFinancials(reserva);
  const noches = nightsCount(reserva.checkin, reserva.checkout);
  const sena = reserva.sena || 0;
  const saldo = reserva.saldo || 0;
  const totalCobrado = sena + saldo;
  const saldoPendiente = Math.max(0, fin.liq - totalCobrado);
  const estaSaldado = saldoPendiente <= 0;

  const cabinName = isUnassigned 
    ? `Sin asignar (${TIPOS[tipoDeSinAsignar(reserva.depto)]})` 
    : DN[reserva.depto] || reserva.depto;

  const cabinColor = DC[reserva.depto] || '#2A2118';

  // Abrir WhatsApp al huésped
  const handleOpenWhatsApp = () => {
    if (!reserva.tel) return;
    const cleanTel = reserva.tel.replace(/\D/g, '');
    const msg = `Hola ${reserva.huesped}! Te escribimos de Cabañas Los Bananos en Puerto Iguazú para confirmar tu estadía del ${formatDateEs(reserva.checkin)} al ${formatDateEs(reserva.checkout)}.`;
    window.open(`https://wa.me/${cleanTel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const [tgLoading, setTgLoading] = React.useState(false);
  const [tgSuccess, setTgSuccess] = React.useState(false);

  const handleSendTelegram = async () => {
    const cfg = getTelegramConfig();
    if (!cfg.botToken || !cfg.chatId) {
      alert('Configurá primero tu bot de Telegram en la pestaña Avisos.');
      return;
    }

    setTgLoading(true);
    const text = formatTelegramCheckin(reserva);
    const res = await sendTelegramMessage(cfg.botToken, cfg.chatId, text);
    setTgLoading(false);

    if (res.success) {
      setTgSuccess(true);
      setTimeout(() => setTgSuccess(false), 3000);
    } else {
      alert(`Error al enviar a Telegram: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-[#FCF8F2] border-2 border-[#DBCAB5] rounded-2xl w-full max-w-lg my-auto max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado con color de la cabaña */}
        <div 
          className="px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0"
          style={{ backgroundColor: cabinColor }}
        >
          <div className="flex items-center gap-2.5">
            {isIcal ? (
              <div className="p-2 bg-white/20 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-white/20 rounded-lg">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider font-bold opacity-90 block">
                {cabinName}
              </span>
              <h2 className="text-lg sm:text-xl font-bold leading-tight truncate max-w-[280px]">
                {reserva.huesped}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-90"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo de la ficha con scroll vertical asegurado */}
        <div className={`p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 ${isDyslexiaMode ? 'dyslexia-enhanced' : ''}`}>
          {/* Si es un bloqueo iCal */}
          {isIcal ? (
            <div className="bg-[#FAF3EA] border-2 border-[#D69654] rounded-xl p-4 text-center space-y-3">
              <div className="text-sm text-[#704214] leading-relaxed">
                Este período está bloqueado por el calendario de <strong>{reserva.plataforma}</strong>.
                Podés convertirlo en una reserva con nombre de huésped y precio.
              </div>

              <div className="text-xs font-semibold text-[#8F551B]">
                {formatDateExtended(reserva.checkin)} ➔ {formatDateExtended(reserva.checkout)} ({noches} noches)
              </div>

              <button
                onClick={() => {
                  onClose();
                  if (onConvertIcal) onConvertIcal(reserva);
                }}
                className="w-full py-3 px-4 bg-[#D2502A] hover:bg-[#B53F1D] text-white font-bold text-sm sm:text-base rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <span>➕ Convertir en Reserva Confirmada</span>
              </button>
            </div>
          ) : (
            <>
              {/* Fechas claras */}
              <div className="bg-white border border-[#E8DCCF] rounded-xl p-4 shadow-xs">
                <div className="text-xs uppercase tracking-wider font-bold text-[#8C765C] mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#D2502A]" />
                  <span>Fechas de la Estadía ({noches} noches)</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="border-r border-[#EFE5D8] pr-2">
                    <span className="text-[11px] text-[#A38E75] uppercase block font-semibold">
                      Llegada (Check-in)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#2A2118] block">
                      {formatDateExtended(reserva.checkin)}
                    </span>
                    {reserva.early && (
                      <span className="inline-block mt-1 text-[11px] px-2 py-0.5 bg-[#FFF4DC] text-[#9A6700] rounded-md font-semibold">
                        Early Check-in
                      </span>
                    )}
                  </div>

                  <div className="pl-1">
                    <span className="text-[11px] text-[#A38E75] uppercase block font-semibold">
                      Salida (Check-out)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#2A2118] block">
                      {formatDateExtended(reserva.checkout)}
                    </span>
                    {reserva.late && (
                      <span className="inline-block mt-1 text-[11px] px-2 py-0.5 bg-[#FFF4DC] text-[#9A6700] rounded-md font-semibold">
                        Late Check-out
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque Financiero: Ultra Claro (Precio, Comisión, Neto, Saldo) */}
              <div className="bg-[#2A2118] text-[#F3E9D6] rounded-xl p-4 shadow-md space-y-3">
                <div className="text-xs uppercase tracking-wider font-bold text-[#D4B594] border-b border-[#47382A] pb-2 flex items-center justify-between">
                  <span>Desglose de Dinero</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#3F3124] text-[#E0C7AA] text-[11px] font-normal">
                    Canal: {reserva.plataforma}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div>
                    <span className="text-[10px] text-[#B8A38C] uppercase block">Subtotal</span>
                    <span className="font-semibold text-sm sm:text-base text-[#FBF6EE]">
                      {formatMoney(fin.subTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#F9A8A0] uppercase block">Comisión</span>
                    <span className="font-semibold text-sm sm:text-base text-[#F9A8A0]">
                      {fin.com > 0 ? `- ${formatMoney(fin.com)}` : '0%'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6EE7B7] uppercase block font-bold">Líquido Neto</span>
                    <span className="font-bold text-base sm:text-lg text-[#6EE7B7]">
                      {formatMoney(fin.liq)}
                    </span>
                  </div>
                </div>

                {/* Estado del cobro: Seña vs Saldo */}
                <div className="bg-[#1A140D] rounded-lg p-3 border border-[#3E2F20] flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-[#BFA88F]">
                      Cobrado: <strong>{formatMoney(totalCobrado)}</strong> (Seña {formatMoney(sena)} + Saldo {formatMoney(saldo)})
                    </div>
                  </div>
                  <div>
                    {estaSaldado ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6EE7B7] bg-[#1E3A2B] px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saldado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA39E] bg-[#421714] px-2.5 py-1 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Falta: {formatMoney(saldoPendiente)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Información del Huésped y Notas */}
              <div className="bg-white border border-[#E8DCCF] rounded-xl p-4 space-y-2 text-xs sm:text-sm text-[#4A3C2F]">
                <div className="flex items-center justify-between border-b border-[#F0E6DA] pb-2">
                  <span className="text-[#8C765C] font-semibold">Estado de reserva:</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E2EDDC] text-[#2E7D32] font-bold text-xs">
                    {reserva.estado}
                  </span>
                </div>

                {reserva.tel && (
                  <div className="flex items-center justify-between border-b border-[#F0E6DA] pb-2">
                    <span className="text-[#8C765C] font-semibold">Teléfono / WhatsApp:</span>
                    <span className="font-medium text-[#2A2118]">{reserva.tel}</span>
                  </div>
                )}

                {reserva.nac && (
                  <div className="flex items-center justify-between border-b border-[#F0E6DA] pb-2">
                    <span className="text-[#8C765C] font-semibold">Nacionalidad:</span>
                    <span className="font-medium text-[#2A2118]">{reserva.nac}</span>
                  </div>
                )}

                {reserva.notas && (
                  <div className="pt-1">
                    <span className="text-[#8C765C] font-semibold block mb-0.5">Notas / Observaciones:</span>
                    <p className="bg-[#FAF4EC] p-2.5 rounded-lg text-[#3F3124] italic">
                      "{reserva.notas}"
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Botones de acción táctiles grandes */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            {/* Si es reserva de Booking sin cabaña asignada */}
            {isUnassigned && onAssignCabin && (
              <button
                onClick={() => {
                  onClose();
                  onAssignCabin(reserva);
                }}
                className="flex-1 min-w-[140px] py-2.5 px-4 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Home className="w-4 h-4" />
                <span>Asignar Cabaña</span>
              </button>
            )}

            {/* WhatsApp al Huésped */}
            {reserva.tel && !isIcal && (
              <button
                onClick={handleOpenWhatsApp}
                className="flex-1 min-w-[140px] py-2.5 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>
            )}

            {/* Notificar a Telegram */}
            {!isIcal && (
              <button
                onClick={handleSendTelegram}
                disabled={tgLoading}
                className="py-2.5 px-3.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                title="Enviar aviso a Telegram"
              >
                <Send className="w-4 h-4" />
                <span>{tgSuccess ? '¡Enviado! ✓' : tgLoading ? 'Enviando...' : 'Telegram'}</span>
              </button>
            )}

            {/* Editar */}
            {!isIcal && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(reserva);
                }}
                className="flex-1 min-w-[120px] py-2.5 px-4 bg-[#2A2118] hover:bg-[#3D3023] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Reserva</span>
              </button>
            )}

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="py-2.5 px-5 bg-[#E8DDD0] hover:bg-[#DDD0C0] text-[#423223] font-semibold text-sm rounded-xl transition"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
