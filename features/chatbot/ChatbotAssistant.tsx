'use client';

import React, {useState, useRef, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {
  ContextoChat,
  AccionEstructuradaChat,
  Cita,
  Diente,
  Tratamiento,
  ServicioClinico,
} from '@/domain';
import {useChatbot} from '@/hooks';
import {repositories} from '@/data/factory';
import {
  CrearCitaPayload,
  ReagendarCitaPayload,
  EditarDientePayload,
} from '@/data/repositories';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface ChatbotAssistantProps {
  contexto: ContextoChat;
  onActionExecuted?: () => void;
  onOpenOdontograma?: () => void;
}

export function ChatbotAssistant({
  contexto,
  onActionExecuted,
  onOpenOdontograma,
}: ChatbotAssistantProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [accionPorConfirmar, setAccionPorConfirmar] =
    useState<AccionEstructuradaChat | null>(null);
  const [ejecutandoAccion, setEjecutandoAccion] = useState<boolean>(false);

  const {mensajes, escribiendo, enviarMensaje, marcarAccionConfirmada} =
    useChatbot(contexto);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, abierto, escribiendo, accionPorConfirmar]);

  const chipsSegunRol =
    contexto.rolActual === 'VISITANTE'
      ? [
          {label: 'Ver servicios y precios', query: '¿Qué servicios y precios tienen?'},
          {label: 'Horarios y ubicación', query: '¿Cuál es su horario y ubicación?'},
          {label: 'Quiero agendar cita', query: 'Quiero agendar una cita'},
        ]
      : contexto.rolActual === 'DENTISTA'
      ? [
          {label: 'Ver agenda del paciente', query: 'Mostrar citas del paciente'},
          {label: 'Reagendar cita (con confirmación)', query: 'Reagendar cita del paciente'},
          {
            label: 'Registrar obturación #16 (con confirmación)',
            query: 'Registrar obturación en diente #16',
          },
          {label: 'Ver odontograma del paciente', query: 'Mostrar odontograma'},
        ]
      : [
          {label: 'Ver mis citas', query: 'Mostrar mis citas programadas'},
          {label: 'Mi odontograma', query: 'Ver resumen de mi odontograma'},
          {label: 'Continuar tratamiento', query: 'Continuar mi tratamiento en curso'},
          {label: 'Agendar limpieza', query: 'Quiero agendar una nueva cita'},
          {label: 'Cancelar cita', query: 'Deseo cancelar mi próxima cita'},
        ];

  const ejecutarAccion = async (accion: AccionEstructuradaChat) => {
    if (accion.requiereConfirmacion && !accionPorConfirmar) {
      setAccionPorConfirmar(accion);
      return;
    }

    setEjecutandoAccion(true);
    try {
      if (accion.tipo === 'IR_A_LOGIN') {
        setAbierto(false);
        router.push('/login');
        return;
      }

      if (accion.tipo === 'ABRIR_ODONTOGRAMA') {
        if (onOpenOdontograma) onOpenOdontograma();
        marcarAccionConfirmada(
          accion.id,
          'He abierto la vista completa de tu Odontograma de 32 dientes.'
        );
        return;
      }

      if (
        accion.tipo === 'AGENDAR_CITA' ||
        accion.tipo === 'CONTINUAR_TRATAMIENTO'
      ) {
        const payload = accion.payload as unknown as CrearCitaPayload;
        const cita = await repositories.citas.agendarCita(payload);
        marcarAccionConfirmada(
          accion.id,
          `Cita confirmada con éxito: ${cita.servicioNombre} el ${cita.fecha} a las ${cita.hora} hrs con ${cita.dentistaNombre}.`
        );
        if (onActionExecuted) onActionExecuted();
      }

      if (accion.tipo === 'CANCELAR_CITA') {
        const {citaId, motivo} = accion.payload as {
          citaId: string;
          motivo: string;
        };
        const cancelada = await repositories.citas.cancelarCita(citaId, motivo);
        marcarAccionConfirmada(
          accion.id,
          `La cita del ${cancelada.fecha} a las ${cancelada.hora} hrs ha sido cancelada tras tu confirmación.`
        );
        if (onActionExecuted) onActionExecuted();
      }

      if (accion.tipo === 'REAGENDAR_CITA' && contexto.rolActual === 'DENTISTA') {
        const payload = accion.payload as unknown as ReagendarCitaPayload;
        const reagendada = await repositories.citas.reagendarCita(payload);
        marcarAccionConfirmada(
          accion.id,
          `Cita reagendada para el ${reagendada.fecha} a las ${reagendada.hora} hrs. Se envió notificación al paciente ${reagendada.pacienteNombre}.`
        );
        if (onActionExecuted) onActionExecuted();
      }

      if (
        accion.tipo === 'MODIFICAR_ODONTOGRAMA' &&
        contexto.rolActual === 'DENTISTA'
      ) {
        const payload = accion.payload as unknown as EditarDientePayload;
        await repositories.odontograma.registrarCambioDiente(payload);
        marcarAccionConfirmada(
          accion.id,
          `Cambio aplicado al odontograma en el diente #${payload.numeroFDI} (${payload.superficie} → ${payload.nuevoEstado}) y guardado en la bitácora de auditoría.`
        );
        if (onActionExecuted) onActionExecuted();
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo completar la acción solicitada.';
      marcarAccionConfirmada(accion.id, `Aviso: ${msg}`);
    } finally {
      setAccionPorConfirmar(null);
      setEjecutandoAccion(false);
    }
  };

  return (
    <>
      {!abierto && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir Asistente Clínico"
            className="flex items-center gap-2.5 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>
              Asistente Clínico ({contexto.rolActual})
            </span>
          </button>
        </div>
      )}

      {abierto && (
        <aside
          aria-label="Panel del Asistente Clínico"
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[440px] max-h-[84vh] bg-white border border-stone-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-semibold">
                  Asistente Lumina · Modo {contexto.rolActual}
                </h2>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Ejecuta acciones reales sobre los repositorios de la app
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Aviso ético obligatorio */}
          <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200/80 flex items-center gap-2 text-[11px] text-amber-900">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-700" />
            <span>
              Este asistente es de apoyo administrativo y no sustituye el criterio clínico odontológico.
            </span>
          </div>

          {/* Chips de acciones rápidas */}
          <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto">
            {chipsSegunRol.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => enviarMensaje(chip.query)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-teal-50 text-slate-800 border border-stone-300 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Mensajes y tarjetas embebidas */}
          <div
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6] min-h-[260px] max-h-[360px]"
          >
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.emisor === 'USUARIO' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    m.emisor === 'USUARIO'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white border border-stone-200 text-slate-800'
                  }`}
                >
                  {m.texto}

                  {/* Renderizado de componentes estructurados dentro del chat */}
                  {m.componentes?.map((comp, idx) => (
                    <div
                      key={idx}
                      className="mt-2.5 pt-2.5 border-t border-stone-200 space-y-1.5"
                    >
                      {comp.tipo === 'TARJETA_CITAS' &&
                        (comp.datos as Cita[]).map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-[#FAF9F6] border border-stone-200 text-[11px]"
                          >
                            <p className="font-semibold text-slate-900">
                              {c.fecha} · {c.hora} hrs — {c.servicioNombre}
                            </p>
                            <p className="text-slate-600">
                              {c.dentistaNombre} · Estado: {c.estado}
                            </p>
                          </div>
                        ))}

                      {comp.tipo === 'MINI_ODONTOGRAMA' &&
                        (comp.datos as Diente[]).map((d) => (
                          <div
                            key={d.numeroFDI}
                            className="p-2 rounded-lg bg-[#FAF9F6] border border-stone-200 text-[11px] flex items-center justify-between"
                          >
                            <span className="font-mono font-bold text-slate-900">
                              #{d.numeroFDI} {d.nombreAnatomico}
                            </span>
                            <span className="font-semibold text-teal-800">
                              {d.estadoGeneral}
                            </span>
                          </div>
                        ))}

                      {comp.tipo === 'RESUMEN_TRATAMIENTOS' &&
                        (comp.datos as Tratamiento[]).map((t) => (
                          <div
                            key={t.id}
                            className="p-2 rounded-lg bg-[#FAF9F6] border border-stone-200 text-[11px]"
                          >
                            <p className="font-semibold text-slate-900">
                              {t.nombre} ({t.progresoPorcentaje}%)
                            </p>
                            <p className="text-slate-600">
                              Estado: {t.estado} · Sesiones:{' '}
                              {t.sesionesCompletadas}/{t.sesionesTotales}
                            </p>
                          </div>
                        ))}

                      {comp.tipo === 'TABLA_SERVICIOS' &&
                        (comp.datos as ServicioClinico[]).slice(0, 4).map((s) => (
                          <div
                            key={s.id}
                            className="p-2 rounded-lg bg-[#FAF9F6] border border-stone-200 text-[11px] flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-900">
                              {s.nombre}
                            </span>
                            <span className="font-mono font-semibold text-teal-800">
                              ${s.precioBaseMXN} MXN
                            </span>
                          </div>
                        ))}
                    </div>
                  ))}

                  {/* Botones de acciones estructuradas */}
                  {m.acciones && m.acciones.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-200 flex flex-wrap gap-1.5">
                      {m.acciones.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          disabled={acc.confirmada || ejecutandoAccion}
                          onClick={() => ejecutarAccion(acc)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            acc.confirmada
                              ? 'bg-stone-100 text-slate-500'
                              : 'bg-teal-800 hover:bg-teal-900 text-white'
                          }`}
                        >
                          {acc.confirmada ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Ejecutada
                            </span>
                          ) : (
                            acc.etiqueta
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Cuadro de confirmación explícita para acciones sensibles */}
            {accionPorConfirmar && (
              <div
                role="alertdialog"
                aria-label="Confirmación de acción sensible"
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Confirmación requerida en pantalla</span>
                </div>
                <p>
                  ¿Confirmas que deseas ejecutar:{' '}
                  <strong>{accionPorConfirmar.etiqueta}</strong>?
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={ejecutandoAccion}
                    onClick={() => ejecutarAccion(accionPorConfirmar)}
                    className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Sí, confirmar y guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccionPorConfirmar(null)}
                    className="px-3 py-1.5 bg-white border border-stone-300 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {escribiendo && (
              <div className="text-xs text-slate-500 italic px-2">
                El asistente está procesando tu solicitud...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensaje(input);
              setInput('');
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta o comando clínico..."
              aria-label="Mensaje para el asistente clínico"
              className="flex-1 px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              aria-label="Enviar mensaje"
              className="px-3.5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
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
