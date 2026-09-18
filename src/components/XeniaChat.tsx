import React, { useState, useRef, useEffect } from 'react';
import { Reserva, Gasto } from '../types';
import { DN, calcFinancials, formatMoney, formatDateEs, CABANAS } from '../services/cabinConfig';
import { 
  X, 
  Send, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Sliders, 
  Square, 
  Play, 
  AlertCircle, 
  Camera, 
  RotateCcw,
  Sparkles,
  Upload
} from 'lucide-react';

interface XeniaChatProps {
  reservas: Reserva[];
  gastos: Gasto[];
  theme?: 'dark' | 'light';
}

// Ilustración vectorial tropical de Xenia estilo Carmen Miranda
const XeniaIllustration: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Fondo oscuro tropical */}
    <circle cx="50" cy="50" r="49" fill="#20112A" />
    
    {/* Aros grandes rosados */}
    <circle cx="25" cy="67" r="7.5" stroke="#F43F5E" strokeWidth="2.5" fill="none" />
    <circle cx="75" cy="67" r="7.5" stroke="#F43F5E" strokeWidth="2.5" fill="none" />
    
    {/* Cuello y blusa lima */}
    <path d="M37 77 C37 87, 34 94, 23 100 L77 100 C66 94, 63 87, 63 77 Z" fill="#BEF264" opacity="0.8" />
    <path d="M43 75 C43 83, 57 83, 57 75 L57 69 L43 69 Z" fill="#FCE7F3" />
    
    {/* Rostro sonriente */}
    <ellipse cx="50" cy="62" rx="17" ry="19" fill="#FED7AA" />
    
    {/* Rubor en las mejillas */}
    <ellipse cx="39" cy="65" rx="3.5" ry="2" fill="#FB7185" opacity="0.6" />
    <ellipse cx="61" cy="65" rx="3.5" ry="2" fill="#FB7185" opacity="0.6" />
    
    {/* Ojos celestes y sombras azules */}
    <ellipse cx="43" cy="58" rx="3.5" ry="2" fill="#38BDF8" />
    <circle cx="43" cy="58" r="1.5" fill="#0F172A" />
    <path d="M39 55 Q43 53 47 55" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" />
    
    <ellipse cx="57" cy="58" rx="3.5" ry="2" fill="#38BDF8" />
    <circle cx="57" cy="58" r="1.5" fill="#0F172A" />
    <path d="M53 55 Q57 53 61 55" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" />
    
    {/* Sonrisa con labios fucsia y dientes */}
    <path d="M43 69 Q50 77 57 69 Z" fill="#E11D48" />
    <path d="M45 69 Q50 72 55 69 Z" fill="#FFFFFF" />

    {/* Turbante violeta brillante con purpurina */}
    <path d="M30 52 C30 36, 70 36, 70 52 C70 56, 68 58, 65 58 C60 52, 40 52, 35 58 C32 58, 30 56, 30 52 Z" fill="#4C1D95" />
    <path d="M33 46 C36 34, 64 34, 67 46 C59 39, 41 39, 33 46 Z" fill="#6B21A8" />
    <circle cx="42" cy="45" r="0.9" fill="#FDE047" />
    <circle cx="51" cy="42" r="1.1" fill="#FDE047" />
    <circle cx="58" cy="46" r="0.9" fill="#FDE047" />

    {/* Flor amarilla (Crisantemo/Dalia) */}
    <circle cx="36" cy="30" r="9" fill="#EAB308" />
    <circle cx="35" cy="29" r="6" fill="#FDE047" />
    <circle cx="36" cy="30" r="3" fill="#CA8A04" />

    {/* Manzana roja brillante */}
    <circle cx="38" cy="39" r="8" fill="#DC2626" />
    <ellipse cx="36" cy="37" rx="2.5" ry="4" fill="#EF4444" />
    <path d="M38 31 Q39 29 40 27" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="39" cy="36" r="1.2" fill="#FEF08A" />

    {/* Flor roja (Hibiscus/Dalia grande) */}
    <circle cx="58" cy="35" r="10" fill="#DC2626" />
    <circle cx="58" cy="35" r="7" fill="#B91C1C" />
    <circle cx="58" cy="35" r="4" fill="#991B1B" />

    {/* Piña / Ananá tropical en la cima */}
    <ellipse cx="58" cy="19" rx="7" ry="8.5" fill="#D97706" />
    <path d="M52 19 L64 19 M54 15 L62 15 M54 23 L62 23" stroke="#78350F" strokeWidth="0.8" />
    {/* Hojas verdes del ananá */}
    <path d="M58 11 L54 1 L58 7 L62 0 L60 7 L67 2 L61 11 Z" fill="#16A34A" />
  </svg>
);

export const XeniaChat: React.FC<XeniaChatProps> = ({ reservas, gastos, theme = 'dark' }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string; id: string }>>([
    {
      id: 'init-1',
      role: 'bot',
      text: '¡Hola! Soy Xenia, tu asistente en Los Bananos 🍍🌿 Podés hablarme con el micrófono o escuchar mis respuestas. Preguntame quién llega hoy, qué cabañas están libres o cuánto generaste en el mes.',
    },
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Avatar personalizado de Xenia (guarda base64 en localStorage o usa la foto oficial)
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    return localStorage.getItem('bn_xenia_avatar') || null;
  });
  const [defaultAvatarError, setDefaultAvatarError] = useState<boolean>(false);
  const officialAvatarPath = './xeniabananos.jpeg';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Voz (TTS) y Micrófono (STT)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  
  // Por defecto la voz está ACTIVADA
  const [autoVoice, setAutoVoice] = useState<boolean>(() => {
    const saved = localStorage.getItem('bn_xenia_autovoice');
    return saved === null ? true : saved === 'true';
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [micStatusText, setMicStatusText] = useState<string>('');
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);

  // Selector y calibración de Voz Femenina Rioplatense
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(() => {
    return localStorage.getItem('bn_xenia_voice_uri') || '';
  });
  const [showVoiceSelect, setShowVoiceSelect] = useState<boolean>(false);
  const voicePitch = 1.15;
  const voiceRate = 1.0;

  const recognitionRef = useRef<any>(null);
  const recordedTranscriptRef = useRef<string>('');
  const isDark = theme === 'dark';

  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().split('T')[0];

  // Chequeo de soporte de voz
  const isTTSAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const SpeechRecognitionAPI = typeof window !== 'undefined' 
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
    : null;
  const isSpeechRecAvailable = Boolean(SpeechRecognitionAPI);

  // Procesar archivo de imagen
  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomAvatar(base64);
      localStorage.setItem('bn_xenia_avatar', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleResetAvatar = () => {
    setCustomAvatar(null);
    localStorage.removeItem('bn_xenia_avatar');
  };

  // Drag and drop para la imagen
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Renderizador del Avatar: muestra la foto real subida, la oficial xeniabananos.jpeg o la ilustración
  const activeAvatarSrc = customAvatar || (!defaultAvatarError ? officialAvatarPath : null);

  const renderAvatar = (sizeClass = 'w-8 h-8', showClickToUpload = false) => {
    return (
      <div 
        onClick={showClickToUpload ? () => fileInputRef.current?.click() : undefined}
        title={showClickToUpload ? 'Tocá para cambiar o cargar la foto de Xenia' : 'Xenia de Los Bananos'}
        className={`${sizeClass} rounded-full overflow-hidden relative shrink-0 border-2 border-amber-400 shadow-md flex items-center justify-center bg-amber-950/40 ${
          showClickToUpload ? 'cursor-pointer hover:opacity-90 hover:scale-105 transition' : ''
        }`}
      >
        {activeAvatarSrc ? (
          <img
            src={activeAvatarSrc}
            alt="Xenia Tropical"
            onError={() => {
              if (!customAvatar) {
                setDefaultAvatarError(true);
              }
            }}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <XeniaIllustration className="w-full h-full object-cover" />
        )}
      </div>
    );
  };

  // Puntuación de voces para priorizar voz femenina rioplatense natural
  const rankVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const lang = v.lang.toLowerCase().replace('_', '-');
    const name = v.name.toLowerCase();

    // Descartar tajantemente cualquier voz masculina
    const maleKeywords = ['male', 'hombre', 'masculin', 'diego', 'jorge', 'raul', 'tomas', 'pablo', 'carlos', 'miguel', 'juan', 'alvaro', 'gonzalo', 'enrique', 'david', 'antonio', 'manuel'];
    if (maleKeywords.some(m => name.includes(m))) {
      return -10000;
    }

    // Acento argentino y uruguayo
    if (lang === 'es-ar') score += 1000;
    else if (lang === 'es-uy') score += 800;
    else if (lang === 'es-419') score += 500;
    else if (lang === 'es-es') score += 100;
    else if (lang.startsWith('es-')) score += 200;
    else if (lang.startsWith('es')) score += 150;
    else return -10000;

    // Femenina comprobada
    const femaleKeywords = [
      'female', 'mujer', 'femenin', 'zira', 'sabina', 'helena', 'elena', 
      'paulina', 'isabela', 'camila', 'luciana', 'valentina', 'soledad', 
      'victoria', 'monica', 'valeria', 'sofia', 'maria', 'laura', 'natural', 'neural', 'hilda'
    ];
    if (femaleKeywords.some(f => name.includes(f))) {
      score += 400;
    }

    if (name.includes('google')) score += 50;

    return score;
  };

  const loadVoices = () => {
    if (!isTTSAvailable) return;
    const all = window.speechSynthesis.getVoices();
    if (!all || all.length === 0) return;

    // Filtrar español y excluir nombres típicamente masculinos
    const maleKeywords = ['male', 'hombre', 'diego', 'jorge', 'raul', 'tomas', 'pablo', 'carlos', 'miguel', 'juan', 'alvaro', 'gonzalo', 'enrique', 'david'];
    const femaleOrNeutral = all.filter(v => {
      if (!v.lang.toLowerCase().startsWith('es')) return false;
      const n = v.name.toLowerCase();
      return !maleKeywords.some(m => n.includes(m));
    });

    // Ordenar de mayor a menor según prioridad rioplatense femenina
    femaleOrNeutral.sort((a, b) => rankVoice(b) - rankVoice(a));

    const finalVoices = femaleOrNeutral.length > 0 
      ? femaleOrNeutral 
      : all.filter(v => v.lang.toLowerCase().startsWith('es'));

    setAvailableVoices(finalVoices);

    const saved = localStorage.getItem('bn_xenia_voice_uri');
    const isSavedValidAndFemale = saved && finalVoices.some(v => v.voiceURI === saved);

    if (isSavedValidAndFemale) {
      setSelectedVoiceUri(saved);
    } else if (finalVoices.length > 0) {
      // Elegir directamente la número 1 (la mujer rioplatense mejor calificada)
      setSelectedVoiceUri(finalVoices[0].voiceURI);
      localStorage.setItem('bn_xenia_voice_uri', finalVoices[0].voiceURI);
    }
  };

  useEffect(() => {
    if (!isTTSAvailable) return;
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isTTSAvailable]);

  useEffect(() => {
    return () => {
      if (isTTSAvailable) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [isTTSAvailable]);

  const speakText = (rawText: string, messageId?: string) => {
    if (!isTTSAvailable) return;

    window.speechSynthesis.cancel();

    if (isSpeaking && speakingMessageId === messageId) {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    const clean = rawText
      .replace(/[•\*\#_🌿👑📊⚙️💰✓✕🇦🇷🌎🎙️📅🍍📸]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '. ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;

    // Obtener la mejor voz femenina disponible
    const allVoices = window.speechSynthesis.getVoices();
    const isFemale = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      const isMale = ['male', 'hombre', 'diego', 'jorge', 'raul', 'tomas', 'pablo', 'carlos', 'miguel', 'juan'].some(m => n.includes(m));
      return !isMale;
    };

    let chosenVoice = availableVoices.find(v => v.voiceURI === selectedVoiceUri);
    if (!chosenVoice || !isFemale(chosenVoice)) {
      // Buscar primera voz femenina en español
      chosenVoice = availableVoices.find(isFemale) || allVoices.find(v => v.lang.toLowerCase().startsWith('es') && isFemale(v));
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = 'es-AR';
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (messageId) setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (isTTSAvailable) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const toggleAutoVoice = () => {
    const next = !autoVoice;
    setAutoVoice(next);
    localStorage.setItem('bn_xenia_autovoice', String(next));
    if (!next) {
      stopSpeaking();
    }
  };

  const toggleListening = () => {
    setMicErrorMsg(null);

    if (!isSpeechRecAvailable) {
      setMicErrorMsg('Tu navegador no tiene activado el reconocimiento de voz. Podés tipear o probar en Google Chrome.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      setIsListening(false);
      setMicStatusText('');
      if (recordedTranscriptRef.current.trim()) {
        const textToSend = recordedTranscriptRef.current.trim();
        recordedTranscriptRef.current = '';
        setInputVal('');
        sendMessage(textToSend, true);
      }
      return;
    }

    stopSpeaking();
    recordedTranscriptRef.current = '';
    setMicStatusText('Escuchando tu voz...');

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'es-AR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setMicErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }

        if (currentTranscript.trim()) {
          recordedTranscriptRef.current = currentTranscript;
          setInputVal(currentTranscript);
          setMicStatusText(`"${currentTranscript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Error de micrófono:', event.error);
        setIsListening(false);
        setMicStatusText('');
        if (event.error === 'not-allowed') {
          setMicErrorMsg('Permiso de micrófono no habilitado en el navegador. Tocá permitir en la barra de direcciones o abrí la app en pestaña nueva.');
        } else if (event.error === 'no-speech') {
          setMicErrorMsg('No se detectó sonido. Intentá hablar más cerca del micrófono.');
        } else {
          setMicErrorMsg('No se pudo captar el audio. Podés intentar nuevamente.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setMicStatusText('');

        const finalQuestion = recordedTranscriptRef.current.trim();
        if (finalQuestion) {
          recordedTranscriptRef.current = '';
          setInputVal('');
          sendMessage(finalQuestion, true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setMicStatusText('');
      setMicErrorMsg('No se pudo iniciar el micrófono en este momento.');
    }
  };

  const handleAsk = (question: string) => {
    sendMessage(question, false);
  };

  const handleSend = () => {
    if (!inputVal.trim()) return;
    sendMessage(inputVal.trim(), false);
    setInputVal('');
  };

  const sendMessage = async (userText: string, fromVoice = false) => {
    // Detener de inmediato cualquier locución previa en cola para evitar que se pisen las respuestas
    stopSpeaking();

    const newMsgId = Date.now().toString(36);
    setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: userText }]);
    setIsTyping(true);

    const qLower = userText.toLowerCase().trim();

    setTimeout(() => {
      let botResponse = '';

      // 1. Preguntas de ayuda / cómo hacer una reserva o usar el sistema
      if (
        qLower.includes('como hago una reserva') || 
        qLower.includes('como creo una reserva') || 
        qLower.includes('como cargar') || 
        qLower.includes('como anoto') ||
        qLower.includes('nueva reserva') ||
        qLower.includes('cargar reserva') ||
        qLower.includes('agregar reserva')
      ) {
        botResponse = 'Para crear una nueva reserva podés:\n1. Tocar el botón verde "+ Nueva Reserva" arriba a la izquierda.\n2. O hacer clic directamente sobre el día de entrada en el calendario para la cabaña que quieras.\nSe abrirá la ficha para ingresar nombre del huésped, fechas, tarifa y seña.';
      }
      // 2. Saludos
      else if (
        qLower.startsWith('hola') || qLower.startsWith('buen') || qLower.startsWith('buenas') || 
        qLower.includes('cómo estás') || qLower.includes('como andas') || qLower.includes('que tal') ||
        qLower === 'xenia' || qLower === 'hola xenia'
      ) {
        const act = reservas.filter(
          r => r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin <= today && r.checkout > today
        );
        botResponse = `¡Hola! ¿Cómo andás? Todo en orden por acá en Los Bananos 🍍 Hoy tenemos ${act.length} de las 7 cabañas ocupadas. ¿Querés que te cuente quién llega, qué cabañas están libres o cómo vienen las ganancias?`;
      }
      // 3. Próximo huésped / Próximo check-in / Entradas (¡PRIORIDAD ANTES DE CASILLAS!)
      else if (
        qLower.includes('check in') || qLower.includes('check-in') || qLower.includes('checkin') ||
        qLower.includes('proximo') || qLower.includes('proxima') || qLower.includes('siguiente') ||
        qLower.includes('llega') || qLower.includes('entran') || qLower.includes('viene') || 
        qLower.includes('vienen') || qLower.includes('cuando entra') || qLower.includes('quien entra')
      ) {
        if (qLower.includes('hoy')) {
          const hoyCheckin = reservas.filter(
            r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin === today
          );
          if (hoyCheckin.length === 0) {
            botResponse = 'Hoy no tenés check-ins programados en ninguna cabaña. Todo en calma.';
          } else {
            botResponse = `Hoy llegan ${hoyCheckin.length} huéspedes:\n` +
              hoyCheckin.map(r => `• ${r.huesped} en ${DN[r.depto]} (${r.plataforma})`).join('\n');
          }
        } else if (qLower.includes('mañana')) {
          const manCheckin = reservas.filter(
            r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin === tomorrow
          );
          if (manCheckin.length === 0) {
            botResponse = 'Mañana no hay check-ins previstos.';
          } else {
            botResponse = `Mañana llegan ${manCheckin.length} huéspedes:\n` +
              manCheckin.map(r => `• ${r.huesped} en ${DN[r.depto]}`).join('\n');
          }
        } else {
          // Próximo check-in o próximos huéspedes (sin límite artificial de 7 días)
          const futurosCheckins = reservas
            .filter(r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin >= today)
            .sort((a, b) => a.checkin.localeCompare(b.checkin));

          if (futurosCheckins.length === 0) {
            botResponse = 'Por el momento no hay futuros check-ins registrados en las cabañas.';
          } else {
            const primerCheckin = futurosCheckins[0];
            const mismosDia = futurosCheckins.filter(r => r.checkin === primerCheckin.checkin);
            
            if (mismosDia.length === 1) {
              botResponse = `El próximo check-in es de ${primerCheckin.huesped} el ${formatDateEs(primerCheckin.checkin)} en ${DN[primerCheckin.depto]} (${primerCheckin.plataforma}). Se queda hasta el ${formatDateEs(primerCheckin.checkout)}.`;
            } else {
              botResponse = `El próximo ingreso es el ${formatDateEs(primerCheckin.checkin)} con ${mismosDia.length} huéspedes:\n` +
                mismosDia.map(r => `• ${r.huesped} en ${DN[r.depto]} (${r.plataforma})`).join('\n');
            }

            // Si hay más reservas en los siguientes días, agregar un breve resumen
            const siguientes = futurosCheckins.filter(r => r.checkin > primerCheckin.checkin).slice(0, 3);
            if (siguientes.length > 0) {
              botResponse += `\n\nLuego le siguen:\n` + siguientes.map(r => `• ${r.huesped}: ${formatDateEs(r.checkin)} (${DN[r.depto]})`).join('\n');
            }
          }
        }
      }
      // 4. Salidas / Check-out
      else if (qLower.includes('check out') || qLower.includes('check-out') || qLower.includes('checkout') || qLower.includes('sale') || qLower.includes('salen') || qLower.includes('se va') || qLower.includes('se van') || qLower.includes('salida')) {
        const checkoutsHoy = reservas.filter(
          r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkout === today
        );
        if (checkoutsHoy.length === 0) {
          const proxCheckout = reservas
            .filter(r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkout >= today)
            .sort((a, b) => a.checkout.localeCompare(b.checkout))[0];
          
          if (proxCheckout) {
            botResponse = `Hoy no hay salidas programadas. El próximo check-out es el ${formatDateEs(proxCheckout.checkout)}: ${proxCheckout.huesped} deja ${DN[proxCheckout.depto]}.`;
          } else {
            botResponse = 'Hoy no hay salidas programadas. Todos los huéspedes continúan su estadía.';
          }
        } else {
          botResponse = `Hoy hacen check-out ${checkoutsHoy.length} huéspedes:\n` +
            checkoutsHoy.map(r => `• ${r.huesped} deja ${DN[r.depto]}`).join('\n');
        }
      }
      // 5. Explicación de las casillas compartimentadas (solo si pregunta específicamente por casillas / diseño)
      else if (qLower.includes('compartiment') || qLower.includes('casilla') || (qLower.includes('dividid') && (qLower.includes('dia') || qLower.includes('calendario')))) {
        botResponse = 'Las casillas compartimentadas del calendario dividen el día en dos:\n• Lado izquierdo OUT: el huésped que hace check-out por la mañana.\n• Lado derecho IN: el nuevo huésped que hace check-in por la tarde.\nPodés tocar cualquiera de los dos lados para abrir la ficha de esa reserva en particular.';
      }
      // 6. Modos de usuario
      else if (qLower.includes('usuario') || qLower.includes('modo') || qLower.includes('recep') || qLower.includes('dia a dia') || qLower.includes('propietario')) {
        botResponse = 'Los Bananos tiene 2 modos de uso:\n\n1. Modo Día a Día: Solo tenés el calendario limpio y el botón de carga. Es ideal para trabajar sin distracciones financieras ni pantallas complejas. ¡A mí podés preguntarme lo que quieras por voz desde acá!\n\n2. Modo Propietario: Acceso completo con PIN 1234 para ver finanzas, gastos, Google Calendar y configurar iCal.';
      }
      // 7. Google Calendar y sincronización
      else if (qLower.includes('google') || qLower.includes('csv') || qLower.includes('importar') || qLower.includes('sincroniz')) {
        botResponse = 'Para cargar tu Google Calendar:\n1. Arriba a la derecha tocá el botón Google Calendar.\n2. Subí tu archivo .CSV exportado de Google Calendar.\n3. Vas a ver la vista previa con cada evento asignado a su cabaña. Si querés corregís algo y tocás Importar Reservas para que queden registradas.';
      }
      else if (qLower.includes('cabaña') || qLower.includes('depto') || qLower.match(/cab\s*\d/) || qLower.match(/la\s*[1-7]/)) {
        const match = qLower.match(/[1-7]/);
        if (match) {
          const cNum = match[0] as unknown as keyof typeof DN;
          const currentOccupant = reservas.find(
            r => r.depto === cNum && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin <= today && r.checkout > today
          );
          const nextGuest = reservas
            .filter(r => r.depto === cNum && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin >= today)
            .sort((a, b) => a.checkin.localeCompare(b.checkin))[0];

          if (currentOccupant) {
            botResponse = `En ${DN[cNum]} hoy está alojado ${currentOccupant.huesped} hasta el ${formatDateEs(currentOccupant.checkout)} (${currentOccupant.plataforma}).`;
            if (nextGuest && nextGuest.id !== currentOccupant.id) {
              botResponse += ` Su próximo huésped es ${nextGuest.huesped}, que entra el ${formatDateEs(nextGuest.checkin)}.`;
            }
          } else if (nextGuest) {
            botResponse = `${DN[cNum]} está libre hoy. Su próxima reserva es de ${nextGuest.huesped}, entrando el ${formatDateEs(nextGuest.checkin)} (${nextGuest.plataforma}).`;
          } else {
            botResponse = `${DN[cNum]} está completamente libre hoy y no tiene reservas registradas en los próximos días.`;
          }
        } else {
          botResponse = 'Los Bananos tiene 7 cabañas: Cabaña 1 a 6 para 4 huéspedes, y Cabaña 7 para 6 huéspedes. ¿De cuál querés información?';
        }
      }

      else if (
        qLower.includes('libre') || qLower.includes('libres') || qLower.includes('disponib') || 
        qLower.includes('ocupad') || qLower.includes('hay lugar') || qLower.includes('vacia')
      ) {
        const act = reservas.filter(
          r => r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin <= today && r.checkout > today
        );
        const ocupadasSet = new Set(act.map(r => r.depto));
        const libres = CABANAS.filter(c => !ocupadasSet.has(c));

        if (libres.length === 0) {
          botResponse = `¡Complejo lleno! Hoy tenés las 7 cabañas 100% ocupadas.`;
        } else {
          botResponse = `Hoy tenés ${libres.length} cabañas libres de las 7. Las disponibles son: ${libres.map(c => DN[c]).join(', ')}.`;
        }
      }
      else if (
        qLower.includes('cuanto') || qLower.includes('mes') || qLower.includes('gener') || 
        qLower.includes('ingreso') || qLower.includes('plata') || qLower.includes('rendimiento') || 
        qLower.includes('ganancia') || qLower.includes('dinero') || qLower.includes('balance')
      ) {
        const currentM = new Date().getMonth();
        const currentY = new Date().getFullYear();
        const em = reservas.filter(r => {
          if (r.estado === 'Cancelada' || r.estado === 'Non show' || !!r.icalUid) return false;
          const d = new Date(r.checkin);
          return d.getMonth() === currentM && d.getFullYear() === currentY;
        });
        const liqTotal = em.reduce((s, r) => s + calcFinancials(r).liq, 0);
        botResponse = `En lo que va del mes, el líquido neto generado para vos por las cabañas es de ${formatMoney(liqTotal)} en ${em.length} reservas activas.`;
      }
      else if (qLower.includes('pago') || qLower.includes('pendiente') || qLower.includes('saldo') || qLower.includes('cobrar') || qLower.includes('debe')) {
        const conSaldo = reservas.filter(r => {
          if (r.estado === 'Cancelada' || r.estado === 'Non show' || !!r.icalUid) return false;
          const fin = calcFinancials(r);
          const cobrado = (r.sena || 0) + (r.saldo || 0);
          return cobrado < fin.liq && r.checkout >= today;
        });

        if (conSaldo.length === 0) {
          botResponse = '¡Buenas noticias! Todas las reservas activas y futuras tienen el cobro saldado al día.';
        } else {
          botResponse = `Hay ${conSaldo.length} reservas con saldo pendiente de cobro:\n` +
            conSaldo.slice(0, 5).map(r => {
              const fin = calcFinancials(r);
              const falta = fin.liq - ((r.sena || 0) + (r.saldo || 0));
              return `• ${r.huesped} (${DN[r.depto]}): falta ${formatMoney(falta)}`;
            }).join('\n');
        }
      }
      else {
        botResponse = `Te escuché: "${userText}". Podés preguntarme quién llega hoy o esta semana, qué cabañas están libres, cuánto generaste en el mes o quién está en una cabaña puntual.`;
      }

      setIsTyping(false);
      const botMsgId = Date.now().toString(36) + 'b';
      setMessages(prev => [...prev, { id: botMsgId, role: 'bot', text: botResponse }]);

      if (fromVoice || autoVoice) {
        speakText(botResponse, botMsgId);
      }
    }, 400);
  };

  const selectedVoiceObj = availableVoices.find(v => v.voiceURI === selectedVoiceUri);

  return (
    <>
      {/* Input oculto para cargar xeniabananos.jpeg */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Botón Flotante Xenia con Foto Oficial de Carmen Miranda */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) stopSpeaking();
        }}
        title="Xenia de Los Bananos (Asistente de Voz)"
        className={`fixed bottom-5 right-5 sm:right-7 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition transform active:scale-95 cursor-pointer ${
          isSpeaking 
            ? 'ring-4 ring-amber-400 animate-pulse' 
            : 'hover:scale-105'
        }`}
      >
        {isOpen ? (
          <div className="w-full h-full rounded-full bg-slate-900 border-2 border-emerald-400 text-white flex items-center justify-center shadow-xl">
            <X className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-full h-full rounded-full relative">
            {renderAvatar('w-full h-full')}
            {isSpeaking && (
              <div className="absolute inset-0 bg-amber-500/40 rounded-full flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white animate-bounce" />
              </div>
            )}
          </div>
        )}
      </button>

      {/* Ventana de Chat Flotante fija estrictamente a la derecha */}
      {isOpen && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '88px',
            left: 'auto',
            zIndex: 9999
          }}
          className={`w-[calc(100vw-32px)] sm:w-[380px] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] max-h-[calc(100vh-110px)] animate-in slide-in-from-bottom-5 duration-200 border relative ${
            isDark 
              ? 'bg-[#161A20] border-[#2D3540] text-[#F1F5F9]' 
              : 'bg-white border-[#CBD5E1] text-[#0F172A]'
          }`}
        >
          {/* Overlay si arrastra la foto sobre el chat */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-emerald-950/80 border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-xs">
              <Upload className="w-12 h-12 text-emerald-400 animate-bounce mb-2" />
              <p className="font-bold text-sm">¡Soltá tu foto de Xenia acá!</p>
              <p className="text-xs text-emerald-200">Se guardará automáticamente como su avatar</p>
            </div>
          )}

          {/* Header Charcoal con Avatar de Xenia */}
          <div className="bg-[#12151A] p-3 text-white flex items-center justify-between border-b border-[#2D3540]">
            <div className="flex items-center gap-2.5">
              <div className="relative group">
                {renderAvatar('w-10 h-10')}
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-[#12151A] animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-sm block leading-tight flex items-center gap-1.5">
                  Xenia
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tropical 🍍
                  </span>
                  {isSpeaking && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Volume2 className="w-3 h-3 animate-pulse" /> Hablando
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  Voz Oficial Femenina 🇦🇷
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Botón para cambiar entre las voces femeninas de tu navegador */}
              {availableVoices.length > 1 && (
                <button
                  onClick={() => setShowVoiceSelect(!showVoiceSelect)}
                  title="Elegir voz de Xenia"
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center gap-1 cursor-pointer ${
                    showVoiceSelect
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-[#1A1F26] text-slate-400 border-[#2D3540] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Voz</span>
                </button>
              )}

              {/* Interruptor Voz Automática ON/OFF */}
              <button
                onClick={toggleAutoVoice}
                title={autoVoice ? 'Voz activa: Xenia lee cada respuesta en voz alta' : 'Voz silenciada'}
                className={`px-2 py-1 rounded-lg border transition text-xs flex items-center gap-1 cursor-pointer ${
                  autoVoice 
                    ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-xs' 
                    : 'bg-[#1A1F26] text-slate-400 border-[#2D3540] hover:text-white'
                }`}
              >
                {autoVoice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-semibold">{autoVoice ? 'Voz ON' : 'Silencio'}</span>
              </button>

              {/* Parar voz si está hablando */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  title="Detener audio"
                  className="p-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                title="Cerrar"
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Menú Rápido para elegir la voz femenina que más te guste de tu computadora */}
          {showVoiceSelect && (
            <div className={`p-3 border-b text-xs space-y-2 animate-in slide-in-from-top-1 duration-150 ${
              isDark ? 'bg-[#151921] border-[#2D3540] text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Voces disponibles en tu equipo:
                </span>
                <button
                  onClick={() => speakText('¡Hola! Soy Xenia de Cabañas Los Bananos. ¿En qué te puedo ayudar hoy?')}
                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] shadow-xs cursor-pointer"
                >
                  Probar esta voz
                </button>
              </div>

              <select
                value={selectedVoiceUri}
                onChange={(e) => {
                  const uri = e.target.value;
                  setSelectedVoiceUri(uri);
                  localStorage.setItem('bn_xenia_voice_uri', uri);
                  // Hablar inmediatamente una frase de prueba para que escuche si le gusta
                  setTimeout(() => {
                    speakText('¡Hola! Soy Xenia de Los Bananos.');
                  }, 50);
                }}
                className={`w-full p-2 rounded-lg text-xs outline-none border transition ${
                  isDark 
                    ? 'bg-[#1E242E] border-[#363F4D] text-white' 
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {availableVoices.map((v) => {
                  const isAr = v.lang.toLowerCase().includes('ar') || v.lang.toLowerCase().includes('uy');
                  return (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {isAr ? '🇦🇷' : '👩'} {v.name} ({v.lang})
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-400">
                Al seleccionar una voz queda guardada para siempre en este equipo sin desenfocar.
              </p>
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs sm:text-sm">
            {messages.map((m) => {
              const isCurrentSpeaking = isSpeaking && speakingMessageId === m.id;

              return (
                <div key={m.id} className="space-y-1">
                  <div className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'bot' && renderAvatar('w-7 h-7', true)}
                    
                    <div
                      className={`p-3 rounded-xl max-w-[82%] leading-relaxed relative group ${
                        m.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : isDark
                            ? `bg-[#1F252E] border text-[#F1F5F9] rounded-bl-xs shadow-xs whitespace-pre-line ${
                                isCurrentSpeaking ? 'border-amber-400/80 shadow-md shadow-amber-500/10' : 'border-[#2D3540]'
                              }`
                            : `bg-slate-50 border text-[#0F172A] rounded-bl-xs shadow-xs whitespace-pre-line ${
                                isCurrentSpeaking ? 'border-amber-500 shadow-md' : 'border-[#E2E8F0]'
                              }`
                      }`}
                    >
                      {m.text}

                      {/* Botón de audio para respuestas del bot */}
                      {m.role === 'bot' && isTTSAvailable && (
                        <div className="pt-2 mt-1 border-t border-slate-700/40 flex items-center justify-between">
                          <button
                            onClick={() => speakText(m.text, m.id)}
                            title={isCurrentSpeaking ? 'Pausar audio' : 'Escuchar a Xenia hablar esta respuesta'}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                              isCurrentSpeaking 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                          >
                            {isCurrentSpeaking ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                <span>Detener</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Escuchar voz</span>
                              </>
                            )}
                          </button>

                          <span className="text-[10px] text-slate-500">
                            {selectedVoiceObj?.lang?.includes('AR') ? '🇦🇷 Rioplatense' : 'Voz Femenina'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2">
                {renderAvatar('w-7 h-7')}
                <div className={`p-3 rounded-xl text-xs inline-block ${
                  isDark ? 'bg-[#1F252E] border border-[#2D3540] text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  Xenia está preparando tu respuesta...
                </div>
              </div>
            )}
          </div>

          {/* Avisos de Micrófono o Transcripción en Vivo */}
          {micStatusText && (
            <div className="px-3 py-1.5 bg-rose-950/40 border-t border-rose-800/40 text-rose-300 text-[11px] flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="truncate">{micStatusText}</span>
            </div>
          )}

          {micErrorMsg && (
            <div className="px-3 py-2 bg-amber-950/60 border-t border-amber-800/50 text-amber-200 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="leading-tight">{micErrorMsg}</span>
            </div>
          )}

          {/* Preguntas Frecuentes Rápidas */}
          <div className={`p-2 border-t flex gap-1.5 overflow-x-auto text-[11px] scrollbar-none ${
            isDark ? 'bg-[#12151A] border-[#2D3540]' : 'bg-slate-50 border-[#E2E8F0]'
          }`}>
            <button
              onClick={() => handleAsk('¿Quién llega esta semana?')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition border cursor-pointer ${
                isDark 
                  ? 'bg-[#1A1F26] border-[#2D3540] text-slate-200 hover:bg-[#252C37]' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🎙️ ¿Quién llega?
            </button>
            <button
              onClick={() => handleAsk('¿Hay cabañas libres hoy?')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition border cursor-pointer ${
                isDark 
                  ? 'bg-[#1A1F26] border-[#2D3540] text-slate-200 hover:bg-[#252C37]' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🌿 Disponibilidad
            </button>
            <button
              onClick={() => handleAsk('¿Cuánto generé este mes?')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition border cursor-pointer ${
                isDark 
                  ? 'bg-[#1A1F26] border-[#2D3540] text-slate-200 hover:bg-[#252C37]' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              💰 Ganancias mes
            </button>
            <button
              onClick={() => handleAsk('¿Quién está en la Cabaña 1?')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition border cursor-pointer ${
                isDark 
                  ? 'bg-[#1A1F26] border-[#2D3540] text-slate-200 hover:bg-[#252C37]' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🏡 Cabaña 1
            </button>
          </div>

          {/* Barra de Entrada de Voz y Texto */}
          <div className={`p-2.5 border-t flex items-center gap-2 ${
            isDark ? 'bg-[#12151A] border-[#2D3540]' : 'bg-white border-[#E2E8F0]'
          }`}>
            {/* Botón de Micrófono para Dictarle */}
            <button
              onClick={toggleListening}
              title={isListening ? 'Tocá para detener y enviar' : 'Hablarle a Xenia por micrófono'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/30'
                  : 'bg-[#1F252E] hover:bg-[#2D3540] text-emerald-400 border border-[#2D3540]'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? 'Hablá ahora, te estoy escuchando...' : 'Escribí o tocá el micrófono...'}
              className={`flex-1 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none border transition ${
                isListening 
                  ? 'border-rose-500 bg-rose-950/20 text-white placeholder-rose-400' 
                  : isDark 
                    ? 'bg-[#1A1F26] border-[#2D3540] text-white placeholder-slate-500 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-300 text-[#0F172A] placeholder-slate-400 focus:border-emerald-500'
              }`}
            />

            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition shrink-0 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
