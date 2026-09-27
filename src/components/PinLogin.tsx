import React, { useState, useEffect } from 'react';
import { UserKey, VolunteerId } from '../types';
import { getAppPins, getVolunteerNames, USER_META } from '../services/cabinConfig';
import { KeyRound, Check, Calendar, ShieldCheck, ArrowRight, Sparkles, Lock } from 'lucide-react';

interface PinLoginProps {
  onLoginSuccess: (user: UserKey) => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({ onLoginSuccess }) => {
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

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      setTimeout(() => verifyPin(newPin), 120);
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

  const verifyPin = (candidatePin: string) => {
    const currentPins = getAppPins();
    const expectedPin = currentPins[targetRole] || (targetRole === 'recepcion' ? currentPins.vol || '0000' : '');
    const adminMasterPin = currentPins.admin || '1234';

    // Admite el PIN específico del usuario o el PIN maestro de Propietario
    if (candidatePin === expectedPin || candidatePin === adminMasterPin) {
      const userKey = targetRole as UserKey;
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', userKey);
      }
      onLoginSuccess(userKey);
    } else {
      setErrorMsg(`PIN incorrecto para ${getProfileRoleName()}.`);
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
    <div className="min-h-screen bg-[#12151A] text-[#F1F5F9] flex items-center justify-center p-4">
      <div className="bg-[#1A1F26] text-[#F1F5F9] border border-[#2D3540] rounded-3xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md shadow-2xl space-y-5">
        
        {/* Logo e Identidad */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-lg">
            🌿
          </div>
          <h1 className="font-bold text-2xl text-white">
            Los Bananos Cabañas
          </h1>
          <p className="text-xs text-[#94A3B8] font-medium">
            Puerto Iguazú · Elegí quién ingresa
          </p>
        </div>

        {/* Selector de Perfil (4 opciones claras) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#12151A] border border-[#2D3540] rounded-2xl">
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
                ? 'bg-emerald-600/25 border-2 border-emerald-500 text-white shadow-xs'
                : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {targetRole === 'recepcion' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <span className="font-bold text-xs block">Día a Día</span>
            <span className="text-[10px] text-slate-400 leading-tight">Recepción</span>
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
                ? 'bg-blue-600/25 border-2 border-blue-500 text-white shadow-xs'
                : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              {targetRole === 'admin' && <Check className="w-4 h-4 text-blue-400" />}
            </div>
            <span className="font-bold text-xs block">Propietario</span>
            <span className="text-[10px] text-slate-400 leading-tight">Finanzas y Panel</span>
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
                ? 'bg-emerald-600/25 border-2 border-emerald-400 text-white shadow-xs'
                : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">🧑‍🌾</span>
              {targetRole === 'vol1' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <span className="font-bold text-xs block truncate">
              {volNames.vol1?.split('(')[0]?.trim() || 'Voluntario 1'}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">Worldpackers</span>
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
                ? 'bg-emerald-600/25 border-2 border-emerald-400 text-white shadow-xs'
                : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">👩‍🌾</span>
              {targetRole === 'vol2' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <span className="font-bold text-xs block truncate">
              {volNames.vol2?.split('(')[0]?.trim() || 'Voluntario 2'}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">Worldpackers</span>
          </button>
        </div>

        {/* Sección de Ingreso de PIN de 4 dígitos */}
        <div className="space-y-4 pt-1">
          <div className="text-center space-y-1">
            <span className="text-xs uppercase font-bold text-slate-300 tracking-wider block">
              PIN de 4 dígitos para {getProfileRoleName()}
            </span>
            
            {(targetRole === 'vol1' || targetRole === 'vol2') && (
              <p className="text-[11px] text-slate-400">
                (Configurado por el propietario, ej: últimos 4 de su celular)
              </p>
            )}

            {/* Indicador de 4 puntos */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    pin.length > idx
                      ? targetRole === 'admin'
                        ? 'bg-blue-500 scale-125 shadow-xs'
                        : 'bg-emerald-500 scale-125 shadow-xs'
                      : 'bg-[#222933] border border-[#2D3540]'
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

          {/* Teclado Táctil Numérico */}
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                className="h-12 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540] text-white font-bold text-xl shadow-xs transition active:scale-95 flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}

            <button
              onClick={handleClear}
              className="h-12 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-400 font-bold text-xs transition active:scale-95 flex items-center justify-center cursor-pointer"
              title="Borrar todo"
            >
              ✕
            </button>

            <button
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540] text-white font-bold text-xl shadow-xs transition active:scale-95 flex items-center justify-center cursor-pointer"
            >
              0
            </button>

            <button
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540] text-slate-400 font-bold text-lg transition active:scale-95 flex items-center justify-center cursor-pointer"
              title="Borrar último dígito"
            >
              ⌫
            </button>
          </div>

          {/* Atajo rápido / sugerencia de PIN configurado */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => verifyPin(defaultPinForRole)}
              className="text-xs text-slate-400 hover:text-white transition underline cursor-pointer"
            >
              Completar PIN actual ({defaultPinForRole})
            </button>
          </div>
        </div>

        {/* Checkbox para no pedirlo siempre en el celular */}
        <label className="flex items-center justify-center gap-2 text-xs text-slate-400 cursor-pointer pt-2 border-t border-[#2D3540]">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={e => setRememberDevice(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded"
          />
          <span>Recordar este usuario en este celular</span>
        </label>
      </div>
    </div>
  );
};
