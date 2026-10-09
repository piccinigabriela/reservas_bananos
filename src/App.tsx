import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Reserva, Gasto, CabinCode, AppView, VolunteerTask, VolunteerId, CabinCleaningStatus, CabinStatusInfo } from './types';
import {
  fetchReservas,
  guardarReserva,
  insertarReservas,
  eliminarReserva,
  eliminarReservas,
  fetchGastos,
  guardarGasto,
  eliminarGasto,
  fetchTareas,
  guardarTarea,
  eliminarTarea,
  marcarTarea,
  fetchEstadosCabanas,
  guardarEstadoCabana,
  sincronizarIcal,
  limpiarCacheLocal,
} from './services/api';
import { CABANAS, DN, getVolunteerNames, getEffectiveCabinStatuses } from './services/cabinConfig';
import { supabase, rolDelUsuario, BananosRol } from './services/supabase';
import { cargarConfig, migrarConfigLegadoSiFalta, suscribirConfig } from './services/settings';
import { esBloqueo, nombreClave, seSuperponen } from './services/reservaUtils';
import { Header } from './components/Header';
import { CalendarTimeline } from './components/CalendarTimeline';
import { FichaReservaModal } from './components/FichaReservaModal';
import { ReservaFormModal } from './components/ReservaFormModal';
import { AssignCabinModal } from './components/AssignCabinModal';
import { GoogleCalendarImportModal } from './components/GoogleCalendarImportModal';
import { UnlockAdminModal } from './components/UnlockAdminModal';
import { VolunteerTaskModal } from './components/VolunteerTaskModal';
import { PinLogin } from './components/PinLogin';
import { VoluntarioPortalView } from './components/VoluntarioPortalView';
import { XeniaChat } from './components/XeniaChat';
import { RendimientoView } from './components/AdminViews/RendimientoView';
import { GastosView } from './components/AdminViews/GastosView';
import { ReservasTableView } from './components/AdminViews/ReservasTableView';
import { AvisosView } from './components/AdminViews/AvisosView';
import { ConfigView } from './components/AdminViews/ConfigView';
import { XeniaMulticanalView } from './components/AdminViews/XeniaMulticanalView';
import { LandingPageView } from './components/LandingPageView';
import { GuestWelcomeView } from './components/GuestWelcomeView';
import { CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';

const CLAVE_ULTIMO_SYNC = 'lb_bananos_v2_ultimo_sync';
const MINUTOS_ENTRE_SYNC_AUTO = 15;

/** Vista que está mirando el propietario (puede previsualizar recepción o un voluntario). */
type Vista = 'propia' | 'recepcion' | 'vol1' | 'vol2';

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch (_) {
    return null;
  }
}
function guardarLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch (_) {}
}

export default function App() {
  // ---------------------------------------------------------------- Sesión
  const [session, setSession] = useState<Session | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [rol, setRol] = useState<BananosRol | null>(null);
  const [errorRol, setErrorRol] = useState<string | null>(null);
  const esAdmin = rol === 'admin';
  const puedeEditar = rol === 'admin' || rol === 'recepcion';

  useEffect(() => {
    const aplicar = async (s: Session | null) => {
      setSession(s);
      try {
        setRol(await rolDelUsuario(s));
        setErrorRol(null);
      } catch (e: any) {
        setRol(null);
        setErrorRol(s ? 'No se pudo verificar tu usuario. Revisá la conexión y volvé a intentar.' : null);
      }
      setSesionLista(true);
    };
    supabase.auth.getSession().then(({ data }) => aplicar(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      // Al refrescar el token no hace falta volver a consultar el rol
      if (evento === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }
      // Diferido para no llamar a Supabase dentro del callback de auth
      setTimeout(() => aplicar(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------------------------------------------------------------- Preferencias de este dispositivo
  const [vista, setVista] = useState<Vista>('propia');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (leerLocal('bn_theme') as 'dark' | 'light') || 'light');
  const [currentTab, setCurrentTab] = useState<AppView>('calendario');
  const [isDyslexiaMode, setIsDyslexiaMode] = useState<boolean>(() => leerLocal('bn_dyslexia') === 'true');
  const isDarkMode = theme === 'dark';

  // Vistas públicas (no cargan datos privados)
  const [isLandingMode, setIsLandingMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('reservas') || params.has('catalogo') || params.has('web');
  });
  const [isGuestWelcomeOpen, setIsGuestWelcomeOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      return (
        params.has('bienvenida') || params.has('guia') || params.has('guest') || params.has('huesped') ||
        params.has('cabana') || params.has('depto') || hash.includes('guia') || hash.includes('bienvenida') ||
        path.includes('guia') || path.includes('bienvenida')
      );
    } catch (_) {
      return false;
    }
  });
  const [openedFromAdmin, setOpenedFromAdmin] = useState(false);

  // ---------------------------------------------------------------- Datos
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>([]);
  const [volunteerNames, setVolunteerNames] = useState<Record<VolunteerId, string>>(() => getVolunteerNames());
  const [cabinStatuses, setCabinStatuses] = useState<Partial<Record<CabinCode, CabinStatusInfo>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  const [isSyncingIcal, setIsSyncingIcal] = useState(false);
  const ultimaCarga = useRef(0);

  // Modales
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [isNewReservaOpen, setIsNewReservaOpen] = useState(false);
  const [assigningReserva, setAssigningReserva] = useState<Reserva | null>(null);
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);
  const [isUnlockAdminOpen, setIsUnlockAdminOpen] = useState(false);
  const [volunteerModalSlot, setVolunteerModalSlot] = useState<{ volId: VolunteerId; dateIso: string; task?: VolunteerTask | null } | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), ok ? 3500 : 6000);
  }, []);
  const mostrarError = (prefijo: string, e: any) => showToast(`${prefijo}: ${e?.message || e}`, false);

  useEffect(() => suscribirConfig(() => setVolunteerNames(getVolunteerNames())), []);

  const recargarReservas = useCallback(async () => {
    const { reservas: lista, sinConexion: off } = await fetchReservas();
    setReservas(lista);
    setSinConexion(off);
    ultimaCarga.current = Date.now();
  }, []);

  const cargarTodo = useCallback(async () => {
    if (!rol) return;
    try {
      await cargarConfig();
      if (rol === 'admin') {
        const n = await migrarConfigLegadoSiFalta();
        if (n > 0) showToast(`Se pasó la configuración de este dispositivo a la base (${n} ajustes) ✓`);
      }
      const [, tareas, estados, gastosDb] = await Promise.all([
        recargarReservas(),
        fetchTareas(),
        fetchEstadosCabanas(),
        rol === 'admin' ? fetchGastos() : Promise.resolve([] as Gasto[]),
      ]);
      setVolunteerTasks(tareas);
      setCabinStatuses(estados);
      setGastos(gastosDb);
      setVolunteerNames(getVolunteerNames());
    } catch (e) {
      mostrarError('No se pudieron cargar los datos', e);
    } finally {
      setIsLoading(false);
    }
  }, [rol, recargarReservas, showToast]);

  const correrSync = useCallback(
    async (manual: boolean) => {
      if (!(rol === 'admin' || rol === 'recepcion')) return;
      setIsSyncingIcal(true);
      try {
        const r = await sincronizarIcal();
        guardarLocal(CLAVE_ULTIMO_SYNC, String(Date.now()));
        await recargarReservas();
        if (manual || r.creados || r.actualizados || r.borrados || r.feedsConError.length) {
          if (!r.feeds) {
            showToast('No hay calendarios configurados (Configuración → iCal).', false);
          } else {
            const partes = [
              `${r.creados} nuevos`,
              `${r.actualizados} actualizados`,
              `${r.borrados} borrados`,
            ];
            let msg = `Calendarios sincronizados: ${partes.join(' · ')}`;
            if (r.sinCabana.length) msg += ` · ${r.sinCabana.length} eventos de Google sin cabaña en el título`;
            if (r.feedsConError.length) msg += ` · no se pudo leer: ${r.feedsConError.join(', ')}`;
            showToast(msg, r.feedsConError.length === 0);
          }
        }
      } catch (e) {
        if (manual) mostrarError('Error al sincronizar', e);
      } finally {
        setIsSyncingIcal(false);
      }
    },
    [rol, recargarReservas, showToast]
  );

  // Cargar al iniciar sesión (nunca en las vistas públicas)
  useEffect(() => {
    if (!sesionLista) return;
    if (!rol) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    cargarTodo().then(() => {
      const ultimo = Number(leerLocal(CLAVE_ULTIMO_SYNC) || 0);
      if (Date.now() - ultimo > MINUTOS_ENTRE_SYNC_AUTO * 60_000) correrSync(false);
    });
  }, [sesionLista, rol, cargarTodo, correrSync]);

  // Al volver a la app (cambiar de pestaña o desbloquear el celular), traer lo último
  useEffect(() => {
    if (!rol) return;
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaCarga.current > 60_000) {
        cargarTodo();
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [rol, cargarTodo]);

  // ---------------------------------------------------------------- Rol efectivo de la pantalla
  const rolPantalla: BananosRol | null = esAdmin && vista !== 'propia' ? (vista as BananosRol) : rol;
  const isReception = rolPantalla === 'recepcion';

  const effectiveCabinStatuses = React.useMemo(
    () => getEffectiveCabinStatuses(cabinStatuses, reservas, volunteerTasks),
    [cabinStatuses, reservas, volunteerTasks]
  );

  // ---------------------------------------------------------------- Acciones
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRol(null);
    limpiarCacheLocal();
    setVista('propia');
    setReservas([]);
    setGastos([]);
  };

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    guardarLocal('bn_theme', next);
  };

  const handleToggleDyslexia = () => {
    const next = !isDyslexiaMode;
    setIsDyslexiaMode(next);
    guardarLocal('bn_dyslexia', String(next));
  };

  const handleSaveReserva = async (reservaData: Partial<Reserva>, opciones?: { reemplazarBloqueos?: string[] }) => {
    try {
      const guardada = await guardarReserva(reservaData);
      const reemplazar = (opciones?.reemplazarBloqueos || []).filter(id => id !== guardada.id);
      if (reemplazar.length) await eliminarReservas(reemplazar);
      setReservas(prev => [...prev.filter(r => r.id !== guardada.id && !reemplazar.includes(r.id)), guardada]);
      setIsNewReservaOpen(false);
      setEditingReserva(null);
      showToast('Reserva guardada ✓');
    } catch (e) {
      mostrarError('No se guardó la reserva', e);
    }
  };

  const handleDeleteReserva = async (id: string) => {
    try {
      await eliminarReserva(id);
      setReservas(prev => prev.filter(r => r.id !== id));
      setSelectedReserva(null);
      showToast('Reserva eliminada');
    } catch (e) {
      mostrarError('No se pudo eliminar', e);
    }
  };

  const handleAssignCabin = async (reservaId: string, newCabinCode: CabinCode) => {
    const r = reservas.find(x => x.id === reservaId);
    if (!r) return;
    try {
      const guardada = await guardarReserva({ ...r, depto: newCabinCode });
      setReservas(prev => prev.map(x => (x.id === reservaId ? guardada : x)));
      showToast(`Asignada a ${DN[newCabinCode]} ✓`);
    } catch (e) {
      mostrarError('No se pudo asignar', e);
    }
  };

  // Convertir un bloqueo iCal en reserva: se edita LA MISMA fila (mismo id y vínculo con el evento),
  // así la próxima sincronización la reconoce y no crea un bloqueo nuevo.
  const handleConvertIcalBlock = (bloqueo: Reserva) => {
    let nombre = (bloqueo.huesped || '').replace(/^🔒\s*/, '').trim();
    if (/bloqueado|not available|^reserved$/i.test(nombre)) nombre = '';
    setSelectedReserva(null);
    setEditingReserva({ ...bloqueo, huesped: nombre, icalUid: undefined, notas: bloqueo.notas || `Convertido de bloqueo ${bloqueo.plataforma}` });
  };

  // Importar: nunca reemplaza; saltea lo que ya existe en CUALQUIER cabaña
  const handleImportGoogleCalendar = async (nuevas: Reserva[]) => {
    const yaExiste = (n: Reserva) =>
      reservas.some(
        r =>
          (r.depto === n.depto && r.checkin === n.checkin) ||
          (r.checkin === n.checkin && r.checkout === n.checkout && nombreClave(r.huesped) && nombreClave(r.huesped) === nombreClave(n.huesped))
      );
    const aImportar = nuevas.filter(n => !yaExiste(n));
    const salteadas = nuevas.length - aImportar.length;
    try {
      await insertarReservas(aImportar);
      await recargarReservas();
      showToast(`Se importaron ${aImportar.length} reservas${salteadas ? ` · ${salteadas} ya existían y se saltearon` : ''} ✓`);
    } catch (e) {
      mostrarError('No se pudo importar', e);
    }
  };

  const handleAddGasto = async (g: Gasto) => {
    try {
      await guardarGasto(g);
      setGastos(prev => [g, ...prev]);
      showToast('Gasto registrado ✓');
    } catch (e) {
      mostrarError('No se guardó el gasto', e);
    }
  };

  const handleDeleteGasto = async (id: string) => {
    try {
      await eliminarGasto(id);
      setGastos(prev => prev.filter(g => g.id !== id));
      showToast('Gasto eliminado');
    } catch (e) {
      mostrarError('No se pudo eliminar el gasto', e);
    }
  };

  const nombreVol = (id: VolunteerId) => volunteerNames[id]?.split('(')[0]?.trim() || 'Voluntario';

  const actualizarEstadoCabana = async (depto: CabinCode, status: CabinCleaningStatus, updatedBy: string) => {
    const info: CabinStatusInfo = { depto, status, updatedAt: new Date().toISOString(), updatedBy };
    await guardarEstadoCabana(info);
    setCabinStatuses(prev => ({ ...prev, [depto]: info }));
  };

  const handleSaveVolunteerTask = async (task: VolunteerTask) => {
    try {
      await guardarTarea(task);
      setVolunteerTasks(prev => [...prev.filter(t => t.id !== task.id), task]);
      if (task.completada && task.depto && CABANAS.includes(task.depto as CabinCode)) {
        await actualizarEstadoCabana(task.depto as CabinCode, 'limpia', nombreVol(task.voluntarioId));
      }
      showToast(`Tarea guardada para ${nombreVol(task.voluntarioId)} ${task.completada ? '✓ Cabaña limpia 🟢' : ''}`);
    } catch (e) {
      mostrarError('No se guardó la tarea', e);
    }
  };

  const handleDeleteVolunteerTask = async (taskId: string) => {
    try {
      await eliminarTarea(taskId);
      setVolunteerTasks(prev => prev.filter(t => t.id !== taskId));
      showToast('Tarea eliminada');
    } catch (e) {
      mostrarError('No se pudo eliminar la tarea', e);
    }
  };

  const handleToggleVolunteerTaskComplete = async (taskId: string, completed: boolean) => {
    const tarea = volunteerTasks.find(t => t.id === taskId);
    try {
      await marcarTarea(taskId, completed);
      setVolunteerTasks(prev => prev.map(t => (t.id === taskId ? { ...t, completada: completed } : t)));
      if (tarea?.depto && CABANAS.includes(tarea.depto as CabinCode)) {
        await actualizarEstadoCabana(tarea.depto as CabinCode, completed ? 'limpia' : 'pendiente', nombreVol(tarea.voluntarioId));
      }
      showToast(completed ? 'Tarea hecha ✓ · Cabaña marcada como limpia 🟢' : 'Tarea marcada como pendiente');
    } catch (e) {
      mostrarError('No se pudo actualizar la tarea', e);
    }
  };

  const handleUpdateCabinStatus = async (depto: CabinCode, status: CabinCleaningStatus, updatedBy?: string) => {
    const quien =
      updatedBy || (rolPantalla === 'vol1' || rolPantalla === 'vol2' ? nombreVol(rolPantalla) : rolPantalla === 'admin' ? 'Propietario' : 'Recepción');
    try {
      await actualizarEstadoCabana(depto, status, quien);
      showToast(`${DN[depto] || depto}: ${status === 'limpia' ? 'Limpia 🟢' : status === 'pendiente' ? 'Pendiente de limpieza 🔴' : 'Ocupada 🟡'}`);
    } catch (e) {
      mostrarError('No se pudo actualizar la cabaña', e);
    }
  };

  const handleDownloadBackup = () => {
    const backupObj = { fecha: new Date().toISOString(), reservas, gastos, volunteerTasks, volunteerNames, cabinStatuses };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bananos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de respaldo descargada');
  };

  // Restaurar: SOLO agrega lo que falta. Nunca pisa ni borra datos actuales.
  const handleRestoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data.reservas)) {
          showToast('Archivo de respaldo no válido', false);
          return;
        }
        const existentes = new Set(reservas.map(r => r.id));
        const faltantes = (data.reservas as Reserva[]).filter(r => r && r.id && !existentes.has(r.id));
        if (!window.confirm(`El respaldo tiene ${data.reservas.length} reservas. Se van a AGREGAR ${faltantes.length} que hoy no están. No se modifica ni borra nada de lo actual. ¿Seguimos?`)) return;
        await insertarReservas(faltantes);
        if (esAdmin && Array.isArray(data.gastos)) {
          const gIds = new Set(gastos.map(g => g.id));
          for (const g of data.gastos as Gasto[]) if (g?.id && !gIds.has(g.id)) await guardarGasto(g);
        }
        await cargarTodo();
        showToast(`Respaldo restaurado: ${faltantes.length} reservas agregadas ✓`);
      } catch (err) {
        mostrarError('Error al restaurar', err);
      }
    };
    reader.readAsText(file);
  };

  // ---------------------------------------------------------------- Pantallas públicas
  const loginModal = <UnlockAdminModal isOpen={isUnlockAdminOpen} onClose={() => setIsUnlockAdminOpen(false)} />;

  // Al iniciar sesión desde el modal, cerrarlo
  useEffect(() => {
    if (rol) setIsUnlockAdminOpen(false);
  }, [rol, session?.user?.id]);

  if (isGuestWelcomeOpen) {
    return (
      <>
        <GuestWelcomeView
          onBackToAdmin={() => {
            setIsGuestWelcomeOpen(false);
            setOpenedFromAdmin(false);
            window.history.replaceState({}, '', window.location.pathname);
          }}
          openedFromAdmin={openedFromAdmin}
        />
        {loginModal}
      </>
    );
  }

  if (isLandingMode) {
    return (
      <>
        <LandingPageView
          onBackToAdmin={() => {
            setIsLandingMode(false);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
        {loginModal}
      </>
    );
  }

  if (!sesionLista) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Cargando…</div>;
  }

  if (!session || !rol) {
    return (
      <PinLogin
        onOpenGuestGuide={() => setIsGuestWelcomeOpen(true)}
        aviso={errorRol || (session && !rol ? 'Tu usuario no tiene acceso a Los Bananos. Pedile a Gabi que te habilite.' : null)}
      />
    );
  }

  const fichaYModales = (
    <>
      <FichaReservaModal
        reserva={selectedReserva}
        onClose={() => setSelectedReserva(null)}
        onEdit={res => {
          setSelectedReserva(null);
          setEditingReserva(res);
          setIsNewReservaOpen(true);
        }}
        onAssignCabin={res => {
          setSelectedReserva(null);
          setAssigningReserva(res);
        }}
        onConvertIcal={handleConvertIcalBlock}
        onDelete={handleDeleteReserva}
        isDyslexiaMode={isDyslexiaMode}
        cabinStatuses={effectiveCabinStatuses}
        puedeEditar={puedeEditar}
      />
      {loginModal}
    </>
  );

  // Portal de voluntarios (o el propietario previsualizándolo)
  if (rolPantalla === 'vol1' || rolPantalla === 'vol2') {
    return (
      <>
        <VoluntarioPortalView
          volunteerId={rolPantalla}
          tasks={volunteerTasks}
          onToggleTaskComplete={handleToggleVolunteerTaskComplete}
          reservas={reservas}
          onLogout={esAdmin ? () => setVista('propia') : handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
          cabinStatuses={effectiveCabinStatuses}
          onUpdateCabinStatus={handleUpdateCabinStatus}
          onRequestSwitchToAdmin={esAdmin ? () => setVista('propia') : () => setIsUnlockAdminOpen(true)}
        />
        {fichaYModales}
        {toast && <Toast toast={toast} />}
      </>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'theme-dark bg-[#12151A] text-[#F1F5F9]' : 'theme-light bg-[#F3F5F7] text-[#0F172A]'} flex flex-col ${isDyslexiaMode ? 'dyslexia-enhanced' : ''}`}>
      <Header
        isReception={isReception}
        esAdmin={esAdmin}
        onLogout={handleLogout}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewReserva={() => {
          setEditingReserva(null);
          setIsNewReservaOpen(true);
        }}
        isDyslexiaMode={isDyslexiaMode}
        onToggleDyslexiaMode={handleToggleDyslexia}
        onSyncIcal={() => correrSync(true)}
        isSyncing={isSyncingIcal}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenGoogleCalendar={() => setIsGoogleCalendarOpen(true)}
        onCambiarUsuario={() => setIsUnlockAdminOpen(true)}
        onVolverAPropietario={() => setVista('propia')}
        onSwitchToReception={esAdmin ? () => { setVista('recepcion'); setCurrentTab('calendario'); } : undefined}
        onSwitchToVolunteer={esAdmin ? volId => setVista(volId) : undefined}
        onOpenGuestWelcome={() => {
          setOpenedFromAdmin(true);
          setIsGuestWelcomeOpen(true);
        }}
      />

      {sinConexion && (
        <div className="bg-amber-100 text-amber-900 border-b border-amber-300 px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Sin conexión: estás viendo la última copia guardada. Los cambios no se van a guardar hasta que vuelva la conexión.
        </div>
      )}

      <main className={`flex-1 w-full mx-auto p-2 sm:p-6 space-y-6 ${isReception || currentTab === 'calendario' ? 'max-w-full' : 'max-w-7xl'}`}>
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-slate-400 font-medium text-sm">Cargando reservas…</div>
          </div>
        ) : (
          <>
            {(isReception || currentTab === 'calendario') && (
              <CalendarTimeline
                reservas={reservas}
                onSelectReserva={setSelectedReserva}
                onOpenAssignCabin={puedeEditar ? setAssigningReserva : undefined}
                onConvertIcalBlock={puedeEditar ? handleConvertIcalBlock : undefined}
                onOpenRendimiento={esAdmin && !isReception ? () => setCurrentTab('rendimiento') : undefined}
                volunteerTasks={volunteerTasks}
                onSelectVolunteerSlot={
                  puedeEditar ? (volId, dateIso, task) => setVolunteerModalSlot({ volId, dateIso, task: task || null }) : undefined
                }
                volunteerNames={volunteerNames}
                isDyslexiaMode={isDyslexiaMode}
                isDarkMode={isDarkMode}
                isReception={isReception}
                cabinStatuses={effectiveCabinStatuses}
                onUpdateCabinStatus={handleUpdateCabinStatus}
              />
            )}

            {!isReception && esAdmin && (
              <>
                {currentTab === 'rendimiento' && (
                  <RendimientoView reservas={reservas} gastos={gastos} onBackToCalendar={() => setCurrentTab('calendario')} />
                )}
                {currentTab === 'reservas' && (
                  <ReservasTableView
                    reservas={reservas}
                    onEditReserva={res => {
                      setEditingReserva(res);
                      setIsNewReservaOpen(true);
                    }}
                    onDeleteReserva={handleDeleteReserva}
                    onAssignCabin={res => setAssigningReserva(res)}
                    onImportCsv={() => setIsGoogleCalendarOpen(true)}
                  />
                )}
                {currentTab === 'gastos' && <GastosView gastos={gastos} onAddGasto={handleAddGasto} onDeleteGasto={handleDeleteGasto} />}
                {currentTab === 'avisos' && <AvisosView reservas={reservas} />}
                {currentTab === 'config' && (
                  <ConfigView
                    reservas={reservas}
                    onSyncAllIcal={() => correrSync(true)}
                    isSyncing={isSyncingIcal}
                    onDownloadBackup={handleDownloadBackup}
                    onRestoreBackup={handleRestoreBackup}
                    onConfigGuardada={() => showToast('Configuración guardada para todos los dispositivos ✓')}
                    onError={e => mostrarError('No se guardó la configuración', e)}
                  />
                )}
                {currentTab === 'xenia' && (
                  <XeniaMulticanalView
                    reservas={reservas}
                    onNewReservaCreated={() => {
                      recargarReservas();
                      showToast('Xenia registró una reserva pendiente de seña 🎉');
                    }}
                    onOpenLandingPage={() => setIsLandingMode(true)}
                    onNavigateTab={setCurrentTab}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {fichaYModales}

      <ReservaFormModal
        isOpen={isNewReservaOpen || editingReserva !== null}
        onClose={() => {
          setIsNewReservaOpen(false);
          setEditingReserva(null);
        }}
        onSave={handleSaveReserva}
        initialData={editingReserva}
        existingReservas={reservas}
        isDyslexiaMode={isDyslexiaMode}
      />

      <AssignCabinModal reserva={assigningReserva} onClose={() => setAssigningReserva(null)} onAssign={handleAssignCabin} existingReservas={reservas} />

      <GoogleCalendarImportModal
        isOpen={isGoogleCalendarOpen}
        onClose={() => setIsGoogleCalendarOpen(false)}
        onImport={handleImportGoogleCalendar}
        existingReservasCount={reservas.length}
        onDownloadBackup={handleDownloadBackup}
      />

      {volunteerModalSlot && (
        <VolunteerTaskModal
          isOpen
          onClose={() => setVolunteerModalSlot(null)}
          onSaveTask={handleSaveVolunteerTask}
          onDeleteTask={handleDeleteVolunteerTask}
          initialTask={volunteerModalSlot.task}
          selectedVolunteerId={volunteerModalSlot.volId}
          selectedDate={volunteerModalSlot.dateIso}
          isDarkMode={isDarkMode}
          isDyslexiaMode={isDyslexiaMode}
        />
      )}

      {/* Xenia interna: solo el propietario (responde sobre finanzas) */}
      {esAdmin && !isReception && <XeniaChat reservas={reservas} gastos={gastos} theme={theme} />}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Toast({ toast }: { toast: { msg: string; ok: boolean } }) {
  return (
    <div
      role="status"
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] bg-[#1A1F26] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm border border-[#2D3540] border-l-4 ${
        toast.ok ? 'border-l-emerald-500' : 'border-l-rose-500'
      }`}
    >
      {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
      <span>{toast.msg}</span>
    </div>
  );
}
