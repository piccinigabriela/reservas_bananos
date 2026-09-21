import React, { useState, useMemo } from 'react';
import { Reserva, CabinCode } from '../../types';
import { 
  CABANAS, 
  DN, 
  DC, 
  calcFinancials, 
  formatMoney, 
  formatDateEs, 
  getTemporada,
  esSinAsignar,
  tipoDeSinAsignar,
  TIPOS,
  getMonedaPlatCfg
} from '../../services/cabinConfig';
import { 
  Search, 
  Download, 
  Upload, 
  FileText, 
  Edit3, 
  Trash2, 
  Home, 
  Filter, 
  ArrowUpDown 
} from 'lucide-react';

interface ReservasTableViewProps {
  reservas: Reserva[];
  onEditReserva: (r: Reserva) => void;
  onDeleteReserva: (id: string) => void;
  onAssignCabin: (r: Reserva) => void;
  onImportCsv: () => void;
  onClearAllReservas?: () => void;
}

export const ReservasTableView: React.FC<ReservasTableViewProps> = ({
  reservas,
  onEditReserva,
  onDeleteReserva,
  onAssignCabin,
  onImportCsv,
  onClearAllReservas,
}) => {
  const [filterDepto, setFilterDepto] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [filterDesde, setFilterDesde] = useState<string>('');
  const [filterHasta, setFilterHasta] = useState<string>('');

  const [sortField, setSortField] = useState<string>('checkin');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filtrado
  const filtered = useMemo(() => {
    return reservas.filter(r => {
      if (r.icalUid) return false; // Bloqueos de iCal no van en la tabla de clientes
      if (filterDepto && r.depto !== filterDepto) return false;
      if (filterEstado && r.estado !== filterEstado) return false;
      if (searchName && !r.huesped.toLowerCase().includes(searchName.toLowerCase().trim())) return false;
      if (filterDesde && r.checkin < filterDesde) return false;
      if (filterHasta && r.checkin > filterHasta) return false;
      return true;
    });
  }, [reservas, filterDepto, filterEstado, searchName, filterDesde, filterHasta]);

  // Ordenamiento
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof Reserva];
      let valB: any = b[sortField as keyof Reserva];

      if (sortField === 'subtotal') {
        valA = calcFinancials(a).subTotal;
        valB = calcFinancials(b).subTotal;
      } else if (sortField === 'liquido') {
        valA = calcFinancials(a).liq;
        valB = calcFinancials(b).liq;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['sep=;'],
      ['#', 'Cabaña', 'Huésped', 'Nac.', 'Teléfono', 'Check-in', 'Check-out', 'Noches', 'Precio/Noche', 'Subtotal', 'Comisión', 'Líquido', 'Seña', 'Saldo', 'Temporada', 'Estado', 'Plataforma', 'Destino'],
      ...sorted.map((r, i) => {
        const fin = calcFinancials(r);
        return [
          i + 1,
          DN[r.depto] || r.depto,
          `"${r.huesped.replace(/"/g, '""')}"`,
          r.nac || '',
          r.tel || '',
          r.checkin,
          r.checkout,
          fin.n,
          r.precio,
          fin.subTotal,
          fin.com,
          fin.liq,
          r.sena || 0,
          r.saldo || 0,
          getTemporada(r.checkin),
          r.estado,
          r.plataforma,
          r.destino || '',
        ];
      }),
    ];
    const content = '\uFEFF' + csvRows.map(e => e.join(';')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas_bananos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const w = window as any;
    if (!w.jspdf?.jsPDF) {
      alert('La biblioteca PDF se está cargando. Intentá de nuevo.');
      return;
    }
    const doc = new w.jspdf.jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Listado de Reservas — Los Bananos', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, 14, 22);

    const headers = [['#', 'Cabaña', 'Huésped', 'In', 'Out', 'N', 'Subtotal', 'Com.', 'Líquido', 'Estado', 'Plat.']];
    const body = sorted.map((r, i) => {
      const fin = calcFinancials(r);
      return [
        String(i + 1),
        DN[r.depto] || r.depto,
        r.huesped,
        formatDateEs(r.checkin),
        formatDateEs(r.checkout),
        String(fin.n),
        formatMoney(fin.subTotal),
        formatMoney(fin.com),
        formatMoney(fin.liq),
        r.estado,
        r.plataforma,
      ];
    });

    doc.autoTable({
      head: headers,
      body,
      startY: 26,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [42, 33, 24] },
    });

    doc.save(`reservas_bananos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acciones */}
      <div className="bg-[#FCF8F2] border border-[#E5D7C5] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Buscador de Huésped */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#8C765C] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="Buscar por nombre de huésped..."
              className="w-full bg-white border border-[#D4C3AE] rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#2A2118] outline-none"
            />
          </div>

          {/* Filtro Cabaña */}
          <div>
            <select
              value={filterDepto}
              onChange={e => setFilterDepto(e.target.value)}
              className="bg-white border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#2A2118]"
            >
              <option value="">Todas las Cabañas</option>
              {CABANAS.map(c => (
                <option key={c} value={c}>{DN[c]}</option>
              ))}
              <option value="SA_big">⏳ Sin asignar — Big</option>
              <option value="SA_tj">⏳ Sin asignar — Tiny Jacuzzi</option>
              <option value="SA_te">⏳ Sin asignar — Tiny Estándar</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="bg-white border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#2A2118]"
            >
              <option value="">Todos los Estados</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Stand by">Stand by</option>
              <option value="Shown">Shown</option>
              <option value="Non show">Non show</option>
              <option value="Cortesía">Cortesía</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Rango de Fechas y Botones de Import/Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#EFE5D8]">
          <div className="flex items-center gap-2 text-xs text-[#6A5844]">
            <span className="font-semibold">Check-in entre:</span>
            <input
              type="date"
              value={filterDesde}
              onChange={e => setFilterDesde(e.target.value)}
              className="bg-white border border-[#D4C3AE] rounded-md px-2 py-1 text-xs"
            />
            <span>➔</span>
            <input
              type="date"
              value={filterHasta}
              onChange={e => setFilterHasta(e.target.value)}
              className="bg-white border border-[#D4C3AE] rounded-md px-2 py-1 text-xs"
            />
            {(filterDesde || filterHasta) && (
              <button
                onClick={() => {
                  setFilterDesde('');
                  setFilterHasta('');
                }}
                className="text-[#C0392B] font-bold px-1.5 hover:underline"
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F2E8DC] border border-[#D9C9B4] rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F2E8DC] border border-[#D9C9B4] rounded-lg transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={onImportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2A2118] text-white hover:bg-[#3D3023] rounded-lg transition shadow-xs"
              title="Cargar archivo .ics o .csv de Google Calendar o planilla"
            >
              <Upload className="w-3.5 h-3.5 text-[#E5D7C5]" />
              <span>Importar</span>
            </button>

            {onClearAllReservas && reservas.length > 0 && (
              <button
                onClick={onClearAllReservas}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] rounded-lg transition"
                title="Vaciar todas las reservas previas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#2A2118] text-[#F3E9D6] uppercase text-[10px] tracking-wider whitespace-nowrap">
              <tr>
                <th className="p-2.5 text-center">#</th>
                <th className="p-2.5 cursor-pointer hover:underline" onClick={() => handleSort('depto')}>
                  Cabaña <ArrowUpDown className="w-3 h-3 inline opacity-70" />
                </th>
                <th className="p-2.5 cursor-pointer hover:underline" onClick={() => handleSort('huesped')}>
                  Huésped <ArrowUpDown className="w-3 h-3 inline opacity-70" />
                </th>
                <th className="p-2.5 cursor-pointer hover:underline" onClick={() => handleSort('checkin')}>
                  Llegada <ArrowUpDown className="w-3 h-3 inline opacity-70" />
                </th>
                <th className="p-2.5">Salida</th>
                <th className="p-2.5 text-center">N</th>
                <th className="p-2.5 cursor-pointer hover:underline" onClick={() => handleSort('subtotal')}>
                  Subtotal <ArrowUpDown className="w-3 h-3 inline opacity-70" />
                </th>
                <th className="p-2.5 text-[#F9A8A0]">Com.</th>
                <th className="p-2.5 font-bold text-[#6EE7B7] cursor-pointer hover:underline" onClick={() => handleSort('liquido')}>
                  Líquido <ArrowUpDown className="w-3 h-3 inline opacity-70" />
                </th>
                <th className="p-2.5">Seña</th>
                <th className="p-2.5">Saldo</th>
                <th className="p-2.5 text-center">Temp.</th>
                <th className="p-2.5">Estado</th>
                <th className="p-2.5">Canal</th>
                <th className="p-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D8] whitespace-nowrap">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-[#8C765C]">
                    No se encontraron reservas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                sorted.map((r, i) => {
                  const fin = calcFinancials(r);
                  const isUnassigned = esSinAsignar(r.depto);
                  const temp = getTemporada(r.checkin);
                  const saldoCobrado = (r.sena || 0) + (r.saldo || 0);
                  const estaSaldado = saldoCobrado >= fin.liq;

                  return (
                    <tr key={r.id} className="hover:bg-[#FAF6F0] transition">
                      <td className="p-2.5 text-center text-[#8C765C] font-semibold">{i + 1}</td>
                      <td className="p-2.5">
                        <span
                          className="px-2 py-0.5 rounded-sm text-white font-bold text-[11px]"
                          style={{ backgroundColor: DC[r.depto] || '#555' }}
                        >
                          {DN[r.depto] || r.depto}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-[#2A2118]">
                        <div>{r.huesped}</div>
                        <div className="text-[10px] text-[#8C765C] font-normal mt-0.5">
                          {r.pax || 2} pax {r.plus ? `(+ ${formatMoney(r.plus, r.moneda || (getMonedaPlatCfg()[r.plataforma] || 'ARS'))} extra)` : ''}
                        </div>
                      </td>
                      <td className="p-2.5">{formatDateEs(r.checkin)}</td>
                      <td className="p-2.5">{formatDateEs(r.checkout)}</td>
                      <td className="p-2.5 text-center font-bold">{fin.n}</td>
                      <td className="p-2.5">{formatMoney(fin.subTotal)}</td>
                      <td className="p-2.5 text-[#B33928]">{formatMoney(fin.com)}</td>
                      <td className="p-2.5 font-bold text-[#2E7D32]">{formatMoney(fin.liq)}</td>
                      <td className="p-2.5 text-[#6A5844]">{r.sena ? formatMoney(r.sena) : '—'}</td>
                      <td className={`p-2.5 font-semibold ${estaSaldado ? 'text-[#2E7D32]' : 'text-[#B33928]'}`}>
                        {r.saldo ? formatMoney(r.saldo) : '—'} {estaSaldado && '✓'}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded-xs font-bold text-[10px] ${
                          temp === 'Alta' ? 'bg-[#FFEAE6] text-[#C00000]' : 'bg-[#EBF2F8] text-[#1F4E79]'
                        }`}>
                          {temp}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFE5D8] text-[#3B2C1E]">
                          {r.estado}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium">{r.plataforma}</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isUnassigned && (
                            <button
                              onClick={() => onAssignCabin(r)}
                              className="p-1 bg-[#D97706] text-white hover:bg-[#B45309] rounded-md transition"
                              title="Asignar cabaña física"
                            >
                              <Home className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditReserva(r)}
                            className="p-1 bg-white border border-[#D4C3AE] text-[#2A2118] hover:bg-[#F2E8DC] rounded-md transition"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar reserva de ${r.huesped}?`)) {
                                onDeleteReserva(r.id);
                              }
                            }}
                            className="p-1 bg-white border border-[#F4C2BC] text-[#C0392B] hover:bg-[#FADBD8] rounded-md transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
