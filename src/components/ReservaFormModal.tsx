import React, { useState, useEffect } from 'react';
import { Reserva, CabinCode, Plataforma, EstadoReserva } from '../types';
import { 
  CABANAS, 
  DN, 
  DC, 
  TIPOS, 
  CABANAS_POR_TIPO, 
  TIPO_DE_CABANA, 
  esSinAsignar, 
  tipoDeSinAsignar,
  calcFinancials,
  nightsCount,
  formatMoney,
  getComisionesCfg
} from '../services/cabinConfig';
import { X, Calendar, DollarSign, User, AlertTriangle } from 'lucide-react';

interface ReservaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reservaData: Partial<Reserva>) => void;
  initialData?: Reserva | null;
  existingReservas: Reserva[];
  isDyslexiaMode: boolean;
}

export const ReservaFormModal: React.FC<ReservaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingReservas,
  isDyslexiaMode,
}) => {
  const [depto, setDepto] = useState<CabinCode>(initialData?.depto || 'C2');
  const [huesped, setHuesped] = useState<string>(initialData?.huesped || '');
  const [tel, setTel] = useState<string>(initialData?.tel || '');
  const [nac, setNac] = useState<string>(initialData?.nac || '');
  const [checkin, setCheckin] = useState<string>(initialData?.checkin || '');
  const [checkout, setCheckout] = useState<string>(initialData?.checkout || '');
  const [precio, setPrecio] = useState<number | string>(initialData?.precio || '');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>(initialData?.moneda || (initialData?.plataforma === 'Airbnb' ? 'USD' : 'ARS'));
  const [pax, setPax] = useState<number>(initialData?.pax || 2);
  const [plus, setPlus] = useState<number | string>(initialData?.plus || 0);
  const [plataforma, setPlataforma] = useState<string>(initialData?.plataforma || 'Directo');
  const [comisionAirbnb, setComisionAirbnb] = useState<number>(() => {
    if (initialData?.comision != null) return Number(initialData.comision);
    return 15;
  });
  const [estado, setEstado] = useState<EstadoReserva>(initialData?.estado || 'Confirmada');
  const [destino, setDestino] = useState<string>(initialData?.destino || '');
  const [notas, setNotas] = useState<string>(initialData?.notas || '');
  const [sena, setSena] = useState<number | string>(initialData?.sena || 0);
  const [saldo, setSaldo] = useState<number | string>(initialData?.saldo || 0);
  const [early, setEarly] = useState<boolean>(initialData?.early || false);
  const [late, setLate] = useState<boolean>(initialData?.late || false);

  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDepto(initialData?.depto || 'C2');
      setHuesped(initialData?.huesped || '');
      setTel(initialData?.tel || '');
      setNac(initialData?.nac || '');
      setCheckin(initialData?.checkin || '');
      setCheckout(initialData?.checkout || '');
      setPrecio(initialData?.precio !== undefined && initialData?.precio !== null ? initialData.precio : '');
      setMoneda(initialData?.moneda || (initialData?.plataforma === 'Airbnb' ? 'USD' : 'ARS'));
      setPax(initialData?.pax || 2);
      setPlus(initialData?.plus !== undefined && initialData?.plus !== null ? initialData.plus : 0);
      setPlataforma(initialData?.plataforma || 'Directo');
      setComisionAirbnb(initialData?.comision != null ? Number(initialData.comision) : 15);
      setEstado(initialData?.estado || 'Confirmada');
      setDestino(initialData?.destino || '');
      setNotas(initialData?.notas || '');
      setSena(initialData?.sena !== undefined && initialData?.sena !== null ? initialData.sena : 0);
      setSaldo(initialData?.saldo !== undefined && initialData?.saldo !== null ? initialData.saldo : 0);
      setEarly(initialData?.early || false);
      setLate(initialData?.late || false);
      setErrorMessage('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Resumen financiero en tiempo real
  const fin = calcFinancials({
    checkin,
    checkout,
    precio: Number(precio) || 0,
    pax: Number(pax) || 2,
    plus: Number(plus) || 0,
    plataforma,
    moneda,
    comision: plataforma === 'Airbnb' ? comisionAirbnb : undefined,
    estado,
  });

  const noches = nightsCount(checkin, checkout);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!depto || !huesped.trim() || !checkin || !checkout || !precio) {
      setErrorMessage('Por favor completá los campos obligatorios: Cabaña, Huésped, Fechas y Precio.');
      return;
    }

    if (new Date(checkout) <= new Date(checkin)) {
      setErrorMessage('La fecha de salida debe ser posterior a la fecha de llegada.');
      return;
    }

    // Validación de superposición (excepto si es same-day check-in/out)
    if (esSinAsignar(depto)) {
      const tipo = tipoDeSinAsignar(depto);
      const cupo = CABANAS_POR_TIPO[tipo].length;
      const ocupadas = existingReservas.filter(
        r =>
          r.id !== initialData?.id &&
          r.estado !== 'Cancelada' &&
          r.estado !== 'Non show' &&
          r.estado !== 'Devolución' &&
          !(checkout <= r.checkin || checkin >= r.checkout) &&
          (esSinAsignar(r.depto) ? tipoDeSinAsignar(r.depto) === tipo : TIPO_DE_CABANA[r.depto] === tipo)
      ).length;

      if (ocupadas >= cupo) {
        setErrorMessage(`No hay disponibilidad: las ${cupo} cabañas ${TIPOS[tipo]} ya están ocupadas en esas fechas.`);
        return;
      }
    } else {
      const conflict = existingReservas.find(
        r =>
          r.id !== initialData?.id &&
          r.depto === depto &&
          r.estado !== 'Cancelada' &&
          r.estado !== 'Non show' &&
          r.estado !== 'Devolución' &&
          !(checkout <= r.checkin || checkin >= r.checkout)
      );

      if (conflict && !(checkin === conflict.checkout || checkout === conflict.checkin)) {
        setErrorMessage(`Hay superposición de fechas con la reserva de ${conflict.huesped} en ${DN[depto]}.`);
        return;
      }
    }

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      depto,
      huesped: huesped.trim(),
      tel: tel.trim(),
      nac: nac.trim(),
      checkin,
      checkout,
      precio: Number(precio) || 0,
      moneda,
      pax: Number(pax) || 2,
      plus: Number(plus) || 0,
      plataforma,
      comision: plataforma === 'Airbnb' ? comisionAirbnb : null,
      estado,
      destino,
      notas: notas.trim(),
      sena: Number(sena) || 0,
      saldo: Number(saldo) || 0,
      early,
      late,
      creado: initialData?.creado || new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-[#FCF8F2] border-2 border-[#DBCAB5] rounded-2xl w-full max-w-xl my-auto max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado fijo superior */}
        <div className="bg-[#2A2118] px-4 sm:px-5 py-3.5 text-white flex items-center justify-between border-b border-[#47382A] shrink-0">
          <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
            <span>{initialData ? '✏️ Modificar Reserva' : '➕ Nueva Reserva'}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-90"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con scroll vertical garantizado */}
        <form onSubmit={handleSubmit} className={`flex flex-col overflow-y-auto flex-1 ${isDyslexiaMode ? 'dyslexia-enhanced' : ''}`}>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {errorMessage && (
              <div className="bg-[#FFF0ED] border-2 border-[#E0533C] text-[#9A220E] px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bloque 1: Cabaña y Fechas */}
            <div className="bg-white border border-[#E5D7C5] rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
              <h3 className="text-xs uppercase tracking-wider font-bold text-[#8C765C] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#D2502A]" />
                <span>1. Cabaña y Fechas</span>
              </h3>

            <div>
              <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                Cabaña asignada *
              </label>
              <select
                value={depto}
                onChange={e => setDepto(e.target.value as CabinCode)}
                className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2.5 text-sm sm:text-base font-semibold text-[#2A2118] outline-none"
              >
                <option value="C2">Cabaña 2 (Big — 4 a 6 pax)</option>
                <option value="C3">Cabaña 3 (Big — 4 a 6 pax)</option>
                <option value="C5">Cabaña 5 (Tiny Estándar — 2 a 4 pax)</option>
                <option value="C6">Cabaña 6 (Tiny Estándar — 2 a 4 pax)</option>
                <option value="C7">Cabaña 7 (Tiny Jacuzzi — 2 pax)</option>
                <option value="C8">Cabaña 8 (Tiny Estándar — 2 a 4 pax)</option>
                <option value="C9">Cabaña 9 (Tiny Estándar — 2 a 4 pax)</option>
                <option value="SA_big">⏳ Sin asignar — Big (Booking)</option>
                <option value="SA_tj">⏳ Sin asignar — Tiny Jacuzzi (Booking)</option>
                <option value="SA_te">⏳ Sin asignar — Tiny Estándar (Booking)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Llegada (Check-in) *
                </label>
                <input
                  type="date"
                  value={checkin}
                  onChange={e => setCheckin(e.target.value)}
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                  required
                />
                <label className="flex items-center gap-2 mt-1.5 text-xs text-[#6A5844] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={early}
                    onChange={e => setEarly(e.target.checked)}
                    className="w-4 h-4 accent-[#D2502A] rounded"
                  />
                  <span>Early Check-in (antes de hora)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Salida (Check-out) *
                </label>
                <input
                  type="date"
                  value={checkout}
                  onChange={e => setCheckout(e.target.value)}
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                  required
                />
                <label className="flex items-center gap-2 mt-1.5 text-xs text-[#6A5844] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={late}
                    onChange={e => setLate(e.target.checked)}
                    className="w-4 h-4 accent-[#D2502A] rounded"
                  />
                  <span>Late Check-out (después de hora)</span>
                </label>
              </div>
            </div>

            {checkin && checkout && noches > 0 && (
              <div className="bg-[#FAF4EB] py-1.5 px-3 rounded-lg text-xs font-bold text-[#8C5823] flex items-center justify-between">
                <span>Duración calculada:</span>
                <span>{noches} {noches === 1 ? 'noche' : 'noches'}</span>
              </div>
            )}
          </div>

          {/* Bloque 2: Huésped y Datos de Contacto */}
          <div className="bg-white border border-[#E5D7C5] rounded-xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#8C765C] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#D2502A]" />
              <span>2. Datos del Huésped</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                Nombre y Apellido del Huésped *
              </label>
              <input
                type="text"
                value={huesped}
                onChange={e => setHuesped(e.target.value)}
                placeholder="Ej: Marcelo García"
                className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm sm:text-base font-semibold text-[#2A2118] outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  placeholder="Ej: 5493757123456"
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm text-[#2A2118] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Nacionalidad / Procedencia
                </label>
                <input
                  type="text"
                  value={nac}
                  onChange={e => setNac(e.target.value)}
                  placeholder="Ej: Brasileño, Buenos Aires"
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm text-[#2A2118] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Cantidad de Pasajeros (Pax)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={pax}
                  onChange={e => setPax(parseInt(e.target.value) || 2)}
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Estado de la Reserva
                </label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value as EstadoReserva)}
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                >
                  <option value="Confirmada">Confirmada</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Stand by">Stand by</option>
                  <option value="Shown">Shown (Check-in efectuado)</option>
                  <option value="Non show">Non show (No se presentó)</option>
                  <option value="Cortesía">Cortesía</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Devolución">Devolución</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque 3: Tarifa, Canal y Desglose Financiero */}
          <div className="bg-white border border-[#E5D7C5] rounded-xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#8C765C] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#D2502A]" />
              <span>3. Precio y Pagos</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Precio por Noche *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  placeholder="Ej: 35 o 60000"
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm sm:text-base font-bold text-[#2A2118] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Moneda
                </label>
                <select
                  value={moneda}
                  onChange={e => setMoneda(e.target.value as 'ARS' | 'USD')}
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                >
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD (US$)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Pasajero Extra (Plus)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={plus}
                  onChange={e => setPlus(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm sm:text-base font-semibold text-[#2A2118] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Plataforma / Canal
                </label>
                <select
                  value={plataforma}
                  onChange={e => {
                    const val = e.target.value;
                    setPlataforma(val);
                    if (val === 'Airbnb') {
                      setMoneda('USD');
                    } else {
                      setMoneda('ARS');
                    }
                  }}
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                >
                  <option value="Directo">Directo (WhatsApp / Teléfono)</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Booking">Booking.com</option>
                  <option value="Google">Google</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Otro">Otro canal</option>
                </select>
              </div>
            </div>

            {/* Alerta de seguridad si es USD y el precio es inusualmente alto */}
            {moneda === 'USD' && Number(precio) >= 500 && (
              <div className="bg-[#FFF9E6] border-2 border-[#FFE082] text-[#7F5F00] p-3 rounded-lg text-xs font-semibold space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>⚠️ ¿Moneda Correcta?</span>
                </div>
                <p>
                  Estás cargando una tarifa de <strong>USD {Number(precio).toLocaleString('es-AR')}</strong> por noche. 
                  Si este valor está expresado en <strong>Pesos Argentinos ($)</strong>, por favor cambiá la Moneda arriba a <strong>ARS ($)</strong> para evitar facturaciones gigantescas.
                </p>
              </div>
            )}

            {/* Comisión específica de Airbnb */}
            {plataforma === 'Airbnb' && (
              <div className="bg-[#FFF6F6] p-3 rounded-lg border border-[#F9D2D2]">
                <label className="block text-xs font-semibold text-[#C0392B] mb-1">
                  Comisión de Airbnb
                </label>
                <select
                  value={comisionAirbnb}
                  onChange={e => setComisionAirbnb(Number(e.target.value))}
                  className="w-full bg-white border border-[#EAA6A6] rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold"
                >
                  <option value="15">15% (comisión estándar para reservas nuevas)</option>
                  <option value="3">3% (comisión para reservas anteriores)</option>
                </select>
              </div>
            )}

            {/* Seña y Saldo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Seña recibida por anticipado ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sena}
                  onChange={e => setSena(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                  Saldo cobrado ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={saldo}
                  onChange={e => setSaldo(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm font-semibold text-[#2A2118] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                Destino del cobro
              </label>
              <select
                value={destino}
                onChange={e => setDestino(e.target.value)}
                className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-sm text-[#2A2118] outline-none"
              >
                <option value="">— Sin especificar —</option>
                <option value="Efectivo">Efectivo en mano</option>
                <option value="Billetera virtual">Transferencia / Billetera virtual</option>
                <option value="Airbnb">Cobrado por Airbnb</option>
                <option value="Booking">Cobrado por Booking</option>
                <option value="Payoneer">Payoneer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A3C2F] mb-1">
                Notas / Observaciones
              </label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={2}
                placeholder="Llegada de noche, viaja con mascotas, cuna de bebé..."
                className="w-full bg-[#FAF5EE] border-2 border-[#D4C3AE] focus:border-[#D2502A] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#2A2118] outline-none"
              />
            </div>
          </div>

          {/* Banner de cálculo en vivo: Noches, Subtotal, Comisión, Líquido */}
          <div className="bg-[#2A2118] text-[#F3E9D6] rounded-xl p-4 shadow-md space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-[#D4B594]">
              Cálculo Automático
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[10px] text-[#A69177] uppercase block">Noches</span>
                <span className="font-bold text-sm sm:text-base text-[#FBF6EE]">
                  {noches}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#A69177] uppercase block">Subtotal</span>
                <span className="font-semibold text-sm sm:text-base text-[#FBF6EE]">
                  {formatMoney(fin.subTotal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#F9A8A0] uppercase block">Comisión</span>
                <span className="font-semibold text-sm sm:text-base text-[#F9A8A0]">
                  {fin.com > 0 ? `- ${formatMoney(fin.com)}` : '0%'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#6EE7B7] uppercase block font-bold">Líquido</span>
                <span className="font-bold text-base sm:text-lg text-[#6EE7B7]">
                  {formatMoney(fin.liq)}
                </span>
              </div>
            </div>
          </div>

          </div>

          {/* Botones de acción fijados abajo para que siempre estén visibles y cómodos */}
          <div className="bg-[#FAF4EB] border-t border-[#E5D7C5] p-3 sm:p-4 flex gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-[#E8DDD0] hover:bg-[#DDD0C0] text-[#423223] font-semibold text-xs sm:text-sm rounded-xl transition text-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-2 py-2.5 sm:py-3 px-4 sm:px-6 bg-[#D2502A] hover:bg-[#E55B33] text-white font-bold text-xs sm:text-base rounded-xl transition shadow-md text-center transform active:scale-95"
            >
              Guardar Reserva ✓
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
