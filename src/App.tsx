import React, { useState, useEffect } from 'react';
import { Reserva, Gasto, CabinCode, UserKey, AppView } from './types';
import { 
  fetchReservas, 
  saveReservas, 
  fetchGastos, 
  saveGastos, 
  syncIcalFeeds 
} from './services/api';
import { CABANAS, DN, DC } from './services/cabinConfig';
import { Header } from './components/Header';
import { CalendarTimeline } from './components/CalendarTimeline';
import { FichaReservaModal } from './components/FichaReservaModal';
import { ReservaFormModal } from './components/ReservaFormModal';
import { AssignCabinModal } from './components/AssignCabinModal';
import { GoogleCalendarImportModal } from './components/GoogleCalendarImportModal';
import { UnlockAdminModal } from './components/UnlockAdminModal';
import { PinLogin } from './components/PinLogin';
import { XeniaChat } from './components/XeniaChat';
import { RendimientoView } from './components/AdminViews/RendimientoView';
import { GastosView } from './components/AdminViews/GastosView';
import { ReservasTableView } from './components/AdminViews/ReservasTableView';
import { AvisosView } from './components/AdminViews/AvisosView';
import { ConfigView } from './components/AdminViews/ConfigView';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Autenticación / PIN
  const [currentUser, setCurrentUser] = useState<UserKey | null>(() => {
    return (localStorage.getItem('bn_remembered_user') as UserKey) || null;
  });

  // Modo de visualización: 'focus' (solo calendario + formulario) vs 'advanced' (panel completo)
  const [viewMode, setViewMode] = useState<'focus' | 'advanced'>(() => {
    const saved = localStorage.getItem('bn_view_mode');
    return (saved as 'focus' | 'advanced') || 'focus';
  });

  // Tema: Modo Oscuro Charcoal o Modo Claro
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('bn_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Pestaña activa (solo relevante si está en modo advanced y modo propietario)
  const [currentTab, setCurrentTab] = useState<AppView>('calendario');

  // Modo accesible para dislexia
  const [isDyslexiaMode, setIsDyslexiaMode] = useState<boolean>(() => {
    return localStorage.getItem('bn_dyslexia') === 'true';
  });

  // Datos
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingIcal, setIsSyncingIcal] = useState<boolean>(false);

  // Modales
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [isNewReservaOpen, setIsNewReservaOpen] = useState<boolean>(false);
  const [assigningReserva, setAssigningReserva] = useState<Reserva | null>(null);
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState<boolean>(false);
  const [isUnlockAdminOpen, setIsUnlockAdminOpen] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const isReception = currentUser === 'recepcion' || currentUser === 'vol';

  // Cargar datos al iniciar
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      const [loadedReservas, loadedGastos] = await Promise.all([
        fetchReservas(),
        fetchGastos(),
      ]);
      setReservas(loadedReservas);
      setGastos(loadedGastos);
      setIsLoading(false);

      // Sincronización en segundo plano de feeds iCal
      syncIcalFeeds(loadedReservas).then(({ count, updatedReservas }) => {
        if (count > 0) {
          setReservas(updatedReservas);
        }
      });
    };

    initLoad();
  }, []);

  // Alternar tema Dark/Light
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('bn_theme', next);
    showToast(next === 'dark' ? 'Modo Oscuro Charcoal activado' : 'Modo Claro activado');
  };

  // Alternar modo dislexia
  const handleToggleDyslexia = () => {
    const next = !isDyslexiaMode;
    setIsDyslexiaMode(next);
    localStorage.setItem('bn_dyslexia', String(next));
    showToast(next ? 'Tipografía de lectura fácil activada' : 'Lectura normal activada');
  };

  // Alternar Modo Enfoque vs Panel Completo (en Modo Propietario)
  const handleToggleViewMode = () => {
    const next = viewMode === 'focus' ? 'advanced' : 'focus';
    setViewMode(next);
    localStorage.setItem('bn_view_mode', next);
    if (next === 'focus') {
      setCurrentTab('calendario');
      showToast('Modo Enfoque: solo calendario y reservas 🌿');
    } else {
      showToast('Panel Completo: métricas, gastos y configuración activados ⚙️');
    }
  };

  // Cambiar a Modo Día a Día (Recepción) con 1 clic
  const handleSwitchToReception = () => {
    setCurrentUser('recepcion');
    localStorage.setItem('bn_remembered_user', 'recepcion');
    setCurrentTab('calendario');
    showToast('Modo Día a Día activado: solo calendario y cargas 🌿');
  };

  // Desbloqueo exitoso de Modo Propietario mediante PIN
  const handleUnlockAdminSuccess = () => {
    setCurrentUser('admin');
    localStorage.setItem('bn_remembered_user', 'admin');
    setIsUnlockAdminOpen(false);
    showToast('Modo Propietario activado con acceso completo 👑');
  };

  // Sincronización manual de iCal
  const handleSyncIcalManual = async () => {
    setIsSyncingIcal(true);
    try {
      const { count, updatedReservas } = await syncIcalFeeds(reservas);
      setReservas(updatedReservas);
      showToast(`iCal sincronizado: ${count} bloqueos actualizados ✓`, true);
    } catch (err) {
      showToast('Error al conectar con los feeds iCal', false);
    } finally {
      setIsSyncingIcal(false);
    }
  };

  // Guardar reserva (creación o edición)
  const handleSaveReserva = async (reservaData: Partial<Reserva>) => {
    let updated: Reserva[];
    if (reservaData.id) {
      // Edición
      updated = reservas.map(r => (r.id === reservaData.id ? ({ ...r, ...reservaData } as Reserva) : r));
      showToast('Reserva actualizada con éxito ✓');
    } else {
      // Creación
      const newRes: Reserva = {
        ...reservaData,
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      } as Reserva;
      updated = [...reservas, newRes];
      showToast('Reserva creada con éxito ✓');
    }

    setReservas(updated);
    setIsNewReservaOpen(false);
    setEditingReserva(null);
    await saveReservas(updated);
  };

  // Eliminar reserva
  const handleDeleteReserva = async (id: string) => {
    const updated = reservas.filter(r => r.id !== id);
    setReservas(updated);
    setSelectedReserva(null);
    showToast('Reserva eliminada');
    await saveReservas(updated);
  };

  // Asignar cabaña física a una reserva sin asignar de Booking
  const handleAssignCabin = async (reservaId: string, newCabinCode: CabinCode) => {
    const updated = reservas.map(r => (r.id === reservaId ? { ...r, depto: newCabinCode } : r));
    setReservas(updated);
    showToast(`Asignada a ${DN[newCabinCode]} ✓`);
    await saveReservas(updated);
  };

  // Convertir bloqueo de iCal en reserva editable
  const handleConvertIcalBlock = (icalBlock: Reserva) => {
    const convertedRes: Reserva = {
      ...icalBlock,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      huesped: '',
      precio: 0,
      notas: `Convertido de bloqueo ${icalBlock.plataforma}`,
      icalUid: undefined,
    };
    setSelectedReserva(null);
    setEditingReserva(convertedRes);
  };

  // Importar reservas desde Google Calendar CSV
  const handleImportGoogleCalendar = async (newReservas: Reserva[]) => {
    const updated = [...reservas, ...newReservas];
    setReservas(updated);
    await saveReservas(updated);
    showToast(`Se importaron ${newReservas.length} reservas de Google Calendar ✓`);
  };

  // Agregar Gasto
  const handleAddGasto = async (newGasto: Gasto) => {
    const updated = [newGasto, ...gastos];
    setGastos(updated);
    showToast('Gasto registrado ✓');
    await saveGastos(updated);
  };

  // Eliminar Gasto
  const handleDeleteGasto = async (id: string) => {
    const updated = gastos.filter(g => g.id !== id);
    setGastos(updated);
    showToast('Gasto eliminado');
    await saveGastos(updated);
  };

  // Descarga de Backup
  const handleDownloadBackup = () => {
    const backupObj = {
      fecha: new Date().toISOString(),
      reservas,
      gastos,
      pins: localStorage.getItem('bn_p'),
      wa: localStorage.getItem('bn_wa'),
      ical: localStorage.getItem('bn_ical'),
    };
    const json = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bananos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Copia de respaldo descargada');
  };

  // Restaurar Backup
  const handleRestoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.reservas && Array.isArray(data.reservas)) {
          setReservas(data.reservas);
          await saveReservas(data.reservas);
          if (data.gastos) {
            setGastos(data.gastos);
            await saveGastos(data.gastos);
          }
          showToast('Copia de respaldo restaurada con éxito ✓');
        } else {
          showToast('Archivo de respaldo no válido', false);
        }
      } catch (err) {
        showToast('Error al leer el archivo de respaldo', false);
      }
    };
    reader.readAsText(file);
  };

  // Si no ha ingresado el PIN
  if (!currentUser) {
    return <PinLogin onLoginSuccess={user => setCurrentUser(user)} />;
  }

  const isDarkMode = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'theme-dark bg-[#12151A] text-[#F1F5F9]' : 'theme-light bg-[#F3F5F7] text-[#0F172A]'} flex flex-col ${isDyslexiaMode ? 'dyslexia-enhanced' : ''}`}>
      {/* Barra de Navegación Principal */}
      <Header
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('bn_remembered_user');
          setCurrentUser(null);
        }}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        onOpenNewReserva={() => {
          setEditingReserva(null);
          setIsNewReservaOpen(true);
        }}
        isDyslexiaMode={isDyslexiaMode}
        onToggleDyslexiaMode={handleToggleDyslexia}
        onSyncIcal={handleSyncIcalManual}
        isSyncing={isSyncingIcal}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenGoogleCalendar={() => setIsGoogleCalendarOpen(true)}
        onRequestSwitchToAdmin={() => setIsUnlockAdminOpen(true)}
        onSwitchToReception={handleSwitchToReception}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-slate-400 font-medium text-sm">
              Sincronizando cabañas y reservas...
            </div>
          </div>
        ) : (
          <>
            {/* Si está en modo recepción, SIEMPRE muestra solo el calendario sin desvíos */}
            {(isReception || currentTab === 'calendario') && (
              <CalendarTimeline
                reservas={reservas}
                onSelectReserva={res => setSelectedReserva(res)}
                onOpenAssignCabin={res => setAssigningReserva(res)}
                onConvertIcalBlock={res => handleConvertIcalBlock(res)}
                onOpenRendimiento={() => setCurrentTab('rendimiento')}
                isDyslexiaMode={isDyslexiaMode}
                isDarkMode={isDarkMode}
                isReception={isReception}
              />
            )}

            {/* Módulos exclusivos del Modo Propietario */}
            {!isReception && (
              <>
                {/* Vista 2: Rendimiento y Balance del Negocio */}
                {currentTab === 'rendimiento' && (
                  <RendimientoView
                    reservas={reservas}
                    gastos={gastos}
                    onBackToCalendar={() => setCurrentTab('calendario')}
                  />
                )}

                {/* Vista 3: Tabla Histórica de Reservas */}
                {currentTab === 'reservas' && (
                  <ReservasTableView
                    reservas={reservas}
                    onEditReserva={res => {
                      setEditingReserva(res);
                      setIsNewReservaOpen(true);
                    }}
                    onDeleteReserva={handleDeleteReserva}
                    onAssignCabin={res => setAssigningReserva(res)}
                    onImportCsv={async () => {
                      setIsGoogleCalendarOpen(true);
                    }}
                  />
                )}

                {/* Vista 4: Gastos Operativos */}
                {currentTab === 'gastos' && (
                  <GastosView
                    gastos={gastos}
                    onAddGasto={handleAddGasto}
                    onDeleteGasto={handleDeleteGasto}
                  />
                )}

                {/* Vista 5: Avisos de Check-in */}
                {currentTab === 'avisos' && (
                  <AvisosView reservas={reservas} />
                )}

                {/* Vista 6: Configuración e iCal */}
                {currentTab === 'config' && (
                  <ConfigView
                    onSyncAllIcal={handleSyncIcalManual}
                    isSyncing={isSyncingIcal}
                    onDownloadBackup={handleDownloadBackup}
                    onRestoreBackup={handleRestoreBackup}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Modal: Ficha Detallada de Reserva (al tocar en el calendario) */}
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
        onConvertIcal={res => handleConvertIcalBlock(res)}
        onDelete={id => handleDeleteReserva(id)}
        isDyslexiaMode={isDyslexiaMode}
      />

      {/* Modal: Formulario Nueva / Editar Reserva */}
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

      {/* Modal: Asignar Cabaña Física a Booking */}
      <AssignCabinModal
        reserva={assigningReserva}
        onClose={() => setAssigningReserva(null)}
        onAssign={handleAssignCabin}
        existingReservas={reservas}
      />

      {/* Modal: Cargar Google Calendar CSV */}
      <GoogleCalendarImportModal
        isOpen={isGoogleCalendarOpen}
        onClose={() => setIsGoogleCalendarOpen(false)}
        onImport={handleImportGoogleCalendar}
        existingReservas={reservas}
      />

      {/* Modal: Desbloquear Modo Propietario */}
      <UnlockAdminModal
        isOpen={isUnlockAdminOpen}
        onClose={() => setIsUnlockAdminOpen(false)}
        onSuccess={handleUnlockAdminSuccess}
      />

      {/* Asistente Flotante Xenia */}
      <XeniaChat reservas={reservas} gastos={gastos} theme={theme} />

      {/* Notificaciones Toast Charcoal */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A1F26] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm border border-[#2D3540] border-l-4 border-l-emerald-500 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toast.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
