import React, { useState } from 'react';
import { CABANAS, DN, DC, DEFAULT_PINS, getComisionesCfg, getMonedaPlatCfg, getTipoCambioVal } from '../../services/cabinConfig';
import { Reserva } from '../../types';
import { downloadIcsFile } from '../../services/icalExport';
import { Settings, Key, Phone, DollarSign, Calendar, Database, RefreshCw, Save, Download, Copy, Check, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';

interface ConfigViewProps {
  reservas: Reserva[];
  onSyncAllIcal: () => void;
  isSyncing: boolean;
  onDownloadBackup: () => void;
  onRestoreBackup: (file: File) => void;
  onClearAllReservas?: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  reservas,
  onSyncAllIcal,
  isSyncing,
  onDownloadBackup,
  onRestoreBackup,
  onClearAllReservas,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  // PINs
  const [pins, setPins] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('bn_p');
      if (saved) return { ...DEFAULT_PINS, ...JSON.parse(saved) };
    } catch (_) {}
    return { ...DEFAULT_PINS };
  });

  // WhatsApp
  const [waAdmin, setWaAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('bn_wa');
      if (saved) return JSON.parse(saved).admin || '';
    } catch (_) {}
    return '';
  });

  // Comisiones
  const [comAirbnb, setComAirbnb] = useState<number>(() => getComisionesCfg().airbnb);
  const [comBooking, setComBooking] = useState<number>(() => getComisionesCfg().booking);

  // Monedas
  const [monedas, setMonedas] = useState(() => getMonedaPlatCfg());
  const [tipoCambio, setTipoCambio] = useState<number>(() => getTipoCambioVal());

  // iCal URLs
  const [icalUrls, setIcalUrls] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('bn_ical');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

  const [savedStatus, setSavedStatus] = useState<string>('');

  const handleSaveAll = () => {
    // Validar PINs
    const keys = ['admin', 'gabi', 'vol'] as const;
    for (const k of keys) {
      if (!/^\d{4}$/.test(pins[k] || '')) {
        alert(`El PIN de ${k} debe tener exactamente 4 números.`);
        return;
      }
    }

    localStorage.setItem('bn_p', JSON.stringify(pins));
    localStorage.setItem('bn_wa', JSON.stringify({ admin: waAdmin.trim() }));
    localStorage.setItem('bn_com', JSON.stringify({ airbnb: comAirbnb, booking: comBooking }));
    localStorage.setItem('bn_moneda_plat', JSON.stringify(monedas));
    localStorage.setItem('bn_tc', String(tipoCambio));
    localStorage.setItem('bn_ical', JSON.stringify(icalUrls));

    setSavedStatus('¡Configuración guardada con éxito! ✓');
    setTimeout(() => setSavedStatus(''), 3000);
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
            Configuración de PINs, sincronizaciones iCal, comisiones y respaldos.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D2502A] hover:bg-[#E55B33] text-white font-bold text-sm rounded-xl transition shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Cambios</span>
        </button>
      </div>

      {savedStatus && (
        <div className="p-3 bg-[#E2EDDC] border border-[#3F7D48] text-[#1E5624] font-bold text-sm rounded-xl text-center">
          {savedStatus}
        </div>
      )}

      {/* PINs de Acceso */}
      <div className="bg-white border border-[#E5D7C5] rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#2A2118] flex items-center gap-2">
          <Key className="w-4 h-4 text-[#D2502A]" />
          <span>PINs de Acceso (4 dígitos)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FAF4EB] p-3 rounded-lg border border-[#EFE2D2]">
            <span className="font-bold text-xs text-[#2A2118] block">Hermano / Propietario</span>
            <span className="text-[11px] text-[#7A6752] block mb-2">Modo Enfoque por defecto</span>
            <input
              type="password"
              maxLength={4}
              value={pins.admin || ''}
              onChange={e => setPins(p => ({ ...p, admin: e.target.value }))}
              className="bg-white border border-[#D4C3AE] rounded px-3 py-1 text-center font-bold text-base w-24 tracking-widest"
            />
          </div>

          <div className="bg-[#FAF4EB] p-3 rounded-lg border border-[#EFE2D2]">
            <span className="font-bold text-xs text-[#2A2118] block">Gabi (Administradora)</span>
            <span className="text-[11px] text-[#7A6752] block mb-2">Acceso completo</span>
            <input
              type="password"
              maxLength={4}
              value={pins.gabi || ''}
              onChange={e => setPins(p => ({ ...p, gabi: e.target.value }))}
              className="bg-white border border-[#D4C3AE] rounded px-3 py-1 text-center font-bold text-base w-24 tracking-widest"
            />
          </div>

          <div className="bg-[#FAF4EB] p-3 rounded-lg border border-[#EFE2D2]">
            <span className="font-bold text-xs text-[#2A2118] block">Voluntario / Ayudante</span>
            <span className="text-[11px] text-[#7A6752] block mb-2">Solo ocupación y avisos</span>
            <input
              type="password"
              maxLength={4}
              value={pins.vol || ''}
              onChange={e => setPins(p => ({ ...p, vol: e.target.value }))}
              className="bg-white border border-[#D4C3AE] rounded px-3 py-1 text-center font-bold text-base w-24 tracking-widest"
            />
          </div>
        </div>
      </div>

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
              Tipo de cambio (1 USD = ? ARS)
            </label>
            <input
              type="number"
              value={tipoCambio}
              onChange={e => setTipoCambio(parseFloat(e.target.value) || 1200)}
              className="bg-[#FAF5EE] border border-[#D4C3AE] rounded-lg px-3 py-1.5 text-sm font-bold text-[#2A2118] w-40"
            />
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
            <span>¿Cómo bloquear Airbnb automáticamente cuando cargás acá una reserva directa?</span>
          </div>
          <p className="leading-relaxed">
            1. En Airbnb, andá a tu anuncio &gt; <strong>Disponibilidad &gt; Conectar calendarios &gt; Importar calendario</strong>.<br />
            2. Descargá o copiá el enlace iCal de la cabaña abajo y pegalo en Airbnb con el nombre <em>"Los Bananos Directas"</em>.<br />
            3. ¡Listo! Airbnb leerá tus reservas directas y <strong>bloqueará esas noches en Airbnb</strong> para que nadie más las pueda reservar.
          </p>
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

                  {/* Botón de Descarga del feed .ics */}
                  <button
                    type="button"
                    onClick={() => downloadIcsFile(code, reservas)}
                    title="Descargar archivo .ics con todas las reservas de esta cabaña"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D2502A]" />
                    <span>Exportar iCal (.ics)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#FF5A5F] block mb-0.5">
                      1. Importar desde Airbnb (URL iCal de Airbnb):
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
                      2. Importar desde Booking (URL iCal de Booking):
                    </label>
                    <input
                      type="url"
                      placeholder="https://ical.booking.com/..."
                      value={icalUrls['bk_' + code] || ''}
                      onChange={e => handleIcalChange('bk_' + code, e.target.value)}
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
          Tus datos se sincronizan automáticamente en Supabase. Si deseás tener una copia descargada en tu dispositivo, podés bajarla aquí o restaurarla.
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

      {/* Zona de Mantenimiento de Datos */}
      <div className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          <span>Mantenimiento y Limpieza de Datos</span>
        </h3>
        <p className="text-xs text-[#7F1D1D] leading-relaxed">
          Si vas a cargar un nuevo archivo CSV o .ics que ya contiene todas tus reservas anteriores y no querés que se superpongan ni dupliquen, podés vaciar todas las reservas previas.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs font-semibold text-[#991B1B]">
            Estado actual: <strong>{reservas.length} reservas registradas</strong>
          </div>

          {onClearAllReservas && (
            <button
              onClick={onClearAllReservas}
              disabled={reservas.length === 0}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#FCA5A5] text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Vaciar todas las reservas previas</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
