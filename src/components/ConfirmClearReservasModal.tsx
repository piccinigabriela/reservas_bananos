import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2, X } from 'lucide-react';

interface ConfirmClearReservasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  onDownloadBackup: () => void;
}

export const ConfirmClearReservasModal: React.FC<ConfirmClearReservasModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  onDownloadBackup,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const isEnabled = confirmText.trim().toUpperCase() === 'BORRAR';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1A1F26] text-[#F1F5F9] border border-[#DC2626]/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#450A0A]/40 px-5 py-4 border-b border-[#DC2626]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626]/20 text-[#EF4444] flex items-center justify-center border border-[#DC2626]/40">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Vaciar Todas las Reservas</h2>
              <p className="text-xs text-[#FCA5A5]">Acción destructiva de limpieza total</p>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmText('');
              onClose();
            }}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg transition hover:bg-[#222933]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-[#2D1515] border border-[#DC2626]/30 p-3.5 rounded-xl text-[#FECACA] space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#EF4444]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>¿Eliminar las {count} reservas registradas?</span>
            </div>
            <p className="leading-relaxed">
              Esta acción borrará todas las reservas de la base de datos y del calendario.
              El calendario quedará en cero para que puedas cargar tu archivo nuevo sin ninguna superposición.
            </p>
          </div>

          {/* Backup prompt */}
          <div className="bg-[#222933] border border-[#2D3540] p-3 rounded-xl flex items-center justify-between gap-3">
            <span className="text-[#94A3B8]">Te recomendamos descargar una copia de respaldo antes:</span>
            <button
              type="button"
              onClick={onDownloadBackup}
              className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white font-semibold rounded-lg border border-[#475569] transition flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Bajar Backup</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#94A3B8] block">
              Para confirmar, escribí la palabra <strong className="text-white">BORRAR</strong> a continuación:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="BORRAR"
              className="w-full bg-[#12151A] border border-[#2D3540] focus:border-[#EF4444] rounded-xl px-3 py-2 text-sm font-bold text-white text-center tracking-wider outline-hidden"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#12151A] px-5 py-3.5 border-t border-[#2D3540] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setConfirmText('');
              onClose();
            }}
            className="px-4 py-2 bg-transparent hover:bg-[#222933] text-[#94A3B8] hover:text-white text-xs font-semibold rounded-xl transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!isEnabled}
            onClick={() => {
              setConfirmText('');
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#2D3540] disabled:text-[#64748B] text-white font-bold text-xs rounded-xl transition shadow-lg"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Todas las Reservas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
