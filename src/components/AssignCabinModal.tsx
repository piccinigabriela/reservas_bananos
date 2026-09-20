import React from 'react';
import { Reserva, CabinCode } from '../types';
import { 
  DN, 
  DC, 
  TIPOS, 
  CABANAS_POR_TIPO, 
  tipoDeSinAsignar, 
  formatDateEs,
  nightsCount
} from '../services/cabinConfig';
import { X, Home, Check, AlertCircle } from 'lucide-react';

interface AssignCabinModalProps {
  reserva: Reserva | null;
  onClose: () => void;
  onAssign: (reservaId: string, newCabinCode: CabinCode) => void;
  existingReservas: Reserva[];
}

export const AssignCabinModal: React.FC<AssignCabinModalProps> = ({
  reserva,
  onClose,
  onAssign,
  existingReservas,
}) => {
  if (!reserva) return null;

  const tipo = tipoDeSinAsignar(reserva.depto);
  const candidateCabins = CABANAS_POR_TIPO[tipo] || [];

  // Filtrar solo las cabañas libres en las fechas de esta reserva
  const availableCabins = candidateCabins.filter(code => {
    const conflict = existingReservas.find(
      r =>
        r.id !== reserva.id &&
        r.depto === code &&
        r.estado !== 'Cancelada' &&
        r.estado !== 'Non show' &&
        r.estado !== 'Devolución' &&
        !(reserva.checkout <= r.checkin || reserva.checkin >= r.checkout)
    );
    return !conflict;
  });

  const noches = nightsCount(reserva.checkin, reserva.checkout);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-[#FCF8F2] border-2 border-[#DBCAB5] rounded-2xl w-full max-w-md my-auto max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#D97706] px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            <h2 className="text-base sm:text-lg font-bold">
              Asignar Cabaña Física
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 text-sm text-[#443527] overflow-y-auto flex-1">
          {/* Ficha rápida de la reserva */}
          <div className="bg-white border border-[#E5D7C5] p-3.5 rounded-xl space-y-1">
            <div className="font-bold text-[#2A2118] text-base">
              {reserva.huesped}
            </div>
            <div className="text-xs text-[#7A6752]">
              Tipo contratado: <strong>{TIPOS[tipo]}</strong>
            </div>
            <div className="text-xs text-[#7A6752]">
              Fechas: {formatDateEs(reserva.checkin)} ➔ {formatDateEs(reserva.checkout)} ({noches} noches)
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8C765C] block mb-2">
              Elegí una cabaña libre para hospedar a este pasajero:
            </span>

            {availableCabins.length === 0 ? (
              <div className="p-4 bg-[#FFF0ED] border border-[#EAA6A6] text-[#A62615] rounded-xl text-center space-y-1">
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-[#E0533C]" />
                <div className="font-bold">No hay cabañas {TIPOS[tipo]} libres</div>
                <div className="text-xs">
                  Revisá el calendario o reubicá otra reserva para liberar un espacio.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableCabins.map(code => (
                  <button
                    key={code}
                    onClick={() => {
                      onAssign(reserva.id, code);
                      onClose();
                    }}
                    className="w-full p-3.5 bg-white hover:bg-[#FAF4EB] border-2 border-[#DBCAB5] hover:border-[#D97706] rounded-xl flex items-center justify-between transition group shadow-xs active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-xs shrink-0"
                        style={{ backgroundColor: DC[code] }}
                      />
                      <span className="font-bold text-sm sm:text-base text-[#2A2118] group-hover:text-[#D97706]">
                        {DN[code]}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#E2EDDC] text-[#2E7D32] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Disponible
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#E8DDD0] hover:bg-[#DDD0C0] text-[#423223] font-semibold rounded-xl text-xs sm:text-sm transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
