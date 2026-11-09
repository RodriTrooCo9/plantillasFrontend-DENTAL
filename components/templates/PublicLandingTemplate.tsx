"use client";

import React from "react";
import Link from "next/link";
import { TopNavbar } from "@/components/TopNavbar";
import { QueryState } from "@/components/ui/QueryState";
import { Card, Button } from "@/components/ui";
import { HeroClinicVisual } from "@/components/ClinicalVisuals";
import { ChatbotAssistant } from "@/features/chatbot/ChatbotAssistant";
import type { ServicioClinico, Dentista } from "@/types";
import {
  Calendar,
  Lock,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
} from "lucide-react";

const PREGUNTAS_FRECUENTES = [
  {
    pregunta: "¿Qué incluye la primera consulta de valoración odontológica?",
    respuesta:
      "Incluye escaneo intraoral óptico 3D sin radiación, radiografía digital, diagnóstico periodontal completo y apertura de tu odontograma de 32 piezas FDI en el Portal del Paciente.",
  },
  {
    pregunta: "¿Cuál es la política para cancelar o reprogramar una cita?",
    respuesta:
      "Puedes cancelar o reagendar desde tu Portal del Paciente o mediante el Asistente Clínico hasta con 24 horas de anticipación sin ningún cargo.",
  },
  {
    pregunta: "¿Quién puede editar mi odontograma digital?",
    respuesta:
      "Por seguridad médico-legal, el paciente visualiza su odontograma de 32 dientes en modo de solo lectura. Únicamente los odontólogos acreditados pueden registrar cambios, los cuales quedan respaldados en un historial de auditoría.",
  },
];

export interface PublicLandingTemplateProps {
  servicios: ServicioClinico[];
  dentistas: Dentista[];
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onBookService: (servicioId?: string) => void;
  onNavigateLogin: () => void;
  onNavigateDentist: () => void;
}

export function PublicLandingTemplate({
  servicios,
  dentistas,
  loading,
  error,
  onRetry,
  onBookService,
  onNavigateLogin,
  onNavigateDentist,
}: PublicLandingTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-main)] pb-20">
      {/* Top Bar Estricta de 3 Zonas */}
      <TopNavbar />

      <main className="flex-1">
        {/* 1. HERO CON PROPUESTA DE VALOR Y BOTONES AGENDAR CITA / INICIAR SESIÓN */}
        <section className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary)]">
                  <span>Odontología Digital de Especialidades</span>
                  <span aria-hidden="true">·</span>
                  <span>Atención cercana y personalizada</span>
                </div>

                <h1
                  className="mt-3 font-semibold tracking-tight leading-[1.12] text-slate-900"
                  style={{
                    fontFamily: "var(--font-fraunces), serif",
                    fontSize: "clamp(2.25rem, 3.8vw, 3.5rem)",
                    textWrap: "balance",
                  }}
                >
                  Cuidado odontológico de alta precisión con expediente y
                  odontograma digital
                </h1>

                <p className="mt-4 text-base text-[var(--color-text-muted)] leading-relaxed max-w-xl">
                  Conoce nuestros tratamientos especializados, agenda tu cita en
                  línea o accede a tu Portal de Paciente para revisar tu
                  historial clínico, tus tratamientos y tu odontograma de 32
                  piezas FDI.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button size="lg" onClick={() => onBookService()}>
                    <Calendar className="w-4 h-4" />
                    <span>Agendar cita</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onNavigateLogin}
                  >
                    <Lock className="w-4 h-4 text-teal-800" />
                    <span>Iniciar sesión</span>
                  </Button>
                </div>
              </div>

              {/* Acceso Rápido a los Portales Desacoplados */}
              <Card className="mt-8 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-teal-800">
                      Entornos por Rol Listos para Evaluar
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Prueba directamente el Portal del Paciente (odontograma
                      solo lectura), el Portal del Dentista (odontograma
                      editable + auditoría) o la pantalla de Login.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onBookService()}
                    >
                      Portal Paciente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNavigateDentist}
                    >
                      Portal Dentista
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-6">
              <HeroClinicVisual
                onSelectQuickService={() => onBookService(servicios[0]?.id)}
              />
            </div>
          </div>
        </section>

        {/* 2. SERVICIOS CONFIGURABLES DESDE EL ARCHIVO DE DATOS */}
        <section
          id="servicios"
          aria-labelledby="servicios-heading"
          className="max-w-[1280px] mx-auto px-6 py-14 border-t border-[var(--color-border-base)]"
        >
          <div>
            <p className="text-xs font-medium text-[var(--color-primary)]">
              Encuentra el cuidado que necesitas
            </p>
            <h2
              id="servicios-heading"
              className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Nuestros Servicios Odontológicos
            </h2>
          </div>

          <QueryState
            loading={loading}
            error={error}
            empty={!servicios.length}
            onRetry={onRetry}
            emptyMessage="El catálogo estará disponible próximamente."
          >
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicios.map((srv, idx) => (
                <Card
                  key={srv.id}
                  className="p-6 flex flex-col justify-between hover:border-stone-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-mono font-bold text-teal-800">
                        0{idx + 1}. {srv.categoria}
                      </span>
                      <span className="font-mono tabular-nums">
                        {srv.duracionMinutos} min · Garantía {srv.garantiaAnios}{" "}
                        años
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {srv.nombre}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {srv.descripcionCorta}
                    </p>
                    <p className="mt-3 pt-3 border-t border-stone-100 text-xs text-slate-700">
                      <strong>Protocolo:</strong> {srv.protocoloClinico}
                    </p>
                    <p className="mt-1 text-xs text-teal-900">
                      <strong>Beneficio:</strong> {srv.beneficioMedible}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-600 block">
                        Arancel orientativo
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                        ${srv.precioBaseMXN.toLocaleString("es-MX")} MXN
                      </span>
                    </div>
                    <Button size="sm" onClick={() => onBookService(srv.id)}>
                      Agendar servicio
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </QueryState>
        </section>

        {/* 3. SOBRE EL CONSULTORIO Y EQUIPO DE DENTISTAS */}
        <section
          id="equipo"
          aria-labelledby="equipo-heading"
          className="max-w-[1280px] mx-auto px-6 py-14 border-t border-[var(--color-border-base)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium text-[var(--color-primary)]">
                Especialistas Certificados
              </p>
              <h2
                id="equipo-heading"
                className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                Sobre el Consultorio y Nuestro Equipo Médico
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                En Lumina Odontología integramos tomografía volumétrica CBCT,
                escaneo intraoral óptico y microscopía clínica con un sistema
                digital transparente donde paciente y especialista colaboran en
                tiempo real.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {dentistas.map((doc) => (
                <Card
                  key={doc.id}
                  className="p-6 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-mono text-teal-800 font-semibold">
                      Cédula: {doc.cedulaProfesional}
                    </span>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {doc.nombreCompleto}
                    </h3>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      {doc.especialidad}
                    </p>
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                      {doc.biografiaCorta}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-stone-200 text-xs text-slate-600">
                    Atención: {doc.diasAtencion.join(", ")}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 4. TESTIMONIOS Y PREGUNTAS FRECUENTES */}
        <section
          id="faq"
          className="max-w-[1280px] mx-auto px-6 py-14 border-t border-[var(--color-border-base)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-medium text-[var(--color-primary)]">
                Casos Reales Verificados
              </p>
              <h2
                className="text-2xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                Testimonios de Pacientes
              </h2>
              <Card className="p-5 text-xs space-y-2">
                <p className="italic text-slate-700 leading-relaxed">
                  &ldquo;Desde mi primera cita pude ver el avance de mis
                  alineadores invisibles y el estado de mi implante #46 en el
                  odontograma interactivo del portal.&rdquo;
                </p>
                <p className="font-semibold text-slate-900">
                  — Lucía Fernández Vega · Expediente EXP-2026-0842
                </p>
              </Card>
              <Card className="p-5 text-xs space-y-2">
                <p className="italic text-slate-700 leading-relaxed">
                  &ldquo;El equipo registró mi alergia a penicilina en el
                  historial clínico y mi endodoncia microscópica fue totalmente
                  indolora en una sola sesión.&rdquo;
                </p>
                <p className="font-semibold text-slate-900">
                  — Carlos Eduardo Navarro · Expediente EXP-2026-1190
                </p>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-medium text-[var(--color-primary)]">
                Resolución de Dudas
              </p>
              <h2
                className="text-2xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                Preguntas Frecuentes
              </h2>
              <div className="space-y-3">
                {PREGUNTAS_FRECUENTES.map((item, i) => (
                  <Card key={i} className="p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.pregunta}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      {item.respuesta}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. HORARIOS, UBICACIÓN Y CONTACTO */}
        <section
          id="contacto"
          className="max-w-[1280px] mx-auto px-6 py-12 border-t border-[var(--color-border-base)]"
        >
          <Card className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-teal-800 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Ubicación Clínica
                </h3>
                <p className="text-slate-600 mt-1">
                  Av. Presidente Masaryk 340, Piso 4, Polanco, Miguel Hidalgo,
                  11560 Ciudad de México, CDMX.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-teal-800 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Horarios de Atención
                </h3>
                <p className="text-slate-600 mt-1">
                  Lunes a Viernes: 08:30 – 20:00 hrs
                  <br />
                  Sábados: 09:00 – 16:00 hrs
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-teal-800 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Contacto Directo y Urgencias
                </h3>
                <p className="text-slate-600 mt-1">
                  Recepción: +52 55 4182 9000
                  <br />
                  contacto@luminadental.mx
                </p>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-base)] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            <span
              className="font-bold text-slate-900 mr-2"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Lumina Odontología
            </span>
            <span>
              © 2026 Arquitectura Frontend Desacoplada (Next.js App Router +
              Repositorios Mock/HTTP).
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-slate-900">
              Login (/login)
            </Link>
            <Link href="/paciente" className="hover:text-slate-900">
              Portal Paciente (/paciente)
            </Link>
            <Link href="/dentista" className="hover:text-slate-900">
              Portal Dentista (/dentista)
            </Link>
          </div>
        </div>
      </footer>

      {/* Chatbot Flotante en Modo VISITANTE */}
      <ChatbotAssistant contexto={{ rolActual: "VISITANTE" }} />
    </div>
  );
}
