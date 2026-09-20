import React, { useState } from 'react';
import { Gasto, CabinCode } from '../../types';
import { CABANAS, DN, DC, formatMoney, formatDateEs } from '../../services/cabinConfig';
import { Download, Trash2, PlusCircle } from 'lucide-react';

interface GastosViewProps {
  gastos: Gasto[];
  onAddGasto: (gasto: Gasto) => void;
  onDeleteGasto: (id: string) => void;
}

export const GastosView: React.FC<GastosViewProps> = ({ gastos, onAddGasto, onDeleteGasto }) => {
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [depto, setDepto] = useState<string>('General');
  const [categoria, setCategoria] = useState<string>('Limpieza');
  const [monto, setMonto] = useState<number | string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [comprobante, setComprobante] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !descripcion.trim() || !monto) {
      alert('Completá fecha, descripción y monto.');
      return;
    }

    onAddGasto({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      fecha,
      depto,
      categoria,
      descripcion: descripcion.trim(),
      monto: Number(monto) || 0,
      comprobante: comprobante.trim(),
    });

    setDescripcion('');
    setMonto('');
    setComprobante('');
    setFecha(new Date().toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['sep=;'],
      ['Fecha', 'Cabaña', 'Categoría', 'Descripción', 'Monto $', 'Comprobante'],
      ...gastos.map(g => [
        g.fecha,
        g.depto === 'General' ? 'General' : (DN[g.depto as CabinCode] || g.depto),
        g.categoria,
        `"${g.descripcion.replace(/"/g, '""')}"`,
        g.monto,
        `"${(g.comprobante || '').replace(/"/g, '""')}"`,
      ]),
    ];
    const content = '\uFEFF' + csvRows.map(e => e.join(';')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gastos_bananos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  return (
    <div className="space-y-6">
      {/* Formulario para registrar nuevo gasto */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs">
        <h3 className="text-base font-bold text-[#2A2118] mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-[#D2502A]" />
          <span>Registrar Gasto Operativo</span>
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm text-[#2A2118]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Cabaña o Destino
            </label>
            <select
              value={depto}
              onChange={e => setDepto(e.target.value)}
              className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm text-[#2A2118]"
            >
              <option value="General">General (todo el complejo)</option>
              {CABANAS.map(c => (
                <option key={c} value={c}>{DN[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm text-[#2A2118]"
            >
              <option>Limpieza</option>
              <option>Mantenimiento</option>
              <option>Servicios (Luz, Agua, WiFi)</option>
              <option>Seguros</option>
              <option>Impuestos</option>
              <option>Parque y Selva</option>
              <option>Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Monto en Pesos ($) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="Ej: 15000"
              className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm font-bold text-[#2A2118]"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Descripción *
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Repuestos de bomba de agua cabaña 7"
              className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm text-[#2A2118]"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Comprobante / Nro. Factura (opcional)
            </label>
            <input
              type="text"
              value={comprobante}
              onChange={e => setComprobante(e.target.value)}
              placeholder="Ej: Factura B 0001-00045"
              className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm text-[#2A2118]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#D2502A] hover:bg-[#E55B33] text-white font-bold text-sm rounded-lg transition"
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de gastos registrados */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-[#FAF4EB] border-b border-[#E5D7C5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-[#2A2118]">
              Gastos Registrados ({gastos.length})
            </span>
            <span className="text-xs bg-[#EFE5D8] px-2.5 py-1 rounded-md text-[#5B4632] font-semibold">
              Total acumulado: {formatMoney(totalGastos)}
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F2E8DC] border border-[#D9C9B4] rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-[#2A2118] text-[#F3E9D6] uppercase text-[11px]">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cabaña</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Descripción</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Comprobante</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D8]">
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8C765C]">
                    No hay gastos registrados.
                  </td>
                </tr>
              ) : (
                gastos.map(g => (
                  <tr key={g.id} className="hover:bg-[#FAF6F0]">
                    <td className="p-3 whitespace-nowrap">{formatDateEs(g.fecha)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-sm bg-[#EFE5D8] text-[#3B2C1E] font-medium text-xs">
                        {g.depto === 'General' ? 'General' : (DN[g.depto as CabinCode] || g.depto)}
                      </span>
                    </td>
                    <td className="p-3">{g.categoria}</td>
                    <td className="p-3 font-medium text-[#2A2118]">{g.descripcion}</td>
                    <td className="p-3 font-bold text-[#B33928]">{formatMoney(g.monto)}</td>
                    <td className="p-3 text-[#7A6752]">{g.comprobante || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar gasto "${g.descripcion}"?`)) {
                            onDeleteGasto(g.id);
                          }
                        }}
                        className="p-1 text-[#C0392B] hover:bg-[#FADBD8] rounded-md transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
