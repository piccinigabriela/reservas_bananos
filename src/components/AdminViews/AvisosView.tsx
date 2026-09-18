import React, { useState } from 'react';
import { Reserva } from '../../types';
import { DN, DC, calcFinancials, formatMoney, formatDateEs, nightsCount } from '../../services/cabinConfig';
import { Bell, MessageSquare, CheckSquare, Calendar, User } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="bg-[#FCF8F2] border border-[#E5D7C5] rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#D2502A]" />
          <h2 className="font-bold text-base text-[#2A2118]">
            Próximas Llegadas (Próximos 7 Días)
          </h2>
        </div>
        <p className="text-xs text-[#7A6752] mt-1">
          Coordiná la limpieza, entrega de llaves y confirmación por WhatsApp con los huéspedes que llegan esta semana.
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

                {/* Checklist de Operación y Botón de WhatsApp */}
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

                  <button
                    onClick={() => handleWhatsApp(r)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-lg transition shadow-xs ml-auto"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
