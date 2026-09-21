import React, { useState } from 'react';
import { Reserva, Gasto } from '../../types';
import { 
  CABANAS, 
  DN, 
  DC, 
  calcFinancials, 
  formatMoney, 
  aARS,
  getTipoCambioVal,
  nightsCount,
  getFechaCorteCfg
} from '../../services/cabinConfig';
import { Download, FileText, TrendingUp, ArrowLeft, Clock, AlertTriangle } from 'lucide-react';

interface RendimientoViewProps {
  reservas: Reserva[];
  gastos: Gasto[];
  onBackToCalendar?: () => void;
}

export const RendimientoView: React.FC<RendimientoViewProps> = ({ reservas, gastos, onBackToCalendar }) => {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const fechaCorte = getFechaCorteCfg();

  const hasMonth = selectedMonth !== '';
  const monthNum = hasMonth ? parseInt(selectedMonth) : -1;

  const EXCL = ['Cancelada', 'Cortesía', 'Non show', 'Stand by', 'Devolución'];
  const filteredReservas = reservas.filter(r => {
    if (EXCL.includes(r.estado) || !!r.icalUid) return false;
    if (!r.checkin) return false;
    // Si hay fecha de corte configurada, excluir reservas con checkin anterior a esa fecha
    if (fechaCorte && r.checkin < fechaCorte) return false;

    const [y, m] = r.checkin.split('-').map(Number);
    if (hasMonth && (m - 1 !== monthNum || y !== selectedYear)) return false;
    if (!hasMonth && y !== selectedYear) return false;
    return true;
  });

  const filteredGastos = gastos.filter(g => {
    if (!g.fecha) return false;
    if (fechaCorte && g.fecha < fechaCorte) return false;

    const [y, m] = g.fecha.split('-').map(Number);
    if (hasMonth && (m - 1 !== monthNum || y !== selectedYear)) return false;
    if (!hasMonth && y !== selectedYear) return false;
    return true;
  });

  const totalBruto = filteredReservas.reduce((s, r) => s + calcFinancials(r).subTotal, 0);
  const totalComisiones = filteredReservas.reduce((s, r) => s + calcFinancials(r).com, 0);
  const totalLiquido = filteredReservas.reduce((s, r) => s + calcFinancials(r).liq, 0);
  const totalNoches = filteredReservas.reduce((s, r) => s + calcFinancials(r).n, 0);
  const totalGastos = filteredGastos.reduce((s, g) => s + (g.monto || 0), 0);
  const totalCobrado = filteredReservas.reduce((s, r) => s + ((r.sena || 0) + (r.saldo || 0)), 0);
  const saldoPendiente = Math.max(0, totalLiquido - totalCobrado);
  const resultadoNeto = totalLiquido - totalGastos;
  const ticketPromedio = filteredReservas.length ? totalBruto / filteredReservas.length : 0;
  const sinPrecioCount = filteredReservas.filter(r => !r.precio || r.precio === 0).length;

  // Por cabaña
  const statsPorCabana = CABANAS.map(code => {
    const cabReservas = filteredReservas.filter(r => r.depto === code);
    let s = 0, com = 0, l = 0, n = 0;
    cabReservas.forEach(r => {
      const c = calcFinancials(r);
      s += c.subTotal;
      com += c.com;
      l += c.liq;
      n += c.n;
    });
    return {
      code,
      name: DN[code],
      color: DC[code],
      count: cabReservas.length,
      noches: n,
      subtotal: s,
      comision: com,
      liquido: l,
      ticket: cabReservas.length ? s / cabReservas.length : 0,
    };
  });

  // Por canal
  const canales = ['Directo', 'Airbnb', 'Booking', 'Google', 'Instagram', 'Facebook'];
  const statsPorCanal = canales.map(canal => {
    const canReservas = filteredReservas.filter(r => r.plataforma === canal);
    let l = 0, n = 0;
    canReservas.forEach(r => {
      const c = calcFinancials(r);
      l += c.liq;
      n += c.n;
    });
    const pct = totalLiquido > 0 ? Math.round((l / totalLiquido) * 100) : 0;
    return {
      canal,
      count: canReservas.length,
      noches: n,
      liquido: l,
      pct,
    };
  }).filter(c => c.count > 0);

  // Exportar CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['sep=;'],
      ['Cabaña', 'Reservas', 'Noches', 'Subtotal', 'Comisión', 'Líquido', 'Ticket Promedio'],
      ...statsPorCabana.map(c => [
        c.name,
        c.count,
        c.noches,
        c.subtotal,
        c.comision,
        c.liquido,
        Math.round(c.ticket),
      ]),
      ['TOTAL', filteredReservas.length, totalNoches, totalBruto, totalComisiones, totalLiquido, Math.round(ticketPromedio)],
    ];
    const content = '\uFEFF' + csvRows.map(e => e.join(';')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rendimiento_${selectedYear}_${hasMonth ? monthNum + 1 : 'anual'}.csv`;
    link.click();
  };

  // Exportar PDF
  const handleExportPDF = () => {
    const w = window as any;
    if (!w.jspdf?.jsPDF) {
      alert('La biblioteca PDF se está cargando. Intentá de nuevo en un segundo.');
      return;
    }
    const doc = new w.jspdf.jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Los Bananos · Cabañas Iguazú', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Rendimiento ${hasMonth ? `Mes ${monthNum + 1}/` : 'Año '}${selectedYear}`, 14, 24);

    const headers = [['Cabaña', 'Reservas', 'Noches', 'Subtotal', 'Com.', 'Líquido', 'Ticket']];
    const body = statsPorCabana.map(c => [
      c.name,
      c.count,
      c.noches,
      formatMoney(c.subtotal),
      formatMoney(c.comision),
      formatMoney(c.liquido),
      formatMoney(c.ticket),
    ]);
    body.push([
      'TOTAL',
      String(filteredReservas.length),
      String(totalNoches),
      formatMoney(totalBruto),
      formatMoney(totalComisiones),
      formatMoney(totalLiquido),
      formatMoney(ticketPromedio),
    ]);

    doc.autoTable({
      head: headers,
      body,
      startY: 32,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [42, 33, 24] },
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Financiero', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Ingresos Brutos: ${formatMoney(totalBruto)}`, 14, finalY + 6);
    doc.text(`Comisiones de Plataformas: -${formatMoney(totalComisiones)}`, 14, finalY + 12);
    doc.text(`Gastos Operativos: -${formatMoney(totalGastos)}`, 14, finalY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Resultado Neto Final: ${formatMoney(resultadoNeto)}`, 14, finalY + 26);

    doc.save(`rendimiento_bananos_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Botón de regreso rápido al calendario para que nunca se desoriente */}
      {onBackToCalendar && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToCalendar}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F2E8DC] text-[#2A2118] font-bold text-xs sm:text-sm rounded-xl border border-[#D4C3AE] shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#D2502A]" />
            <span>← Volver al Calendario Diario</span>
          </button>
        </div>
      )}

      {/* Filtros de período y exportación */}
      <div className="bg-[#FCF8F2] border border-[#E5D7C5] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#8C765C] mb-1">
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-sm font-semibold text-[#2A2118]"
            >
              <option value="">Todo el año</option>
              <option value="0">Enero</option>
              <option value="1">Febrero</option>
              <option value="2">Marzo</option>
              <option value="3">Abril</option>
              <option value="4">Mayo</option>
              <option value="5">Junio</option>
              <option value="6">Julio</option>
              <option value="7">Agosto</option>
              <option value="8">Septiembre</option>
              <option value="9">Octubre</option>
              <option value="10">Noviembre</option>
              <option value="11">Diciembre</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#8C765C] mb-1">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-white border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-sm font-semibold text-[#2A2118]"
            >
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>

          <div className="bg-[#FAF4EB] border border-[#E5D7C5] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#7A6752]">Cambio:</span>
            <span className="text-xs font-bold text-[#D2502A]">1 USD = ${getTipoCambioVal().toLocaleString('es-AR')} ARS</span>
          </div>

          {fechaCorte && (
            <div className="bg-[#EFE2D2] border border-[#D4C3AE] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-[#4A3C2F]" title="Las reservas anteriores a esta fecha se omiten de este balance contable">
              <Clock className="w-3.5 h-3.5 text-[#D2502A]" />
              <span>Corte contable: <strong>{fechaCorte.split('-').reverse().join('/')}</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-[#F2E8DC] border border-[#D9C9B4] rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#2A2118] hover:bg-[#3D3023] text-white rounded-lg transition"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* Alerta si hay reservas sin precio configurado */}
      {sinPrecioCount > 0 && filteredReservas.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#F59E0B]/50 rounded-xl p-4 flex items-start gap-3 text-[#92400E] shadow-xs">
          <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-bold text-[#92400E] block">
              {sinPrecioCount === filteredReservas.length
                ? `Hay ${filteredReservas.length} reservas registradas (${totalNoches} noches) pero figuran con tarifa $0`
                : `Hay ${sinPrecioCount} de ${filteredReservas.length} reservas registradas con tarifa $0`}
            </span>
            <span className="text-[#B45309] block mt-1 leading-relaxed">
              Las reservas están en el calendario y ocupan noches reales, pero como fueron importadas desde Google Calendar sin un valor monetario, los ingresos dan $0. Al ingresar a cada reserva (en el Calendario o Tabla) y ponerle su precio real, el sistema calculará los ingresos automáticamente.
            </span>
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen Numérico Grande */}
      <div className="bg-[#2A2118] text-[#F3E9D6] rounded-2xl p-5 sm:p-6 shadow-md grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] text-[#A69177] uppercase block font-semibold">
            Ingresos Brutos
          </span>
          <span className="font-bold text-lg sm:text-2xl text-[#FBF6EE]">
            {formatMoney(totalBruto)}
          </span>
          <span className="text-[11px] text-[#A69177] block mt-0.5 font-mono">
            ≈ USD {Math.round(totalBruto / getTipoCambioVal()).toLocaleString('es-AR')}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#F9A8A0] uppercase block font-semibold">
            Comisiones
          </span>
          <span className="font-bold text-lg sm:text-2xl text-[#F9A8A0]">
            - {formatMoney(totalComisiones)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#F9A8A0] uppercase block font-semibold">
            Gastos Operativos
          </span>
          <span className="font-bold text-lg sm:text-2xl text-[#F9A8A0]">
            - {formatMoney(totalGastos)}
          </span>
        </div>

        <div className="bg-[#1A140D] p-3 rounded-xl border border-[#443628]">
          <span className="text-[11px] text-[#6EE7B7] uppercase block font-bold">
            Resultado Neto
          </span>
          <span className="font-bold text-xl sm:text-3xl text-[#6EE7B7]">
            {formatMoney(resultadoNeto)}
          </span>
          <span className="text-[11px] text-[#A7F3D0] block mt-0.5 font-mono">
            ≈ USD {Math.round(resultadoNeto / getTipoCambioVal()).toLocaleString('es-AR')}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#A69177] uppercase block">
            Noches Ocupadas
          </span>
          <span className="font-bold text-base sm:text-lg text-white">
            {totalNoches} noches
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#A69177] uppercase block">
            Líquido Esperado
          </span>
          <span className="font-bold text-base sm:text-lg text-white">
            {formatMoney(totalLiquido)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#A69177] uppercase block">
            Cobrado a la Fecha
          </span>
          <span className="font-bold text-base sm:text-lg text-[#6EE7B7]">
            {formatMoney(totalCobrado)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-[#FFA39E] uppercase block font-semibold">
            Saldo Pendiente
          </span>
          <span className="font-bold text-base sm:text-lg text-[#FFA39E]">
            {saldoPendiente > 0 ? formatMoney(saldoPendiente) : '✓ 100% Cobrado'}
          </span>
        </div>
      </div>

      {/* Rendimiento por Cabaña */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-[#FAF4EB] border-b border-[#E5D7C5] font-bold text-sm text-[#2A2118]">
          Desglose por Cabaña
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-[#2A2118] text-[#F3E9D6] uppercase text-[11px]">
              <tr>
                <th className="p-3">Cabaña</th>
                <th className="p-3 text-center">Reservas</th>
                <th className="p-3 text-center">Noches</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">Comisión</th>
                <th className="p-3 font-bold text-[#6EE7B7]">Líquido</th>
                <th className="p-3">Ticket Prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D8]">
              {statsPorCabana.map(c => (
                <tr key={c.code} className="hover:bg-[#FAF6F0]">
                  <td className="p-3 font-semibold text-[#2A2118] flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                  </td>
                  <td className="p-3 text-center font-medium">{c.count}</td>
                  <td className="p-3 text-center font-semibold">{c.noches}</td>
                  <td className="p-3">
                    {c.subtotal > 0 ? (
                      formatMoney(c.subtotal)
                    ) : c.count > 0 ? (
                      <span className="text-[#A16207] font-medium flex items-center gap-1">
                        $ 0 <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] px-1 py-0.2 rounded font-semibold">Sin tarifa</span>
                      </span>
                    ) : (
                      formatMoney(0)
                    )}
                  </td>
                  <td className="p-3 text-[#B33928]">{formatMoney(c.comision)}</td>
                  <td className="p-3 font-bold text-[#2E7D32]">{formatMoney(c.liquido)}</td>
                  <td className="p-3">{formatMoney(c.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rendimiento por Canal */}
      {statsPorCanal.length > 0 && (
        <div className="bg-white border border-[#E5D7C5] rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-[#FAF4EB] border-b border-[#E5D7C5] font-bold text-sm text-[#2A2118]">
            Ingresos por Canal de Venta
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-[#2A2118] text-[#F3E9D6] uppercase text-[11px]">
                <tr>
                  <th className="p-3">Canal</th>
                  <th className="p-3 text-center">Reservas</th>
                  <th className="p-3 text-center">Noches</th>
                  <th className="p-3">Líquido Generado</th>
                  <th className="p-3 text-center">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE5D8]">
                {statsPorCanal.map(c => (
                  <tr key={c.canal} className="hover:bg-[#FAF6F0]">
                    <td className="p-3 font-semibold text-[#2A2118]">{c.canal}</td>
                    <td className="p-3 text-center font-medium">{c.count}</td>
                    <td className="p-3 text-center font-semibold">{c.noches}</td>
                    <td className="p-3 font-bold text-[#2E7D32]">{formatMoney(c.liquido)}</td>
                    <td className="p-3 text-center font-bold">{c.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
