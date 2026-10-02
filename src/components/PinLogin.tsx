import React, { useState, useEffect } from 'react';
import { UserKey } from '../types';
import { getAppPins, getVolunteerNames, isMasterSecretPin } from '../services/cabinConfig';
import { Calendar, ShieldCheck, Compass, Check, KeyRound } from 'lucide-react';

interface PinLoginProps {
  onLoginSuccess: (user: UserKey) => void;
  onOpenGuestGuide?: () => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({ onLoginSuccess, onOpenGuestGuide }) => {
  const [targetRole, setTargetRole] = useState<'recepcion' | 'admin' | 'vol1' | 'vol2'>('recepcion');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  
  const volNames = getVolunteerNames();
  const pins = getAppPins();

  const getProfileTitle = () => {
    if (targetRole === 'recepcion') return 'Día a Día (Recepción)';
    if (targetRole === 'admin') return 'Propietario / Administración';
    if (targetRole === 'vol1') return volNames.vol1 || 'Voluntario 1';
    if (targetRole === 'vol2') return volNames.vol2 || 'Voluntario 2';
    return 'Usuario';
  };

  const getProfileRoleName = () => {
    if (targetRole === 'recepcion') return 'recepción';
    if (targetRole === 'admin') return 'propietario';
    if (targetRole === 'vol1') return volNames.vol1?.split('(')[0]?.trim() || 'Voluntario 1';
    if (targetRole === 'vol2') return volNames.vol2?.split('(')[0]?.trim() || 'Voluntario 2';
    return 'usuario';
  };

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
      setTimeout(() => verifyPin(newPin), 120);
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

    // Código maestro secreto para Gabriela (1535): ingresa inmediatamente como Propietario/Admin
    if (isMasterSecretPin(candidatePin)) {
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', 'admin');
      }
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onLoginSuccess('admin');
      return;
    }

    const currentPins = getAppPins();
    const expectedPin = currentPins[targetRole] || (targetRole === 'recepcion' ? currentPins.vol || '0000' : '');
    const adminMasterPin = currentPins.admin || '1234';

    // Admite el PIN específico del usuario o el PIN maestro de Propietario
    if (candidatePin === expectedPin || candidatePin === adminMasterPin) {
      const userKey = targetRole as UserKey;
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', userKey);
      }
      localStorage.removeItem('bn_pin_fails');
      localStorage.removeItem('bn_pin_lock_until');
      setFailedAttempts(0);
      onLoginSuccess(userKey);
    } else {
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
    }
  };

  // Soporte de teclado físico (números 0-9 y backspace)
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
  }, [pin, targetRole]);

  const defaultPinForRole = targetRole === 'admin' 
    ? '1234' 
    : targetRole === 'recepcion' 
      ? '0000' 
      : targetRole === 'vol1' 
        ? (pins.vol1 || '1111') 
        : (pins.vol2 || '2222');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF7] via-[#F5EFE6] to-[#EBE2D3] text-[#2A2118] flex flex-col items-center justify-center p-4 selection:bg-emerald-600 selection:text-white relative">
      {/* Resplandor decorativo de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-3xl -mt-40 ml-40" />
      </div>

      <div className="relative bg-white/95 backdrop-blur-md text-[#2A2118] border border-[#EAE0D2] rounded-3xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md shadow-2xl space-y-5">
        
        {/* Logo e Identidad */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-md ring-4 ring-emerald-500/20">
            🌴
          </div>
          <h1 className="font-black text-2xl text-[#2A2118] tracking-tight">
            Cabañas Los Bananos
          </h1>
          <p className="text-xs text-[#7A6752] font-medium">
            Puerto Iguazú · Seleccioná tu perfil para ingresar
          </p>
        </div>

        {/* Selector de Perfil (4 opciones claras) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF5EE] border border-[#EAE0D2] rounded-2xl">
          {/* Recepción */}
          <button
            type="button"
            onClick={() => {
              setTargetRole('recepcion');
              setPin('');
              setErrorMsg('');
            }}
            className={`p-3 rounded-xl text-left transition flex flex-col justify-between cursor-pointer ${
              targetRole === 'recepcion'
                ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                : 'text-[#7A6752] hover:bg-white hover:text-[#2A2118] border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Calendar className="w-4 h-4 text-emerald-700" />
              {targetRole === 'recepcion' && <Check className="w-4 h-4 text-emerald-700" />}
            </div>
            <span className="font-extrabold text-xs block text-[#2A2118]">Día a Día</span>
            <span className="text-[10px] text-emerald-700 font-semibold leading-tight">Recepción</span>
          </button>

          {/* Propietario */}
          <button
            type="button"
            onClick={() => {
              setTargetRole('admin');
              setPin('');
              setErrorMsg('');
            }}
            className={`p-3 rounded-xl text-left transition flex flex-col justify-between cursor-pointer ${
              targetRole === 'admin'
                ? 'bg-amber-50 border-2 border-amber-600 text-amber-950 shadow-sm ring-2 ring-amber-500/20'
                : 'text-[#7A6752] hover:bg-white hover:text-[#2A2118] border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              {targetRole === 'admin' && <Check className="w-4 h-4 text-amber-700" />}
            </div>
            <span className="font-extrabold text-xs block text-[#2A2118]">Propietario</span>
            <span className="text-[10px] text-amber-800 font-semibold leading-tight">Administración</span>
          </button>

          {/* Voluntario 1 */}
          <button
            type="button"
            onClick={() => {
              setTargetRole('vol1');
              setPin('');
              setErrorMsg('');
            }}
            className={`p-3 rounded-xl text-left transition flex flex-col justify-between cursor-pointer ${
              targetRole === 'vol1'
                ? 'bg-cyan-50 border-2 border-cyan-600 text-cyan-950 shadow-sm ring-2 ring-cyan-500/20'
                : 'text-[#7A6752] hover:bg-white hover:text-[#2A2118] border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">🧑‍🌾</span>
              {targetRole === 'vol1' && <Check className="w-4 h-4 text-cyan-700" />}
            </div>
            <span className="font-extrabold text-xs block truncate text-[#2A2118]">
              {volNames.vol1?.split('(')[0]?.trim() || 'Voluntario 1'}
            </span>
            <span className="text-[10px] text-cyan-800 font-semibold leading-tight">Worldpackers</span>
          </button>

          {/* Voluntario 2 */}
          <button
            type="button"
            onClick={() => {
              setTargetRole('vol2');
              setPin('');
              setErrorMsg('');
            }}
            className={`p-3 rounded-xl text-left transition flex flex-col justify-between cursor-pointer ${
              targetRole === 'vol2'
                ? 'bg-purple-50 border-2 border-purple-600 text-purple-950 shadow-sm ring-2 ring-purple-500/20'
                : 'text-[#7A6752] hover:bg-white hover:text-[#2A2118] border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">👩‍🌾</span>
              {targetRole === 'vol2' && <Check className="w-4 h-4 text-purple-700" />}
            </div>
            <span className="font-extrabold text-xs block truncate text-[#2A2118]">
              {volNames.vol2?.split('(')[0]?.trim() || 'Voluntario 2'}
            </span>
            <span className="text-[10px] text-purple-800 font-semibold leading-tight">Worldpackers</span>
          </button>
        </div>

        {/* Sección de Ingreso de PIN de 4 dígitos o Bloqueo */}
        {isLocked ? (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-center my-3">
            <div className="text-rose-700 font-black text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
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
              <span className="text-xs uppercase font-extrabold text-[#7A6752] tracking-wider block">
                Ingresá el PIN de {getProfileRoleName()}
              </span>

              {/* Indicador de 4 puntos */}
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      pin.length > idx
                        ? targetRole === 'admin'
                          ? 'bg-amber-500 scale-125 shadow-md ring-2 ring-amber-300'
                          : 'bg-emerald-600 scale-125 shadow-md ring-2 ring-emerald-300'
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
                  className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] text-[#2A2118] font-extrabold text-xl shadow-xs transition active:scale-90 flex items-center justify-center cursor-pointer"
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
                className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] text-[#2A2118] font-extrabold text-xl shadow-xs transition active:scale-90 flex items-center justify-center cursor-pointer"
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

        {/* Checkbox para no pedirlo siempre en el celular */}
        <div className="pt-2 border-t border-[#EAE0D2] space-y-2.5">
          <label className="flex items-center justify-center gap-2 text-xs text-[#5A4838] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={e => setRememberDevice(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
            <span className="font-medium">Recordar este usuario en este dispositivo</span>
          </label>

          {/* Enlace directo a Guía del Huésped */}
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
        </div>
      </div>
    </div>
  );
};
