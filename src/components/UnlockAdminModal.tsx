import React, { useState } from 'react';
import { DEFAULT_PINS } from '../services/cabinConfig';
import { ShieldCheck, X, Check, Lock } from 'lucide-react';

interface UnlockAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UnlockAdminModal: React.FC<UnlockAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const getSavedAdminPin = () => {
    try {
      const saved = localStorage.getItem('bn_p');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.admin) return parsed.admin;
      }
    } catch (_) {}
    return DEFAULT_PINS.admin || '1234';
  };

  const verifyPin = (candidatePin: string) => {
    const adminPin = getSavedAdminPin();
    if (candidatePin === adminPin) {
      setPin('');
      setErrorMsg('');
      onSuccess();
    } else {
      setErrorMsg('PIN de Propietario incorrecto');
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setErrorMsg('');
    if (next.length === 4) {
      setTimeout(() => verifyPin(next), 120);
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-[#1A1F26] text-[#F1F5F9] border border-[#2D3540] rounded-3xl p-6 sm:p-7 w-full max-w-xs sm:max-w-sm shadow-2xl space-y-5 text-center">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-white">Desbloquear Modo Propietario</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 text-left leading-relaxed">
          Ingresá tu PIN de propietario para ver balances, gráficos de rendimiento, gastos y configuración.
        </p>

        {/* Indicador de 4 dígitos */}
        <div className="space-y-2">
          <div className="flex justify-center gap-3 py-1">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  pin.length > idx
                    ? 'bg-blue-500 scale-125 shadow-xs'
                    : 'bg-[#12151A] border border-[#2D3540]'
                }`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-400 animate-shake">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Teclado Táctil */}
        <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-11 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540] text-white font-bold text-lg shadow-xs transition active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}

          <button
            onClick={handleClear}
            className="h-11 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-400 font-bold text-xs transition active:scale-95 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>

          <button
            onClick={() => handleDigit('0')}
            className="h-11 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540] text-white font-bold text-lg shadow-xs transition active:scale-95 flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540] text-slate-400 font-bold text-base transition active:scale-95 flex items-center justify-center cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Acceso de prueba / Atajo */}
        <div className="pt-2 border-t border-[#2D3540] flex justify-between items-center text-xs">
          <button
            onClick={() => verifyPin('1234')}
            className="text-blue-400 hover:underline font-semibold"
          >
            Acceso Rápido (1234)
          </button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
