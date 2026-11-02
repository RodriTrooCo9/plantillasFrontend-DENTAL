'use client';

import React, {useState, useRef, useEffect} from 'react';
import {
  PatientClinicalProfile,
  AppointmentRecord,
  ChatMessage,
  buildClinicalAssistantResponse,
} from '@/lib/dental-logic';
import {
  MessageSquare,
  X,
  Send,
  FileText,
  Calendar,
  Activity,
  Sparkles,
  UserCheck,
  ArrowUpRight,
} from 'lucide-react';

interface ClinicalChatbotWidgetProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activePatient: PatientClinicalProfile;
  allPatients: PatientClinicalProfile[];
  appointments: AppointmentRecord[];
  onSelectPatientId: (patientId: string) => void;
  onNavigateToPortalTab: (
    tab: 'citas' | 'historial' | 'tratamientos' | 'odontograma' | 'servicios'
  ) => void;
}

const QUICK_PROMPTS = [
  {
    label: 'Revisar mi historial médico',
    query: 'Ayúdame a revisar mi historial médico y alergias registradas',
  },
  {
    label: 'Ver mis citas programadas',
    query: '¿Cuáles son mis citas programadas y cuándo es mi próximo control?',
  },
  {
    label: 'Estado de mis tratamientos',
    query: 'Muéstrame el avance y sesiones de mis tratamientos actuales',
  },
  {
    label: 'Resumen de mi odontograma',
    query: 'Dame el resumen de mi odontograma y piezas con tratamiento',
  },
];

export function ClinicalChatbotWidget({
  isOpen,
  onToggleOpen,
  activePatient,
  allPatients,
  appointments,
  onSelectPatientId,
  onNavigateToPortalTab,
}: ClinicalChatbotWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hola, soy el Asistente Clínico de Lumina Odontología. Estoy conectado al expediente ${activePatient.patientCode} de ${activePatient.fullName}.\n\nPuedo ayudarte a revisar su historial médico, consultar sus citas programadas, explicar el avance de sus tratamientos o inspeccionar su odontograma personalizado.`,
      timestamp: 'Ahora',
      suggestedTab: 'historial',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevPatientIdRef = useRef<string>(activePatient.id);

  // Sync welcome context only when user switches to a different patient
  useEffect(() => {
    if (prevPatientIdRef.current === activePatient.id) return;
    prevPatientIdRef.current = activePatient.id;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-switch-${activePatient.id}-${Date.now()}`,
        sender: 'assistant',
        text: `Expediente activo cambiado a ${activePatient.fullName} (${activePatient.patientCode}). Próxima cita: ${activePatient.nextCheckupDate} con ${activePatient.assignedDoctor}. ¿Qué deseas revisar de este paciente?`,
        timestamp: 'Ahora',
        suggestedTab: 'odontograma',
      },
    ]);
  }, [
    activePatient.id,
    activePatient.fullName,
    activePatient.patientCode,
    activePatient.nextCheckupDate,
    activePatient.assignedDoctor,
  ]);

  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  const sendClinicalQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/clinical-chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          message: trimmed,
          patient: activePatient,
          appointments,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          suggestedTab: data.suggestedTab,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const patientAppts = appointments.filter(
          (a) => a.patientId === activePatient.id
        );
        const fallback = buildClinicalAssistantResponse(
          trimmed,
          activePatient,
          patientAppts
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'assistant',
            text: fallback.reply,
            timestamp: 'Ahora',
            suggestedTab: fallback.suggestedTab,
          },
        ]);
      }
    } catch {
      const patientAppts = appointments.filter(
        (a) => a.patientId === activePatient.id
      );
      const fallback = buildClinicalAssistantResponse(
        trimmed,
        activePatient,
        patientAppts
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: fallback.reply,
          timestamp: 'Ahora',
          suggestedTab: fallback.suggestedTab,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendClinicalQuery(inputValue);
  };

  const getSuggestedTabLabel = (
    tab?: 'citas' | 'historial' | 'tratamientos' | 'odontograma' | 'servicios'
  ) => {
    switch (tab) {
      case 'historial':
        return 'Abrir Historial Médico en Portal';
      case 'citas':
        return 'Abrir Mis Citas Programadas';
      case 'tratamientos':
        return 'Abrir Plan de Tratamientos';
      case 'odontograma':
        return `Abrir Odontograma de ${activePatient.fullName.split(' ')[0]}`;
      case 'servicios':
        return 'Abrir Catálogo de Servicios';
      default:
        return null;
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label="Abrir Asistente Clínico de Historial, Citas y Odontograma"
            className="flex items-center gap-2.5 px-4 py-3 bg-teal-800 hover:bg-teal-900 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg border border-teal-700 transition-transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Asistente Clínico · {activePatient.fullName.split(' ')[0]}</span>
          </button>
        </div>
      )}

      {/* Chatbot Interactive Panel */}
      {isOpen && (
        <aside
          aria-label="Asistente Clínico Odontológico"
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[430px] max-h-[82vh] bg-white border border-stone-300 rounded-2xl shadow-xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <h2 className="text-sm font-semibold">
                  Asistente Clínico Lumina
                </h2>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 font-mono tabular-nums">
                Expediente: {activePatient.patientCode} · {activePatient.fullName}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleOpen}
              aria-label="Cerrar asistente clínico"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Patient Switcher inside Chatbot */}
          <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between gap-2 text-xs">
            <label
              htmlFor="chatbot-patient-select"
              className="font-medium text-slate-700 flex items-center gap-1.5 shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-800" />
              <span>Paciente activo:</span>
            </label>
            <select
              id="chatbot-patient-select"
              value={activePatient.id}
              onChange={(e) => onSelectPatientId(e.target.value)}
              className="flex-1 py-1 px-2 text-xs font-semibold text-slate-900 bg-white border border-stone-300 rounded-md focus:outline-none focus:border-teal-700"
            >
              {allPatients.map((pat) => (
                <option key={pat.id} value={pat.id}>
                  {pat.fullName} ({pat.patientCode})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Clinical Action Chips */}
          <div className="px-4 py-2.5 bg-stone-100/80 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => sendClinicalQuery(qp.query)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-stone-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Conversation Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6] min-h-[260px] max-h-[360px]"
          >
            {messages.map((msg) => {
              const tabButtonLabel = getSuggestedTabLabel(msg.suggestedTab);
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-teal-800 text-white'
                        : 'bg-white border border-stone-200 text-slate-800'
                    }`}
                  >
                    {msg.text}

                    {msg.sender === 'assistant' &&
                      msg.suggestedTab &&
                      tabButtonLabel && (
                        <div className="mt-2.5 pt-2 border-t border-stone-200/80">
                          <button
                            type="button"
                            onClick={() =>
                              onNavigateToPortalTab(msg.suggestedTab!)
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer"
                          >
                            <span>{tabButtonLabel}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono tabular-nums">
                    {msg.sender === 'user' ? 'Tú' : 'Asistente Lumina'} ·{' '}
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600">
                  Consultando expediente clínico {activePatient.patientCode}...
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <label htmlFor="chatbot-input" className="sr-only">
              Pregunta sobre tu historial médico, citas, tratamientos u odontograma
            </label>
            <input
              id="chatbot-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pregunta por tu historial, citas, tratamientos u odontograma..."
              className="flex-1 px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Enviar consulta al asistente clínico"
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
