import React, { useState } from 'react';
import { Reserva, CabinCode, Plataforma, EstadoReserva } from '../types';
import { CABANAS, DN, DC } from '../services/cabinConfig';
import { parseImportFile, ParsedImportItem } from '../services/calendarImportParser';
import {
  Upload,
  Calendar,
  Check,
  AlertCircle,
  X,
  Download,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  FileCode,
} from 'lucide-react';

interface GoogleCalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newReservas: Reserva[], mode: 'replace' | 'append') => void;
  existingReservasCount: number;
  onDownloadBackup: () => void;
}

export const GoogleCalendarImportModal: React.FC<GoogleCalendarImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingReservasCount,
  onDownloadBackup,
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setErrorMsg('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          setErrorMsg('El archivo seleccionado está vacío.');
          return;
        }

        const items = parseImportFile(text, file.name);
        if (items.length === 0) {
          setErrorMsg(
            'No se encontraron reservas o eventos válidos en el archivo. Asegurate de que sea un archivo .ics (Google Calendar / iCal) o un archivo .csv con fechas y cabañas.'
          );
          return;
        }
        setParsedItems(items);
        setStep('preview');
      } catch (err) {
        console.error('Error importando archivo:', err);
        setErrorMsg('Error al leer el archivo. Verificá que el formato sea un .csv o .ics válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedItems(prev => prev.map(ev => ({ ...ev, selected: select })));
  };

  const handleToggleEvent = (id: string) => {
    setParsedItems(prev => prev.map(ev => (ev.id === id ? { ...ev, selected: !ev.selected } : ev)));
  };

  const handleChangeCabin = (id: string, cabin: CabinCode) => {
    setParsedItems(prev => prev.map(ev => (ev.id === id ? { ...ev, depto: cabin } : ev)));
  };

  const handleChangeGuest = (id: string, name: string) => {
    setParsedItems(prev => prev.map(ev => (ev.id === id ? { ...ev, huesped: name } : ev)));
  };

  const handleChangePrice = (id: string, precio: number) => {
    setParsedItems(prev => prev.map(ev => (ev.id === id ? { ...ev, precio } : ev)));
  };

  const handleConfirmImport = () => {
    const selected = parsedItems.filter(ev => ev.selected);
    if (selected.length === 0) {
      alert('Por favor seleccioná al menos una reserva para importar.');
      return;
    }

    if (
      importMode === 'replace' &&
      existingReservasCount > 0 &&
      !window.confirm(
        `Atención: Esta opción borrará las ${existingReservasCount} reservas anteriores e importará las ${selected.length} reservas del archivo para que no queden superpuestas ni duplicadas.\n\n¿Deseás continuar?`
      )
    ) {
      return;
    }

    const newReservas: Reserva[] = selected.map(ev => ({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      depto: ev.depto,
      huesped: ev.huesped,
      tel: ev.tel || '',
      nac: '',
      checkin: ev.checkin,
      checkout: ev.checkout,
      precio: ev.precio || 0,
      pax: ev.pax || 2,
      plus: 0,
      plataforma: ev.plataforma,
      destino: '',
      estado: ev.estado || 'Confirmada',
      notas: ev.notas,
      early: false,
      late: false,
      sena: 0,
      saldo: 0,
      creado: new Date().toISOString(),
    }));

    onImport(newReservas, importMode);
    onClose();
  };

  const selectedCount = parsedItems.filter(ev => ev.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#1A1F26] text-[#F1F5F9] border border-[#2D3540] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#12151A] px-5 py-4 border-b border-[#2D3540] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 text-[#60A5FA] flex items-center justify-center border border-[#2563EB]/30 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                Importar Reservas (Google Calendar / CSV / .ics)
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Subí tu archivo exportado de Google Calendar (.ics o .csv) o tu planilla de reservas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg transition hover:bg-[#222933]"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido según el paso */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'upload' ? (
            <div className="space-y-4">
              {/* Información sobre formatos admitidos */}
              <div className="bg-[#222933] border border-[#2D3540] rounded-xl p-4 text-xs text-[#94A3B8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-[#60A5FA]" />
                    Formatos compatibles: Archivos .ics y .csv
                  </span>
                  {existingReservasCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#93C5FD] rounded-full text-[11px] font-semibold">
                      {existingReservasCount} reservas actuales en la app
                    </span>
                  )}
                </div>

                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Google Calendar (.ics o .csv):</strong> Podés exportar tu calendario desde Google Calendar ➔ Configuración ➔ Importar y exportar. Admite tanto el archivo <code>.ics</code> descargado como archivos <code>.csv</code>.
                  </li>
                  <li>
                    <strong>Planillas de reservas (.csv):</strong> Detecta automáticamente columnas de Cabaña, Huésped, Fechas de Entrada/Salida, Teléfono, Precio y Plataforma.
                  </li>
                  <li>
                    <strong>Sin superposiciones:</strong> En el siguiente paso podrás elegir si querés <em>reemplazar las reservas previas</em> (para que no queden duplicadas) o sumar solo las nuevas.
                  </li>
                </ul>
              </div>

              {/* Zona de Drop / Carga de Archivos */}
              <label className="border-2 border-dashed border-[#3B82F6]/50 hover:border-[#3B82F6] bg-[#12151A]/80 hover:bg-[#12151A] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center border border-[#2563EB]/30">
                  <Upload className="w-7 h-7 text-[#60A5FA]" />
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-sm sm:text-base text-white block">
                    Arrastrá tu archivo .ics o .csv aquí
                  </span>
                  <span className="text-xs text-[#94A3B8] block">
                    o hacé clic para buscar en tu dispositivo (Archivos .ics, .csv, .txt)
                  </span>
                </div>
                <input
                  type="file"
                  accept=".ics,.csv,.txt"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      handleFileChange(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              {/* Botón de Respaldo Preventivo */}
              {existingReservasCount > 0 && (
                <div className="bg-[#1A1F26] border border-[#2D3540] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Download className="w-4 h-4 text-[#D97706]" />
                    <span>¿Querés guardar una copia de las reservas actuales antes de continuar?</span>
                  </div>
                  <button
                    onClick={onDownloadBackup}
                    className="px-3 py-1.5 bg-[#222933] hover:bg-[#2D3540] text-[#F1F5F9] font-semibold rounded-lg border border-[#374151] transition flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Backup JSON</span>
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#FCA5A5] text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Opciones de Modo de Importación: Reemplazar vs Sumar */}
              <div className="bg-[#222933] border border-[#2D3540] p-4 rounded-xl space-y-3">
                <span className="font-bold text-white text-xs uppercase tracking-wider block">
                  ¿Cómo querés aplicar las reservas a la aplicación?
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                      importMode === 'replace'
                        ? 'bg-[#1E293B] border-[#3B82F6] ring-1 ring-[#3B82F6]'
                        : 'bg-[#1A1F26] border-[#2D3540] hover:border-[#374151]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        importMode === 'replace'
                          ? 'border-[#3B82F6] bg-[#3B82F6]'
                          : 'border-[#64748B]'
                      }`}
                    >
                      {importMode === 'replace' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-[#60A5FA]" />
                        Reemplazar todas las reservas previas
                      </span>
                      <span className="text-[11px] text-[#94A3B8] block mt-0.5">
                        Vacía las reservas existentes en la app y carga las de tu archivo limpio. 
                        <strong> Evita superposiciones y duplicados</strong> si tu archivo ya contiene las reservas viejas y nuevas.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                      importMode === 'append'
                        ? 'bg-[#1E293B] border-[#3B82F6] ring-1 ring-[#3B82F6]'
                        : 'bg-[#1A1F26] border-[#2D3540] hover:border-[#374151]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        importMode === 'append'
                          ? 'border-[#3B82F6] bg-[#3B82F6]'
                          : 'border-[#64748B]'
                      }`}
                    >
                      {importMode === 'append' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-[#10B981]" />
                        Sumar a las reservas existentes
                      </span>
                      <span className="text-[11px] text-[#94A3B8] block mt-0.5">
                        Conserva las reservas que ya están en la app y añade las del archivo, omitiendo las que coincidan en cabaña y check-in.
                      </span>
                    </div>
                  </button>
                </div>

                {importMode === 'replace' && existingReservasCount > 0 && (
                  <div className="bg-[#B45309]/20 border border-[#F59E0B]/30 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs text-[#FDE68A]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                      <span>
                        Se borrarán las <strong>{existingReservasCount} reservas previas</strong> para dejar el calendario totalmente limpio con tu archivo.
                      </span>
                    </div>
                    <button
                      onClick={onDownloadBackup}
                      className="text-xs text-white underline hover:text-[#93C5FD] whitespace-nowrap"
                    >
                      Bajar backup previo
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de resumen de archivo y desglose por cabaña */}
              <div className="bg-[#12151A] border border-[#2D3540] p-3 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {parsedItems.length} reservas válidas en {fileName}
                    </span>
                    <span className="text-[#94A3B8]">({selectedCount} seleccionadas para cargar)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSelectAll(true)}
                      className="px-2.5 py-1 bg-[#1A1F26] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white rounded-md transition"
                    >
                      Seleccionar todas
                    </button>
                    <button
                      onClick={() => handleToggleSelectAll(false)}
                      className="px-2.5 py-1 bg-[#1A1F26] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white rounded-md transition"
                    >
                      Deseleccionar todas
                    </button>
                    <button
                      onClick={() => setStep('upload')}
                      className="px-2.5 py-1 bg-[#1A1F26] hover:bg-[#2D3540] text-[#60A5FA] rounded-md transition"
                    >
                      Elegir otro archivo
                    </button>
                  </div>
                </div>

                {/* Desglose de reservas por cabaña detectada */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#222933]">
                  <span className="text-[11px] text-[#94A3B8] font-medium mr-1">Distribución detectada:</span>
                  {CABANAS.map(c => {
                    const count = parsedItems.filter(i => i.selected && i.depto === c).length;
                    return (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition"
                        style={{
                          backgroundColor: count > 0 ? `${DC[c]}25` : '#1A1F26',
                          borderColor: count > 0 ? DC[c] : '#2D3540',
                          color: count > 0 ? '#FFFFFF' : '#64748B',
                        }}
                      >
                        <span>{c}:</span>
                        <span className="font-mono">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Lista de Reservas Detectadas para Revisión */}
              <div className="border border-[#2D3540] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[44vh]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#12151A] text-[#94A3B8] uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-[#2D3540]">
                      <tr>
                        <th className="p-3 text-center w-10">✓</th>
                        <th className="p-3">Huésped</th>
                        <th className="p-3">Cabaña Asignada</th>
                        <th className="p-3">Pax</th>
                        <th className="p-3">Check-in</th>
                        <th className="p-3">Check-out</th>
                        <th className="p-3">Precio</th>
                        <th className="p-3">Canal</th>
                        <th className="p-3">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D3540] bg-[#1A1F26]">
                      {parsedItems.map(ev => {
                        return (
                          <tr
                            key={ev.id}
                            className={`hover:bg-[#222933] transition ${ev.selected ? 'bg-[#1A1F26]' : 'opacity-40'}`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={ev.selected}
                                onChange={() => handleToggleEvent(ev.id)}
                                className="w-4 h-4 accent-[#3B82F6] rounded cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-bold text-white">
                              <input
                                type="text"
                                value={ev.huesped}
                                onChange={e => handleChangeGuest(ev.id, e.target.value)}
                                className="bg-[#12151A] border border-[#2D3540] focus:border-[#3B82F6] rounded px-2 py-1 text-xs text-white w-full min-w-[140px]"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={ev.depto}
                                  onChange={e => handleChangeCabin(ev.id, e.target.value as CabinCode)}
                                  className="bg-[#12151A] border border-[#2D3540] focus:border-[#3B82F6] rounded px-2 py-1 text-xs font-bold text-white"
                                >
                                  {CABANAS.map(c => (
                                    <option key={c} value={c}>
                                      {DN[c]}
                                    </option>
                                  ))}
                                </select>
                                {ev.isUncertainCabin && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#FEF3C7] text-[#92400E] font-semibold whitespace-nowrap"
                                    title="No se encontró mención explícita a la cabaña en el texto original, revisá si es la correcta"
                                  >
                                    Revisar
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-[#94A3B8]">
                              <span className="px-1.5 py-0.5 bg-[#12151A] border border-[#2D3540] rounded text-[10px] text-white">
                                {ev.pax || 2}p
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-[#F1F5F9] whitespace-nowrap">{ev.checkin}</td>
                            <td className="p-3 font-semibold text-[#F1F5F9] whitespace-nowrap">{ev.checkout}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={ev.precio || ''}
                                placeholder="0"
                                onChange={e => handleChangePrice(ev.id, parseFloat(e.target.value) || 0)}
                                className="bg-[#12151A] border border-[#2D3540] rounded px-2 py-1 text-xs text-white w-20 text-right"
                              />
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2D3540] text-[#94A3B8] whitespace-nowrap">
                                {ev.plataforma}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-[#94A3B8] max-w-[180px] truncate" title={ev.notas}>
                              {ev.notas}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#12151A] px-5 py-3.5 border-t border-[#2D3540] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent hover:bg-[#222933] text-[#94A3B8] hover:text-white text-xs sm:text-sm font-semibold rounded-xl transition"
          >
            Cancelar
          </button>

          {step === 'preview' && (
            <button
              onClick={handleConfirmImport}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#2D3540] disabled:text-[#64748B] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>
                {importMode === 'replace' ? 'Reemplazar y Cargar' : 'Sumar'}{' '}
                {selectedCount} Reserva{selectedCount !== 1 ? 's' : ''} al Calendario
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
