"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui";
import { useOperation } from "@/hooks/use-operation";
import { useRouter } from "next/navigation";
import {
  ContextoChat,
  AccionEstructuradaChat,
  Cita,
  Diente,
  Tratamiento,
  ServicioClinico,
} from "@/domain";
import { useChatbot } from "@/hooks";
import { repositories } from "@/data/factory";
import { formatCurrencyBs } from "@/lib/formatters";
import {
  CrearCitaPayload,
  ReagendarCitaPayload,
  EditarDientePayload,
} from "@/data/repositories";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

interface ChatbotAssistantProps {
  contexto: ContextoChat;
  onActionExecuted?: () => void;
  onOpenOdontograma?: () => void;
}

export function ChatbotAssistant(props: ChatbotAssistantProps) {
  return (
    <ChatbotSession
      key={`${props.contexto.rolActual}:${props.contexto.pacienteActivoId || ""}:${props.contexto.dentistaActivoId || ""}`}
      {...props}
    />
  );
}
function ChatbotSession({
  contexto,
  onActionExecuted,
  onOpenOdontograma,
}: ChatbotAssistantProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [accionPorConfirmar, setAccionPorConfirmar] =
    useState<AccionEstructuradaChat | null>(null);
  const operation = useOperation();
  const ejecutandoAccion = operation.pending;
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const {
    mensajes,
    escribiendo,
    error,
    ultimoMensaje,
    enviarMensaje,
    marcarAccionConfirmada,
    marcarAccionFallida,
  } = useChatbot(contexto);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, abierto, escribiendo, accionPorConfirmar]);

  const chipsSegunRol =
    contexto.rolActual === "VISITANTE"
      ? [
          {
            label: "Ver servicios y precios",
            query: "¿Qué servicios y precios tienen?",
          },
          {
            label: "Horarios y ubicación",
            query: "¿Cuál es su horario y ubicación?",
          },
          { label: "Quiero agendar cita", query: "Quiero agendar una cita" },
        ]
      : contexto.rolActual === "DENTISTA"
        ? [
            {
              label: "Ver agenda del paciente",
              query: "Mostrar citas del paciente",
            },
            {
              label: "Reagendar cita (con confirmación)",
              query: "Reagendar cita del paciente",
            },
            {
              label: "Registrar obturación #16 (con confirmación)",
              query: "Registrar obturación en diente #16",
            },
            {
              label: "Ver odontograma del paciente",
              query: "Mostrar odontograma",
            },
          ]
        : [
            { label: "Ver mis citas", query: "Mostrar mis citas programadas" },
            { label: "Mi odontograma", query: "Ver resumen de mi odontograma" },
            {
              label: "Continuar tratamiento",
              query: "Continuar mi tratamiento en curso",
            },
            {
              label: "Agendar limpieza",
              query: "Quiero agendar una nueva cita",
            },
            { label: "Cancelar cita", query: "Deseo cancelar mi próxima cita" },
          ];

  const ejecutarAccion = async (accion: AccionEstructuradaChat) => {
    if (accion.requiereConfirmacion && !accionPorConfirmar) {
      setAccionPorConfirmar(accion);
      return;
    }

    await operation.run(async () => {
      try {
        if (accion.tipo === "IR_A_LOGIN") {
          setAbierto(false);
          router.push("/login");
          return;
        }
        if (accion.tipo === "ABRIR_ODONTOGRAMA") {
          onOpenOdontograma?.();
          marcarAccionConfirmada(accion.id, "Odontograma abierto.");
          return;
        }
        const confirmation = accion.payload.confirmarAccion;
        if (
          typeof confirmation !== "object" ||
          confirmation === null ||
          !("id" in confirmation) ||
          !("token" in confirmation) ||
          typeof confirmation.id !== "string" ||
          typeof confirmation.token !== "string"
        )
          throw new Error(
            "La propuesta no es válida. Solicita una nueva acción.",
          );
        const response = await repositories.chat.sendMessage(
          "Confirmar acción",
          contexto,
          { id: confirmation.id, token: confirmation.token },
        );
        if (response.acciones?.some((a) => a.requiereConfirmacion))
          throw new Error("El servidor no confirmó el cambio.");
        if (active.current) {
          marcarAccionConfirmada(accion.id, response.texto);
          setAccionPorConfirmar(null);
          onActionExecuted?.();
        }
      } catch (e) {
        if (active.current)
          marcarAccionFallida(
            accion.id,
            e instanceof Error
              ? e.message
              : "No fue posible ejecutar la acción.",
          );
        throw e;
      }
    });
  };

  return (
    <>
      {
        <div className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir Asistente Clínico"
            className="flex items-center gap-2.5 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Asistente Clínico ({contexto.rolActual})</span>
          </button>
        </div>
      }

      <Modal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title="Asistente de Lumina"
      >
        <aside
          aria-label="Panel del Asistente Clínico"
          className="w-full h-[min(36rem,calc(100dvh-10rem))] min-h-0 flex flex-col overflow-hidden"
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
              Este asistente es de apoyo administrativo y no sustituye el
              criterio clínico odontológico.
            </span>
          </div>

          {/* Chips de acciones rápidas */}
          <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto">
            {chipsSegunRol.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={escribiendo || ejecutandoAccion}
                onClick={() => void enviarMensaje(chip.query)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-teal-50 text-slate-800 border border-stone-300 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Mensajes y tarjetas embebidas */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversación del asistente"
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6] min-h-0"
          >
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.emisor === "USUARIO" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    m.emisor === "USUARIO"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white border border-stone-200 text-slate-800"
                  }`}
                >
                  {m.texto}

                  {/* Renderizado de componentes estructurados dentro del chat */}
                  {m.componentes?.map((comp, idx) => (
                    <div
                      key={idx}
                      className="mt-2.5 pt-2.5 border-t border-stone-200 space-y-1.5"
                    >
                      {comp.tipo === "TARJETA_CITAS" &&
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

                      {comp.tipo === "MINI_ODONTOGRAMA" &&
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

                      {comp.tipo === "RESUMEN_TRATAMIENTOS" &&
                        (comp.datos as Tratamiento[]).map((t) => (
                          <div
                            key={t.id}
                            className="p-2 rounded-lg bg-[#FAF9F6] border border-stone-200 text-[11px]"
                          >
                            <p className="font-semibold text-slate-900">
                              {t.nombre} ({t.progresoPorcentaje}%)
                            </p>
                            <p className="text-slate-600">
                              Estado: {t.estado} · Sesiones:{" "}
                              {t.sesionesCompletadas}/{t.sesionesTotales}
                            </p>
                          </div>
                        ))}

                      {comp.tipo === "TABLA_SERVICIOS" &&
                        (comp.datos as ServicioClinico[])
                          .slice(0, 4)
                          .map((s) => (
                            <div
                              key={s.id}
                              className="p-2 rounded-lg bg-[#FAF9F6] border border-stone-200 text-[11px] flex items-center justify-between"
                            >
                              <span className="font-medium text-slate-900">
                                {s.nombre}
                              </span>
                              <span className="font-mono font-semibold text-teal-800">
                                {formatCurrencyBs(s.precioBaseMXN)}
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
                          disabled={
                            acc.confirmada || ejecutandoAccion || escribiendo
                          }
                          onClick={() => ejecutarAccion(acc)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            acc.confirmada
                              ? "bg-stone-100 text-slate-600"
                              : "bg-teal-800 hover:bg-teal-900 text-white"
                          }`}
                        >
                          {acc.confirmada ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Ejecutada
                            </span>
                          ) : (
                            <>
                              {acc.estado === "fallida" ? "Reintentar: " : ""}
                              {acc.etiqueta}
                            </>
                          )}
                        </button>
                      ))}
                      {m.acciones
                        .filter((a) => a.estado === "fallida")
                        .map((a) => (
                          <p key={a.id} role="alert" className="text-red-800">
                            {a.error}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Cuadro de confirmación explícita para acciones sensibles */}
            <Modal
              isOpen={!!accionPorConfirmar}
              onClose={() => {
                if (!ejecutandoAccion) setAccionPorConfirmar(null);
              }}
              title="Confirmar cambio clínico"
            >
              <p className="text-sm">{accionPorConfirmar?.etiqueta}</p>
              <p className="text-sm mt-2">
                Esta acción se aplicará únicamente al expediente indicado en la
                propuesta.
              </p>
              {operation.error && (
                <p role="alert" className="text-red-800 mt-2">
                  {operation.error}
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  data-autofocus
                  disabled={ejecutandoAccion}
                  className="min-h-11 px-3 border rounded-lg"
                  onClick={() => setAccionPorConfirmar(null)}
                >
                  Volver sin guardar
                </button>
                <button
                  type="button"
                  disabled={ejecutandoAccion}
                  className="min-h-11 px-3 bg-teal-800 text-white rounded-lg"
                  onClick={() => {
                    if (accionPorConfirmar)
                      void ejecutarAccion(accionPorConfirmar);
                  }}
                >
                  {ejecutandoAccion ? "Guardando…" : "Confirmar y guardar"}
                </button>
              </div>
            </Modal>

            {escribiendo && (
              <div className="text-xs text-slate-600 italic px-2">
                El asistente está procesando tu solicitud...
              </div>
            )}
          </div>

          {/* Input */}
          {error && (
            <div className="p-3">
              <p role="alert">{error}</p>
              <button
                type="button"
                disabled={escribiendo}
                className="min-h-11 underline"
                onClick={() => void enviarMensaje(ultimoMensaje)}
              >
                Reintentar mensaje
              </button>
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await enviarMensaje(input)) setInput("");
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta o comando clínico..."
              aria-label="Mensaje para el asistente clínico"
              data-autofocus
              className="flex-1 min-w-0 px-3 py-2 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              aria-label="Enviar mensaje"
              disabled={escribiendo || ejecutandoAccion || !input.trim()}
              className="px-3.5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </aside>
      </Modal>
    </>
  );
}
