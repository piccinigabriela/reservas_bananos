import React from 'react';
import { UserKey, AppView } from '../types';
import { USER_META } from '../services/cabinConfig';
import { 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings, 
  PlusCircle, 
  RefreshCw, 
  LogOut, 
  Receipt, 
  ListOrdered, 
  Bell, 
  Sparkles,
  SlidersHorizontal,
  Sun,
  Moon,
  Upload,
  ShieldCheck,
  Calendar,
  Globe,
  Bot,
  MessageSquare,
  Compass
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserKey;
  onLogout: () => void;
  viewMode: 'focus' | 'advanced';
  onToggleViewMode: () => void;
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
  onRequestSwitchToAdmin?: () => void;
  onSwitchToReception?: () => void;
  onOpenLandingPage?: () => void;
  onSwitchToVolunteer?: (volId: 'vol1' | 'vol2') => void;
  onOpenGuestWelcome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  viewMode,
  onToggleViewMode,
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
  onRequestSwitchToAdmin,
  onSwitchToReception,
  onOpenLandingPage,
  onSwitchToVolunteer,
  onOpenGuestWelcome,
}) => {
  const userInfo = USER_META[currentUser] || { name: 'Usuario', role: 'General' };
  const isReception = currentUser === 'recepcion' || currentUser === 'vol';

  return (
    <header className="bg-[#12151A] text-[#F1F5F9] border-b border-[#2D3540] sticky top-0 z-40 shadow-md">
      {/* Barra superior principal */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Marca e Identidad */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRequestSwitchToAdmin}
            className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-inner font-bold shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition"
            title="Los Bananos"
          >
            🌿
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-white leading-tight flex items-center gap-1.5 flex-wrap">
              Los Bananos
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs ${
                isReception 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/80' 
                  : 'bg-amber-950 text-amber-300 border border-amber-500/80 ring-1 ring-amber-500/30'
              }`}>
                {isReception ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>🟢 Modo Día a Día (Recepción)</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs">👑</span>
                    <span>Modo Propietario (Ajustes y Finanzas)</span>
                  </>
                )}
              </span>
            </h1>
            <p className="text-[11px] text-[#94A3B8]">
              {isReception 
                ? 'Vista segura y limpia: solo calendario y cargas de reservas' 
                : 'Acceso total activo: Finanzas, Gastos, Xenia y Configuración'}
            </p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* MODO RECEPCIÓN: Solo lo esencial (Calendario, Botón Carga, Modo Lectura, Tema y Switch) */}
          {isReception ? (
            <>
              {/* Botón para cambiar al Modo Propietario / Oculto (con PIN 1535) */}
              {onRequestSwitchToAdmin && (
                <button
                  onClick={onRequestSwitchToAdmin}
                  title="Abrir Modo Propietario para ver finanzas, gastos, xenia y ajustes (PIN 1535)"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-600/70 font-bold transition shadow-sm cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>👑 Abrir Modo Ajustes / Propietario</span>
                </button>
              )}

              {/* Selector Modo Oscuro / Claro */}
              <button
                onClick={onToggleTheme}
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm rounded-xl bg-[#1A1F26] hover:bg-[#222933] text-[#F1F5F9] border border-[#2D3540] transition"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-400" />
                )}
              </button>

              {/* Accesibilidad Dislexia */}
              <button
                onClick={onToggleDyslexiaMode}
                title="Activar tipografía y espaciado de alta legibilidad para dislexia"
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-xl transition border font-semibold ${
                  isDyslexiaMode
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-[#1A1F26] text-[#94A3B8] border-[#2D3540] hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">{isDyslexiaMode ? 'Lectura Fácil' : 'Lectura'}</span>
              </button>

              {/* Botón Cargar Reserva (Principal y muy visible) */}
              <button
                onClick={onOpenNewReserva}
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition transform active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Cargar Reserva</span>
              </button>

              {/* Botón Ver Guía Huésped & Xenia en nueva pestaña */}
              <a
                href="?bienvenida=true"
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir la Página de Bienvenida y Concierge Xenia para Huéspedes en una pestaña nueva"
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/70 font-semibold transition"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Guía Huéspedes & Xenia ↗</span>
              </a>

              {/* Salir / Cambiar PIN */}
              <button
                onClick={onLogout}
                title="Cerrar sesión y volver a la pantalla de PIN"
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm text-slate-300 hover:text-white bg-[#1A1F26] hover:bg-[#222933] border border-[#2D3540] rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Salir / PIN</span>
              </button>
            </>
          ) : (
            /* MODO PROPIETARIO COMPLETO */
            <>
              {/* Botón Volver al Modo Día a Día con 1 solo toque */}
              {onSwitchToReception && (
                <button
                  onClick={onSwitchToReception}
                  title="Ocultar finanzas y volver a la vista protegida de Día a Día"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-500 font-bold transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🌿 Salir a Modo Día a Día</span>
                </button>
              )}

              {/* Botón Ver Guía Huésped & Xenia en nueva pestaña */}
              <a
                href="?bienvenida=true"
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir la Guía del Huésped y Concierge Xenia en una pestaña nueva"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700 font-bold transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>🌴 Guía del Huésped ↗</span>
              </a>

              {/* Botón Google Calendar CSV */}
              <button
                onClick={onOpenGoogleCalendar}
                title="Cargar archivo CSV exportado desde Google Calendar"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-[#222933] hover:bg-[#2D3540] text-[#60A5FA] border border-[#2D3540] transition font-medium active:scale-95 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Calendar</span>
                <span className="sm:hidden">GCal</span>
              </button>

              {/* Selector Modo Oscuro / Claro */}
              <button
                onClick={onToggleTheme}
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-[#222933] hover:bg-[#2D3540] text-[#F1F5F9] border border-[#2D3540] transition cursor-pointer"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden md:inline text-xs">Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-sky-400" />
                    <span className="hidden md:inline text-xs">Oscuro</span>
                  </>
                )}
              </button>

              {/* Sincronizar iCal manual */}
              <button
                onClick={onSyncIcal}
                disabled={isSyncing}
                title="Sincronizar calendarios de Airbnb y Booking"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-[#222933] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white transition border border-[#2D3540] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden lg:inline">{isSyncing ? 'Sincronizando...' : 'iCal'}</span>
              </button>

              {/* Accesibilidad Dislexia */}
              <button
                onClick={onToggleDyslexiaMode}
                title="Activar tipografía y espaciado de alta legibilidad para dislexia"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg transition border font-medium cursor-pointer ${
                  isDyslexiaMode
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-[#222933] text-[#94A3B8] border-[#2D3540] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isDyslexiaMode ? 'Lectura Fácil' : 'Lectura'}</span>
              </button>

              {/* Botón Cargar Reserva */}
              <button
                onClick={onOpenNewReserva}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition transform active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cargar Reserva</span>
              </button>

              {/* Salir / Cambiar PIN */}
              <button
                onClick={onLogout}
                title="Bloquear / Cambiar PIN de acceso"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm text-slate-300 hover:text-white bg-[#222933] hover:bg-rose-950/40 hover:border-rose-800/50 border border-[#2D3540] rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Salir / PIN</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barra de navegación secundaria con todos los módulos en Modo Propietario */}
      {!isReception && (
        <div className="bg-[#0E1013] border-t border-[#242A33] px-4 sm:px-6 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs sm:text-sm scrollbar-none py-1">
            <span className="text-[#64748B] text-[11px] uppercase font-bold tracking-wider mr-1 hidden sm:inline">
              Módulos:
            </span>

            <button
              onClick={() => onSelectTab('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'calendario'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => onSelectTab('reservas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'reservas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Tabla de Reservas</span>
            </button>

            <button
              onClick={() => onSelectTab('rendimiento')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'rendimiento'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rendimiento y Balance</span>
            </button>

            <button
              onClick={() => onSelectTab('gastos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'gastos'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Gastos Operativos</span>
            </button>

            <button
              onClick={() => onSelectTab('avisos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'avisos'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Mensajería & WhatsApp</span>
            </button>

            <button
              onClick={() => onSelectTab('xenia')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'xenia'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <span className="text-sm">🍍</span>
              <span>Xenia (WhatsApp/IG/Web)</span>
            </button>

            {onSwitchToVolunteer && (
              <button
                onClick={() => onSwitchToVolunteer('vol1')}
                title="Ver la vista y tareas de los voluntarios (Worldpackers)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-300 hover:bg-[#1A1F26] hover:text-white font-bold transition whitespace-nowrap cursor-pointer"
              >
                <span>🧑‍🌾</span>
                <span>Portal Voluntarios</span>
              </button>
            )}

            <button
              onClick={() => onSelectTab('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                currentTab === 'config'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-300 hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Configuración & PINs</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
