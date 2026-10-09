import React from 'react';
import { X } from 'lucide-react';
import { PinLogin } from './PinLogin';

interface UnlockAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se mantiene por compatibilidad; el cambio de usuario lo detecta App al cambiar la sesión. */
  onSuccess?: (role?: string) => void;
}

/** Cambiar de usuario (ej: de Recepción a Propietario) con el mismo ingreso real de Supabase. */
export const UnlockAdminModal: React.FC<UnlockAdminModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white border border-[#EAE0D2] shadow flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <PinLogin compacto />
      </div>
    </div>
  );
};
