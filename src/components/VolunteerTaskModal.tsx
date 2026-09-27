import React, { useState, useEffect } from 'react';
import { VolunteerTask, VolunteerId, VolunteerTaskType } from '../types';
import { 
  VOLUNTEER_TASK_META, 
  CABANAS, 
  DN, 
  formatDateExtended, 
  getVolunteerNames, 
  saveVolunteerNames 
} from '../services/cabinConfig';
import { X, Calendar, CheckCircle2, Trash2, Clock, Home, User, Edit2 } from 'lucide-react';

interface VolunteerTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: VolunteerTask) => void;
  onDeleteTask?: (taskId: string) => void;
  initialTask?: VolunteerTask | null;
  selectedVolunteerId: VolunteerId;
  selectedDate: string; // YYYY-MM-DD
  isDarkMode?: boolean;
  isDyslexiaMode?: boolean;
}

const QUICK_SUGGESTIONS: Record<VolunteerTaskType, string[]> = {
  limpieza: ['Limpieza de Cabaña', 'Limpieza profunda y desinfección', 'Cambio de sábanas y toallas', 'Repaso antes de check-in'],
  parque: ['Cortar pasto sector pileta', 'Desmalezar senderos y cabañas', 'Mantenimiento del bananal y plantas', 'Riego y limpieza de hojas'],
  mantenimiento: ['Pintura de decks y barandas', 'Revisión bombas de agua y filtros', 'Reparación de cerraduras / mosquiteros', 'Arreglo eléctrico o plomería'],
  checkin: ['Recibir huéspedes en recepción', 'Acompañar a cabaña y explicar normas', 'Preparar amenidades de bienvenida', 'Check-out y revisión de llaves'],
  libre: ['Día Libre / Franco Worldpackers', 'Medio día libre (tarde)', 'Excursión a Cataratas'],
  otro: ['Organización de depósito / lavandería', 'Inventario de blancos', 'Apoyo general recepción', 'Compras de insumos'],
};

export const VolunteerTaskModal: React.FC<VolunteerTaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  onDeleteTask,
  initialTask,
  selectedVolunteerId,
  selectedDate,
  isDarkMode = true,
  isDyslexiaMode = false,
}) => {
  const [volNames, setVolNames] = useState<Record<VolunteerId, string>>(() => getVolunteerNames());
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');

  const [tipo, setTipo] = useState<VolunteerTaskType>(initialTask?.tipo || 'limpieza');
  const [titulo, setTitulo] = useState<string>(initialTask?.titulo || '');
  const [horario, setHorario] = useState<string>(initialTask?.horario || '08:30 a 13:00');
  const [depto, setDepto] = useState<string>(initialTask?.depto || '');
  const [notas, setNotas] = useState<string>(initialTask?.notas || '');
  const [completada, setCompletada] = useState<boolean>(initialTask?.completada || false);

  useEffect(() => {
    if (isOpen) {
      const names = getVolunteerNames();
      setVolNames(names);
      setCustomName(names[selectedVolunteerId] || `Voluntario ${selectedVolunteerId === 'vol1' ? '1' : '2'}`);
      setIsEditingName(false);

      if (initialTask) {
        setTipo(initialTask.tipo);
        setTitulo(initialTask.titulo);
        setHorario(initialTask.horario || '08:30 a 13:00');
        setDepto(initialTask.depto || '');
        setNotas(initialTask.notas || '');
        setCompletada(initialTask.completada || false);
      } else {
        setTipo('limpieza');
        setTitulo('Limpieza de Cabaña');
        setHorario('08:30 a 13:00');
        setDepto('');
        setNotas('');
        setCompletada(false);
      }
    }
  }, [isOpen, initialTask, selectedVolunteerId]);

  if (!isOpen) return null;

  const handleSaveName = () => {
    const trimmed = customName.trim();
    if (trimmed) {
      const updated = { ...volNames, [selectedVolunteerId]: trimmed };
      setVolNames(updated);
      saveVolunteerNames(updated);
    }
    setIsEditingName(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const task: VolunteerTask = {
      id: initialTask?.id || ('task_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4)),
      voluntarioId: selectedVolunteerId,
      fecha: selectedDate,
      titulo: titulo.trim(),
      tipo,
      horario: horario.trim(),
      depto: depto || undefined,
      notas: notas.trim() || undefined,
      completada,
    };

    onSaveTask(task);
    onClose();
  };

  const volunteerDisplayName = volNames[selectedVolunteerId] || `Voluntario ${selectedVolunteerId === 'vol1' ? '1' : '2'}`;
  const meta = VOLUNTEER_TASK_META[tipo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className={`border-2 rounded-2xl w-full max-w-lg my-auto max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
          isDarkMode 
            ? 'bg-[#161B22] border-[#2D3540] text-[#F1F5F9]' 
            : 'bg-[#FCF8F2] border-[#DBCAB5] text-[#2A2118]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-4 sm:px-5 py-3.5 text-white flex items-center justify-between shrink-0"
          style={{ backgroundColor: meta.color }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-2xl p-1 bg-white/20 rounded-lg shrink-0">
              {meta.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-wider font-bold opacity-90 block">
                {initialTask ? 'Modificar Tarea' : 'Asignar Tarea diaria'} · {formatDateExtended(selectedDate)}
              </span>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="text"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      className="bg-black/30 border border-white/40 rounded px-2 py-0.5 text-sm font-bold text-white outline-none"
                      placeholder="Nombre del voluntario..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="px-2 py-0.5 bg-white text-[#2A2118] font-bold text-xs rounded hover:bg-slate-100"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingName(true)} title="Tocar para cambiar nombre">
                    <h2 className="text-base sm:text-lg font-bold leading-tight truncate">
                      {volunteerDisplayName}
                    </h2>
                    <Edit2 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-90"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={`p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 ${isDyslexiaMode ? 'dyslexia-enhanced' : ''}`}>
          {/* Selector de Tipo de Tarea */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C765C]'}`}>
              Tipo de Actividad
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(VOLUNTEER_TASK_META) as VolunteerTaskType[]).map(t => {
                const m = VOLUNTEER_TASK_META[t];
                const isSelected = tipo === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTipo(t);
                      if (!titulo || QUICK_SUGGESTIONS[tipo]?.includes(titulo)) {
                        setTitulo(QUICK_SUGGESTIONS[t][0] || '');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition active:scale-95 ${
                      isSelected
                        ? isDarkMode
                          ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-xs'
                          : 'border-[#D2502A] bg-[#FFF0ED] text-[#2A2118] font-bold shadow-xs'
                        : isDarkMode
                          ? 'border-[#2D3540] bg-[#12151A] text-[#94A3B8] hover:border-slate-600'
                          : 'border-[#E5D7C5] bg-white text-[#5A4838] hover:bg-[#FAF4EB]'
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-xs font-semibold leading-tight line-clamp-2">
                      {m.label.split('/')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sugerencias Rápidas */}
          <div>
            <span className={`text-[11px] font-bold block mb-1.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C765C]'}`}>
              Sugerencias rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS[tipo]?.map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTitulo(sug)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    titulo === sug
                      ? 'bg-emerald-500 text-white font-bold border-emerald-600'
                      : isDarkMode
                        ? 'bg-[#1A1F26] border-[#2D3540] text-[#CBD5E1] hover:bg-[#222933]'
                        : 'bg-[#FAF4EB] border-[#D4C3AE] text-[#4A3C2F] hover:bg-[#F0E6DA]'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Título / Descripción de la tarea */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#4A3C2F]'}`}>
              Descripción de la Tarea *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Limpieza profunda C5 y repaso de parque..."
              className={`w-full border-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition ${
                isDarkMode 
                  ? 'bg-[#12151A] border-[#2D3540] text-white focus:border-emerald-500' 
                  : 'bg-[#FAF5EE] border-[#D4C3AE] text-[#2A2118] focus:border-[#D2502A]'
              }`}
              required
            />
          </div>

          {/* Horario y Cabaña Vinculada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold mb-1 flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#4A3C2F]'}`}>
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Horario estimado</span>
              </label>
              <input
                type="text"
                value={horario}
                onChange={e => setHorario(e.target.value)}
                placeholder="Ej: 08:30 a 13:00"
                className={`w-full border-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none ${
                  isDarkMode 
                    ? 'bg-[#12151A] border-[#2D3540] text-white focus:border-emerald-500' 
                    : 'bg-[#FAF5EE] border-[#D4C3AE] text-[#2A2118] focus:border-[#D2502A]'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#4A3C2F]'}`}>
                <Home className="w-3.5 h-3.5 text-amber-500" />
                <span>Cabaña vinculada (opcional)</span>
              </label>
              <select
                value={depto}
                onChange={e => setDepto(e.target.value)}
                className={`w-full border-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold outline-none ${
                  isDarkMode 
                    ? 'bg-[#12151A] border-[#2D3540] text-white focus:border-emerald-500' 
                    : 'bg-[#FAF5EE] border-[#D4C3AE] text-[#2A2118] focus:border-[#D2502A]'
                }`}
              >
                <option value="">— Todo el complejo / General —</option>
                {CABANAS.map(c => (
                  <option key={c} value={c}>{DN[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas u observaciones */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#4A3C2F]'}`}>
              Notas y Detalles para el voluntario
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Herramientas a usar, prioridad, check-in a las 14hs..."
              className={`w-full border-2 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none ${
                isDarkMode 
                  ? 'bg-[#12151A] border-[#2D3540] text-white focus:border-emerald-500' 
                  : 'bg-[#FAF5EE] border-[#D4C3AE] text-[#2A2118] focus:border-[#D2502A]'
              }`}
            />
          </div>

          {/* Checkbox de Tarea Completada */}
          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
            completada 
              ? isDarkMode ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-[#E2EDDC] border-[#3F7D48] text-[#1E5624]' 
              : isDarkMode ? 'bg-[#12151A] border-[#2D3540] text-[#94A3B8]' : 'bg-[#FAF5EE] border-[#E5D7C5] text-[#5A4838]'
          }`}>
            <input
              type="checkbox"
              checked={completada}
              onChange={e => setCompletada(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
            />
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <CheckCircle2 className={`w-4 h-4 ${completada ? 'text-emerald-500' : 'opacity-40'}`} />
              <span>{completada ? '¡Tarea Completada ✓!' : 'Marcar como tarea realizada / completada'}</span>
            </div>
          </label>

          {/* Botones de acción */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/40">
            {initialTask && onDeleteTask ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Eliminar esta tarea asignada al voluntario?')) {
                    onDeleteTask(initialTask.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs sm:text-sm rounded-xl border border-rose-500/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Borrar Tarea</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition ${
                  isDarkMode 
                    ? 'bg-[#1E242D] hover:bg-[#2A3340] text-[#CBD5E1]' 
                    : 'bg-[#E8DDD0] hover:bg-[#DDD0C0] text-[#423223]'
                }`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <span>Guardar Tarea ✓</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
