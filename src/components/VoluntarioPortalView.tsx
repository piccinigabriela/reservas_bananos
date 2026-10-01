import React, { useState } from 'react';
import { VolunteerId, VolunteerTask, Reserva, CabinCode, CabinCleaningStatus, CabinStatusInfo } from '../types';
import { 
  VOLUNTEER_TASK_META, 
  getVolunteerNames, 
  DN, 
  DC, 
  CABANAS,
  SEMAFORO_CONFIG,
  formatDateEs, 
  formatDateExtended, 
  nightsCount 
} from '../services/cabinConfig';
import { CalendarTimeline } from './CalendarTimeline';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Home, 
  LogOut, 
  Sun, 
  Moon, 
  Sparkles, 
  Eye,
  ListTodo,
  CalendarDays,
  X,
  User,
  Users,
  Info,
  Check,
  Brush,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';

interface VoluntarioPortalViewProps {
  volunteerId: VolunteerId;
  tasks: VolunteerTask[];
  onToggleTaskComplete: (taskId: string, completed: boolean) => void;
  reservas: Reserva[];
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  cabinStatuses: Record<CabinCode, CabinStatusInfo>;
  onUpdateCabinStatus: (depto: CabinCode, status: CabinCleaningStatus, updatedBy?: string) => void;
}

export const VoluntarioPortalView: React.FC<VoluntarioPortalViewProps> = ({
  volunteerId,
  tasks,
  onToggleTaskComplete,
  reservas,
  onLogout,
  isDarkMode,
  onToggleTheme,
  cabinStatuses,
  onUpdateCabinStatus,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<'mis_tareas' | 'calendario_completo' | 'ocupacion_cabanas'>('mis_tareas');
  
  // Modales operativos
  const [selectedReservaForView, setSelectedReservaForView] = useState<Reserva | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<VolunteerTask | null>(null);

  const volNames = getVolunteerNames();
  const rawName = volNames[volunteerId] || (volunteerId === 'vol1' ? 'Voluntario 1' : 'Voluntario 2');
  const firstName = rawName.split(' ')[0] || 'Voluntario';

  // Tareas de este voluntario
  const myTasks = tasks.filter(t => t.voluntarioId === volunteerId);
  const todayTasks = myTasks.filter(t => t.fecha === today);
  const selectedDateTasks = myTasks.filter(t => t.fecha === selectedDate);

  // Próximas tareas a partir de hoy (ordenadas)
  const upcomingTasks = myTasks
    .filter(t => t.fecha >= today)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Conteo de cabañas según semáforo
  const statusCounts = CABANAS.reduce(
    (acc, code) => {
      const st = cabinStatuses[code]?.status || 'limpia';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { limpia: 0, pendiente: 0, ocupada: 0 } as Record<CabinCleaningStatus, number>
  );

  // Helper para marcar tarea hecha y cabaña limpia a la vez
  const handleMarkTaskAndCabinClean = (task: VolunteerTask) => {
    onToggleTaskComplete(task.id, true);
    if (task.depto && CABANAS.includes(task.depto as CabinCode)) {
      onUpdateCabinStatus(task.depto as CabinCode, 'limpia', rawName);
    }
  };

  // Generar días de la semana actual para navegación rápida
  const currentWeekDays = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Lunes
    d.setDate(d.getDate() + diff);

    return Array.from({ length: 14 }, (_, i) => {
      const iter = new Date(d);
      iter.setDate(d.getDate() + i);
      const iso = iter.toISOString().split('T')[0];
      return {
        iso,
        dayNum: iter.getDate(),
        dowName: iter.toLocaleDateString('es-AR', { weekday: 'short' }),
        isToday: iso === today,
        hasTask: myTasks.some(t => t.fecha === iso),
      };
    });
  })();

  // Cabañas con recambio o checkin hoy (solo información operativa sin precios)
  const cabanasTurnoverHoy = reservas.filter(
    r => (r.checkin === today || r.checkout === today) && r.estado !== 'Cancelada' && r.estado !== 'Non show'
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDarkMode ? 'bg-[#0E1116] text-[#F1F5F9]' : 'bg-[#F4F6F8] text-[#0F172A]'
    }`}>
      {/* Barra Superior del Voluntario */}
      <header className={`border-b px-4 py-3 sticky top-0 z-30 shadow-xs transition-colors ${
        isDarkMode ? 'bg-[#161B22] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-sm">
              {volunteerId === 'vol1' ? '🧑‍🌾' : '👩‍🌾'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base leading-tight">
                  {rawName}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Worldpackers
                </span>
              </div>
              <span className="text-xs text-slate-400 block">
                Cabañas Los Bananos · Puerto Iguazú
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition ${
                isDarkMode ? 'bg-[#1E242D] border-[#2D3540] text-amber-400 hover:bg-[#2A3340]' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Cambiar tema día/noche"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs sm:text-sm rounded-xl border border-rose-500/30 transition cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className={`w-full mx-auto p-3 sm:p-6 space-y-5 flex-1 ${
        activeTab === 'calendario_completo' ? 'max-w-full' : 'max-w-5xl'
      }`}>
        {/* Banner de Saludo y Pestañas de Navegación */}
        <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-colors ${
          isDarkMode ? 'bg-linear-to-r from-[#1A222D] to-[#141820] border-[#2D3540]' : 'bg-linear-to-r from-emerald-50 to-teal-50 border-emerald-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                🌿 {formatDateExtended(today)}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold">
                ¡Hola, {firstName}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                {todayTasks.length > 0 
                  ? `Tenés ${todayTasks.length} ${todayTasks.length === 1 ? 'actividad programada' : 'actividades programadas'} para hoy.` 
                  : 'No tenés tareas asignadas para hoy. ¡Disfrutá tu día o consultá en recepción!'}
              </p>
            </div>

            {/* Selector de Vistas / Pestañas del Voluntario */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('mis_tareas')}
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'mis_tareas'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isDarkMode ? 'bg-[#222933] text-slate-300 hover:bg-[#2D3540]' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                <span>Mi Agenda Diaria</span>
              </button>

              <button
                onClick={() => setActiveTab('calendario_completo')}
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'calendario_completo'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isDarkMode ? 'bg-[#222933] text-slate-300 hover:bg-[#2D3540]' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
                title="Ver cuadrícula completa del complejo con tus tareas abajo"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Calendario Completo (con tareas abajo)</span>
              </button>

              <button
                onClick={() => setActiveTab('ocupacion_cabanas')}
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'ocupacion_cabanas'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isDarkMode ? 'bg-[#222933] text-slate-300 hover:bg-[#2D3540]' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Cabañas de Hoy</span>
              </button>
            </div>
          </div>
        </div>

        {/* PESTAÑA 1: MI AGENDA DIARIA (CHECKLIST RÁPIDO Y SEMÁFORO DE CABAÑAS) */}
        {activeTab === 'mis_tareas' && (
          <>
            {/* Widget del Semáforo de Limpieza del Complejo */}
            <div className={`border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-colors ${
              isDarkMode ? 'bg-[#161B22] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Brush className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm sm:text-base">
                    Semáforo de Cabañas (Estado de Limpieza en Vivo)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🟢 {statusCounts.limpia} Limpias
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    🔴 {statusCounts.pendiente} Pendientes
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    🟡 {statusCounts.ocupada} Ocupadas
                  </span>
                </div>
              </div>

              {/* Botonera de Cabañas Físicas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                {CABANAS.map(cabinCode => {
                  const statusInfo = cabinStatuses[cabinCode] || { depto: cabinCode, status: 'limpia' };
                  const cfg = SEMAFORO_CONFIG[statusInfo.status] || SEMAFORO_CONFIG.limpia;

                  return (
                    <div
                      key={cabinCode}
                      className={`border rounded-xl p-2.5 flex flex-col justify-between gap-1.5 transition ${
                        isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">
                          {DN[cabinCode] ? DN[cabinCode].split('(')[0].trim() : cabinCode}
                        </span>
                        <span className="text-base" title={cfg.label}>
                          {cfg.icon}
                        </span>
                      </div>

                      <div className="text-[10px] font-bold truncate">
                        <span className={`px-1.5 py-0.5 rounded-md block text-center ${
                          statusInfo.status === 'limpia'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : statusInfo.status === 'pendiente'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {cfg.shortLabel}
                        </span>
                      </div>

                      {/* Botón rápido para marcar limpia / cambiar */}
                      <button
                        onClick={() => {
                          const nextStatus: CabinCleaningStatus = 
                            statusInfo.status === 'pendiente' ? 'limpia' : statusInfo.status === 'limpia' ? 'pendiente' : 'limpia';
                          onUpdateCabinStatus(cabinCode, nextStatus, rawName);
                        }}
                        className={`w-full py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          statusInfo.status === 'pendiente'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            : isDarkMode ? 'bg-[#1E242D] hover:bg-[#2A3340] text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                        title="Toca para cambiar estado"
                      >
                        {statusInfo.status === 'pendiente' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Marcar Limpia</span>
                          </>
                        ) : (
                          <span>Cambiar</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selector de Días (Próximos 14 días) */}
            <div className={`border rounded-2xl p-4 shadow-xs space-y-3 transition-colors ${
              isDarkMode ? 'bg-[#161B22] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Seleccionar Día para ver actividades:
                </span>
                <button
                  onClick={() => setSelectedDate(today)}
                  className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  Ir a Hoy
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {currentWeekDays.map(d => {
                  const isSelected = selectedDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      onClick={() => setSelectedDate(d.iso)}
                      className={`min-w-[62px] sm:min-w-[70px] p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center transition active:scale-95 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : isDarkMode
                            ? 'bg-[#12151A] border-[#2D3540] text-slate-300 hover:border-slate-500'
                            : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-semibold block ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                        {d.dowName}
                      </span>
                      <span className="text-base sm:text-lg font-bold block leading-tight">
                        {d.dayNum}
                      </span>
                      {d.hasTask && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjetas de Tareas del Día Seleccionado */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>Tareas para el {formatDateExtended(selectedDate)}:</span>
                </h3>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className={`border rounded-2xl p-8 text-center space-y-2 transition-colors ${
                  isDarkMode ? 'bg-[#161B22] border-[#2D3540] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <div className="text-3xl mb-1">🌴</div>
                  <div className="font-bold text-sm text-slate-300">
                    Sin tareas programadas para este día
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Si te asignan alguna tarea de limpieza, parque o mantenimiento, aparecerá reflejada automáticamente aquí y en el calendario abajo.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedDateTasks.map(task => {
                    const meta = VOLUNTEER_TASK_META[task.tipo] || VOLUNTEER_TASK_META.otro;
                    const isCleaning = task.tipo === 'limpieza' || !!task.depto;
                    const linkedCabinCode = task.depto as CabinCode | undefined;
                    const linkedCabinStatus = linkedCabinCode ? cabinStatuses[linkedCabinCode] : undefined;

                    return (
                      <div
                        key={task.id}
                        className={`border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition relative overflow-hidden ${
                          task.completada
                            ? isDarkMode ? 'bg-emerald-950/20 border-emerald-500/40 opacity-90' : 'bg-emerald-50 border-emerald-300'
                            : isDarkMode ? 'bg-[#1A1F26] border-[#2D3540]' : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Cabecera de la tarea */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl p-2 rounded-xl bg-black/20 shrink-0">
                              {meta.icon}
                            </span>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">
                                {meta.label}
                              </span>
                              <h4 className={`text-base sm:text-lg font-bold leading-tight ${task.completada ? 'line-through text-slate-400' : ''}`}>
                                {task.titulo}
                              </h4>
                            </div>
                          </div>

                          <button
                            onClick={() => onToggleTaskComplete(task.id, !task.completada)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                              task.completada
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isDarkMode
                                  ? 'bg-[#222933] text-slate-300 hover:bg-[#2D3540] border border-[#2D3540]'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                            }`}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${task.completada ? 'text-white' : 'opacity-40'}`} />
                            <span>{task.completada ? 'Realizada ✓' : 'Marcar hecha'}</span>
                          </button>
                        </div>

                        {/* Botón especial para LIMPIEZA: Marcar Cabaña Limpia (Verde) con 1 clic */}
                        {isCleaning && linkedCabinCode && (
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm">
                                {SEMAFORO_CONFIG[linkedCabinStatus?.status || 'limpia']?.icon || '🟢'}
                              </span>
                              <div className="min-w-0">
                                <span className="text-[11px] font-bold block truncate">
                                  {DN[linkedCabinCode] || linkedCabinCode}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Estado actual: {SEMAFORO_CONFIG[linkedCabinStatus?.status || 'limpia']?.label}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleMarkTaskAndCabinClean(task)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0 shadow-sm cursor-pointer active:scale-95"
                              title="Marca la tarea como completada y la cabaña como limpia (verde)"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Ya la limpié (Pasa a Verde)</span>
                            </button>
                          </div>
                        )}

                        {/* Detalles: Horario y Cabaña */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          {task.horario && (
                            <div className={`p-2 rounded-xl flex items-center gap-1.5 ${isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'}`}>
                              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-mono">{task.horario}</span>
                            </div>
                          )}

                          {task.depto && (
                            <div className={`p-2 rounded-xl flex items-center gap-1.5 ${isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'}`}>
                              <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="font-semibold">{DN[task.depto as CabinCode] || task.depto}</span>
                            </div>
                          )}
                        </div>

                        {/* Notas adicionales */}
                        {task.notas && (
                          <div className={`p-2.5 rounded-xl text-xs italic ${isDarkMode ? 'bg-[#12151A] text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
                            "{task.notas}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Próximas tareas en la semana */}
            <div className={`border rounded-2xl p-5 shadow-xs space-y-3 transition-colors ${
              isDarkMode ? 'bg-[#161B22] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
            }`}>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Próximas actividades programadas de tu voluntariado</span>
              </h3>

              {upcomingTasks.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">
                  No hay más tareas programadas en los próximos días.
                </div>
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {upcomingTasks.slice(0, 7).map(t => {
                    const meta = VOLUNTEER_TASK_META[t.tipo] || VOLUNTEER_TASK_META.otro;
                    return (
                      <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base">{meta.icon}</span>
                          <div className="min-w-0">
                            <span className="font-bold block truncate">
                              {t.titulo}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {formatDateExtended(t.fecha)} {t.horario ? `· ${t.horario}` : ''} {t.depto ? `· ${DN[t.depto as CabinCode] || t.depto}` : ''}
                            </span>
                          </div>
                        </div>

                        <div>
                          {t.completada ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              ✓ Hecha
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* PESTAÑA 2: CALENDARIO COMPLETO (CUADRÍCULA DE CABAÑAS + FILAS DE TAREAS ABAJO) */}
        {activeTab === 'calendario_completo' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#161B22] border-[#2D3540]' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold block">Vista General de Ocupación con Semáforo de Limpieza</span>
                  <span className="text-slate-300">
                    🟡 <strong>Amarillo:</strong> Cabañas ocupadas · 🔴 <strong>Rojo:</strong> Desocupada pendiente de limpieza · 🟢 <strong>Verde:</strong> Cabaña limpia y lista. <strong>Abajo de todo tenés tu fila con tus tareas asignadas.</strong>
                  </span>
                </div>
              </div>
            </div>

            <CalendarTimeline
              reservas={reservas}
              onSelectReserva={res => setSelectedReservaForView(res)}
              volunteerTasks={tasks}
              volunteerNames={volNames}
              highlightVolunteerId={volunteerId}
              isVoluntarioView={true}
              isReception={true}
              cabinStatuses={cabinStatuses}
              onUpdateCabinStatus={(depto, status) => onUpdateCabinStatus(depto, status, rawName)}
              defaultColorMode="semaforo_limpieza"
              onSelectVolunteerSlot={(volId, dateIso, task) => {
                if (task) {
                  setSelectedTaskForDetail(task);
                } else if (volId === volunteerId) {
                  // Slot vacío del voluntario
                  setSelectedTaskForDetail({
                    id: 'slot-info',
                    voluntarioId: volId,
                    fecha: dateIso,
                    tipo: 'otro',
                    titulo: 'Sin tarea asignada',
                    completada: false,
                    notas: 'No hay ninguna actividad programada para este día.',
                  });
                }
              }}
              isDyslexiaMode={false}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* PESTAÑA 3: CABAÑAS DE HOY (INFORMACIÓN OPERATIVA DE SALIDAS Y LLEGADAS) */}
        {activeTab === 'ocupacion_cabanas' && (
          <div className={`border rounded-2xl p-5 shadow-xs space-y-4 transition-colors ${
            isDarkMode ? 'bg-[#161B22] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base">
                  Movimientos y Cabañas de Hoy ({formatDateEs(today)})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultá qué cabañas tienen salidas (check-out) o llegadas (check-in) hoy para preparar la limpieza.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold">
                  🟢 {statusCounts.limpia} Limpias
                </span>
                <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-bold">
                  🔴 {statusCounts.pendiente} Pendientes
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cabanasTurnoverHoy.length === 0 ? (
                <div className="col-span-2 p-6 text-center text-xs text-slate-400">
                  Hoy no hay check-ins ni check-outs programados.
                </div>
              ) : (
                cabanasTurnoverHoy.map(r => {
                  const isCheckin = r.checkin === today;
                  const isCheckout = r.checkout === today;
                  const cabinStatus = cabinStatuses[r.depto]?.status || 'limpia';

                  return (
                    <div
                      key={r.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                        isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: DC[r.depto] || '#555' }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-sm block">
                              {DN[r.depto] || r.depto}
                            </span>
                            <span className="text-xs text-slate-400 block truncate">
                              {r.huesped} ({r.pax || 2} pax)
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isCheckout && (
                            <span className="px-2 py-0.5 bg-rose-950/60 border border-rose-800/40 text-rose-300 font-bold text-[10px] rounded-md block mb-1">
                              Salida (Check-out)
                            </span>
                          )}
                          {isCheckin && (
                            <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold text-[10px] rounded-md block">
                              Llegada (Check-in)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Estado de limpieza y botón rápido */}
                      <div className={`p-2.5 rounded-lg flex items-center justify-between gap-2 border ${
                        cabinStatus === 'limpia'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : cabinStatus === 'pendiente'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <span>{SEMAFORO_CONFIG[cabinStatus]?.icon}</span>
                          <span>{SEMAFORO_CONFIG[cabinStatus]?.label}</span>
                        </div>

                        {CABANAS.includes(r.depto) && (
                          <button
                            onClick={() => {
                              const nextStatus: CabinCleaningStatus = cabinStatus === 'limpia' ? 'pendiente' : 'limpia';
                              onUpdateCabinStatus(r.depto, nextStatus, rawName);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                              cabinStatus === 'pendiente'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                          >
                            {cabinStatus === 'pendiente' ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Marcar Limpia (Verde)</span>
                              </>
                            ) : (
                              <span>Poner Pendiente (Rojo)</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Operativo de Reserva para Voluntario (Sin Precios ni Datos Financieros) */}
      {selectedReservaForView && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 ${
            isDarkMode ? 'bg-[#161B22] border-[#2D3540] text-[#F1F5F9]' : 'bg-white border-slate-200 text-[#0F172A]'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: DC[selectedReservaForView.depto] || '#10B981' }}
                />
                <h3 className="font-bold text-base">
                  {DN[selectedReservaForView.depto] || selectedReservaForView.depto}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReservaForView(null)}
                className="p-1 rounded-lg hover:bg-slate-700/40 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className={`p-3 rounded-xl flex items-center gap-3 ${
                isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'
              }`}>
                <User className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Huésped</span>
                  <span className="font-bold text-base">{selectedReservaForView.huesped || 'Reserva'}</span>
                  {selectedReservaForView.pax && (
                    <span className="text-xs text-slate-400 block">{selectedReservaForView.pax} personas</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'}`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Llegada</span>
                  <span className="font-semibold text-xs">{formatDateEs(selectedReservaForView.checkin)}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'}`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Salida</span>
                  <span className="font-semibold text-xs">{formatDateEs(selectedReservaForView.checkout)}</span>
                </div>
              </div>

              {selectedReservaForView.notas && (
                <div className={`p-3 rounded-xl text-xs space-y-1 ${isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'}`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Notas / Observaciones:</span>
                  <p className="italic text-slate-300">"{selectedReservaForView.notas}"</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedReservaForView(null)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Tarea al tocar en el Calendario */}
      {selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 ${
            isDarkMode ? 'bg-[#161B22] border-[#2D3540] text-[#F1F5F9]' : 'bg-white border-slate-200 text-[#0F172A]'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {VOLUNTEER_TASK_META[selectedTaskForDetail.tipo]?.icon || '🌿'}
                </span>
                <h3 className="font-bold text-base">
                  {selectedTaskForDetail.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTaskForDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-700/40 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className={`p-3 rounded-xl flex items-center justify-between ${
                isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'
              }`}>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha</span>
                  <span className="font-bold">{formatDateExtended(selectedTaskForDetail.fecha)}</span>
                </div>
                {selectedTaskForDetail.horario && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Horario</span>
                    <span className="font-mono font-bold text-emerald-400">{selectedTaskForDetail.horario}</span>
                  </div>
                )}
              </div>

              {selectedTaskForDetail.depto && (
                <div className={`p-3 rounded-xl flex items-center gap-2 ${
                  isDarkMode ? 'bg-[#12151A]' : 'bg-slate-50'
                }`}>
                  <Home className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cabaña Asignada</span>
                    <span className="font-bold">{DN[selectedTaskForDetail.depto as CabinCode] || selectedTaskForDetail.depto}</span>
                  </div>
                </div>
              )}

              {selectedTaskForDetail.notas && (
                <div className={`p-3 rounded-xl italic ${
                  isDarkMode ? 'bg-[#12151A] text-slate-300' : 'bg-slate-50 text-slate-700'
                }`}>
                  "{selectedTaskForDetail.notas}"
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              {selectedTaskForDetail.id !== 'slot-info' && (
                <button
                  onClick={() => {
                    onToggleTaskComplete(selectedTaskForDetail.id, !selectedTaskForDetail.completada);
                    setSelectedTaskForDetail(prev => prev ? { ...prev, completada: !prev.completada } : null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    selectedTaskForDetail.completada
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedTaskForDetail.completada ? 'Desmarcar (Pendiente)' : 'Marcar como Realizada ✓'}</span>
                </button>
              )}

              <button
                onClick={() => setSelectedTaskForDetail(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
