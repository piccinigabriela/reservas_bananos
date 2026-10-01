import React, { useState } from 'react';
import { Reserva, CabinCode, Plataforma, EstadoReserva } from '../types';
import { CABANAS, DN, DC } from '../services/cabinConfig';
import { parseImportFile, parseFreeText, ParsedImportItem } from '../services/calendarImportParser';
import { fetchIcalFromUrl } from '../services/api';
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
  MessageSquare,
  Sparkles,
  HelpCircle,
  Link2,
  Globe,
  Copy,
  ExternalLink,
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
  const [inputTab, setInputTab] = useState<'url' | 'text' | 'file'>('url');
  const [pastedText, setPastedText] = useState<string>('');
  const [gcalUrl, setGcalUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('bn_ical');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.gc_general || parsed.gc_C2 || '';
      }
    } catch (_) {}
    return '';
  });
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [copiedCabinLink, setCopiedCabinLink] = useState<string | null>(null);
  const [showHowToGuide, setShowHowToGuide] = useState<boolean>(true);
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');

  if (!isOpen) return null;

  const handleFetchFromUrl = async () => {
    setErrorMsg('');
    const cleanUrl = gcalUrl.trim();
    if (!cleanUrl) {
      setErrorMsg('Por favor pegá la "Dirección secreta en formato iCal" de Google Calendar (o enlace .ics de Airbnb / Booking).');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setErrorMsg('La URL debe comenzar con https://');
      return;
    }

    setIsFetchingUrl(true);
    try {
      const icsText = await fetchIcalFromUrl(cleanUrl);
      const items = parseImportFile(icsText, 'google-calendar.ics');
      if (items.length === 0) {
        setErrorMsg('El calendario se conectó correctamente pero no contiene eventos de reserva en el rango de fechas actual o futuro.');
        return;
      }

      // Guardar URL para que quede persistida en la configuración iCal
      try {
        const savedRaw = localStorage.getItem('bn_ical');
        const urls = savedRaw ? JSON.parse(savedRaw) : {};
        urls.gc_general = cleanUrl;
        localStorage.setItem('bn_ical', JSON.stringify(urls));
      } catch (_) {}

      setFileName('Google Calendar (Sincronización en vivo)');
      setParsedItems(items);
      setStep('preview');
    } catch (err: any) {
      console.error('Error sincronizando calendario desde URL:', err);
      setErrorMsg(err.message || 'Error al conectar con la URL de Google Calendar. Verificá que sea la dirección secreta en formato iCal (.ics).');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleProcessPastedText = () => {
    setErrorMsg('');
    if (!pastedText.trim()) {
      setErrorMsg('Por favor pegá algún mensaje de WhatsApp, texto de Booking/Airbnb o listado de reservas.');
      return;
    }

    try {
      const items = parseFreeText(pastedText);
      if (items.length === 0) {
        setErrorMsg(
          'No pudimos detectar fechas válidas en el texto. Probá con formatos como "15/10 al 18/10", "12 de octubre al 16 de octubre", o mencionando la cabaña (C2, C3, etc.).'
        );
        return;
      }
      setFileName('Texto / WhatsApp copiado');
      setParsedItems(items);
      setStep('preview');
    } catch (err) {
      console.error('Error procesando texto:', err);
      setErrorMsg('Ocurrió un error al procesar el texto ingresado.');
    }
  };

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
              {/* Selector de método: Enlace Automático vs Pegar Texto vs Subir Archivo */}
              <div className="flex bg-[#12151A] p-1 rounded-xl border border-[#2D3540] max-w-xl">
                <button
                  type="button"
                  onClick={() => setInputTab('url')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    inputTab === 'url'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Enlace Automático (Google Calendar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('text')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    inputTab === 'text'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp / Texto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('file')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    inputTab === 'file'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Archivo (.ics)</span>
                </button>
              </div>

              {inputTab === 'url' ? (
                <div className="space-y-4">
                  {/* Tarjeta de conexión directa */}
                  <div className="bg-[#222933] border border-[#2D3540] rounded-xl p-4 text-xs text-[#94A3B8] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-[#60A5FA]" />
                        Sincronización en Automático desde Google Calendar
                      </span>
                      {existingReservasCount > 0 && (
                        <span className="px-2 py-0.5 bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#93C5FD] rounded-full text-[11px] font-semibold">
                          {existingReservasCount} reservas en app
                        </span>
                      )}
                    </div>
                    <p className="text-[#CBD5E1] leading-relaxed">
                      Pegá aquí la <strong>"Dirección secreta en formato iCal"</strong> de tu Google Calendar (o tu link de Airbnb/Booking). El sistema se conectará directamente a los servidores de Google y traerá tus reservas en tiempo real sin que tengas que descargar ni subir archivos manualmente.
                    </p>

                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-bold text-white block">
                        Dirección secreta de Google Calendar (enlace iCal .ics):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          value={gcalUrl}
                          onChange={e => setGcalUrl(e.target.value)}
                          placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                          className="flex-1 bg-[#12151A] border border-[#2D3540] focus:border-[#3B82F6] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] outline-none font-mono"
                        />
                        <button
                          type="button"
                          disabled={isFetchingUrl}
                          onClick={handleFetchFromUrl}
                          className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition shrink-0 cursor-pointer"
                        >
                          {isFetchingUrl ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Conectando...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              <span>Conectar y Traer Reservas</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Guía Paso a Paso Interactiva */}
                  <div className="bg-[#1A1F26] border border-[#2D3540] rounded-xl p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowHowToGuide(!showHowToGuide)}
                      className="w-full flex items-center justify-between text-xs font-bold text-white hover:text-[#93C5FD] transition"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#F59E0B]" />
                        ¿Cómo obtener este enlace en Google Calendar? (Paso a paso)
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        {showHowToGuide ? '▲ Ocultar pasos' : '▼ Ver pasos'}
                      </span>
                    </button>

                    {showHowToGuide && (
                      <div className="text-xs text-[#94A3B8] space-y-2.5 pt-1 border-t border-[#2D3540]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-[#12151A] p-3 rounded-lg border border-[#2D3540] space-y-1">
                            <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">
                              Paso 1 · Abrir Calendar
                            </span>
                            <p className="text-[#CBD5E1] text-[11px]">
                              Entrá a <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-[#60A5FA] underline">calendar.google.com</a> desde tu computadora.
                            </p>
                          </div>

                          <div className="bg-[#12151A] p-3 rounded-lg border border-[#2D3540] space-y-1">
                            <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">
                              Paso 2 · Menú del Calendario
                            </span>
                            <p className="text-[#CBD5E1] text-[11px]">
                              En el lateral izquierdo (Mis calendarios), pasá el mouse sobre tu calendario, clic en <strong>⋮ (3 puntos)</strong> y elegí <strong>"Configurar y compartir"</strong>.
                            </p>
                          </div>

                          <div className="bg-[#12151A] p-3 rounded-lg border border-[#2D3540] space-y-1">
                            <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider block">
                              Paso 3 · Dirección Secreta
                            </span>
                            <p className="text-[#CBD5E1] text-[11px]">
                              Bajá hasta la sección <strong>"Integrar el calendario"</strong> y copiá la <strong>"Dirección secreta en formato iCal"</strong> (enlace que termina en <code>.ics</code>).
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg text-[#FDE68A] text-[11px] flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                          <span>
                            <strong>Tip:</strong> Usá la dirección <em>secreta</em> (no la pública). De ese modo no necesitás hacer tu calendario visible en internet; la app se conecta de forma privada y segura.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sección Dirección Inversa: Ver Los Bananos en Google Calendar del Celular */}
                  <div className="bg-[#1A1F26] border border-emerald-900/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 text-xs sm:text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        ¿Querés ver las reservas de Los Bananos en tu celular (Google Calendar)?
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold rounded-full">
                        En vivo
                      </span>
                    </div>

                    <p className="text-xs text-[#CBD5E1] leading-relaxed">
                      Si querés que las reservas que cargues acá aparezcan automáticamente en la app de Google Calendar de tu celular, agregá el calendario de la cabaña con <strong>"Desde URL"</strong>:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {CABANAS.map(code => {
                        const baseUrl = window.location.origin;
                        const url = `${baseUrl}/api/ical/${code}.ics`;
                        const isCopied = copiedCabinLink === code;

                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              setCopiedCabinLink(code);
                              setTimeout(() => setCopiedCabinLink(null), 2500);
                            }}
                            className={`p-2 rounded-lg border text-left text-xs transition flex flex-col justify-between ${
                              isCopied
                                ? 'bg-emerald-900/50 border-emerald-500 text-white'
                                : 'bg-[#12151A] hover:bg-[#222933] border-[#2D3540] text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            <span className="font-bold text-white flex items-center justify-between">
                              <span>{code}</span>
                              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                            </span>
                            <span className="text-[10px] text-[#64748B] mt-1">
                              {isCopied ? '¡Enlace copiado!' : 'Copiar iCal'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-[#94A3B8]">
                      En Google Calendar (web) hacé clic en el <strong>"+"</strong> al lado de <em>"Otros calendarios"</em> ➔ <strong>"Desde URL"</strong> ➔ pegás el enlace copiado. ¡Y listo! Se actualizará solo en tu celular.
                    </p>
                  </div>
                </div>
              ) : inputTab === 'text' ? (
                <div className="space-y-3">
                  <div className="bg-[#222933] border border-[#2D3540] rounded-xl p-4 text-xs text-[#94A3B8] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                        Importador Inteligente de Texto (WhatsApp, Booking, Airbnb)
                      </span>
                      {existingReservasCount > 0 && (
                        <span className="px-2 py-0.5 bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#93C5FD] rounded-full text-[11px] font-semibold">
                          {existingReservasCount} reservas actuales
                        </span>
                      )}
                    </div>
                    <p className="text-[#CBD5E1]">
                      Copiá y pegá acá mensajes de WhatsApp, confirmaciones de Booking/Airbnb o una lista rápida. El sistema detecta automáticamente la cabaña (C2, C3, C5, etc.), el huésped, las fechas y los montos.
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={7}
                      value={pastedText}
                      onChange={e => setPastedText(e.target.value)}
                      placeholder={`Ejemplos que podés pegar acá:

• Mensajes de WhatsApp:
"Juan Pérez Cabaña 3 del 15/10 al 18/10 $120.000 seña 40.000 tel 3512345678"
"C6 Reserva Mariana Gomez 10 de noviembre al 14 de noviembre Booking"
"C7 Jacuzzi Lucas Díaz 20 al 24 de octubre Airbnb"

• O el texto completo de una confirmación de Booking / Airbnb`}
                      className="w-full bg-[#12151A] border border-[#2D3540] focus:border-[#3B82F6] rounded-xl p-3.5 text-xs text-white placeholder-[#64748B] focus:outline-none resize-y font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setPastedText('')}
                      className="text-xs text-[#94A3B8] hover:text-white"
                    >
                      Limpiar texto
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Analizar y Detectar Reservas</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Información sobre formatos admitidos */}
                  <div className="bg-[#222933] border border-[#2D3540] rounded-xl p-4 text-xs text-[#94A3B8] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-[#60A5FA]" />
                        Formatos compatibles: Archivos .ics, .csv y .json
                      </span>
                      {existingReservasCount > 0 && (
                        <span className="px-2 py-0.5 bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#93C5FD] rounded-full text-[11px] font-semibold">
                          {existingReservasCount} reservas actuales en la app
                        </span>
                      )}
                    </div>

                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong>Google Calendar (.ics):</strong> El formato estándar de Google. Exporta todos los eventos y fechas anotadas.
                      </li>
                      <li>
                        <strong>iCal de Booking y Airbnb (.ics):</strong> Descargá el calendario exportado de Airbnb o Booking y arrastralo aquí.
                      </li>
                      <li>
                        <strong>Planillas Excel / Google Sheets (.csv):</strong> Detecta columnas de Cabaña, Huésped, Fechas, Teléfono, Precio y Canal.
                      </li>
                      <li>
                        <strong>Backup de la app (.json):</strong> Copia de seguridad guardada previamente.
                      </li>
                    </ul>
                  </div>

                  {/* Instrucciones paso a paso para descargar de Google Calendar */}
                  <div className="bg-[#12151A] border border-[#2D3540] rounded-xl p-3.5 space-y-2.5 text-xs">
                    <span className="font-bold text-white text-xs flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#60A5FA]" />
                      ¿Cómo descargar tu archivo .ics de Google Calendar?
                    </span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[#CBD5E1] text-[11px]">
                      <li>
                        Entrá a <strong>calendar.google.com</strong> en tu computadora.
                      </li>
                      <li>
                        Hacé clic en la <strong>Ruedita de engranaje (⚙️)</strong> arriba a la derecha ➔ <strong>"Configuración"</strong>.
                      </li>
                      <li>
                        En el menú lateral izquierdo elegí <strong>"Importar y exportar"</strong> ➔ clic en el botón azul <strong>"Exportar"</strong>.
                      </li>
                      <li>
                        Se descarga un archivo comprimido <code>.zip</code>. Hacé doble clic para abrirlo y arrastrá el archivo <code>.ics</code> que está adentro directamente aquí abajo.
                      </li>
                    </ol>
                  </div>

                  {/* Zona de Drop / Carga de Archivos */}
                  <label className="border-2 border-dashed border-[#3B82F6]/50 hover:border-[#3B82F6] bg-[#12151A]/80 hover:bg-[#12151A] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center border border-[#2563EB]/30">
                      <Upload className="w-7 h-7 text-[#60A5FA]" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-sm sm:text-base text-white block">
                        Arrastrá tu archivo .ics, .csv o .json aquí
                      </span>
                      <span className="text-xs text-[#94A3B8] block">
                        o hacé clic para buscar en tu dispositivo (Archivos .ics, .csv, .json, .txt)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".ics,.csv,.txt,.json"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          handleFileChange(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              )}

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
