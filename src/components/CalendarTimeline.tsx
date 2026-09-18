import React, { useState, useMemo } from 'react';
import { Reserva, CabinCode, CabinType } from '../types';
import { 
  CABANAS, 
  DC, 
  DN, 
  TIPOS, 
  TIPO_DE_CABANA, 
  CABANAS_POR_TIPO,
  TIPO_COLOR,
  PLATAFORMA_COLORES,
  esSinAsignar,
  tipoDeSinAsignar,
  formatDateEs,
  nightsCount
} from '../services/cabinConfig';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Lock, User, AlertCircle, Home, BarChart3, ArrowRight } from 'lucide-react';
import { calcFinancials, formatMoney } from '../services/cabinConfig';

interface CalendarTimelineProps {
  reservas: Reserva[];
  onSelectReserva: (reserva: Reserva) => void;
  onOpenAssignCabin?: (reserva: Reserva) => void;
  onConvertIcalBlock?: (reserva: Reserva) => void;
  onOpenRendimiento?: () => void;
  isDyslexiaMode: boolean;
  isDarkMode?: boolean;
  isReception?: boolean;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  reservas,
  onSelectReserva,
  onOpenAssignCabin,
  onConvertIcalBlock,
  onOpenRendimiento,
  isDyslexiaMode,
  isDarkMode = true,
  isReception = false,
}) => {
  const today = new Date();
  const [viewType, setViewType] = useState<'mes' | 'semana'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

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

        {/* Leyenda rápida */}
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
      </div>

      {/* Grid del Calendario / Matriz de Cabañas Charcoal */}
      <div className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
        isDarkMode ? 'bg-[#12151A] border-[#2D3540]' : 'bg-white border-[#CBD5E1]'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse select-none">
            <thead>
              <tr className={isDarkMode ? 'bg-[#0E1013] text-[#94A3B8]' : 'bg-[#1E293B] text-[#F1F5F9]'}>
                <th className={`sticky left-0 z-20 px-3 py-3 text-left font-bold text-xs sm:text-sm uppercase tracking-wider w-36 sm:w-44 border-r shadow-[2px_0_5px_rgba(0,0,0,0.15)] ${
                  isDarkMode ? 'bg-[#0E1013] border-[#2D3540]' : 'bg-[#1E293B] border-[#334155]'
                }`}>
                  Cabaña
                </th>
                {days.map(d => (
                  <th
                    key={d.iso}
                    className={`px-1 py-2 text-center text-xs font-semibold border-r min-w-[36px] sm:min-w-[44px] ${
                      isDarkMode ? 'border-[#242A33]' : 'border-[#334155]'
                    } ${viewType === 'semana' ? 'w-[13.5%] min-w-[100px]' : ''} ${
                      d.isToday 
                        ? 'bg-[#2563EB] text-white font-bold' 
                        : d.isWeekend 
                          ? isDarkMode ? 'bg-[#161B22]' : 'bg-[#293548]' 
                          : ''
                    }`}
                  >
                    <span className="block text-[10px] opacity-75 font-normal">
                      {dowNames[d.dow]}
                    </span>
                    <span className="text-xs sm:text-sm font-bold">
                      {d.dayNum}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-[#242A33]' : 'divide-[#E2E8F0]'}`}>
              {activeCabins.map(cabinCode => {
                const isUnassigned = esSinAsignar(cabinCode);
                const cabinName = DN[cabinCode] || cabinCode;
                const cabinColor = DC[cabinCode] || '#666';

                return (
                  <tr 
                    key={cabinCode} 
                    className={`transition-colors ${
                      isDarkMode ? 'hover:bg-[#161A20]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {/* Columna Cabaña Sticky */}
                    <td className={`sticky left-0 z-10 px-3 py-2.5 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${
                      isDarkMode ? 'bg-[#1A1F26] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-xs shrink-0"
                          style={{ backgroundColor: cabinColor }}
                        />
                        <span className={`font-semibold text-xs sm:text-sm truncate ${
                          isDarkMode ? 'text-[#F1F5F9]' : 'text-[#0F172A]'
                        } ${isDyslexiaMode ? 'font-bold' : ''}`}>
                          {cabinName}
                        </span>
                      </div>
                    </td>

                    {/* Celdas de días */}
                    {days.map(d => {
                      const res = occupancyMap.occupied[cabinCode]?.[d.iso];
                      const checkoutRes = occupancyMap.checkouts[cabinCode]?.[d.iso];

                      const borderCell = isDarkMode ? 'border-[#242A33]' : 'border-[#E2E8F0]';
                      const dayBg = d.isToday 
                        ? isDarkMode ? 'bg-[#1E293B]/40' : 'bg-blue-50'
                        : d.isWeekend 
                          ? isDarkMode ? 'bg-[#14181F]' : 'bg-[#F8FAFC]'
                          : '';

                      // CASO 1: TURNOVER / CASILLA COMPARTIMENTADA (HAY UN CHECK-OUT Y UN CHECK-IN EL MISMO DÍA)
                      if (checkoutRes && res && checkoutRes.id !== res.id) {
                        const isIcalOut = !!checkoutRes.icalUid;
                        const isIcalIn = !!res.icalUid;

                        let bgOut = PLATAFORMA_COLORES[checkoutRes.plataforma] || '#4B5563';
                        if (isIcalOut) bgOut = '#475569';

                        let bgIn = PLATAFORMA_COLORES[res.plataforma] || '#4B5563';
                        if (isIcalIn) bgIn = '#475569';

                        const guestOut = checkoutRes.huesped.split(' ')[0] || 'Out';
                        const guestIn = res.huesped.split(' ')[0] || 'In';

                        return (
                          <td
                            key={d.iso}
                            className={`p-0.5 border-r ${borderCell} h-12 text-center align-middle ${dayBg}`}
                          >
                            <div className="h-full w-full rounded-xs flex overflow-hidden border border-white/30 shadow-xs">
                              {/* Mitad Izquierda: SALIDA MAÑANA (OUT) */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isIcalOut && onConvertIcalBlock) onConvertIcalBlock(checkoutRes);
                                  else onSelectReserva(checkoutRes);
                                }}
                                className="w-1/2 h-full flex flex-col items-center justify-center text-white px-0.5 cursor-pointer hover:brightness-125 transition border-r border-white/40"
                                style={{ backgroundColor: bgOut }}
                                title={`SALIDA MAÑANA: ${checkoutRes.huesped} (${checkoutRes.plataforma}) - Tocar para ver`}
                              >
                                <span className="text-[7.5px] font-black uppercase tracking-wider opacity-85 leading-none">OUT</span>
                                <span className="text-[9.5px] font-bold truncate max-w-full leading-tight">{guestOut}</span>
                              </div>

                              {/* Mitad Derecha: ENTRADA TARDE (IN) */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isIcalIn && onConvertIcalBlock) onConvertIcalBlock(res);
                                  else onSelectReserva(res);
                                }}
                                className="w-1/2 h-full flex flex-col items-center justify-center text-white px-0.5 cursor-pointer hover:brightness-125 transition"
                                style={{ backgroundColor: bgIn }}
                                title={`ENTRADA TARDE: ${res.huesped} (${res.plataforma}) - Tocar para ver`}
                              >
                                <span className="text-[7.5px] font-black uppercase tracking-wider opacity-85 leading-none">IN</span>
                                <span className="text-[9.5px] font-bold truncate max-w-full leading-tight">{guestIn}</span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASO 2: DÍA DE ENTRADA (CHECK-IN) SIN CHECK-OUT PREVIO (MAÑANA LIBRE, TARDE IN)
                      if (res && res.checkin === d.iso) {
                        const isIcal = !!res.icalUid;
                        let bgStyle = PLATAFORMA_COLORES[res.plataforma] || '#4B5563';
                        if (isIcal) bgStyle = '#475569';
                        const guestFirstName = res.huesped.split(' ')[0] || 'Reserva';

                        return (
                          <td
                            key={d.iso}
                            className={`p-0.5 border-r ${borderCell} h-12 text-center align-middle ${dayBg}`}
                          >
                            <div className="h-full w-full rounded-xs flex overflow-hidden border border-white/20 shadow-2xs">
                              {/* Mañana libre */}
                              <div className={`w-1/3 h-full flex items-center justify-center text-[8px] font-semibold ${
                                isDarkMode ? 'bg-[#12151A]/60 text-[#64748B]' : 'bg-slate-100 text-slate-400'
                              }`}>
                                Libre
                              </div>
                              {/* Tarde IN */}
                              <div
                                onClick={() => {
                                  if (isIcal && onConvertIcalBlock) onConvertIcalBlock(res);
                                  else onSelectReserva(res);
                                }}
                                className="w-2/3 h-full flex flex-col items-center justify-center text-white px-1 cursor-pointer hover:brightness-110 transition border-l border-white/40"
                                style={{ backgroundColor: bgStyle }}
                                title={`Check-in hoy: ${res.huesped} - Tocar para ver`}
                              >
                                <div className="flex items-center gap-1 leading-none">
                                  <span className="text-[7.5px] font-black opacity-85">IN</span>
                                  {isIcal && <Lock className="w-2.5 h-2.5" />}
                                </div>
                                <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                                  {guestFirstName}
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASO 3: DÍA DE SALIDA (CHECK-OUT) SIN NUEVO CHECK-IN (MAÑANA OUT, TARDE LIBRE)
                      if (checkoutRes && !res) {
                        const isIcalOut = !!checkoutRes.icalUid;
                        let bgOut = PLATAFORMA_COLORES[checkoutRes.plataforma] || '#4B5563';
                        if (isIcalOut) bgOut = '#475569';
                        const guestOut = checkoutRes.huesped.split(' ')[0] || 'Salida';

                        return (
                          <td
                            key={d.iso}
                            className={`p-0.5 border-r ${borderCell} h-12 text-center align-middle ${dayBg}`}
                          >
                            <div className="h-full w-full rounded-xs flex overflow-hidden border border-white/20 shadow-2xs">
                              {/* Mañana OUT */}
                              <div
                                onClick={() => {
                                  if (isIcalOut && onConvertIcalBlock) onConvertIcalBlock(checkoutRes);
                                  else onSelectReserva(checkoutRes);
                                }}
                                className="w-2/3 h-full flex flex-col items-center justify-center text-white px-1 cursor-pointer hover:brightness-110 transition border-r border-white/40"
                                style={{ backgroundColor: bgOut }}
                                title={`Check-out mañana: ${checkoutRes.huesped} - Tocar para ver`}
                              >
                                <span className="text-[7.5px] font-black opacity-85 leading-none">OUT</span>
                                <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                                  {guestOut}
                                </span>
                              </div>
                              {/* Tarde libre */}
                              <div className={`w-1/3 h-full flex items-center justify-center text-[8px] font-semibold ${
                                isDarkMode ? 'bg-[#12151A]/60 text-[#64748B]' : 'bg-slate-100 text-slate-400'
                              }`}>
                                Libre
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASO 4: ESTADÍA EN CURSO (DÍA COMPLETO OCUPADO)
                      if (res) {
                        const isIcal = !!res.icalUid;
                        const guestFirstName = res.huesped.split(' ')[0] || 'Reserva';
                        let bgStyle = PLATAFORMA_COLORES[res.plataforma] || '#4B5563';
                        if (isIcal) bgStyle = '#475569';

                        return (
                          <td
                            key={d.iso}
                            onClick={() => {
                              if (isIcal && onConvertIcalBlock) onConvertIcalBlock(res);
                              else onSelectReserva(res);
                            }}
                            className={`p-0.5 border-r ${borderCell} h-12 text-center align-middle cursor-pointer ${dayBg}`}
                          >
                            <div
                              className={`h-full w-full rounded-xs flex items-center justify-center px-1 text-white text-[11px] font-bold shadow-2xs transition hover:brightness-115 ${
                                isIcal ? 'border border-dashed border-white/50' : ''
                              }`}
                              style={{ backgroundColor: bgStyle }}
                              title={`${res.huesped} (${formatDateEs(res.checkin)} a ${formatDateEs(res.checkout)})`}
                            >
                              {isIcal ? (
                                <div className="flex items-center gap-0.5">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span className="text-[10px] hidden sm:inline">iCal</span>
                                </div>
                              ) : (
                                <span className="truncate leading-tight">
                                  {viewType === 'semana' ? `${guestFirstName} (${res.plataforma})` : guestFirstName}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // CASO 5: DÍA LIBRE
                      return (
                        <td
                          key={d.iso}
                          className={`p-0.5 border-r ${borderCell} h-12 text-center align-middle ${dayBg}`}
                        >
                          <div className={`h-full w-full rounded-xs flex items-center justify-center text-[10px] transition ${
                            isDarkMode ? 'hover:bg-[#1E242D] text-[#475569]' : 'hover:bg-slate-100 text-slate-300'
                          }`}>
                            {/* Libre */}
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

      {/* Resumen del Negocio de Este Mes Charcoal (Solo en Modo Propietario) */}
      {!isReception ? (
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
      ) : (
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
      )}

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
            • <strong>Tocar cualquier reserva:</strong> Abre la ficha con el teléfono del huésped, señas, saldo pendiente y desglose de ganancias.
          </p>
        </div>
      </div>
    </div>
  );
};
