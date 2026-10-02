import React, { useState, useEffect } from 'react';
import { DEFAULT_PINS, isMasterSecretPin } from '../services/cabinConfig';
import { ShieldCheck, X, Check, Lock } from 'lucide-react';

interface UnlockAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userRole?: string) => void;
}

export const UnlockAdminModal: React.FC<UnlockAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('bn_pin_fails') || '0', 10);
  });
  const [lockedUntil, setLockedUntil] = useState<number>(() => {
    return parseInt(localStorage.getItem('bn_pin_lock_until') || '0', 10);
  });
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const isLocked = lockedUntil > nowTime;
  const remainingSeconds = Math.max(0, Math.ceil((lockedUntil - nowTime) / 1000));

  const getSavedPins = () => {
    try {
      const saved = localStorage.getItem('bn_p');
      if (saved) return { ...DEFAULT_PINS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_PINS;
  };

  const verifyPin = (candidatePin: string) => {
    if (isLocked) return;

    const pins = getSavedPins();
    
    // 1. Maestro o Propietario (1982 por defecto)
    if (isMasterSecretPin(candidatePin) || candidatePin === pins.admin) {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('owner');
      return;
    }

    // 2. Recepción (2026 por defecto)
    if (candidatePin === pins.recepcion) {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('recepcion');
      return;
    }

    // 3. Voluntario (0000 por defecto)
    if (candidatePin === pins.voluntario) {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('vol1');
      return;
    }

    const nextFails = failedAttempts + 1;
    setFailedAttempts(nextFails);
    localStorage.setItem('bn_pin_fails', String(nextFails));

    if (nextFails >= 3) {
      const lockDurationMs = 5 * 60 * 1000; // 5 minutos de bloqueo
      const until = Date.now() + lockDurationMs;
      setLockedUntil(until);
      localStorage.setItem('bn_pin_lock_until', String(until));
      setErrorMsg(`Sistema bloqueado temporalmente por seguridad. Esperá 5 minutos.`);
    } else {
      setErrorMsg(`PIN no válido. Intento ${nextFails} de 3 antes del bloqueo temporal.`);
    }
    setPin('');
  };

  const handleDigit = (digit: string) => {
    if (isLocked || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setErrorMsg('');
    if (next.length === 4) {
      setTimeout(() => verifyPin(next), 120);
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setPin(p => p.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (isLocked) return;
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
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 text-left leading-relaxed">
          Ingresá tu PIN de propietario para ver balances, gráficos de rendimiento, gastos y configuración.
        </p>

        {isLocked ? (
          <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl space-y-2">
            <div className="text-rose-400 font-black text-sm flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Bloqueo de Seguridad Activado</span>
            </div>
            <p className="text-xs text-rose-200">
              Se registraron 3 intentos fallidos consecutivos.
            </p>
            <div className="text-lg font-mono font-black text-rose-300">
              {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ) : (
          <>

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

            <div className="pt-2 border-t border-[#2D3540] flex justify-end items-center text-xs">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white cursor-pointer px-3 py-1 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
