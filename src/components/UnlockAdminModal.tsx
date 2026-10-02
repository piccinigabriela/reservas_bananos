import React, { useState, useEffect } from 'react';
import { DEFAULT_PINS, isMasterSecretPin } from '../services/cabinConfig';
import { ShieldCheck, X, Lock } from 'lucide-react';

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
    
    // 1. Propietario / Administración (1982, 1535)
    if (isMasterSecretPin(candidatePin) || candidatePin === pins.admin || candidatePin === '1982' || candidatePin === '1535') {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('admin');
      return;
    }

    // 2. Recepción / Día a Día (0000)
    if (candidatePin === pins.recepcion || candidatePin === '0000') {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('recepcion');
      return;
    }

    // 3. Voluntario 1
    if (candidatePin === pins.vol1 || candidatePin === '1111') {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('vol1');
      return;
    }

    // 4. Voluntario 2
    if (candidatePin === pins.vol2 || candidatePin === '2222') {
      setPin('');
      setErrorMsg('');
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onSuccess('vol2');
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
      setErrorMsg(`Sistema bloqueado por 5 minutos tras 3 intentos fallidos.`);
    } else {
      setErrorMsg(`PIN incorrecto. Intento ${nextFails} de 3.`);
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white text-[#2A2118] border border-[#EAE0D2] rounded-3xl p-6 sm:p-7 w-full max-w-xs sm:max-w-sm shadow-2xl space-y-4 text-center">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shadow-xs">
              🌴
            </div>
            <div className="text-left">
              <span className="font-extrabold text-sm text-[#2A2118] block leading-tight">Acceso al Sistema</span>
              <span className="text-[10px] text-[#7A6752]">Cabañas Los Bananos</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A6752] hover:text-[#2A2118] hover:bg-[#FAF5EE] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador o Bloqueo */}
        {isLocked ? (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-center my-2">
            <div className="text-rose-700 font-extrabold text-xs flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Bloqueo temporal por seguridad</span>
            </div>
            <div className="text-xl font-mono font-black text-rose-900">
              {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#7A6752]">
              Ingresá tu PIN de 4 dígitos para acceder al panel
            </p>

            {/* Puntos de PIN */}
            <div className="flex justify-center gap-3 py-1">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    pin.length > idx
                      ? 'bg-emerald-600 scale-125 shadow-xs ring-2 ring-emerald-300'
                      : 'bg-[#FAF5EE] border-2 border-[#D4C3AE]'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 animate-bounce">
                {errorMsg}
              </p>
            )}

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="h-11 rounded-xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] text-[#2A2118] font-black text-lg transition active:scale-90 flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-11 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-300 text-rose-700 font-bold text-xs transition active:scale-90 flex items-center justify-center cursor-pointer"
              >
                Borrar
              </button>

              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-11 rounded-xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] text-[#2A2118] font-black text-lg transition active:scale-90 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 rounded-xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-[#D4C3AE] border border-[#D4C3AE] text-[#5A4838] font-bold text-base transition active:scale-90 flex items-center justify-center cursor-pointer"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
