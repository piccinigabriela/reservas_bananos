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
  Calendar
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
}) => {
  const userInfo = USER_META[currentUser] || { name: 'Usuario', role: 'General' };
  const isReception = currentUser === 'recepcion' || currentUser === 'vol';

  return (
    <header className="bg-[#12151A] text-[#F1F5F9] border-b border-[#2D3540] sticky top-0 z-40 shadow-md">
      {/* Barra superior principal */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Marca e Identidad */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-inner font-bold shrink-0">
            🌿
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-white leading-tight flex items-center gap-1.5">
              Los Bananos
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                isReception 
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                  : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
              }`}>
                {isReception ? 'Modo Día a Día' : 'Propietario'}
              </span>
            </h1>
            <p className="text-[11px] text-[#94A3B8]">
              {userInfo.role}
            </p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* MODO RECEPCIÓN: Solo lo esencial (Calendario, Botón Carga, Modo Lectura, Tema y Switch) */}
          {isReception ? (
            <>
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

              {/* Botón para cambiar al Modo Propietario (si él quiere ver números) */}
              {onRequestSwitchToAdmin && (
                <button
                  onClick={onRequestSwitchToAdmin}
                  title="Cambiar a Modo Propietario para ver finanzas y ajustes"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#1A1F26] hover:bg-[#222933] text-blue-400 hover:text-blue-300 border border-[#2D3540] font-semibold transition"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span className="hidden sm:inline">Ver Finanzas</span>
                </button>
              )}

              {/* Salir */}
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#1A1F26] rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* MODO PROPIETARIO COMPLETO */
            <>
              {/* Botón Volver al Modo Día a Día con 1 clic */}
              {onSwitchToReception && (
                <button
                  onClick={onSwitchToReception}
                  title="Volver a la vista limpia de Día a Día (solo calendario y reservas)"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/70 font-semibold transition active:scale-95"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Modo Día a Día</span>
                </button>
              )}

              {/* Botón Google Calendar CSV */}
              <button
                onClick={onOpenGoogleCalendar}
                title="Cargar archivo CSV exportado desde Google Calendar"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[#222933] hover:bg-[#2D3540] text-[#60A5FA] border border-[#2D3540] transition font-medium active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Calendar</span>
                <span className="sm:hidden">GCal</span>
              </button>

              {/* Selector Modo Oscuro / Claro */}
              <button
                onClick={onToggleTheme}
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-[#222933] hover:bg-[#2D3540] text-[#F1F5F9] border border-[#2D3540] transition"
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-[#222933] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white transition border border-[#2D3540]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden lg:inline">{isSyncing ? 'Sincronizando...' : 'iCal'}</span>
              </button>

              {/* Accesibilidad Dislexia */}
              <button
                onClick={onToggleDyslexiaMode}
                title="Activar tipografía y espaciado de alta legibilidad para dislexia"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg transition border font-medium ${
                  isDyslexiaMode
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-[#222933] text-[#94A3B8] border-[#2D3540] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isDyslexiaMode ? 'Lectura Fácil' : 'Lectura'}</span>
              </button>

              {/* Botón directo: Rendimiento y Ganancias */}
              <button
                onClick={() => {
                  if (currentTab === 'rendimiento') {
                    onSelectTab('calendario');
                  } else {
                    onSelectTab('rendimiento');
                  }
                }}
                title="Ver cuánto dinero generó el complejo este mes y por cabaña"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg font-semibold transition border ${
                  currentTab === 'rendimiento'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[#222933] text-emerald-400 border-[#2D3540] hover:bg-[#2D3540]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>
                  {currentTab === 'rendimiento' ? '← Calendario' : '📊 Rendimiento'}
                </span>
              </button>

              {/* Más herramientas */}
              <button
                onClick={onToggleViewMode}
                title="Ver otras herramientas: Gastos, Historial en tabla, Sincronización iCal"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition border ${
                  viewMode === 'advanced'
                    ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                    : 'bg-[#222933] text-[#94A3B8] border-[#2D3540] hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {viewMode === 'advanced' ? 'Opciones' : 'Más'}
                </span>
              </button>

              {/* Botón Cargar Reserva */}
              <button
                onClick={onOpenNewReserva}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition transform active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cargar Reserva</span>
              </button>

              {/* Salir */}
              <button
                onClick={onLogout}
                title="Bloquear / Cambiar PIN"
                className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#222933] rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barra de navegación secundaria (solo visible si activa 'Panel Completo' en Modo Propietario) */}
      {!isReception && viewMode === 'advanced' && (
        <div className="bg-[#0E1013] border-t border-[#242A33] px-4 sm:px-6 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs sm:text-sm scrollbar-none py-1">
            <span className="text-[#64748B] text-[11px] uppercase font-bold tracking-wider mr-1 hidden sm:inline">
              Módulos:
            </span>

            <button
              onClick={() => onSelectTab('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                currentTab === 'calendario'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => onSelectTab('reservas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                currentTab === 'reservas'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Tabla de Reservas</span>
            </button>

            <button
              onClick={() => onSelectTab('rendimiento')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                currentTab === 'rendimiento'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rendimiento y Balance</span>
            </button>

            <button
              onClick={() => onSelectTab('gastos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                currentTab === 'gastos'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Gastos Operativos</span>
            </button>

            <button
              onClick={() => onSelectTab('avisos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                currentTab === 'avisos'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Avisos de Check-in</span>
            </button>

            <button
              onClick={() => onSelectTab('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition whitespace-nowrap ${
                currentTab === 'config'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A1F26] hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Ajustes e iCal</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
