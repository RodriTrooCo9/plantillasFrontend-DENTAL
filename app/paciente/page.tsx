"use client";

import { useSearchParams } from "next/navigation";
import { RescheduleForm } from "@/components/RescheduleForm";
import {
  today,
  addDays,
  futureAppointment,
  notificationText,
} from "@/domain/clinical";
import { useDisponibilidad } from "@/hooks";
import { TopNavbar } from "@/components/TopNavbar";

import { QueryState } from "@/components/ui/QueryState";
import { AsyncForm } from "@/components/ui/AsyncForm";

import React, { useState, useEffect, Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import type { UsuarioAutenticado } from "@/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, usePacientes, useCitas, useOdontograma } from "@/hooks";
import { repositories } from "@/data/factory";
import {
  Card,
  Button,
  Input,
  Select,
  Tabs,
  TabPanel,
  Modal,
} from "@/components/ui";
import { Odontograma32View } from "@/features/odontograma/Odontograma32View";
import { ChatbotAssistant } from "@/features/chatbot/ChatbotAssistant";
import {
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  LogOut,
  PlusCircle,
  ShieldAlert,
} from "lucide-react";

type TabPaciente =
  "resumen" | "historial" | "odontograma" | "tratamientos" | "citas";

export default function PortalPacientePage() {
  return (
    <Suspense fallback={<p role="status">Cargando sesión…</p>}>
      <AuthGate role="PACIENTE">
        {(user) => <PatientPortal key={user.id} user={user} />}
      </AuthGate>
    </Suspense>
  );
}
function PatientPortal({ user }: { user: UsuarioAutenticado }) {
  const router = useRouter();
  const { logout } = useAuth();
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabPaciente>(
    params.get("servicio") ? "citas" : "resumen",
  );
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const pacienteActivoId = user.pacienteId!;

  const {
    pacientes,
    loading: patientLoading,
    error: patientError,
    pacienteActual,
    historial,
    tratamientos,
    buscarPacientes,
  } = usePacientes(pacienteActivoId, { directorio: false });

  const {
    servicios,
    dentistas,
    loading: appointmentsLoading,
    citas,
    error: citaError,
    recargarCitas,
    agendarCita,
    cancelarCita,
    reagendarCita,
  } = useCitas(pacienteActivoId);

  const {
    odontograma,
    recargarOdontograma,
    loading: odontogramLoading,
    error: odontogramError,
  } = useOdontograma(pacienteActivoId);

  // Estado del formulario paso a paso para agendar cita
  const [selectedService, setSrvId] = useState("");
  const requested = params.get("servicio");
  const srvId =
    selectedService ||
    servicios.find((s) => s.id === requested)?.id ||
    servicios[0]?.id ||
    "";
  const [selectedDoctor, setDocId] = useState("");
  const docId =
    selectedDoctor ||
    dentistas.find((d) => d.id === pacienteActual?.dentistaAsignadoId)?.id ||
    dentistas[0]?.id ||
    "";
  const [fechaCita, setFechaCita] = useState(() => addDays(today(), 1));
  const [horaCita, setHoraCita] = useState("");
  const availability = useDisponibilidad(docId, fechaCita, srvId);
  const horariosDisponibles = availability.horarios;
  const selectedTime = horariosDisponibles.includes(horaCita) ? horaCita : "";
  const [motivoCita, setMotivoCita] = useState<string>("");
  const [tratamientoVinculadoId, setTratamientoVinculadoId] = useState<
    string | undefined
  >(undefined);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState<string | null>(
    null,
  );

  // Modal de confirmación para cancelar cita (regla 24 h)
  const [citaACancelarId, setCitaACancelarId] = useState<string | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>(
    "Imprevisto personal (con más de 24h de anticipación)",
  );

  const handleAgendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeConfirmacion(null);
    await availability.revalidate(selectedTime);
    const creada = await agendarCita({
      pacienteId: pacienteActivoId,
      dentistaId: docId,
      servicioId: srvId,
      tratamientoId: tratamientoVinculadoId,
      fecha: fechaCita,
      hora: selectedTime,
      motivoConsulta: motivoCita,
    });
    setMotivoCita("");
    setHoraCita("");
    availability.reload();
    setTratamientoVinculadoId(undefined);
    setMensajeConfirmacion(
      `Cita agendada con éxito: ${creada.servicioNombre} el ${creada.fecha} a las ${creada.hora} hrs con ${creada.dentistaNombre}.`,
    );
  };

  const handleContinuarTratamiento = (trtId: string) => {
    const trt = tratamientos.find((t) => t.id === trtId);
    if (!trt) return;
    setSrvId(trt.servicioId);
    setDocId(trt.dentistaId);
    setFechaCita(
      trt.proximaFechaSugerida >= today()
        ? trt.proximaFechaSugerida
        : addDays(today(), 1),
    );
    setHoraCita("");
    setTratamientoVinculadoId(trt.id);
    setMotivoCita(`Continuación de tratamiento: ${trt.nombre}`);
    setActiveTab("citas");
  };

  const handleConfirmarCancelacion = async () => {
    if (!citaACancelarId) return;
    await cancelarCita(citaACancelarId, motivoCancelacion);
    setMensajeConfirmacion("La cita ha sido cancelada correctamente.");
    setCitaACancelarId(null);
  };

  const citasFuturas = citas.filter((c) => futureAppointment(c));
  const citasPasadasOCanceladas = citas.filter((c) => !futureAppointment(c));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-main)] pb-20">
      {/* Top Bar */}
      <TopNavbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 space-y-6">
        <QueryState
          loading={patientLoading || appointmentsLoading || odontogramLoading}
          error={patientError || citaError || odontogramError}
          empty={!pacienteActual}
          emptyMessage="No se encontró tu expediente. Contacta a recepción."
          onRetry={() => {
            buscarPacientes();
            recargarCitas();
            recargarOdontograma();
          }}
        >
          {/* Encabezado del Paciente */}
          {pacienteActual && (
            <Card className="p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-mono font-bold text-teal-800">
                    {pacienteActual.codigoExpediente}
                  </span>
                  <span>·</span>
                  <span>{pacienteActual.edad} años</span>
                  <span>·</span>
                  <span>Sangre: {pacienteActual.tipoSangre}</span>
                  <span>·</span>
                  <span>
                    Odontólogo titular: {pacienteActual.dentistaAsignadoNombre}
                  </span>
                </div>
                <h1
                  className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  Portal del Paciente: {pacienteActual.nombreCompleto}
                </h1>
                <p className="mt-1 text-xs text-amber-900 font-medium">
                  Alergias registradas: {pacienteActual.alergias.join(", ")} ·{" "}
                  {pacienteActual.alertasMedicas}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button onClick={() => setActiveTab("citas")}>
                  <PlusCircle className="w-4 h-4" />
                  <span>Agendar Cita</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Navegación por Pestañas del Portal del Paciente */}
          <Tabs<TabPaciente>
            ariaLabel="Secciones del Portal del Paciente"
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "resumen", label: "1. Resumen Clínico" },
              {
                id: "historial",
                label: `2. Historial Clínico (${historial.length})`,
              },
              {
                id: "odontograma",
                label: "3. Mi Odontograma (32 Dientes · Solo Lectura)",
              },
              {
                id: "tratamientos",
                label: `4. Mis Tratamientos (${tratamientos.length})`,
              },
              { id: "citas", label: `5. Mis Citas (${citas.length})` },
            ]}
          />
          <TabPanel activeTab={activeTab}>
            {/* VISTA 1: RESUMEN */}
            {activeTab === "resumen" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between text-xs text-teal-800 font-semibold">
                    <span>Próxima Cita Programada</span>
                    <Calendar className="w-4 h-4" />
                  </div>
                  {citasFuturas[0] ? (
                    <div className="mt-3">
                      <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                        {citasFuturas[0].fecha} · {citasFuturas[0].hora} hrs
                      </p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">
                        {citasFuturas[0].servicioNombre}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Especialista: {citasFuturas[0].dentistaNombre}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 p-2.5 rounded-lg bg-[#FAF9F6] border border-stone-200">
                        {citasFuturas[0].motivoConsulta}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-slate-600">
                      No tienes citas futuras programadas.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("citas")}
                  >
                    Gestionar mis citas
                  </Button>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between text-xs text-teal-800 font-semibold">
                    <span>Tratamientos Activos</span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="mt-3 space-y-3">
                    {tratamientos.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span className="truncate">{t.nombre}</span>
                          <span className="font-mono text-teal-800">
                            {t.progresoPorcentaje}%
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">
                          Estado: {t.estado} · Sesiones: {t.sesionesCompletadas}
                          /{t.sesionesTotales}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("tratamientos")}
                  >
                    Ver todos mis tratamientos
                  </Button>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between text-xs text-teal-800 font-semibold">
                    <span>Avisos y Recordatorios Clínicos</span>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-700">
                    <li className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200">
                      <strong>Regla de cancelación:</strong> Puedes cancelar o
                      reprogramar sin cargo hasta con 24 horas de anticipación.
                    </li>
                    <li className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200">
                      <strong>Odontograma digital:</strong> Tu odontograma de 32
                      piezas FDI fue actualizado el{" "}
                      <span className="font-mono">
                        {odontograma?.actualizadoEn || "Sin actualizaciones"}
                      </span>
                      .
                    </li>
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab("odontograma")}
                  >
                    Inspeccionar mi Odontograma
                  </Button>
                </Card>
              </div>
            )}

            {/* VISTA 2: HISTORIAL CLÍNICO (SOLO LECTURA) */}
            {activeTab === "historial" && pacienteActual && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-4 p-6 space-y-3 text-xs">
                  <h2 className="text-base font-semibold text-slate-900">
                    Antecedentes Médicos (Solo Lectura)
                  </h2>
                  <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200">
                    <span className="text-slate-600 block">
                      Alergias reportadas:
                    </span>
                    <strong className="text-slate-900">
                      {pacienteActual.alergias.join(", ")}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200">
                    <span className="text-slate-600 block">
                      Notas sistémicas:
                    </span>
                    <p className="text-slate-800 mt-0.5">
                      {pacienteActual.alertasMedicas}
                    </p>
                  </div>
                </Card>

                <Card className="lg:col-span-8 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Línea de Tiempo de Consultas, Diagnósticos y Procedimientos
                  </h2>
                  <div className="mt-4 space-y-4">
                    {historial.length === 0 && (
                      <p role="status" className="text-sm text-slate-600 py-3">
                        No hay entradas de historial para mostrar.
                      </p>
                    )}
                    {historial.map((h) => (
                      <article
                        key={h.id}
                        className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-mono font-bold text-teal-800">
                            {h.fecha} · {h.tipo}
                          </span>
                          <span>{h.dentistaNombre}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Diagnóstico: {h.diagnostico}
                        </h3>
                        <p className="text-slate-800">
                          <strong>Procedimiento:</strong>{" "}
                          {h.procedimientoRealizado}
                        </p>
                        <p className="text-slate-600">{h.notasClinicas}</p>
                      </article>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* VISTA 3: ODONTOGRAMA (SOLO LECTURA PARA PACIENTE) */}
            {activeTab === "odontograma" && odontograma && pacienteActual && (
              <Odontograma32View
                odontograma={odontograma}
                pacienteNombre={pacienteActual.nombreCompleto}
                editable={false}
              />
            )}

            {/* VISTA 4: TRATAMIENTOS */}
            {activeTab === "tratamientos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tratamientos.length === 0 && (
                  <p role="status" className="text-sm text-slate-600 py-3">
                    No hay tratamientos para mostrar.
                  </p>
                )}
                {tratamientos.map((trt) => (
                  <Card
                    key={trt.id}
                    className="p-6 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-mono font-semibold text-teal-800">
                          Estado: {trt.estado} · Inicio: {trt.fechaInicio}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          ${trt.costoTotalMXN.toLocaleString("es-MX")} MXN
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-slate-900">
                        {trt.nombre}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Especialista: {trt.dentistaNombre} · Dientes FDI:{" "}
                        <span className="font-mono">
                          {trt.dientesFDI.map((d) => `#${d}`).join(", ")}
                        </span>
                      </p>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>
                            Progreso ({trt.sesionesCompletadas}/
                            {trt.sesionesTotales} sesiones)
                          </span>
                          <span className="font-mono font-bold text-teal-800">
                            {trt.progresoPorcentaje}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-700"
                            style={{ width: `${trt.progresoPorcentaje}%` }}
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-600">
                        <strong>Evolución:</strong> {trt.notasEvolucion}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-mono">
                        Próxima sugerida: {trt.proximaFechaSugerida}
                      </span>
                      {trt.estado !== "FINALIZADO" && (
                        <Button
                          size="sm"
                          onClick={() => handleContinuarTratamiento(trt.id)}
                        >
                          Continuar tratamiento (Agendar sesión)
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* VISTA 5: CITAS (AGENDAR, FUTURAS, PASADAS, CANCELAR CON REGLA 24H) */}
            {activeTab === "citas" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Formulario Paso a Paso para Agendar Cita */}
                <Card className="lg:col-span-5 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Agendar Nueva Cita
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Paso 1: Servicio → Paso 2: Dentista → Paso 3: Fecha y
                    Horario disponible
                  </p>

                  <AsyncForm
                    onSubmit={handleAgendarSubmit}
                    className="mt-4 space-y-3.5"
                  >
                    <Select
                      id="pac-srv"
                      label="1. Elegir servicio clínico"
                      value={srvId}
                      onChange={(e) => {
                        setSrvId(e.target.value);
                        setHoraCita("");
                      }}
                    >
                      {servicios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} (${s.precioBaseMXN} MXN ·{" "}
                          {s.duracionMinutos} min)
                        </option>
                      ))}
                    </Select>

                    <Select
                      id="pac-doc"
                      label="2. Elegir especialista"
                      value={docId}
                      onChange={(e) => {
                        setDocId(e.target.value);
                        setHoraCita("");
                      }}
                    >
                      {dentistas.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombreCompleto} — {d.especialidad}
                        </option>
                      ))}
                    </Select>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="pac-fecha"
                        type="date"
                        min={today()}
                        required
                        label="3. Fecha"
                        value={fechaCita}
                        onChange={(e) => {
                          setFechaCita(e.target.value);
                          setHoraCita("");
                        }}
                      />
                      <Select
                        id="pac-hora"
                        label="4. Horario disponible"
                        value={selectedTime}
                        onChange={(e) => setHoraCita(e.target.value)}
                      >
                        <option value="">Selecciona un horario</option>
                        {horariosDisponibles.map((h) => (
                          <option key={h} value={h}>
                            {h} hrs
                          </option>
                        ))}
                      </Select>
                    </div>

                    <Input
                      id="pac-motivo"
                      label="5. Motivo o notas (opcional)"
                      value={motivoCita}
                      onChange={(e) => setMotivoCita(e.target.value)}
                      placeholder="Ej. Seguimiento de tratamiento..."
                    />

                    {mensajeConfirmacion && (
                      <div
                        role="status"
                        className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>{mensajeConfirmacion}</span>
                      </div>
                    )}

                    {citaError && (
                      <div
                        role="alert"
                        className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
                      >
                        {citaError}
                      </div>
                    )}

                    {availability.loading && (
                      <p role="status">Buscando horarios…</p>
                    )}
                    {availability.error && (
                      <div>
                        <p role="alert">{availability.error}</p>
                        <Button type="button" onClick={availability.reload}>
                          Reintentar horarios
                        </Button>
                      </div>
                    )}
                    {!availability.loading &&
                      !availability.error &&
                      !horariosDisponibles.length && (
                        <p role="status">
                          No hay horarios disponibles para esta fecha.
                        </p>
                      )}
                    <Button
                      type="submit"
                      disabled={
                        availability.loading ||
                        !!availability.error ||
                        !selectedTime ||
                        fechaCita < today()
                      }
                      className="w-full"
                    >
                      Confirmar Cita
                    </Button>
                  </AsyncForm>
                </Card>

                {/* Listado de Citas Futuras y Pasadas */}
                <div className="lg:col-span-7 space-y-6">
                  <Card className="p-6">
                    <h3 className="text-base font-semibold text-slate-900">
                      Citas Futuras Programadas ({citasFuturas.length})
                    </h3>
                    <div className="mt-4 space-y-3">
                      {citasFuturas.length === 0 && (
                        <p
                          role="status"
                          className="text-sm text-slate-600 py-3"
                        >
                          No hay citas futuras para mostrar.
                        </p>
                      )}
                      {citasFuturas.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div>
                            <p className="font-mono font-bold text-slate-900">
                              {c.fecha} · {c.hora} hrs ({c.estado})
                            </p>
                            <p className="font-semibold text-teal-900 mt-0.5">
                              {c.servicioNombre} — {c.dentistaNombre}
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              {c.motivoConsulta}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRescheduleId(c.id)}
                          >
                            Reagendar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setCitaACancelarId(c.id)}
                          >
                            Cancelar cita
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-base font-semibold text-slate-900">
                      Historial de Citas Pasadas y Canceladas (
                      {citasPasadasOCanceladas.length})
                    </h3>
                    <div className="mt-4 space-y-2.5">
                      {citasPasadasOCanceladas.length === 0 && (
                        <p
                          role="status"
                          className="text-sm text-slate-600 py-3"
                        >
                          No hay citas pasadas para mostrar.
                        </p>
                      )}
                      {citasPasadasOCanceladas.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">
                              {c.fecha} · {c.servicioNombre}
                            </p>
                            <p className="text-slate-600">{c.motivoConsulta}</p>
                          </div>
                          <span className="font-mono font-semibold text-slate-600">
                            {c.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabPanel>
        </QueryState>
      </main>

      {/* Modal de Confirmación de Cancelación (Regla de 24h) */}
      <Modal
        isOpen={Boolean(citaACancelarId)}
        onClose={() => setCitaACancelarId(null)}
        title="Confirmar cancelación de cita (Regla 24 h)"
      >
        <AsyncForm
          className="space-y-4 text-xs"
          onSubmit={handleConfirmarCancelacion}
        >
          <p className="text-slate-600">
            Recuerda que las cancelaciones deben realizarse con al menos{" "}
            <strong>24 horas de anticipación</strong>. Por favor indica el
            motivo de cancelación:
          </p>
          <Input
            id="cancel-reason"
            label="Motivo de cancelación"
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCitaACancelarId(null)}
            >
              Volver
            </Button>
            <Button variant="danger" type="submit">
              Confirmar Cancelación
            </Button>
          </div>
        </AsyncForm>
      </Modal>

      <Modal
        isOpen={!!rescheduleId}
        onClose={() => setRescheduleId(null)}
        title="Reagendar mi cita"
      >
        {citas.find((c) => c.id === rescheduleId) && (
          <RescheduleForm
            key={rescheduleId}
            cita={citas.find((c) => c.id === rescheduleId)!}
            onSave={async (payload) => {
              const updated = await reagendarCita(payload);
              setMensajeConfirmacion(
                `Cita reagendada. ${notificationText(updated.estadoNotificacion)}`,
              );
              setRescheduleId(null);
            }}
          />
        )}
      </Modal>
      {/* Chatbot Transversal sincronizado con el Paciente activo */}
      <ChatbotAssistant
        contexto={{
          rolActual: "PACIENTE",
          pacienteActivoId,
        }}
        onActionExecuted={() => {
          recargarCitas();
          recargarOdontograma();
          buscarPacientes();
        }}
        onOpenOdontograma={() => setActiveTab("odontograma")}
      />
    </div>
  );
}
