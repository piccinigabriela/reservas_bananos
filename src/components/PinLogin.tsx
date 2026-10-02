import React, { useState, useEffect } from 'react';
import { UserKey } from '../types';
import { getAppPins, isMasterSecretPin } from '../services/cabinConfig';
import { ShieldCheck, Compass, Lock } from 'lucide-react';

interface PinLoginProps {
  onLoginSuccess: (user: UserKey) => void;
  onOpenGuestGuide?: () => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({ onLoginSuccess, onOpenGuestGuide }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);

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

  const isLocked = lockedUntil > nowTime;
  const remainingSeconds = Math.max(0, Math.ceil((lockedUntil - nowTime) / 1000));

  const handleDigit = (digit: string) => {
    if (isLocked || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      setTimeout(() => verifyPin(newPin), 100);
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

  const verifyPin = (candidatePin: string) => {
    if (isLocked) return;

    const currentPins = getAppPins();

    // 1. Propietario / Gabriela (1982 o 1535)
    if (isMasterSecretPin(candidatePin) || candidatePin === currentPins.admin || candidatePin === '1982' || candidatePin === '1535') {
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', 'admin');
      }
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onLoginSuccess('admin');
      return;
    }

    // 2. Recepción / Día a Día (0000)
    if (candidatePin === (currentPins.recepcion || '0000') || candidatePin === '0000') {
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', 'recepcion');
      }
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onLoginSuccess('recepcion');
      return;
    }

    // 3. Voluntario 1 (1111)
    if (candidatePin === (currentPins.vol1 || '1111') || candidatePin === '1111') {
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', 'vol1');
      }
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onLoginSuccess('vol1');
      return;
    }

    // 4. Voluntario 2 (2222)
    if (candidatePin === (currentPins.vol2 || '2222') || candidatePin === '2222') {
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', 'vol2');
      }
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onLoginSuccess('vol2');
      return;
    }

    // PIN incorrecto
    const nextFails = failedAttempts + 1;
    setFailedAttempts(nextFails);
    localStorage.setItem('bn_pin_fails', String(nextFails));

    if (nextFails >= 3) {
      const until = Date.now() + 5 * 60 * 1000;
      setLockedUntil(until);
      localStorage.setItem('bn_pin_lock_until', String(until));
      setErrorMsg('Sistema bloqueado por 5 minutos tras 3 intentos fallidos.');
    } else {
      setErrorMsg(`PIN incorrecto. Intento ${nextFails} de 3.`);
    }
    setPin('');
  };

  // Soporte de teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLocked]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F3EBE0] to-[#EAE0D2] text-[#2A2118] flex flex-col items-center justify-center p-4 selection:bg-emerald-600 selection:text-white relative">
      {/* Resplandor cálido de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-3xl -mt-40 ml-40" />
      </div>

      <div className="relative bg-white/95 backdrop-blur-md text-[#2A2118] border border-[#EAE0D2] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl space-y-5">
        
        {/* Logo e Identidad */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-md ring-4 ring-emerald-500/20">
            🌴
          </div>
          <h1 className="font-black text-2xl text-[#2A2118] tracking-tight">
            Cabañas Los Bananos
          </h1>
          <p className="text-xs text-[#7A6752] font-medium">
            Sistema de Gestión y Reservas
          </p>
        </div>

        {/* Sección de Ingreso de PIN de 4 dígitos o Bloqueo */}
        {isLocked ? (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-center my-3">
            <div className="text-rose-700 font-black text-sm flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-rose-600" />
              <span>Bloqueo de Seguridad Activado</span>
            </div>
            <p className="text-xs text-rose-800">
              Se registraron 3 intentos fallidos de PIN.
            </p>
            <div className="text-xl font-mono font-black text-rose-900">
              {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-[#7A6752] block">
                Ingresá tu PIN de 4 dígitos para acceder
              </span>

              {/* Indicador de 4 puntos */}
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      pin.length > idx
                        ? 'bg-emerald-600 scale-125 shadow-md ring-2 ring-emerald-300'
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
            </div>

            {/* Teclado Táctil Numérico */}
            <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] text-[#2A2118] font-extrabold text-xl shadow-2xs transition active:scale-90 flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-300 text-rose-700 font-bold text-xs transition active:scale-90 flex items-center justify-center cursor-pointer"
                title="Borrar todo"
              >
                Borrar
              </button>

              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] text-[#2A2118] font-extrabold text-xl shadow-2xs transition active:scale-90 flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-[#D4C3AE] border border-[#D4C3AE] text-[#5A4838] font-bold text-lg transition active:scale-90 flex items-center justify-center cursor-pointer"
                title="Borrar último dígito"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* Checkbox para recordar en el dispositivo */}
        <div className="pt-2 border-t border-[#EAE0D2] space-y-2.5">
          <label className="flex items-center justify-center gap-2 text-xs text-[#5A4838] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={e => setRememberDevice(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
            <span className="font-medium">Recordar sesión en este dispositivo</span>
          </label>

          {/* Enlace directo a Guía del Huésped */}
          {onOpenGuestGuide && (
            <div className="text-center">
              <button
                type="button"
                onClick={onOpenGuestGuide}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 transition font-bold cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>¿Sos huésped? Abrir Guía de Bienvenida 🍍</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
