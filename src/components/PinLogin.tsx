import React, { useState } from 'react';
import { UserKey } from '../types';
import { DEFAULT_PINS, USER_META } from '../services/cabinConfig';
import { KeyRound, Lock, Check, Calendar, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

interface PinLoginProps {
  onLoginSuccess: (user: UserKey) => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [targetRole, setTargetRole] = useState<'recepcion' | 'admin'>('recepcion');

  const getSavedPins = () => {
    try {
      const saved = localStorage.getItem('bn_p');
      if (saved) return { ...DEFAULT_PINS, ...JSON.parse(saved) };
    } catch (_) {}
    return { ...DEFAULT_PINS };
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      setTimeout(() => verifyPin(newPin), 150);
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
    const pins = getSavedPins();
    const foundEntry = Object.entries(pins).find(([, p]) => p === candidatePin);

    if (foundEntry) {
      const userKey = foundEntry[0] as UserKey;
      if (rememberDevice) {
        localStorage.setItem('bn_remembered_user', userKey);
      }
      onLoginSuccess(userKey);
    } else {
      setErrorMsg('PIN incorrecto. Intentá nuevamente.');
      setPin('');
    }
  };

  const directLoginReception = () => {
    if (rememberDevice) {
      localStorage.setItem('bn_remembered_user', 'recepcion');
    }
    onLoginSuccess('recepcion');
  };

  return (
    <div className="min-h-screen bg-[#12151A] text-[#F1F5F9] flex items-center justify-center p-4">
      <div className="bg-[#1A1F26] text-[#F1F5F9] border border-[#2D3540] rounded-3xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md shadow-2xl space-y-6">
        {/* Logo e Identidad */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-lg">
            🌿
          </div>
          <h1 className="font-bold text-2xl text-white">
            Los Bananos Cabañas
          </h1>
          <p className="text-xs text-[#94A3B8] font-medium">
            Puerto Iguazú · Elegí tu modo de acceso
          </p>
        </div>

        {/* Selector de Perfil / Modo */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#12151A] border border-[#2D3540] rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTargetRole('recepcion');
              setPin('');
              setErrorMsg('');
            }}
            className={`p-3 rounded-xl text-left transition flex flex-col justify-between ${
              targetRole === 'recepcion'
                ? 'bg-emerald-600/20 border-2 border-emerald-500 text-white shadow-xs'
                : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Calendar className="w-5 h-5 text-emerald-400" />
              {targetRole === 'recepcion' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <span className="font-bold text-xs sm:text-sm block">Día a Día</span>
            <span className="text-[10px] text-slate-400 leading-tight">Solo Calendario y Cargas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetRole('admin');
              setPin('');
              setErrorMsg('');
            }}
            className={`p-3 rounded-xl text-left transition flex flex-col justify-between ${
              targetRole === 'admin'
                ? 'bg-blue-600/20 border-2 border-blue-500 text-white shadow-xs'
                : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              {targetRole === 'admin' && <Check className="w-4 h-4 text-blue-400" />}
            </div>
            <span className="font-bold text-xs sm:text-sm block">Propietario</span>
            <span className="text-[10px] text-slate-400 leading-tight">Acceso Completo y Ganancias</span>
          </button>
        </div>

        {/* Acceso Rápido para Día a Día (Sin complicaciones) */}
        {targetRole === 'recepcion' ? (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl bg-[#12151A] border border-[#2D3540] text-xs text-slate-300 space-y-1.5">
              <span className="font-bold text-emerald-400 block text-sm">
                🌿 Modo Recomendado para el Día a Día
              </span>
              <p className="text-slate-400 leading-relaxed">
                Diseñado para evitar abrumarse. Abre directamente el calendario y el formulario para anotar o editar reservas. Si querés saber datos del negocio, Xenia te responde en el acto.
              </p>
            </div>

            <button
              onClick={directLoginReception}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
            >
              <span>Entrar a Modo Día a Día</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Modo Propietario con PIN */
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
                Ingresá PIN de Propietario
              </span>

              {/* Indicador de PIN (4 puntos) */}
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      pin.length > idx
                        ? 'bg-blue-500 scale-125 shadow-xs'
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

            {/* Teclado Táctil Charcoal */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[260px] mx-auto">
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

            <div className="text-center pt-1">
              <button
                onClick={() => verifyPin('1234')}
                className="text-xs text-blue-400 hover:underline"
              >
                Autocompletar PIN Propietario (1234)
              </button>
            </div>
          </div>
        )}

        {/* Checkbox para no pedirlo siempre */}
        <label className="flex items-center justify-center gap-2 text-xs text-slate-400 cursor-pointer pt-2 border-t border-[#2D3540]">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={e => setRememberDevice(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded"
          />
          <span>Recordar este modo en este dispositivo</span>
        </label>
      </div>
    </div>
  );
};
