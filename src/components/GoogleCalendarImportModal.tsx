import React, { useState } from 'react';
import { Reserva, CabinCode, Plataforma } from '../types';
import { CABANAS, DN, DC, parseGoogleCalendarCSV, GoogleCalendarParsedEvent } from '../services/cabinConfig';
import { Upload, Calendar, Check, AlertCircle, X, ArrowRight, FileText, CheckSquare, Square } from 'lucide-react';

interface GoogleCalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newReservas: Reserva[]) => void;
  existingReservas: Reserva[];
}

export const GoogleCalendarImportModal: React.FC<GoogleCalendarImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingReservas,
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [parsedEvents, setParsedEvents] = useState<GoogleCalendarParsedEvent[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setErrorMsg('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const events = parseGoogleCalendarCSV(text);
        if (events.length === 0) {
          setErrorMsg('No se pudieron encontrar eventos o fechas válidas en el archivo CSV. Asegurate de que sea un archivo exportado de Google Calendar.');
          return;
        }
        setParsedEvents(events);
        setStep('preview');
      } catch (err) {
        setErrorMsg('Error al procesar el archivo CSV. Verificá que el formato sea correcto.');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedEvents(prev => prev.map(ev => ({ ...ev, selected: select })));
  };

  const handleToggleEvent = (id: string) => {
    setParsedEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, selected: !ev.selected } : ev)));
  };

  const handleChangeCabin = (id: string, cabin: CabinCode) => {
    setParsedEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, depto: cabin } : ev)));
  };

  const handleChangeGuest = (id: string, name: string) => {
    setParsedEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, huesped: name } : ev)));
  };

  const handleConfirmImport = () => {
    const selected = parsedEvents.filter(ev => ev.selected);
    if (selected.length === 0) {
      alert('Por favor seleccioná al menos una reserva para importar.');
      return;
    }

    const newReservas: Reserva[] = selected.map(ev => ({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      depto: ev.depto,
      huesped: ev.huesped,
      tel: '',
      nac: '',
      checkin: ev.checkin,
      checkout: ev.checkout,
      precio: ev.precio || 0,
      pax: 2,
      plus: 0,
      plataforma: ev.plataforma,
      destino: '',
      estado: 'Confirmada',
      notas: ev.notas,
      early: false,
      late: false,
      sena: 0,
      saldo: 0,
      creado: new Date().toISOString(),
    }));

    onImport(newReservas);
    onClose();
  };

  const selectedCount = parsedEvents.filter(ev => ev.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#1A1F26] text-[#F1F5F9] border border-[#2D3540] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#12151A] px-5 py-4 border-b border-[#2D3540] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 text-[#60A5FA] flex items-center justify-center border border-[#2563EB]/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                Cargar Reservas desde Google Calendar
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Importá tu calendario actual en formato CSV sin perder ningún dato
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg transition hover:bg-[#222933]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido según el paso */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'upload' ? (
            <div className="space-y-4">
              <div className="bg-[#222933] border border-[#2D3540] rounded-xl p-4 text-xs text-[#94A3B8] space-y-2">
                <span className="font-bold text-white block text-sm">¿Cómo exportar desde Google Calendar?</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>En tu computadora abrí Google Calendar en el navegador.</li>
                  <li>Arriba a la derecha tocá la rueda de <strong>Configuración</strong> ⚙️.</li>
                  <li>En el menú izquierdo seleccioná <strong>Importar y Exportar</strong> ➔ <strong>Exportar</strong>.</li>
                  <li>Se descarga un archivo ZIP; al descomprimirlo tenés los archivos de tus calendarios (.ics o .csv). Si tenés un archivo CSV de reservas, subilo aquí directamente.</li>
                </ol>
              </div>

              {/* Zona de Drop */}
              <label className="border-2 border-dashed border-[#3B82F6]/40 hover:border-[#3B82F6] bg-[#12151A]/60 hover:bg-[#12151A] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-3">
                <Upload className="w-12 h-12 text-[#60A5FA]" />
                <div className="space-y-1">
                  <span className="font-bold text-sm sm:text-base text-white block">
                    Arrastrá tu archivo CSV de Google Calendar aquí
                  </span>
                  <span className="text-xs text-[#94A3B8] block">
                    o hacé clic para buscarlo en tu dispositivo (.csv)
                  </span>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      handleFileChange(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              {errorMsg && (
                <div className="p-3 bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#FCA5A5] text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de resumen */}
              <div className="bg-[#222933] border border-[#2D3540] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {parsedEvents.length} eventos detectados
                  </span>
                  <span className="text-[#94A3B8]">({selectedCount} seleccionados para importar)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2.5 py-1 bg-[#1A1F26] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white rounded-md transition"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1 bg-[#1A1F26] hover:bg-[#2D3540] text-[#94A3B8] hover:text-white rounded-md transition"
                  >
                    Deseleccionar todos
                  </button>
                  <button
                    onClick={() => setStep('upload')}
                    className="px-2.5 py-1 bg-[#1A1F26] hover:bg-[#2D3540] text-[#60A5FA] rounded-md transition"
                  >
                    Subir otro archivo
                  </button>
                </div>
              </div>

              {/* Lista de Reservas Detectadas para Revisión */}
              <div className="border border-[#2D3540] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[48vh]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#12151A] text-[#94A3B8] uppercase text-[10px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-center w-10">✓</th>
                        <th className="p-3">Título original</th>
                        <th className="p-3">Huésped</th>
                        <th className="p-3">Cabaña Asignada</th>
                        <th className="p-3">Check-in</th>
                        <th className="p-3">Check-out</th>
                        <th className="p-3">Canal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D3540] bg-[#1A1F26]">
                      {parsedEvents.map(ev => {
                        return (
                          <tr
                            key={ev.id}
                            className={`hover:bg-[#222933] transition ${ev.selected ? 'bg-[#1A1F26]' : 'opacity-50'}`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={ev.selected}
                                onChange={() => handleToggleEvent(ev.id)}
                                className="w-4 h-4 accent-[#3B82F6] rounded cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-medium text-[#94A3B8] max-w-[180px] truncate" title={ev.subject}>
                              {ev.subject}
                            </td>
                            <td className="p-3 font-bold text-white">
                              <input
                                type="text"
                                value={ev.huesped}
                                onChange={e => handleChangeGuest(ev.id, e.target.value)}
                                className="bg-[#12151A] border border-[#2D3540] rounded px-2 py-1 text-xs text-white w-full max-w-[150px]"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={ev.depto}
                                onChange={e => handleChangeCabin(ev.id, e.target.value as CabinCode)}
                                className="bg-[#12151A] border border-[#2D3540] rounded px-2 py-1 text-xs font-bold text-white"
                              >
                                {CABANAS.map(c => (
                                  <option key={c} value={c}>
                                    {DN[c]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 font-medium text-[#F1F5F9] whitespace-nowrap">{ev.checkin}</td>
                            <td className="p-3 font-medium text-[#F1F5F9] whitespace-nowrap">{ev.checkout}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2D3540] text-[#94A3B8]">
                                {ev.plataforma}
                              </span>
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
              <span>Importar {selectedCount} Reserva{selectedCount !== 1 ? 's' : ''} al Calendario</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
