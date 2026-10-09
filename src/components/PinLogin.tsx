import React, { useEffect, useState } from 'react';
import { Compass, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase, EMAIL_POR_ROL } from '../services/supabase';

/**
 * Ingreso real con Supabase Auth.
 *  - Recepción y voluntarios: elegís tu perfil y escribís tu PIN de 6 dígitos.
 *    El PIN lo valida Supabase (no el navegador) y se puede cambiar sin tocar el código.
 *  - Propietarios: link mágico por mail.
 * Ya no existen PINs maestros ni atajos de teclado.
 */

type PerfilPin = 'recepcion' | 'vol1' | 'vol2';

const PERFILES: Array<{ id: PerfilPin; label: string; icon: string }> = [
  { id: 'recepcion', label: 'Recepción', icon: '🌿' },
  { id: 'vol1', label: 'Voluntario 1', icon: '🧑‍🌾' },
  { id: 'vol2', label: 'Voluntario 2', icon: '👩‍🌾' },
];

const LARGO_PIN = 6;

interface PinLoginProps {
  onOpenGuestGuide?: () => void;
  /** Mensaje para mostrar arriba (ej: "tu usuario no tiene acceso") */
  aviso?: string | null;
  compacto?: boolean;
}

export const PinLogin: React.FC<PinLoginProps> = ({ onOpenGuestGuide, aviso, compacto }) => {
  const [modo, setModo] = useState<'pin' | 'mail'>('pin');
  const [perfil, setPerfil] = useState<PerfilPin | null>(null);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mailEnviado, setMailEnviado] = useState(false);

  const verificar = async (candidato: string) => {
    if (!perfil) return;
    setCargando(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: EMAIL_POR_ROL[perfil], password: candidato });
    setCargando(false);
    if (err) {
      setPin('');
      if (/rate|too many/i.test(err.message)) setError('Demasiados intentos. Esperá unos minutos.');
      else if (/invalid/i.test(err.message)) setError('PIN incorrecto.');
      else setError('No se pudo ingresar. Revisá la conexión.');
    }
    // Si salió bien, App detecta la sesión nueva y cambia de pantalla.
  };

  const tocarDigito = (d: string) => {
    if (cargando || pin.length >= LARGO_PIN) return;
    const nuevo = pin + d;
    setPin(nuevo);
    setError('');
    if (nuevo.length === LARGO_PIN) verificar(nuevo);
  };

  useEffect(() => {
    if (modo !== 'pin' || !perfil) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') tocarDigito(e.key);
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const entrarConClave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !clave) return;
    setCargando(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    setCargando(false);
    if (err) setError(/rate|too many/i.test(err.message) ? 'Demasiados intentos. Esperá unos minutos.' : 'Mail o contraseña incorrectos.');
  };

  const enviarMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Escribí tu mail primero.');
      return;
    }
    setCargando(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    setCargando(false);
    if (err) setError(/rate/i.test(err.message) ? 'Ya te mandamos un link hace poco. Esperá un minuto.' : 'No se pudo enviar el link a ese mail.');
    else setMailEnviado(true);
  };

  const tarjeta = (
    <div className="relative bg-white/95 backdrop-blur-md text-[#2A2118] border border-[#EAE0D2] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl space-y-5">
      <div className="text-center space-y-1.5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white text-3xl font-bold flex items-center justify-center mx-auto shadow-md ring-4 ring-emerald-500/20">
          🌴
        </div>
        <h1 className="font-black text-2xl text-[#2A2118] tracking-tight">Cabañas Los Bananos</h1>
        <p className="text-xs text-[#7A6752] font-medium">Sistema de Gestión y Reservas</p>
      </div>

      {aviso && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold text-center">{aviso}</div>
      )}

      <div className="grid grid-cols-2 gap-1 p-1 bg-[#FAF5EE] border border-[#EAE0D2] rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => { setModo('pin'); setError(''); }}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 ${modo === 'pin' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#5A4838]'}`}
        >
          <KeyRound className="w-3.5 h-3.5" /> Personal (PIN)
        </button>
        <button
          type="button"
          onClick={() => { setModo('mail'); setError(''); }}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 ${modo === 'mail' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#5A4838]'}`}
        >
          <Mail className="w-3.5 h-3.5" /> Propietario
        </button>
      </div>

      {modo === 'pin' && !perfil && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#7A6752] text-center">¿Quién sos?</p>
          {PERFILES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPerfil(p.id); setPin(''); setError(''); }}
              className="w-full py-3 px-4 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] border border-[#D4C3AE] font-bold text-sm flex items-center gap-3 transition active:scale-[0.98]"
            >
              <span className="text-xl">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}

      {modo === 'pin' && perfil && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { setPerfil(null); setPin(''); setError(''); }} className="text-xs font-bold text-[#7A6752] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Cambiar
            </button>
            <span className="text-xs font-bold text-[#2A2118]">{PERFILES.find(p => p.id === perfil)?.label}</span>
          </div>
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-[#7A6752] block">Ingresá tu PIN de {LARGO_PIN} dígitos</span>
            <div className="flex justify-center gap-2.5 py-2" aria-label={`${pin.length} de ${LARGO_PIN} dígitos`}>
              {Array.from({ length: LARGO_PIN }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    pin.length > idx ? 'bg-emerald-600 scale-125 ring-2 ring-emerald-300' : 'bg-[#FAF5EE] border-2 border-[#D4C3AE]'
                  }`}
                />
              ))}
            </div>
            {cargando && <p className="text-xs font-semibold text-[#7A6752]">Verificando…</p>}
            {error && <p className="text-xs font-bold text-rose-600" role="alert">{error}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => tocarDigito(n)}
                className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] font-extrabold text-xl transition active:scale-90"
              >
                {n}
              </button>
            ))}
            <button type="button" onClick={() => { setPin(''); setError(''); }} className="h-12 rounded-2xl bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs">
              Borrar
            </button>
            <button type="button" onClick={() => tocarDigito('0')} className="h-12 rounded-2xl bg-[#FAF5EE] hover:bg-[#EAE0D2] active:bg-emerald-600 active:text-white border border-[#D4C3AE] font-extrabold text-xl transition active:scale-90">
              0
            </button>
            <button type="button" onClick={() => setPin(p => p.slice(0, -1))} className="h-12 rounded-2xl bg-[#FAF5EE] border border-[#D4C3AE] text-[#5A4838] font-bold text-lg" aria-label="Borrar último dígito">
              ⌫
            </button>
          </div>
        </div>
      )}

      {modo === 'mail' && (
        mailEnviado ? (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center text-sm text-emerald-900 space-y-1">
            <p className="font-bold">Revisá tu mail 📬</p>
            <p className="text-xs">Te mandamos un link para entrar. Abrilo desde este mismo dispositivo.</p>
          </div>
        ) : (
          <form onSubmit={entrarConClave} className="space-y-3">
            <label className="block text-xs font-bold text-[#7A6752]">Mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nombre@mail.com"
              className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-emerald-600 rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <label className="block text-xs font-bold text-[#7A6752]">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-emerald-600 rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            {error && <p className="text-xs font-bold text-rose-600" role="alert">{error}</p>}
            <button type="submit" disabled={cargando || !clave} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm">
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>
            <button type="button" onClick={enviarMail} disabled={cargando} className="w-full text-xs font-bold text-emerald-800 underline">
              No tengo contraseña: mandarme un link al mail
            </button>
          </form>
        )
      )}

      {onOpenGuestGuide && (
        <div className="pt-2 border-t border-[#EAE0D2] text-center">
          <button type="button" onClick={onOpenGuestGuide} className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 font-bold">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>¿Sos huésped? Abrir Guía de Bienvenida 🍍</span>
          </button>
        </div>
      )}
    </div>
  );

  if (compacto) return tarjeta;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F3EBE0] to-[#EAE0D2] text-[#2A2118] flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
      </div>
      {tarjeta}
    </div>
  );
};
