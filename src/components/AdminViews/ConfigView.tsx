import React, { useState } from 'react';
import { CABANAS, DN, DC, getComisionesCfg, getMonedaPlatCfg, getTipoCambioVal, getFechaCorteCfg, getVolunteerNames } from '../../services/cabinConfig';
import { Reserva, VolunteerId } from '../../types';
import { downloadIcsFile } from '../../services/icalExport';
import { cfg, guardarCfg } from '../../services/settings';
import { supabase } from '../../services/supabase';
import { Settings, Key, Phone, DollarSign, Calendar, Database, RefreshCw, Save, Download, Copy, Check, ExternalLink, Trash2, AlertTriangle, Clock, Users, ShieldCheck, Sparkles } from 'lucide-react';

interface ConfigViewProps {
  reservas: Reserva[];
  onSyncAllIcal: () => void;
  isSyncing: boolean;
  onDownloadBackup: () => void;
  onRestoreBackup: (file: File) => void;
  onConfigGuardada?: () => void;
  onError?: (e: unknown) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  reservas,
  onSyncAllIcal,
  isSyncing,
  onDownloadBackup,
  onRestoreBackup,
  onConfigGuardada,
  onError,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Voluntarios Worldpackers
  const [volNames, setVolNames] = useState<Record<VolunteerId, string>>(() => getVolunteerNames());

  // WhatsApp
  const [waAdmin, setWaAdmin] = useState<string>(() => cfg<{ admin?: string }>('whatsapp_admin', {}).admin || '');

  // Comisiones
  const [comAirbnb, setComAirbnb] = useState<number>(() => getComisionesCfg().airbnb);
  const [comBooking, setComBooking] = useState<number>(() => getComisionesCfg().booking);

  // Monedas y Corte Contable
  const [monedas, setMonedas] = useState(() => getMonedaPlatCfg());
  const [tipoCambio, setTipoCambio] = useState<number>(() => getTipoCambioVal());
  const [fechaCorte, setFechaCorte] = useState<string>(() => getFechaCorteCfg());

  // iCal URLs
  const [icalUrls, setIcalUrls] = useState<Record<string, string>>(() => ({ ...cfg<Record<string, string>>('ical_urls', {}) }));

  const [savedStatus, setSavedStatus] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  // Se guarda en la base: lo ven todos los dispositivos (antes quedaba solo en este navegador)
  const handleSaveAll = async () => {
    setGuardando(true);
    try {
      await guardarCfg('whatsapp_admin', { admin: waAdmin.trim() });
      await guardarCfg('comisiones', { airbnb: comAirbnb, booking: comBooking });
      await guardarCfg('moneda_plataforma', monedas);
      await guardarCfg('tipo_cambio', tipoCambio);
      await guardarCfg('fecha_corte', fechaCorte.trim());
      await guardarCfg('ical_urls', icalUrls);
      await guardarCfg('voluntarios', volNames);
      setSavedStatus('Configuración guardada para todos los dispositivos ✓');
      setTimeout(() => setSavedStatus(''), 3500);
      onConfigGuardada?.();
    } catch (e) {
      onError?.(e);
    } finally {
      setGuardando(false);
    }
  };

  const handleIcalChange = (key: string, val: string) => {
    setIcalUrls(prev => ({ ...prev, [key]: val.trim() }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#FCF8F2] border border-[#E5D7C5] rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-[#2A2118] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D2502A]" />
            <span>Ajustes del Sistema</span>
          </h2>
          <p className="text-xs text-[#7A6752] mt-0.5">
            Nombres de voluntarios, comisiones, calendarios iCal y respaldos. Se guarda para todos los dispositivos.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={guardando}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D2502A] hover:bg-[#E55B33] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition shadow-md cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{guardando ? 'Guardando…' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {savedStatus && (
        <div className="p-3 bg-[#E2EDDC] border border-[#3F7D48] text-[#1E5624] font-bold text-sm rounded-xl text-center shadow-xs">
          {savedStatus}
        </div>
      )}

      {/* Voluntarios Worldpackers & Sus PINs de Acceso */}
      <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#2A2118] flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Voluntarios Worldpackers</span>
            </h3>
            <p className="text-xs text-[#7A6752] mt-1 leading-relaxed">
              Cada voluntario entra desde su celular eligiendo su perfil y escribiendo su <strong>PIN de 6 dígitos</strong>.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full whitespace-nowrap">
            Worldpackers
          </span>
        </div>

        {/* Banner de ayuda rápida */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Cuando llega un voluntario nuevo:</strong> cambiá su nombre acá y cambiale el PIN en "Usuarios y acceso" (así el voluntario anterior deja de tener acceso).
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Tarjeta Voluntario 1 */}
          <div className="bg-[#FAF5EE] border border-[#EAE0D2] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#2A2118] flex items-center gap-1.5">
                <span className="text-base">🧑‍🌾</span>
                <span>Voluntario 1</span>
              </span>
              <span className="text-[10px] bg-white border border-[#D4C3AE] text-[#5A4838] px-2 py-0.5 rounded-md font-semibold">
                Perfil vol1
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#4A3C2F] mb-1">
                Nombre / Identificación:
              </label>
              <input
                type="text"
                value={volNames.vol1 || ''}
                onChange={e => setVolNames(v => ({ ...v, vol1: e.target.value }))}
                placeholder="Ej: Lucas"
                className="bg-white border border-[#D4C3AE] focus:border-emerald-600 rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] w-full outline-none"
              />
            </div>

          </div>

          {/* Tarjeta Voluntario 2 */}
          <div className="bg-[#FAF5EE] border border-[#EAE0D2] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#2A2118] flex items-center gap-1.5">
                <span className="text-base">👩‍🌾</span>
                <span>Voluntario 2</span>
              </span>
              <span className="text-[10px] bg-white border border-[#D4C3AE] text-[#5A4838] px-2 py-0.5 rounded-md font-semibold">
                Perfil vol2
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#4A3C2F] mb-1">
                Nombre / Identificación:
              </label>
              <input
                type="text"
                value={volNames.vol2 || ''}
                onChange={e => setVolNames(v => ({ ...v, vol2: e.target.value }))}
                placeholder="Ej: Elena"
                className="bg-white border border-[#D4C3AE] focus:border-emerald-600 rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] w-full outline-none"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Usuarios y acceso */}
      <UsuariosYAcceso volNames={volNames} />

      {/* WhatsApp de Avisos */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#D2502A]" />
          <span>Número de WhatsApp para Avisos de Check-in</span>
        </h3>
        <p className="text-xs text-[#7A6752]">
          Ingresá el número con código de país, sin signos ni espacios (ej: 5493757123456).
        </p>
        <input
          type="tel"
          value={waAdmin}
          onChange={e => setWaAdmin(e.target.value)}
          placeholder="5493757123456"
          className="bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm text-[#2A2118] w-full max-w-sm"
        />
      </div>

      {/* Comisiones y Monedas */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#D2502A]" />
          <span>Comisiones y Tipo de Cambio</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Comisión estándar Airbnb (%)
            </label>
            <input
              type="number"
              value={comAirbnb}
              onChange={e => setComAirbnb(parseFloat(e.target.value) || 0)}
              className="bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] w-32"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Comisión estándar Booking (%)
            </label>
            <input
              type="number"
              value={comBooking}
              onChange={e => setComBooking(parseFloat(e.target.value) || 0)}
              className="bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] w-32"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Tipo de cambio de referencia (1 USD = ? ARS)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#8C765C]">$</span>
              <input
                type="number"
                step="any"
                value={tipoCambio}
                onChange={e => setTipoCambio(parseFloat(e.target.value) || 0)}
                placeholder="1550"
                className="bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] w-36 outline-none"
              />
              <span className="text-xs text-[#7A6752]">ARS</span>
            </div>
            <p className="text-[11px] text-[#8C765C] mt-1">
              Convierte automáticamente las reservas en USD (ej: Airbnb) a ARS en Rendimiento y totales.
            </p>
          </div>
        </div>
      </div>

      {/* Fecha de Corte Contable / Inicio de Rendimientos */}
      <div className="bg-white border-2 border-[#D2502A]/30 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D2502A]" />
              <span>Fecha de Corte Contable (Inicio de Rendimientos)</span>
            </h3>
            <p className="text-xs text-[#7A6752] mt-1 max-w-2xl leading-relaxed">
              Las reservas históricas anteriores a esta fecha se mantienen visibles en el calendario para evitar doble reserva, pero <strong>se excluyen de las estadísticas de Rendimiento y de las respuestas de Xenia</strong>. Así no necesitás completar los precios de cientos de reservas pasadas.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#FAF4EB] border border-[#E5D7C5] text-[#D2502A] font-bold text-xs rounded-full whitespace-nowrap">
            Corte Activo
          </span>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
              Calcular rendimientos a partir de:
            </label>
            <input
              type="date"
              value={fechaCorte}
              onChange={e => setFechaCorte(e.target.value)}
              className="bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] outline-none"
            />
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-5">
            <button
              type="button"
              onClick={() => setFechaCorte('2026-09-01')}
              className="px-3 py-1.5 bg-[#FAF4EB] hover:bg-[#F3E7D7] border border-[#D4C3AE] text-[#4A3C2F] text-xs font-semibold rounded-lg transition"
            >
              Fijar 01/09/2026
            </button>
            <button
              type="button"
              onClick={() => setFechaCorte('')}
              className="px-3 py-1.5 hover:bg-gray-100 border border-gray-300 text-gray-600 text-xs rounded-lg transition"
            >
              Sin límite (Todo el historial)
            </button>
          </div>
        </div>
      </div>

      {/* Enlaces de Sincronización iCal por Cabaña */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D2502A]" />
              <span>Sincronización iCal Bidireccional (Airbnb & Booking)</span>
            </h3>
            <p className="text-xs text-[#7A6752] mt-0.5">
              Evitá doble reserva: importá las reservas de Airbnb/Booking y exportá las reservas de este sistema a tus plataformas.
            </p>
          </div>

          <button
            onClick={onSyncAllIcal}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2118] text-white hover:bg-[#3D3023] rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Forzar Sincronización Ahora'}</span>
          </button>
        </div>

        {/* Explicación de cómo exportar a Airbnb para bloquearlo */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <span className="text-base">🛡️</span>
            <span>¿Cómo sincronizar con Google Calendar, Airbnb y Booking?</span>
          </div>
          <p className="leading-relaxed">
            • <strong>Para traer reservas de Google Calendar:</strong> En <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="underline font-bold">Google Calendar</a>, hacé clic en los 3 puntos ⋮ de tu calendario ➔ <em>Configurar y compartir</em> ➔ bajá hasta <strong>"Dirección secreta en formato iCal"</strong> y pegá ese link abajo.<br />
            • <strong>Para bloquear Airbnb/Booking automáticamente con reservas de este sistema:</strong> Copiá el enlace iCal de la cabaña abajo y pegalo en Airbnb (<em>Disponibilidad &gt; Conectar calendarios &gt; Importar</em>) o Booking.
          </p>
        </div>

        {/* Google Calendar General */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
              <span>📅</span>
              <span>Google Calendar General (Complejo completo o Cabañas)</span>
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              Sincronización Automática
            </span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Si tenés un calendario único en Google donde anotás las reservas, pegá su dirección secreta iCal acá. Para que cada evento caiga en su cabaña, el título tiene que empezar con la cabaña (ej: "C5 María x2"); si no, la sincronización lo avisa y no lo carga.
          </p>
          <input
            type="url"
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            value={icalUrls['gc_general'] || ''}
            onChange={e => handleIcalChange('gc_general', e.target.value)}
            className="w-full bg-white border border-blue-300 focus:border-blue-600 rounded-md px-3 py-1.5 text-xs text-[#2A2118] font-mono outline-none"
          />
        </div>

        <div className="space-y-4">
          {CABANAS.map(code => {
            const cabinCount = reservas.filter(
              r => r.depto === code && r.estado !== 'Cancelada' && r.estado !== 'Non show'
            ).length;

            return (
              <div
                key={code}
                className="p-3.5 bg-[#FAF5EE] border border-[#EAE0D2] rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: DC[code] }}
                    />
                    <span className="font-bold text-xs sm:text-sm text-[#2A2118]">
                      {DN[code]}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 bg-[#EAE0D2] text-[#5A4838] rounded-full font-medium">
                      {cabinCount} reservas activas
                    </span>
                  </div>

                  {/* Acciones de exportación iCal para Airbnb */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        // La app está en GitHub Pages: el calendario de salida lo sirve el worker de Cloudflare
                        const url = `https://bananos-ical.huuventa.workers.dev/${code}.ics`;
                        navigator.clipboard.writeText(url);
                        setCopiedCode(code);
                        setTimeout(() => setCopiedCode(null), 2500);
                      }}
                      title="Copiar enlace directo para pegar en Airbnb (Paso 2)"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D2502A] hover:bg-[#E55B33] text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      {copiedCode === code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === code ? '¡Enlace Copiado!' : 'Copiar Enlace para Airbnb'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadIcsFile(code, reservas)}
                      title="Descargar archivo .ics con todas las reservas de esta cabaña"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-50 border border-[#D4C3AE] text-[#5A4838] text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Bajar .ics</span>
                    </button>
                  </div>
                </div>

                {/* Enlace iCal directo para copiar o ver en pantalla */}
                <div className="bg-white border border-amber-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                      Enlace para pegar en Airbnb (Paso 2):
                    </span>
                    <span className="text-xs font-mono text-[#2A2118] select-all break-all">
                      https://bananos-ical.huuventa.workers.dev/{code}.ics
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `https://bananos-ical.huuventa.workers.dev/${code}.ics`;
                      navigator.clipboard.writeText(url);
                      setCopiedCode(code);
                      setTimeout(() => setCopiedCode(null), 2500);
                    }}
                    className="shrink-0 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-md border border-amber-300 transition cursor-pointer flex items-center gap-1"
                  >
                    {copiedCode === code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === code ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#FF5A5F] block mb-0.5">
                      1. Airbnb (iCal URL):
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.airbnb.com/calendar/ical/..."
                      value={icalUrls['ab_' + code] || ''}
                      onChange={e => handleIcalChange('ab_' + code, e.target.value)}
                      className="w-full bg-white border border-[#D4C3AE] rounded-md px-2.5 py-1 text-xs text-[#2A2118]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#003580] block mb-0.5">
                      2. Booking (iCal URL):
                    </label>
                    <input
                      type="url"
                      placeholder="https://ical.booking.com/..."
                      value={icalUrls['bk_' + code] || ''}
                      onChange={e => handleIcalChange('bk_' + code, e.target.value)}
                      className="w-full bg-white border border-[#D4C3AE] rounded-md px-2.5 py-1 text-xs text-[#2A2118]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#2563EB] block mb-0.5">
                      3. Google Calendar (iCal Secreto):
                    </label>
                    <input
                      type="url"
                      placeholder="https://calendar.google.com/.../basic.ics"
                      value={icalUrls['gc_' + code] || ''}
                      onChange={e => handleIcalChange('gc_' + code, e.target.value)}
                      className="w-full bg-white border border-[#D4C3AE] rounded-md px-2.5 py-1 text-xs text-[#2A2118]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup Local */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#D2502A]" />
          <span>Copia de Respaldo Local (Backup)</span>
        </h3>
        <p className="text-xs text-[#7A6752]">
          Tus datos viven en Supabase. Podés bajar una copia cuando quieras. Restaurar solo AGREGA reservas que falten: nunca pisa ni borra las actuales.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onDownloadBackup}
            className="px-4 py-2 bg-[#FAF5EE] hover:bg-[#EFE5D8] border border-[#D4C3AE] text-[#2A2118] font-semibold text-xs sm:text-sm rounded-lg transition"
          >
            ⬇️ Descargar Copia JSON
          </button>

          <label className="px-4 py-2 bg-[#FAF5EE] hover:bg-[#EFE5D8] border border-[#D4C3AE] text-[#2A2118] font-semibold text-xs sm:text-sm rounded-lg transition cursor-pointer">
            🔄 Restaurar Copia
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) {
                  onRestoreBackup(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      </div>

    </div>
  );
};

/** Cambiar PIN del personal (lo valida y guarda Supabase) y la contraseña propia. */
const UsuariosYAcceso: React.FC<{ volNames: Record<VolunteerId, string> }> = ({ volNames }) => {
  const [perfil, setPerfil] = useState<'recepcion' | 'vol1' | 'vol2'>('recepcion');
  const [pin, setPin] = useState('');
  const [msgPin, setMsgPin] = useState<{ ok: boolean; t: string } | null>(null);
  const [clave1, setClave1] = useState('');
  const [clave2, setClave2] = useState('');
  const [msgClave, setMsgClave] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cambiarPin = async () => {
    setMsgPin(null);
    if (!/^\d{6}$/.test(pin)) {
      setMsgPin({ ok: false, t: 'El PIN tiene que tener 6 números.' });
      return;
    }
    setOcupado(true);
    const { error } = await supabase.rpc('bananos_cambiar_pin', { p_rol: perfil, p_pin: pin });
    setOcupado(false);
    if (error) {
      const noExiste = /function|does not exist|not find|PGRST202/i.test(error.message);
      setMsgPin({ ok: false, t: noExiste ? 'Esta opción todavía no está habilitada en la base (falta un paso en Supabase).' : error.message });
    } else {
      setMsgPin({ ok: true, t: 'PIN cambiado. Las sesiones abiertas de ese perfil se cerraron.' });
      setPin('');
    }
  };

  const cambiarClave = async () => {
    setMsgClave(null);
    if (clave1.length < 8) {
      setMsgClave({ ok: false, t: 'Usá al menos 8 caracteres.' });
      return;
    }
    if (clave1 !== clave2) {
      setMsgClave({ ok: false, t: 'Las dos contraseñas no coinciden.' });
      return;
    }
    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: clave1 });
    setOcupado(false);
    if (error) setMsgClave({ ok: false, t: error.message });
    else {
      setMsgClave({ ok: true, t: 'Tu contraseña se cambió ✓' });
      setClave1('');
      setClave2('');
    }
  };

  const nombrePerfil = (p: 'recepcion' | 'vol1' | 'vol2') =>
    p === 'recepcion' ? 'Recepción' : `${p === 'vol1' ? 'Voluntario 1' : 'Voluntario 2'}${volNames[p] ? ` (${volNames[p].split('(')[0].trim()})` : ''}`;

  return (
    <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs space-y-4">
      <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
        <Key className="w-4 h-4 text-[#D2502A]" />
        <span>Usuarios y acceso</span>
      </h3>
      <p className="text-xs text-[#5A4838] leading-relaxed">
        Recepción y voluntarios entran eligiendo su perfil y un PIN de 6 dígitos. Cuando alguien deja de trabajar, cambiale el PIN: se le cierra la sesión en su celular.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <label className="block text-[11px] font-semibold text-[#4A3C2F] mb-1">Perfil</label>
          <select
            value={perfil}
            onChange={e => setPerfil(e.target.value as any)}
            className="w-full bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm font-semibold"
          >
            {(['recepcion', 'vol1', 'vol2'] as const).map(p => (
              <option key={p} value={p}>{nombrePerfil(p)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#4A3C2F] mb-1">PIN nuevo</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="6 números"
            className="w-36 bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-1.5 text-center font-mono font-bold tracking-widest outline-none"
          />
        </div>
        <button
          type="button"
          onClick={cambiarPin}
          disabled={ocupado}
          className="px-4 py-2 bg-[#2A2118] hover:bg-[#3D3023] disabled:opacity-60 text-white text-xs font-bold rounded-lg"
        >
          Cambiar PIN
        </button>
      </div>
      {msgPin && <p className={`text-xs font-semibold ${msgPin.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msgPin.t}</p>}

      <div className="pt-3 border-t border-[#EFE2D2] space-y-2">
        <span className="block text-xs font-bold text-[#2A2118]">Mi contraseña (propietario)</span>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <input
            type="password"
            autoComplete="new-password"
            value={clave1}
            onChange={e => setClave1(e.target.value)}
            placeholder="Contraseña nueva"
            className="bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={clave2}
            onChange={e => setClave2(e.target.value)}
            placeholder="Repetila"
            className="bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={cambiarClave}
            disabled={ocupado}
            className="px-4 py-2 bg-[#2A2118] hover:bg-[#3D3023] disabled:opacity-60 text-white text-xs font-bold rounded-lg"
          >
            Cambiar
          </button>
        </div>
        {msgClave && <p className={`text-xs font-semibold ${msgClave.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msgClave.t}</p>}
      </div>
    </div>
  );
};
