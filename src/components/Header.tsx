import React, { useEffect, useRef, useState } from 'react';
import { AppView } from '../types';
import {
  Calendar as CalendarIcon,
  BarChart3,
  Settings,
  PlusCircle,
  RefreshCw,
  LogOut,
  Receipt,
  ListOrdered,
  Sparkles,
  Sun,
  Moon,
  Upload,
  ShieldCheck,
  MessageSquare,
  Compass,
  MoreHorizontal,
  UserRound,
} from 'lucide-react';

interface HeaderProps {
  /** Vista actual: recepción (solo calendario) o propietario (todo). */
  isReception: boolean;
  /** El usuario logueado es propietario (puede volver a su vista sin PIN). */
  esAdmin: boolean;
  onLogout: () => void;
  currentTab: AppView;
  onSelectTab: (tab: AppView) => void;
  onOpenNewReserva: () => void;
  isDyslexiaMode: boolean;
  onToggleDyslexiaMode: () => void;
  onSyncIcal: () => void;
  isSyncing: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenGoogleCalendar: () => void;
  onCambiarUsuario: () => void;
  onVolverAPropietario?: () => void;
  onSwitchToReception?: () => void;
  onSwitchToVolunteer?: (volId: 'vol1' | 'vol2') => void;
  onOpenGuestWelcome?: () => void;
}

const TABS: Array<{ id: AppView; label: string; icon: React.ReactNode }> = [
  { id: 'calendario', label: 'Calendario', icon: <CalendarIcon className="w-3.5 h-3.5" /> },
  { id: 'reservas', label: 'Reservas', icon: <ListOrdered className="w-3.5 h-3.5" /> },
  { id: 'rendimiento', label: 'Rendimiento', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'gastos', label: 'Gastos', icon: <Receipt className="w-3.5 h-3.5" /> },
  { id: 'avisos', label: 'Mensajes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'xenia', label: 'Xenia', icon: <span className="text-sm leading-none">🍍</span> },
  { id: 'config', label: 'Configuración', icon: <Settings className="w-3.5 h-3.5" /> },
];

export const Header: React.FC<HeaderProps> = ({
  isReception,
  esAdmin,
  onLogout,
  currentTab,
  onSelectTab,
  onOpenNewReserva,
  isDyslexiaMode,
  onToggleDyslexiaMode,
  onSyncIcal,
  isSyncing,
  isDarkMode,
  onToggleTheme,
  onOpenGoogleCalendar,
  onCambiarUsuario,
  onVolverAPropietario,
  onSwitchToReception,
  onSwitchToVolunteer,
  onOpenGuestWelcome,
}) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;
    const cerrar = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuAbierto]);

  const item = (label: string, icon: React.ReactNode, onClick: () => void, extra = '') => (
    <button
      type="button"
      onClick={() => {
        setMenuAbierto(false);
        onClick();
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg hover:bg-[#222933] ${extra}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <header className="bg-[#12151A] text-[#F1F5F9] border-b border-[#2D3540] sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg shrink-0">🌿</div>
          <div className="min-w-0">
            <h1 className="font-bold text-base text-white leading-tight truncate">Los Bananos</h1>
            <span
              className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-bold ${
                isReception ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-600'
              }`}
            >
              {isReception ? 'Recepción' : 'Propietario'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isReception && esAdmin && onVolverAPropietario && (
            <button
              onClick={onVolverAPropietario}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-600/70 font-bold"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Volver a Propietario</span>
            </button>
          )}

          <button
            onClick={onOpenNewReserva}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Reserva</span>
          </button>

          {!isReception && (
            <button
              onClick={onSyncIcal}
              disabled={isSyncing}
              title="Sincronizar Airbnb, Booking y Google Calendar"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-[#222933] hover:bg-[#2D3540] text-[#CBD5E1] border border-[#2D3540]"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden lg:inline">{isSyncing ? 'Sincronizando…' : 'Sincronizar'}</span>
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAbierto(v => !v)}
              aria-label="Más opciones"
              aria-expanded={menuAbierto}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#222933] hover:bg-[#2D3540] border border-[#2D3540]"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuAbierto && (
              <div className="absolute right-0 mt-2 w-64 bg-[#1A1F26] border border-[#2D3540] rounded-xl shadow-2xl p-1.5 z-50">
                {isReception && esAdmin && onVolverAPropietario &&
                  item('Volver a Propietario', <ShieldCheck className="w-4 h-4 text-amber-400" />, onVolverAPropietario, 'sm:hidden text-amber-300')}
                {!isReception && item('Sincronizar calendarios', <RefreshCw className="w-4 h-4" />, onSyncIcal, 'sm:hidden')}
                {!isReception && item('Importar de Google Calendar / CSV', <Upload className="w-4 h-4 text-sky-400" />, onOpenGoogleCalendar)}
                {onOpenGuestWelcome && item('Ver guía del huésped', <Compass className="w-4 h-4 text-amber-400" />, onOpenGuestWelcome)}
                {!isReception && onSwitchToReception && item('Ver como Recepción', <CalendarIcon className="w-4 h-4 text-emerald-400" />, onSwitchToReception)}
                {!isReception && onSwitchToVolunteer && item('Ver portal de voluntarios', <span>🧑‍🌾</span>, () => onSwitchToVolunteer('vol1'))}
                {item(isDarkMode ? 'Modo claro' : 'Modo oscuro', isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />, onToggleTheme)}
                {item(isDyslexiaMode ? 'Lectura normal' : 'Lectura fácil', <Sparkles className="w-4 h-4" />, onToggleDyslexiaMode)}
                <div className="my-1 border-t border-[#2D3540]" />
                {item('Cambiar de usuario', <UserRound className="w-4 h-4" />, onCambiarUsuario)}
                {item('Salir', <LogOut className="w-4 h-4 text-rose-400" />, onLogout, 'text-rose-300')}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isReception && (
        <nav className="bg-[#0E1013] border-t border-[#242A33] px-2 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto text-sm scrollbar-none py-1.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => onSelectTab(t.id)}
                aria-current={currentTab === t.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                  currentTab === t.id ? 'bg-emerald-600 text-white' : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
