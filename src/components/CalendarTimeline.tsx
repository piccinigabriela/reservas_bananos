import React, { useState, useMemo } from 'react';
import { Reserva, CabinCode, CabinType, VolunteerTask, VolunteerId, CabinCleaningStatus, CabinStatusInfo, CalendarColorMode } from '../types';
import { 
  CABANAS, 
  DC, 
  DN, 
  SHORT_DN,
  TIPOS, 
  TIPO_DE_CABANA, 
  CABANAS_POR_TIPO,
  TIPO_COLOR,
  PLATAFORMA_COLORES,
  VOLUNTEER_IDS,
  VOLUNTEER_TASK_META,
  DEFAULT_VOLUNTEER_NAMES,
  DEFAULT_VOLUNTEER_SHORT_NAMES,
  SEMAFORO_CONFIG,
  esSinAsignar,
  tipoDeSinAsignar,
  formatDateEs,
  nightsCount
} from '../services/cabinConfig';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Lock, 
  User, 
  AlertCircle, 
  Home, 
  BarChart3, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Users, 
  CheckCircle2, 
  Plus,
  Sparkles,
  Palette,
  Brush
} from 'lucide-react';
import { calcFinancials, formatMoney } from '../services/cabinConfig';

export type ZoomDensity = 'compact' | 'normal' | 'spacious';

interface CalendarTimelineProps {
  reservas: Reserva[];
  onSelectReserva: (reserva: Reserva) => void;
  onOpenAssignCabin?: (reserva: Reserva) => void;
  onConvertIcalBlock?: (reserva: Reserva) => void;
  onOpenRendimiento?: () => void;
  volunteerTasks?: VolunteerTask[];
  onSelectVolunteerSlot?: (volId: VolunteerId, dateIso: string, task?: VolunteerTask) => void;
  volunteerNames?: Record<VolunteerId, string>;
  isDyslexiaMode: boolean;
  isDarkMode?: boolean;
  isReception?: boolean;
  highlightVolunteerId?: VolunteerId;
  isVoluntarioView?: boolean;
  cabinStatuses?: Record<CabinCode, CabinStatusInfo>;
  onUpdateCabinStatus?: (depto: CabinCode, status: CabinCleaningStatus) => void;
  defaultColorMode?: CalendarColorMode;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  reservas,
  onSelectReserva,
  onOpenAssignCabin,
  onConvertIcalBlock,
  onOpenRendimiento,
  volunteerTasks = [],
  onSelectVolunteerSlot,
  volunteerNames,
  isDyslexiaMode,
  isDarkMode = true,
  isReception = false,
  highlightVolunteerId,
  isVoluntarioView = false,
  cabinStatuses,
  onUpdateCabinStatus,
  defaultColorMode,
}) => {
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const [viewType, setViewType] = useState<'mes' | 'semana'>('mes');
  const [zoomDensity, setZoomDensity] = useState<ZoomDensity>('normal');
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  
  // Modo de color: 'semaforo_limpieza' (amarillo ocupadas, verde limpia, roja desocupada) vs 'plataforma' (airbnb, booking, directo)
  const [colorMode, setColorMode] = useState<CalendarColorMode>(() => {
    if (defaultColorMode) return defaultColorMode;
    if (isVoluntarioView) return 'semaforo_limpieza';
    const saved = localStorage.getItem('bn_cal_color_mode');
    return (saved as CalendarColorMode) || 'semaforo_limpieza';
  });

  const handleToggleColorMode = (newMode: CalendarColorMode) => {
    setColorMode(newMode);
    localStorage.setItem('bn_cal_color_mode', newMode);
  };

  // Semana base (lunes de la semana)
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Navegación de mes
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleTodayMonth = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    const d = new Date(today);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    setWeekStartDate(d);
  };

  // Navegación de semana
  const handlePrevWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() - 7);
    setWeekStartDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 7);
    setWeekStartDate(d);
  };

  // Días a renderizar
  const days = useMemo(() => {
    if (viewType === 'mes') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const dateObj = new Date(selectedYear, selectedMonth, i + 1);
        const iso = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        return {
          dayNum: i + 1,
          dateObj,
          iso,
          dow: dateObj.getDay(),
          isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
          isToday: iso === today.toISOString().split('T')[0],
        };
      });
    } else {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        return {
          dayNum: d.getDate(),
          dateObj: d,
          iso,
          dow: d.getDay(),
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
          isToday: iso === today.toISOString().split('T')[0],
        };
      });
    }
  }, [viewType, selectedMonth, selectedYear, weekStartDate]);

  // Lista de cabañas activas para las filas
  const activeCabins = useMemo(() => {
    const rows: CabinCode[] = [...CABANAS];
    const startIso = days[0]?.iso;
    const endIso = days[days.length - 1]?.iso;

    const unassignedTypes: Record<string, boolean> = {};
    reservas.forEach(r => {
      if (esSinAsignar(r.depto) && r.estado !== 'Cancelada' && r.estado !== 'Non show') {
        if (startIso && endIso && r.checkout >= startIso && r.checkin <= endIso) {
          unassignedTypes[r.depto] = true;
        }
      }
    });

    Object.keys(unassignedTypes).forEach(code => {
      rows.unshift(code as CabinCode);
    });

    return rows;
  }, [days, reservas]);

  // Mapa de ocupación por cabaña y fecha
  const occupancyMap = useMemo(() => {
    const map: Record<string, Record<string, Reserva>> = {};
    const checkoutsMap: Record<string, Record<string, Reserva>> = {};

    activeCabins.forEach(c => {
      map[c] = {};
      checkoutsMap[c] = {};
    });

    reservas.forEach(r => {
      if (r.estado === 'Cancelada' || r.estado === 'Non show' || !map[r.depto]) return;

      const s = new Date(r.checkin);
      const e = new Date(r.checkout);

      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split('T')[0];
        if (map[r.depto]) {
          map[r.depto][iso] = r;
        }
      }
      if (checkoutsMap[r.depto]) {
        checkoutsMap[r.depto][r.checkout] = r;
      }
    });

    return { occupied: map, checkouts: checkoutsMap };
  }, [activeCabins, reservas]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dowNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Reservas pendientes de asignación de cabaña física
  const pendingAssignment = useMemo(() => {
    return reservas.filter(r => esSinAsignar(r.depto) && r.estado !== 'Cancelada' && r.estado !== 'Non show');
  }, [reservas]);

  return (
    <div className="space-y-4">
      {/* Alerta si hay reservas de Booking sin asignar cabaña */}
      {pendingAssignment.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
              ⏳
            </div>
            <div>
              <div className="font-bold text-amber-400 text-sm sm:text-base">
                Hay {pendingAssignment.length} reserva{pendingAssignment.length > 1 ? 's' : ''} pendiente{pendingAssignment.length > 1 ? 's' : ''} de asignar cabaña física
              </div>
              <div className="text-xs text-amber-300/80">
                Booking vendió por tipo de cabaña. Tocá para asignar cuál cabaña concreta le corresponde.
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectReserva(pendingAssignment[0])}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition shrink-0"
          >
            Asignar ahora
          </button>
        </div>
      )}

      {/* Barra de control del calendario Charcoal */}
      <div className={`border rounded-xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors ${
        isDarkMode ? 'bg-[#1A1F26] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
      }`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Selector Mes / Semana */}
          <div className={`flex items-center gap-1.5 p-1 rounded-lg border ${
            isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-[#F1F5F9] border-[#CBD5E1]'
          }`}>
            <button
              onClick={() => setViewType('mes')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
                viewType === 'mes'
                  ? isDarkMode ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#1E293B] text-white shadow-xs'
                  : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Vista Mes
            </button>
            <button
              onClick={() => setViewType('semana')}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
                viewType === 'semana'
                  ? isDarkMode ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#1E293B] text-white shadow-xs'
                  : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Vista Semana (7 días amplios)
            </button>
          </div>

          {/* Control de Zoom / Densidad para Tablet y Desktop */}
          {viewType === 'mes' && (
            <div className={`flex items-center gap-1 p-1 rounded-lg border ${
              isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-[#F1F5F9] border-[#CBD5E1]'
            }`} title="Ajuste de Zoom para Tablet">
              <span className={`text-[11px] font-semibold px-1.5 hidden sm:inline ${
                isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
              }`}>
                Zoom:
              </span>
              <button
                onClick={() => setZoomDensity('compact')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  zoomDensity === 'compact'
                    ? isDarkMode ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#1E293B] text-white shadow-xs'
                    : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Zoom Compacto (entra el mes entero en pantalla de Tablet sin scroll)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span>Mes Completo</span>
              </button>
              <button
                onClick={() => setZoomDensity('normal')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                  zoomDensity === 'normal'
                    ? isDarkMode ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#1E293B] text-white shadow-xs'
                    : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Zoom Normal (balance de lectura)"
              >
                <span>Normal</span>
              </button>
              <button
                onClick={() => setZoomDensity('spacious')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  zoomDensity === 'spacious'
                    ? isDarkMode ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#1E293B] text-white shadow-xs'
                    : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Zoom Amplio (nombres grandes y columnas anchas)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Amplio</span>
              </button>
            </div>
          )}
          {/* Selector de Modo de Color: Semáforo Limpieza vs Plataforma */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border ${
            isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-[#F1F5F9] border-[#CBD5E1]'
          }`} title="Modo de Color del Calendario">
            <button
              onClick={() => handleToggleColorMode('semaforo_limpieza')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                colorMode === 'semaforo_limpieza'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Semáforo de Limpieza: Amarillo (Ocupada), Verde (Limpia), Roja (Desocupada/Pendiente)"
            >
              <Brush className="w-3.5 h-3.5" />
              <span>Semáforo Limpieza</span>
            </button>
            <button
              onClick={() => handleToggleColorMode('plataforma')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                colorMode === 'plataforma'
                  ? isDarkMode ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#1E293B] text-white shadow-xs'
                  : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Colores por canal de venta (Airbnb, Booking, Directo)"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Plataformas</span>
            </button>
          </div>
        </div>

        {/* Controles de fecha con botones táctiles grandes */}
        <div className="flex items-center gap-2">
          <button
            onClick={viewType === 'mes' ? handlePrevMonth : handlePrevWeek}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition active:scale-95 shadow-xs ${
              isDarkMode 
                ? 'bg-[#12151A] border-[#2D3540] text-[#F1F5F9] hover:bg-[#222933]' 
                : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
            title="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className={`px-4 py-1.5 border rounded-lg text-center min-w-[180px] shadow-xs ${
            isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-white border-[#CBD5E1]'
          }`}>
            <span className={`font-bold text-sm sm:text-base block leading-tight ${
              isDarkMode ? 'text-white' : 'text-[#0F172A]'
            }`}>
              {viewType === 'mes' 
                ? `${monthNames[selectedMonth]} ${selectedYear}`
                : `${days[0]?.dayNum} ${monthNames[days[0]?.dateObj.getMonth()]} – ${days[6]?.dayNum} ${monthNames[days[6]?.dateObj.getMonth()]}`
              }
            </span>
          </div>

          <button
            onClick={viewType === 'mes' ? handleNextMonth : handleNextWeek}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition active:scale-95 shadow-xs ${
              isDarkMode 
                ? 'bg-[#12151A] border-[#2D3540] text-[#F1F5F9] hover:bg-[#222933]' 
                : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
            title="Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleTodayMonth}
            className={`px-3.5 py-2 rounded-lg border font-semibold text-xs sm:text-sm transition ${
              isDarkMode
                ? 'bg-[#222933] text-[#F1F5F9] hover:bg-[#2D3540] border-[#2D3540]'
                : 'bg-[#F1F5F9] text-[#1E293B] hover:bg-[#E2E8F0] border-[#CBD5E1]'
            }`}
          >
            Hoy
          </button>
        </div>

        {/* Leyenda rápida adaptable según ColorMode */}
        {colorMode === 'semaforo_limpieza' ? (
          <div className={`hidden lg:flex items-center gap-3 text-xs font-semibold ${
            isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'
          }`}>
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 px-2 py-1 rounded-md text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
              <span>🟡 Ocupada (Huésped)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/40 px-2 py-1 rounded-md text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              <span>🔴 Desocupada (Pendiente Limpieza)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 px-2 py-1 rounded-md text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>🟢 Limpia y Lista</span>
            </div>
          </div>
        ) : (
          <div className={`hidden lg:flex items-center gap-3 text-xs font-medium ${
            isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#FF5A5F]" />
              <span>Airbnb</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#003580]" />
              <span>Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#2E7D32]" />
              <span>Directo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#64748B]" />
              <span>Bloqueo iCal 🔒</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid del Calendario / Matriz de Cabañas Charcoal con encabezado de fechas fijo (Sticky) */}
      <div className={`border rounded-xl shadow-md transition-colors ${
        isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-white border-[#CBD5E1]'
      }`}>
        <div className="overflow-x-auto max-h-[75vh] overflow-y-auto scrollbar-thin relative rounded-xl">
          <table className="w-full border-separate border-spacing-0 select-none">
            <thead className="sticky top-0 z-30 shadow-md">
              <tr className={isDarkMode ? 'bg-[#0E1013] text-[#94A3B8]' : 'bg-[#1E293B] text-[#F1F5F9]'}>
                <th className={`sticky left-0 top-0 z-50 px-2 py-2.5 text-center font-bold text-xs uppercase tracking-wider border-b border-r shadow-[3px_3px_8px_rgba(0,0,0,0.3)] ${
                  zoomDensity === 'compact' ? 'w-12 sm:w-16 min-w-[48px]' : 'w-14 sm:w-20 min-w-[56px]'
                } ${
                  isDarkMode ? 'bg-[#0E1013] border-[#2D3540] text-slate-200' : 'bg-[#1E293B] border-[#334155] text-white'
                }`}>
                  Cab
                </th>
                {days.map(d => {
                  const colWidthClass = viewType === 'semana' 
                    ? 'w-[13.5%] min-w-[100px]' 
                    : zoomDensity === 'compact'
                      ? 'min-w-[28px] sm:min-w-[34px] w-[3.1%]'
                      : zoomDensity === 'spacious'
                        ? 'min-w-[52px] sm:min-w-[64px]'
                        : 'min-w-[36px] sm:min-w-[44px]';

                  return (
                    <th
                      key={d.iso}
                      className={`sticky top-0 z-30 px-0.5 sm:px-1 py-1.5 sm:py-2 text-center text-xs font-semibold border-b border-r shadow-[0_2px_4px_rgba(0,0,0,0.15)] ${colWidthClass} ${
                        isDarkMode ? 'border-[#242A33]' : 'border-[#334155]'
                      } ${
                        d.isToday 
                          ? 'bg-[#2563EB] text-white font-bold ring-1 ring-blue-400/60' 
                          : d.isWeekend 
                            ? isDarkMode ? 'bg-[#161B22]' : 'bg-[#293548]' 
                            : isDarkMode ? 'bg-[#0E1013]' : 'bg-[#1E293B]'
                      }`}
                    >
                      <span className={`block font-normal opacity-75 ${
                        zoomDensity === 'compact' ? 'text-[8px] sm:text-[9px]' : 'text-[10px]'
                      }`}>
                        {dowNames[d.dow]}
                      </span>
                      <span className={`font-bold ${
                        zoomDensity === 'compact' ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                      }`}>
                        {d.dayNum}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-[#242A33]' : 'divide-[#E2E8F0]'}`}>
              {activeCabins.map(cabinCode => {
                const isUnassigned = esSinAsignar(cabinCode);
                const cabinName = DN[cabinCode] || cabinCode;
                const cabinColor = DC[cabinCode] || '#666';

                const cellHeight = zoomDensity === 'compact' ? 'h-10' : zoomDensity === 'spacious' ? 'h-14' : 'h-12';
                const barHeight = zoomDensity === 'compact' ? 'h-7' : zoomDensity === 'spacious' ? 'h-11' : 'h-9';
                const fontSize = zoomDensity === 'compact' ? 'text-[9.5px]' : zoomDensity === 'spacious' ? 'text-[12px]' : 'text-[11px]';

                return (
                  <tr 
                    key={cabinCode} 
                    className={`transition-colors ${
                      isDarkMode ? 'hover:bg-[#161A20]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {/* Columna Cabaña Sticky Compacta con Semáforo */}
                    <td 
                      title={DN[cabinCode] || cabinCode}
                      className={`sticky left-0 z-20 px-1 sm:px-2 py-2 border-r border-b shadow-[2px_0_6px_rgba(0,0,0,0.15)] ${
                        isDarkMode ? 'bg-[#1A1F26] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: cabinColor }}
                          />
                          <span className={`font-bold tracking-wide truncate ${
                            zoomDensity === 'compact' ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                          } ${
                            isDarkMode ? 'text-[#F1F5F9]' : 'text-[#0F172A]'
                          } ${isDyslexiaMode ? 'font-bold' : ''}`}>
                            {SHORT_DN[cabinCode] || cabinCode}
                          </span>
                        </div>

                        {/* Indicador de Semáforo de Limpieza / Ocupación */}
                        {cabinStatuses && cabinStatuses[cabinCode] && !isUnassigned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateCabinStatus) {
                                const curr = cabinStatuses[cabinCode]?.status || 'limpia';
                                const nextStatus: CabinCleaningStatus = 
                                  curr === 'limpia' ? 'pendiente' : curr === 'pendiente' ? 'ocupada' : 'limpia';
                                onUpdateCabinStatus(cabinCode, nextStatus);
                              }
                            }}
                            title={`Estado de la cabaña: ${SEMAFORO_CONFIG[cabinStatuses[cabinCode]?.status || 'limpia']?.label}. Toca para cambiar.`}
                            className="cursor-pointer shrink-0 hover:scale-125 active:scale-95 transition"
                          >
                            <span className="text-[11px] leading-none">
                              {SEMAFORO_CONFIG[cabinStatuses[cabinCode]?.status || 'limpia']?.icon || '🟢'}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Celdas de días en formato de Banda Continua Unificada */}
                    {days.map((d, dayIdx) => {
                      const res = occupancyMap.occupied[cabinCode]?.[d.iso];
                      const checkoutRes = occupancyMap.checkouts[cabinCode]?.[d.iso];

                      const borderCell = isDarkMode ? 'border-[#242A33]' : 'border-[#E2E8F0]';
                      const dayBg = d.isToday 
                        ? isDarkMode ? 'bg-[#1E293B]/40' : 'bg-blue-50'
                        : d.isWeekend 
                          ? isDarkMode ? 'bg-[#14181F]' : 'bg-[#F8FAFC]'
                          : '';

                      // Colores según ColorMode
                      const isSemaforo = colorMode === 'semaforo_limpieza';

                      // Verificar si la reserva continúa al día siguiente para no cortar la banda con divisiones verticales
                      const nextDay = days[dayIdx + 1];
                      const nextRes = nextDay ? occupancyMap.occupied[cabinCode]?.[nextDay.iso] : null;
                      const nextCheckoutRes = nextDay ? occupancyMap.checkouts[cabinCode]?.[nextDay.iso] : null;
                      const isContinuingToNext = Boolean(
                        res && ((nextRes && nextRes.id === res.id) || (nextCheckoutRes && nextCheckoutRes.id === res.id))
                      );

                      // Tarea asignada al voluntario para esta cabaña en este día (si existe)
                      const dayCabinTasks = volunteerTasks.filter(t => t.fecha === d.iso && t.depto === cabinCode);
                      const completedCabinTask = dayCabinTasks.find(t => t.completada);
                      const assignedCabinTask = dayCabinTasks[0];
                      const dayCabinTask = assignedCabinTask;
                      const isDayTaskDone = Boolean(completedCabinTask);
                      // En el día de check-out, la cabaña SIEMPRE arranca en ROJO (desocupada / requiere limpieza)
                      // y pasa a VERDE única y exclusivamente cuando la tarea de limpieza para esa fecha se marca como completada.
                      const isCheckoutClean = isDayTaskDone;

                      // Nombre del voluntario asignado / que completó la tarea
                      const getVolName = (vId?: VolunteerId) => {
                        if (!vId) return '';
                        const raw = volunteerNames?.[vId] || DEFAULT_VOLUNTEER_NAMES[vId] || 'Voluntario';
                        return raw.split('(')[0].trim();
                      };
                      const volCompletedName = completedCabinTask ? getVolName(completedCabinTask.voluntarioId) : '';
                      const volAssignedName = assignedCabinTask ? getVolName(assignedCabinTask.voluntarioId) : '';

                      // CASO 1: TURNOVER / CASILLA COMPARTIMENTADA (CHECK-OUT MAÑANA Y CHECK-IN TARDE EL MISMO DÍA)
                      if (checkoutRes && res && checkoutRes.id !== res.id) {
                        const isIcalOut = !!checkoutRes.icalUid;
                        const isIcalIn = !!res.icalUid;

                        // En el tramo de salida del día del check out:
                        // Si la tarea se marcó como realizada -> VERDE (#10B981)
                        // Si está pendiente de limpieza -> ROJO (#EF4444)
                        let bgOut = isCheckoutClean ? '#10B981' : '#EF4444';
                        if (!isSemaforo && isIcalOut && isCheckoutClean) bgOut = '#10B981';

                        let bgIn = isSemaforo ? '#EAB308' : (PLATAFORMA_COLORES[res.plataforma] || '#4B5563');
                        if (!isSemaforo && isIcalIn) bgIn = '#475569';

                        const guestOut = checkoutRes.huesped ? checkoutRes.huesped.split(' ')[0] : 'Out';
                        const guestIn = res.huesped ? res.huesped.split(' ')[0] : 'In';

                        const highlightClass = isDarkMode 
                          ? 'ring-2 ring-amber-500/70 ring-inset z-10 relative bg-amber-950/10' 
                          : 'ring-2 ring-amber-500 ring-inset z-10 relative bg-amber-50/40';

                        const turnoverOutStatus = isCheckoutClean 
                          ? `Limpia ✓ (Tarea realizada por ${volCompletedName || 'Voluntario'})` 
                          : (volAssignedName ? `Por Limpiar 🔴 (Asignada a ${volAssignedName})` : 'Por Limpiar 🔴');

                        return (
                          <td
                            key={d.iso}
                            className={`p-0 border-b ${isContinuingToNext ? 'border-r-0' : `border-r ${borderCell}`} ${cellHeight} text-center align-middle ${highlightClass}`}
                            title={`Fecha compartida (Recambio/Turnover) - Salida: ${checkoutRes.huesped} (${turnoverOutStatus}) / Entrada: ${res.huesped}`}
                          >
                            <div className={`${barHeight} w-full flex items-stretch`}>
                              {/* Mitad Izquierda: TERMINA BARRA DE SALIDA (OUT MAÑANA) */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectReserva(checkoutRes);
                                }}
                                className={`w-[49%] h-full flex items-center justify-end pr-0.5 sm:pr-1 text-white cursor-pointer hover:brightness-125 transition rounded-r-md border-y border-white/20 shadow-xs ${
                                  isCheckoutClean ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                                style={{ backgroundColor: bgOut }}
                                title={`Check-out: ${checkoutRes.huesped} — ${
                                  isCheckoutClean 
                                    ? `Limpia ✓ (Tarea realizada por ${volCompletedName || 'Voluntario'})` 
                                    : (volAssignedName ? `Desocupada (Pendiente limpieza 🔴 - Asignada a ${volAssignedName})` : 'Desocupada (Pendiente limpieza 🔴)')
                                }`}
                              >
                                <span className="text-[8px] sm:text-[9px] font-black truncate text-right leading-none max-w-full px-0.5" title={checkoutRes.huesped}>
                                  {isIcalOut ? 'OUT' : `${guestOut} ${isCheckoutClean ? '✓' : '🔴'}`}
                                </span>
                              </div>

                              {/* Separador mínimo entre check-out y check-in */}
                              <div className="w-[2%] shrink-0" />

                              {/* Mitad Derecha: INICIA BANDA DE ENTRADA (IN TARDE) */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectReserva(res);
                                }}
                                className={`w-[49%] h-full flex items-center justify-start pl-0.5 sm:pl-1 cursor-pointer hover:brightness-125 transition border-y border-white/20 shadow-xs ${
                                  isContinuingToNext ? 'rounded-l-md rounded-r-none border-r-0' : 'rounded-md'
                                } ${
                                  isSemaforo ? 'text-slate-950 font-black' : 'text-white font-black'
                                }`}
                                style={{ backgroundColor: bgIn }}
                                title={`Check-in / Ocupada: ${res.huesped}`}
                              >
                                <span className="text-[8px] sm:text-[9px] font-black truncate text-left leading-none max-w-full px-0.5" title={res.huesped}>
                                  {isIcalIn ? 'IN' : guestIn}
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASO 2: DÍA DE ENTRADA (CHECK-IN) — ARRANCA LA BANDA CONTINUA
                      if (res && res.checkin === d.iso) {
                        const isIcal = !!res.icalUid;
                        let bgStyle = isSemaforo ? '#EAB308' : (PLATAFORMA_COLORES[res.plataforma] || '#4B5563');
                        if (!isSemaforo && isIcal) bgStyle = '#475569';
                        const guestFirstName = res.huesped || 'Reserva';
                        const nights = nightsCount(res.checkin, res.checkout);
                        const checkinTaskInfo = isDayTaskDone 
                          ? ` · Tarea realizada por ${volCompletedName || 'Voluntario'}` 
                          : (volAssignedName ? ` · Tarea asignada a ${volAssignedName}` : '');

                        return (
                          <td
                            key={d.iso}
                            className={`p-0 border-b ${isContinuingToNext ? 'border-r-0' : `border-r ${borderCell}`} ${cellHeight} text-center align-middle ${dayBg}`}
                          >
                            <div className={`${barHeight} w-full flex items-stretch`}>
                              {/* Espacio previo a la hora de check-in */}
                              <div className="w-[15%] h-full flex items-center justify-center text-[8px] font-semibold opacity-30">
                                ·
                              </div>
                              {/* Inicio de la Banda Continua (Borde redondeado a la izquierda, continuo hacia la derecha) */}
                              <div
                                onClick={() => onSelectReserva(res)}
                                className={`w-[85%] h-full flex items-center gap-1 pl-1.5 sm:pl-2 pr-0.5 cursor-pointer hover:brightness-110 transition rounded-l-lg border-y border-l border-white/25 shadow-xs overflow-hidden ${
                                  isContinuingToNext ? 'rounded-r-none border-r-0' : 'rounded-r-lg border-r'
                                } ${
                                  isSemaforo ? 'text-slate-950 font-black' : 'text-white'
                                }`}
                                style={{ backgroundColor: bgStyle }}
                                title={`Llegada: ${res.huesped} (${nights} noches - ${res.plataforma})${checkinTaskInfo}`}
                              >
                                {isIcal ? (
                                  <Lock className="w-2.5 h-2.5 shrink-0" />
                                ) : (
                                  <span className={`${fontSize} font-black truncate leading-none text-left drop-shadow-xs tracking-tight`}>
                                    {guestFirstName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASO 3: DÍA DE SALIDA (CHECK-OUT) — CONCLUYE LA BANDA CONTINUA EN LA MAÑANA
                      // Si la tarea se marcó como realizada se pone verde (#10B981), de lo contrario rojo (#EF4444)
                      if (checkoutRes && !res) {
                        const isIcalOut = !!checkoutRes.icalUid;
                        let bgOut = isCheckoutClean ? '#10B981' : '#EF4444';
                        if (!isSemaforo && isIcalOut && !isCheckoutClean) bgOut = '#475569';

                        return (
                          <td
                            key={d.iso}
                            className={`p-0 border-b border-r ${borderCell} ${cellHeight} text-center align-middle ${dayBg}`}
                          >
                            <div className={`${barHeight} w-full flex items-stretch`}>
                              {/* Final de la Banda Continua: Rojo si requiere limpieza, Verde al completar tarea */}
                              <div
                                onClick={() => onSelectReserva(checkoutRes)}
                                className="w-[75%] h-full flex items-center justify-end pr-1.5 sm:pr-2 text-white cursor-pointer hover:brightness-110 transition rounded-r-lg border-y border-r border-white/25 shadow-xs overflow-hidden"
                                style={{ backgroundColor: bgOut }}
                                title={`Salida: ${checkoutRes.huesped} — ${
                                  isCheckoutClean 
                                    ? `Cabaña Limpia ✓ (Tarea realizada por ${volCompletedName || 'Voluntario'})` 
                                    : (volAssignedName ? `Desocupada (Pendiente de limpieza 🔴 - Asignada a ${volAssignedName})` : 'Desocupada (Pendiente de limpieza 🔴)')
                                }`}
                              >
                                <span className={`text-[7.5px] sm:text-[8px] font-black tracking-tighter shrink-0 px-1 py-0.5 rounded-xs text-white ${
                                  isCheckoutClean ? 'bg-emerald-800/80' : 'bg-black/30'
                                }`}>
                                  {isCheckoutClean ? 'OUT ✓ LIMPIA' : 'OUT 🔴 LIMPIAR'}
                                </span>
                              </div>
                              {/* Espacio libre después de la hora de check-out */}
                              <div className="w-[25%] h-full flex items-center justify-center text-[8px] font-semibold opacity-30">
                                ·
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASO 4: ESTADÍA EN CURSO (CUERPO DE LA BANDA CONTINUA SIN CORTES NI DIVISIONES)
                      if (res) {
                        const isIcal = !!res.icalUid;
                        const guestFirstName = res.huesped || 'Reserva';
                        let bgStyle = isSemaforo ? '#EAB308' : (PLATAFORMA_COLORES[res.plataforma] || '#4B5563');
                        if (!isSemaforo && isIcal) bgStyle = '#475569';

                        // Posición dentro de la estadía
                        const checkinDate = new Date(res.checkin);
                        const currDate = new Date(d.iso);
                        const diffDays = Math.round((currDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
                        const stayTaskInfo = isDayTaskDone 
                          ? ` · Tarea realizada por ${volCompletedName || 'Voluntario'}` 
                          : (volAssignedName ? ` · Tarea asignada a ${volAssignedName}` : '');

                        return (
                          <td
                            key={d.iso}
                            onClick={() => onSelectReserva(res)}
                            className={`p-0 border-b ${isContinuingToNext ? 'border-r-0' : `border-r ${borderCell}`} ${cellHeight} text-center align-middle cursor-pointer ${dayBg}`}
                          >
                            <div
                              className={`${barHeight} w-full flex items-center justify-center ${fontSize} font-bold border-y border-white/20 transition hover:brightness-110 shadow-xs overflow-hidden ${
                                isContinuingToNext ? 'rounded-none border-r-0' : 'rounded-r-lg border-r'
                              } ${
                                isSemaforo ? 'text-slate-950 font-extrabold' : 'text-white'
                              } ${
                                isIcal ? 'border-b-2 border-dashed border-white/40' : ''
                              }`}
                              style={{ backgroundColor: bgStyle }}
                              title={`${res.huesped} (${formatDateEs(res.checkin)} a ${formatDateEs(res.checkout)} - Ocupada)${stayTaskInfo}`}
                            >
                              {isIcal ? (
                                <div className="flex items-center gap-0.5 opacity-80">
                                  <Lock className="w-2.5 h-2.5 shrink-0" />
                                  <span className="text-[9px] hidden sm:inline">iCal</span>
                                </div>
                              ) : (
                                // Mostrar el nombre de forma limpia y continua a lo largo de la banda
                                <span className="truncate leading-tight px-1 drop-shadow-xs font-semibold select-none">
                                  {viewType === 'semana' 
                                    ? guestFirstName
                                    : (diffDays % 3 === 1 ? guestFirstName : '')
                                  }
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // CASO 5: DÍA LIBRE / DISPONIBLE
                      return (
                        <td
                          key={d.iso}
                          className={`p-0.5 border-b border-r ${borderCell} ${cellHeight} text-center align-middle ${dayBg}`}
                        >
                          {dayCabinTask ? (
                            dayCabinTask.completada ? (
                              <div
                                onClick={() => onSelectVolunteerSlot && onSelectVolunteerSlot(dayCabinTask.voluntarioId, d.iso, dayCabinTask)}
                                className={`${barHeight} w-full rounded-md bg-emerald-600 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer hover:brightness-110 transition overflow-hidden`}
                                title={`Cabaña limpia ✓ — Tarea realizada por ${volCompletedName || getVolName(dayCabinTask.voluntarioId)} (${formatDateEs(d.iso)})`}
                              >
                                <span>🟢</span>
                                <span className="truncate px-0.5">Limpia ✓</span>
                              </div>
                            ) : (
                              <div
                                onClick={() => onSelectVolunteerSlot && onSelectVolunteerSlot(dayCabinTask.voluntarioId, d.iso, dayCabinTask)}
                                className={`${barHeight} w-full rounded-md bg-rose-950/60 border border-rose-500/60 text-rose-300 font-bold text-[9px] sm:text-[10px] flex items-center justify-center gap-0.5 shadow-xs cursor-pointer hover:brightness-110 transition overflow-hidden`}
                                title={`Pendiente de limpieza: ${dayCabinTask.titulo} — Asignada a ${volAssignedName || getVolName(dayCabinTask.voluntarioId)}`}
                              >
                                <span>🔴</span>
                                <span className="truncate px-0.5">Por Limpiar</span>
                              </div>
                            )
                          ) : (
                            <div className={`h-full w-full rounded-xs flex items-center justify-center text-[10px] transition ${
                              isDarkMode ? 'hover:bg-[#1E242D]' : 'hover:bg-slate-100'
                            }`}>
                              {/* Día libre limpio y despejado */}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* SEPARADOR DE SECCIÓN: TAREAS DE VOLUNTARIOS WORLDPACKERS */}
              <tr className={isDarkMode ? 'bg-[#0B0D10]' : 'bg-[#EFE7DD]'}>
                <td 
                  colSpan={days.length + 1}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-y shadow-xs ${
                    isDarkMode ? 'border-[#2D3540] text-emerald-400' : 'border-[#D4C3AE] text-[#8C5823]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>Tareas de Voluntarios (Worldpackers)</span>
                      <span className="text-[10px] font-normal opacity-80 hidden sm:inline">
                        — Tocá cualquier día para asignar actividades (limpieza, parque, mantenimiento, check-in, francos)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold opacity-70">
                      2 voluntarios
                    </span>
                  </div>
                </td>
              </tr>

              {/* FILAS DE VOLUNTARIOS (VOLUNTARIO 1 Y VOLUNTARIO 2) */}
              {VOLUNTEER_IDS.map((volId, idx) => {
                const rawName = volunteerNames?.[volId] || DEFAULT_VOLUNTEER_NAMES[volId];
                // Nombre corto para cuando el espacio es reducido
                const shortLabel = rawName.split('(')[0].trim();
                const isMyRow = highlightVolunteerId === volId;
                const cellHeight = zoomDensity === 'compact' ? 'h-11' : zoomDensity === 'spacious' ? 'h-16' : 'h-13';
                const barHeight = zoomDensity === 'compact' ? 'h-8' : zoomDensity === 'spacious' ? 'h-13' : 'h-10';

                return (
                  <tr 
                    key={volId}
                    className={`transition-colors ${
                      isMyRow 
                        ? isDarkMode ? 'bg-emerald-950/20' : 'bg-emerald-50/50' 
                        : isDarkMode ? 'hover:bg-[#161A20]' : 'hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {/* Columna Sticky del Voluntario */}
                    <td 
                      title={rawName}
                      className={`sticky left-0 z-20 px-1.5 sm:px-2 py-2 border-r border-b shadow-[2px_0_6px_rgba(0,0,0,0.15)] cursor-pointer group ${
                        isMyRow
                          ? isDarkMode ? 'bg-[#1C2622] border-emerald-500/50 text-emerald-300' : 'bg-emerald-100 border-emerald-400 text-emerald-900'
                          : isDarkMode ? 'bg-[#1A1F26] border-[#2D3540]' : 'bg-[#FAF5EE] border-[#E2E8F0]'
                      }`}
                      onClick={() => onSelectVolunteerSlot && onSelectVolunteerSlot(volId, today.toISOString().split('T')[0])}
                    >
                      <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 min-w-0">
                        <span className="text-xs shrink-0">
                          {idx === 0 ? '🧑‍🌾' : '👩‍🌾'}
                        </span>
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1">
                            <span className={`font-bold tracking-tight block truncate ${
                              zoomDensity === 'compact' ? 'text-[10.5px]' : 'text-xs'
                            } ${
                              isMyRow 
                                ? 'text-emerald-400 font-extrabold' 
                                : isDarkMode ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-[#2A2118] group-hover:text-[#D2502A]'
                            } ${isDyslexiaMode ? 'font-bold' : ''}`}>
                              {zoomDensity === 'compact' ? (DEFAULT_VOLUNTEER_SHORT_NAMES[volId] || `Vol ${idx + 1}`) : shortLabel}
                            </span>
                            {isMyRow && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white shrink-0 hidden sm:inline">
                                TÚ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Celdas de días para este voluntario */}
                    {days.map(d => {
                      const task = volunteerTasks.find(t => t.voluntarioId === volId && t.fecha === d.iso);
                      const borderCell = isDarkMode ? 'border-[#242A33]' : 'border-[#E2E8F0]';
                      const dayBg = d.isToday 
                        ? isDarkMode ? 'bg-[#1E293B]/40' : 'bg-emerald-50/50'
                        : d.isWeekend 
                          ? isDarkMode ? 'bg-[#14181F]' : 'bg-[#F8FAFC]'
                          : '';

                      if (task) {
                        const meta = VOLUNTEER_TASK_META[task.tipo] || VOLUNTEER_TASK_META.otro;
                        return (
                          <td
                            key={d.iso}
                            onClick={() => onSelectVolunteerSlot && onSelectVolunteerSlot(volId, d.iso, task)}
                            className={`p-0.5 border-r border-b ${borderCell} ${cellHeight} text-center align-middle cursor-pointer ${dayBg}`}
                            title={`${meta.icon} ${task.titulo} (${meta.label})${task.horario ? ` · ${task.horario}` : ''}${task.depto ? ` · ${DN[task.depto as CabinCode] || task.depto}` : ''}${task.completada ? ` ✓ Realizada por ${shortLabel}` : ` · Asignada a ${shortLabel}`}`}
                          >
                            <div 
                              className={`${barHeight} w-full rounded-lg px-1 py-0.5 flex flex-col justify-center items-center text-center transition hover:brightness-110 shadow-xs border relative overflow-hidden select-none active:scale-95`}
                              style={{
                                backgroundColor: isDarkMode ? meta.bgDark : meta.bgLight,
                                color: isDarkMode ? meta.textDark : meta.textLight,
                                borderColor: isDarkMode ? meta.borderDark : meta.borderLight,
                              }}
                            >
                              <div className="flex items-center justify-center gap-1 max-w-full">
                                <span className="text-xs shrink-0 leading-none">{meta.icon}</span>
                                <span className={`font-black truncate leading-tight tracking-tight ${
                                  zoomDensity === 'compact' ? 'text-[8.5px]' : 'text-[10px]'
                                } ${task.completada ? 'line-through opacity-80' : ''}`}>
                                  {task.titulo}
                                </span>
                                {task.completada && (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0 inline ml-0.5" />
                                )}
                              </div>
                              {task.horario && zoomDensity !== 'compact' && (
                                <span className="text-[8px] opacity-75 font-mono leading-none block truncate max-w-full mt-0.5">
                                  {task.horario}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Celda sin tarea: interactiva con '+' suave
                      return (
                        <td
                          key={d.iso}
                          onClick={() => onSelectVolunteerSlot && onSelectVolunteerSlot(volId, d.iso)}
                          className={`p-0.5 border-r border-b ${borderCell} ${cellHeight} text-center align-middle cursor-pointer ${dayBg} group`}
                          title={`Tocar para asignar tarea a ${shortLabel} el ${formatDateEs(d.iso)}`}
                        >
                          <div className={`h-full w-full rounded-lg flex items-center justify-center text-[10px] transition ${
                            isDarkMode 
                              ? 'group-hover:bg-[#1E293B] group-hover:text-emerald-400 text-transparent' 
                              : 'group-hover:bg-amber-100 group-hover:text-amber-800 text-transparent'
                          }`}>
                            <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen del Negocio de Este Mes Charcoal (Solo en Modo Propietario / No Voluntario ni Recepción) */}
      {!isReception && !isVoluntarioView ? (
        (() => {
          const curM = today.getMonth();
          const curY = today.getFullYear();
          const em = reservas.filter(r => {
            if (r.estado === 'Cancelada' || r.estado === 'Non show' || !!r.icalUid) return false;
            const d = new Date(r.checkin);
            return d.getMonth() === curM && d.getFullYear() === curY;
          });
          const liqTotal = em.reduce((s, r) => s + calcFinancials(r).liq, 0);
          const nochesTotal = em.reduce((s, r) => s + calcFinancials(r).n, 0);
          const todayIso = today.toISOString().split('T')[0];
          const ocupadasHoy = reservas.filter(
            r => r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin <= todayIso && r.checkout > todayIso
          ).length;

          return (
            <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
              isDarkMode 
                ? 'bg-[#1A1F26] border-[#2D3540] text-[#F1F5F9]' 
                : 'bg-[#1E293B] border-[#334155] text-white'
            }`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                    Ganancias Netas de {monthNames[curM]}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                      {formatMoney(liqTotal)}
                    </span>
                    <span className="text-xs text-slate-300">
                      en {em.length} reservas ({nochesTotal} noches)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/60">
                <div className="text-left sm:text-right text-xs text-slate-300">
                  <span className="block font-semibold text-white">
                    {ocupadasHoy} de {CABANAS.length} Cabañas
                  </span>
                  <span className="text-[11px] text-slate-400">ocupadas hoy</span>
                </div>

                {onOpenRendimiento && (
                  <button
                    onClick={onOpenRendimiento}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shrink-0 active:scale-95"
                  >
                    <span>Ver Rendimiento y Balance</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })()
      ) : !isVoluntarioView ? (
        /* En Modo Día a Día: Mensaje limpio de calma cognitiva */
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
          isDarkMode ? 'bg-[#161A20] border-[#2D3540] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>Modo Día a Día:</strong> Vista limpia sin números ni balances para no perder el foco. Para cualquier duda, Xenia te responde abajo.
            </span>
          </div>
        </div>
      ) : null}

      {/* Tarjeta de ayuda rápida con casillas compartimentadas */}
      <div className={`border rounded-xl p-3 sm:p-4 flex items-start gap-3 text-xs sm:text-sm transition-colors ${
        isDarkMode ? 'bg-[#1A1F26] border-[#2D3540] text-[#94A3B8]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
      }`}>
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
          isDarkMode ? 'bg-[#222933] text-[#60A5FA]' : 'bg-blue-100 text-blue-600'
        }`}>
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
            Guía visual de las casillas del calendario
          </div>
          <p className="leading-relaxed">
            • <strong>Casilla Compartimentada (OUT / IN):</strong> Cuando un huésped se va por la mañana y otro entra por la tarde, la casilla se divide a la mitad. Tocá el lado izquierdo para ver a quien sale o el derecho para ver a quien entra.
            <br />
            {isVoluntarioView ? (
              <>• <strong>Tocar cualquier reserva:</strong> Abre la ficha con el nombre del huésped, cantidad de personas y notas operativas.</>
            ) : (
              <>• <strong>Tocar cualquier reserva:</strong> Abre la ficha con el teléfono del huésped, señas, saldo pendiente y desglose de ganancias.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
