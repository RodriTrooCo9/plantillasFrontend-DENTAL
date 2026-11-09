"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Calendar,
  DollarSign,
  Activity,
  User,
  Phone,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
} from "lucide-react";

interface DentalChatbotProps {
  pacienteId?: string | null;
  dentistaId?: string | null;
}

export function DentalChatbot({ pacienteId, dentistaId }: DentalChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/chat/stream`;

  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: apiUrl,
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status, isOpen]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend ?? inputMessage;
    if (!text.trim() || isLoading) return;

    sendMessage({
      text: text.trim(),
    });
    setInputMessage("");
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <aside aria-label="Asistente Virtual" className="fixed bottom-6 right-6 z-50 print:hidden font-sans">
      {/* Botón Flotante para Abrir/Cerrar */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-teal-800 to-emerald-700 text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-emerald-900/40 hover:scale-105 transition-all duration-300 border border-emerald-500/30"
          aria-label="Abrir asistente clínico inteligente"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </span>
          <Stethoscope className="w-5 h-5 text-emerald-200" />
          <span className="font-semibold text-sm tracking-wide">
            Asistente Lumina AI
          </span>
          <span className="bg-emerald-950/60 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-mono border border-emerald-500/20">
            Ollama
          </span>
        </button>
      )}

      {/* Ventana del Chatbot */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 text-white p-4 flex items-center justify-between border-b border-teal-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                  Lumina Odontología AI
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Qwen 2.5 7B
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  Conectado a endpoints locales y agenda
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              aria-label="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner de Estado de Endpoints */}
          <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
              Tool Calling activo con verificación previa
            </span>
            <span className="text-[11px] text-emerald-700 font-mono">
              Port: 3001
            </span>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {/* Mensaje de bienvenida inicial */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-slate-700 text-sm space-y-2.5">
                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                    👋 ¡Hola! Soy el asistente clínico de Lumina.
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600">
                    Estoy conectado en tiempo real con la base de datos de PostgreSQL y la agenda médica para ayudarte a:
                  </p>
                  <ul className="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Verificar disponibilidad y horarios de doctores.</li>
                    <li>Consultar catálogo de tratamientos y precios.</li>
                    <li>Verificar el estado de tus citas y pagos.</li>
                    <li>Agendar citas con validación de cupos.</li>
                  </ul>
                </div>

                {/* Sugerencias Rápidas */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    Acciones directas
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleQuickPrompt("¿Qué horarios tienen disponibles mañana?")}
                      className="text-left bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between group shadow-2xs"
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        Consultar horarios disponibles
                      </span>
                      <span className="text-slate-400 group-hover:text-emerald-700">→</span>
                    </button>

                    <button
                      onClick={() => handleQuickPrompt("¿Cuáles son los tratamientos y aranceles disponibles?")}
                      className="text-left bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between group shadow-2xs"
                    >
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                        Ver catálogo de aranceles y servicios
                      </span>
                      <span className="text-slate-400 group-hover:text-emerald-700">→</span>
                    </button>

                    <button
                      onClick={() => handleQuickPrompt("Comprobar el estado y salud del sistema dental")}
                      className="text-left bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between group shadow-2xs"
                    >
                      <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-indigo-700" />
                        Diagnóstico de endpoints y base de datos
                      </span>
                      <span className="text-slate-400 group-hover:text-emerald-700">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Renderizado de Mensajes */}
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-teal-800 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                    }`}
                  >
                    {/* Renderizar partes del mensaje */}
                    {message.parts && message.parts.length > 0 ? (
                      message.parts.map((part, pIdx) => {
                        if (part.type === "text") {
                          return (
                            <div
                              key={pIdx}
                              className="whitespace-pre-wrap space-y-1.5"
                            >
                              {part.text}
                            </div>
                          );
                        }

                        // Indicador visual de Tool Call / Function Calling
                        if (
                          typeof part.type === "string" &&
                          (part.type.startsWith("tool-") || part.type.includes("tool"))
                        ) {
                          const toolName = part.type.replace("tool-", "");
                          return (
                            <div
                              key={pIdx}
                              className="my-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 space-y-1"
                            >
                              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Endpoint ejecutado: {toolName}
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono">
                                Estado verificado internamente con éxito.
                              </p>
                            </div>
                          );
                        }

                        return null;
                      })
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {/* Fallback si no tiene parts explícitas */}
                        {(message as any).content || ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Indicador de Carga / Invocación de Herramientas */}
            {isLoading && (
              <div className="flex items-center gap-2.5 text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-3.5 py-2.5 rounded-2xl w-fit">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span className="font-medium animate-pulse">
                  Verificando disponibilidad en el servidor...
                </span>
              </div>
            )}

            {/* Error de Red o Endpoint */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">Aviso de conexión</p>
                  <p className="text-red-700">{error.message}</p>
                  <button
                    onClick={() => clearError()}
                    className="text-xs text-red-800 underline font-medium hover:text-red-900"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer e Input */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu consulta o pide agendar..."
                disabled={isLoading}
                className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-teal-800 hover:bg-teal-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-sm"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Lumina AI • Ollama Qwen 2.5 7B Ready</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Phone className="w-2.5 h-2.5" /> +52 55 1234 5678
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
