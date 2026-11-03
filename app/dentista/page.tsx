"use client";

import { RescheduleForm } from "@/components/RescheduleForm";
import { today, addDays, weekDays, notificationText } from "@/domain/clinical";
import { treatmentInputSchema, blockInputSchema } from "@/domain/validation";
import { useEffect } from "react";
import { TopNavbar } from "@/components/TopNavbar";

import { QueryState } from "@/components/ui/QueryState";
import { AsyncForm } from "@/components/ui/AsyncForm";

import React, { useState, Suspense } from "react";
import { useOperation, useAnyOperationPending } from "@/hooks/use-operation";
import { AuthGate } from "@/components/AuthGate";
import type { UsuarioAutenticado } from "@/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, usePacientes, useCitas, useOdontograma } from "@/hooks";
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
  Users,
  Search,
  LogOut,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
} from "lucide-react";

type TabDentista =
  "agenda" | "pacientes" | "odontograma" | "historial" | "tratamientos";

export default function PortalDentistaPage() {
  return (
    <Suspense fallback={<p role="status">Cargando sesión…</p>}>
      <AuthGate role="DENTISTA">
        {(user) => <DentistPortal key={user.id} user={user} />}
      </AuthGate>
    </Suspense>
  );
}
function DentistPortal({ user }: { user: UsuarioAutenticado }) {
  const router = useRouter();
  const treatmentOperation = useOperation();
  const anyOperationPending = useAnyOperationPending();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabDentista>("agenda");
  const [vistaAgenda, setVistaAgenda] = useState<"lista" | "calendario">(
    "lista",
  );
  const dentistaActivoId = user.dentistaId!;
  const [seleccionId, setSelectionId] = useState("");
  const [busquedaPaciente, setBusquedaPaciente] = useState<string>("");
  const [week, setWeek] = useState(today);
  const [filterDate, setFilterDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const {
    pacientes,
    loading: patientLoading,
    error: patientError,
    pacienteActual,
    historial,
    tratamientos,
    buscarPacientes,
    agregarNotaHistorial,
    crearTratamiento,
    actualizarTratamiento,
  } = usePacientes(seleccionId);
  const pacienteSeleccionadoId = seleccionId || pacientes[0]?.id || "";

  const {
    servicios,
    dentistas,
    loading: appointmentsLoading,
    citas,
    error: appointmentsError,
    recargarCitas,
    reagendarCita,
    bloquearHorario,
  } = useCitas(undefined, dentistaActivoId);

  const {
    odontograma,
    recargarOdontograma,
    editarDiente,
    loading: odontogramLoading,
    error: odontogramError,
  } = useOdontograma(pacienteSeleccionadoId);

  // Estado Reagendar Cita Modal
  const [citaAReagendarId, setCitaAReagendarId] = useState<string | null>(null);
  const [avisoOperacion, setAvisoOperacion] = useState<string | null>(null);

  // Estado Bloqueo de Horario Propio
  const [bloqFecha, setBloqFecha] = useState<string>(today);
  const [bloqInicio, setBloqInicio] = useState<string>("16:00");
  const [bloqFin, setBloqFin] = useState<string>("18:00");
  const [bloqMotivo, setBloqMotivo] = useState<string>(
    "Congreso de Implantología Digital",
  );

  // Estado Nueva Nota Historial Clínico
  const [histTipo, setHistTipo] = useState<
    "CONSULTA" | "DIAGNOSTICO" | "PROCEDIMIENTO" | "CONTROL_PERIODONTAL"
  >("PROCEDIMIENTO");
  const [histDiag, setHistDiag] = useState<string>("");
  const [histProc, setHistProc] = useState<string>("");
  const [histNotas, setHistNotas] = useState<string>("");

  // Estado Nuevo Tratamiento
  const [trtNombre, setTrtNombre] = useState<string>("");
  const [trtSelectedService, setTrtSrvId] = useState("");
  const trtSrvId = trtSelectedService || servicios[0]?.id || "";
  const [trtSesiones, setTrtSesiones] = useState<number>(1);
  const [trtCosto, setTrtCosto] = useState<number>(0);
  const [trtDientes, setTrtDientes] = useState<string>("");

  const dentistaActual = dentistas.find((d) => d.id === dentistaActivoId);
  const setPacienteSeleccionadoId = (id: string) => {
    if (anyOperationPending) return;
    if (id !== pacienteSeleccionadoId) {
      setHistDiag("");
      setHistProc("");
      setHistNotas("");
      setTrtNombre("");
      setTrtDientes("");
      setTrtSrvId("");
      setTrtCosto(0);
      setTrtSesiones(1);
      setFieldErrors({});
    }
    setSelectionId(id);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      void buscarPacientes(busquedaPaciente);
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaPaciente, buscarPacientes]);
  const handleBloqueoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = blockInputSchema.safeParse({
      fecha: bloqFecha,
      horaInicio: bloqInicio,
      horaFin: bloqFin,
      motivo: bloqMotivo,
    });
    setFieldErrors({});
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    await bloquearHorario(
      dentistaActivoId,
      bloqFecha,
      bloqInicio,
      bloqFin,
      bloqMotivo,
    );
    setAvisoOperacion(
      `Horario bloqueado el ${bloqFecha} de ${bloqInicio} a ${bloqFin} hrs.`,
    );
  };

  const handleAgregarHistorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histDiag.trim() || !histProc.trim()) return;
    await agregarNotaHistorial({
      pacienteId: pacienteSeleccionadoId,
      dentistaId: dentistaActivoId,
      dentistaNombre: user.nombreCompleto,
      tipo: histTipo,
      diagnostico: histDiag,
      procedimientoRealizado: histProc,
      notasClinicas: histNotas,
    });
    setHistDiag("");
    setHistProc("");
    setHistNotas("");
    setAvisoOperacion("Evolución clínica agregada al expediente del paciente.");
  };

  const handleCrearTratamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const fdiNums = trtDientes.split(",").map((s) => Number(s.trim()));
    const parsed = treatmentInputSchema.safeParse({
      nombre: trtNombre,
      sesionesTotales: trtSesiones,
      costoTotalMXN: trtCosto,
      dientesFDI: fdiNums,
    });
    setFieldErrors({});
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    await crearTratamiento({
      pacienteId: pacienteSeleccionadoId,
      dentistaId: dentistaActivoId,
      servicioId: trtSrvId,
      nombre: trtNombre,
      sesionesTotales: trtSesiones,
      costoTotalMXN: trtCosto,
      dientesFDI: fdiNums,
      proximaFechaSugerida: addDays(today(), 1),
      notasEvolucion:
        "Plan de tratamiento creado desde el Portal del Dentista.",
    });
    setTrtNombre("");
    setAvisoOperacion("Nuevo tratamiento asignado al paciente.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-main)] pb-20">
      {/* Top Bar */}
      <TopNavbar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 space-y-6">
        <QueryState
          loading={patientLoading || appointmentsLoading || odontogramLoading}
          error={patientError || appointmentsError || odontogramError}
          onRetry={() => {
            buscarPacientes();
            recargarCitas();
            recargarOdontograma();
          }}
        >
          {/* Barra Superior de Selección de Dentista y Paciente Activo */}
          <Card className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-teal-800">
                PORTAL CLÍNICO DEL DENTISTA (PERMISOS COMPLETOS DE EDICIÓN)
              </span>
              <h1
                className="text-2xl font-semibold text-slate-900 mt-0.5"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                {user.nombreCompleto} ·{" "}
                <span className="text-base font-normal text-slate-600">
                  {dentistaActual?.especialidad}
                </span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-64">
                <Select
                  id="select-paciente-doc"
                  disabled={anyOperationPending}
                  label="Paciente en consulta (cambiar descarta borradores)"
                  value={pacienteSeleccionadoId}
                  onChange={(e) => setPacienteSeleccionadoId(e.target.value)}
                >
                  {pacientes.length === 0 && (
                    <p role="status" className="text-sm text-slate-600 py-3">
                      No hay pacientes para mostrar.
                    </p>
                  )}
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombreCompleto} ({p.codigoExpediente})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {avisoOperacion && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-center justify-between"
            >
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                {avisoOperacion}
              </span>
              <button
                type="button"
                onClick={() => setAvisoOperacion(null)}
                className="text-teal-800 hover:underline font-semibold cursor-pointer"
              >
                Ocultar
              </button>
            </div>
          )}

          <Tabs<TabDentista>
            ariaLabel="Módulos del Portal del Dentista"
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              {
                id: "agenda",
                label: `1. Agenda y Disponibilidad (${citas.length})`,
              },
              {
                id: "pacientes",
                label: `2. Directorio de Pacientes (${pacientes.length})`,
              },
              {
                id: "odontograma",
                label: `3. Odontograma Editable (${pacienteActual?.nombreCompleto.split(" ")[0] || "Paciente"})`,
              },
              { id: "historial", label: "4. Evolución e Historial Clínico" },
              { id: "tratamientos", label: "5. Gestión de Tratamientos" },
            ]}
          />
          <TabPanel activeTab={activeTab}>
            {/* MÓDULO 1: AGENDA DEL DÍA/SEMANA + REAGENDAR + BLOQUEO DE HORARIOS */}
            {activeTab === "agenda" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Agenda de Pacientes — {dentistaActual?.nombreCompleto}
                      </h2>
                      <p className="text-xs text-slate-600">
                        Permite reagendar citas notificando automáticamente al
                        paciente
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setVistaAgenda("lista")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                          vistaAgenda === "lista"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600"
                        }`}
                      >
                        Vista Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => setVistaAgenda("calendario")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                          vistaAgenda === "calendario"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600"
                        }`}
                      >
                        Vista Calendario Semanal
                      </button>
                    </div>
                  </div>

                  <div className="my-4 flex flex-wrap items-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setWeek((d) => addDays(d, -7))}
                    >
                      Semana anterior
                    </Button>
                    <Input
                      id="week-anchor"
                      label="Semana de"
                      type="date"
                      value={week}
                      onChange={(e) => {
                        if (e.target.value) setWeek(e.target.value);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setWeek((d) => addDays(d, 7))}
                    >
                      Semana siguiente
                    </Button>
                    <Input
                      id="agenda-date-filter"
                      label="Filtrar lista por fecha"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFilterDate("")}
                    >
                      Ver todas las fechas
                    </Button>
                  </div>
                  {vistaAgenda === "lista" ? (
                    <div className="mt-4 space-y-3">
                      {citas.length === 0 && (
                        <p
                          role="status"
                          className="text-sm text-slate-600 py-3"
                        >
                          No hay citas para mostrar.
                        </p>
                      )}
                      {(filterDate
                        ? citas.filter((c) => c.fecha === filterDate)
                        : citas
                      ).map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div>
                            <p className="font-mono font-bold text-slate-900">
                              {c.fecha} · {c.hora} hrs · Estado: {c.estado}
                            </p>
                            <p className="font-semibold text-teal-900 mt-0.5">
                              Paciente: {c.pacienteNombre} — {c.servicioNombre}
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              {c.motivoConsulta}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPacienteSeleccionadoId(c.pacienteId);
                                setActiveTab("odontograma");
                              }}
                            >
                              Abrir Odontograma
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setCitaAReagendarId(c.id)}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reagendar</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {weekDays(week).map((dia) => (
                        <div
                          key={dia}
                          className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200 space-y-2"
                        >
                          <p className="font-mono font-bold text-teal-800 border-b border-stone-200 pb-1.5">
                            Día {dia}
                          </p>
                          {!citas.some((c) => c.fecha === dia) && (
                            <p>Sin citas</p>
                          )}
                          {citas
                            .filter((c) => c.fecha === dia)
                            .map((c) => (
                              <div
                                key={c.id}
                                className="p-2 rounded-lg bg-white border border-stone-200"
                              >
                                <p className="font-mono font-semibold">
                                  {c.hora} hrs
                                </p>
                                <p className="font-medium text-slate-900">
                                  {c.pacienteNombre}
                                </p>
                                <p className="text-slate-600 truncate">
                                  {c.servicioNombre}
                                </p>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Bloqueo de Horarios / Disponibilidad Propia */}
                <Card className="lg:col-span-4 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Bloquear Horario / Disponibilidad
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Reserva bloques quirúrgicos o académicos en tu agenda
                  </p>

                  <AsyncForm
                    onSubmit={handleBloqueoSubmit}
                    className="mt-4 space-y-3"
                  >
                    <Input
                      id="bloq-fecha"
                      error={fieldErrors.fecha}
                      type="date"
                      min={today()}
                      required
                      label="Fecha a bloquear"
                      value={bloqFecha}
                      onChange={(e) => setBloqFecha(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="bloq-ini"
                        error={fieldErrors.horaInicio}
                        type="time"
                        label="Hora inicio"
                        value={bloqInicio}
                        onChange={(e) => setBloqInicio(e.target.value)}
                      />
                      <Input
                        id="bloq-fin"
                        error={fieldErrors.horaFin}
                        type="time"
                        label="Hora fin"
                        value={bloqFin}
                        onChange={(e) => setBloqFin(e.target.value)}
                      />
                    </div>
                    <Input
                      id="bloq-motivo"
                      error={fieldErrors.motivo}
                      label="Motivo del bloqueo"
                      value={bloqMotivo}
                      onChange={(e) => setBloqMotivo(e.target.value)}
                    />
                    <Button type="submit" className="w-full">
                      Registrar Bloqueo de Agenda
                    </Button>
                  </AsyncForm>

                  {dentistaActual?.bloqueos &&
                    dentistaActual.bloqueos.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-stone-200 space-y-2 text-xs">
                        <p className="font-semibold text-slate-800">
                          Bloqueos activos:
                        </p>
                        {dentistaActual.bloqueos.map((b) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-lg bg-[#FAF9F6] border border-stone-200"
                          >
                            <p className="font-mono font-semibold text-slate-900">
                              {b.fecha} ({b.horaInicio} – {b.horaFin})
                            </p>
                            <p className="text-slate-600">{b.motivo}</p>
                          </div>
                        ))}
                      </div>
                    )}
                </Card>
              </div>
            )}

            {/* MÓDULO 2: BUSCADOR Y FICHA COMPLETA DE LOS 5 PACIENTES */}
            {activeTab === "pacientes" && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Directorio Clínico de Pacientes (5 Expedientes Semilla)
                      </h2>
                      <p className="text-xs text-slate-600">
                        Busca por nombre, código de expediente o correo y abre
                        su ficha o su odontograma editable
                      </p>
                    </div>
                    <div className="w-full sm:w-80 flex gap-2">
                      <Input
                        id="search-pac"
                        disabled={anyOperationPending}
                        label="Buscar paciente por nombre, expediente o correo"
                        type="search"
                        placeholder="Buscar paciente o expediente"
                        value={busquedaPaciente}
                        onChange={(e) => {
                          if (!seleccionId && pacienteSeleccionadoId)
                            setSelectionId(pacienteSeleccionadoId);
                          setBusquedaPaciente(e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pacientes.length === 0 && (
                      <p role="status" className="text-sm text-slate-600 py-3">
                        No hay pacientes para mostrar.
                      </p>
                    )}
                    {pacientes.map((p) => (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border transition-colors text-xs flex flex-col justify-between ${
                          p.id === pacienteSeleccionadoId
                            ? "border-teal-800 bg-teal-50/40"
                            : "border-stone-200 bg-[#FAF9F6]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-mono font-bold text-teal-800">
                              {p.codigoExpediente}
                            </span>
                            <span>
                              {p.edad} años · Sangre {p.tipoSangre}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 mt-1">
                            {p.nombreCompleto}
                          </h3>
                          <p className="text-slate-600 mt-0.5">{p.email}</p>
                          <p className="text-amber-900 font-medium mt-2">
                            Alergias: {p.alergias.join(", ")}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            disabled={treatmentOperation.pending}
                            variant="outline"
                            onClick={() => {
                              setPacienteSeleccionadoId(p.id);
                              setActiveTab("historial");
                            }}
                          >
                            Ver Historial
                          </Button>
                          <Button
                            size="sm"
                            disabled={treatmentOperation.pending}
                            onClick={() => {
                              setPacienteSeleccionadoId(p.id);
                              setActiveTab("odontograma");
                            }}
                          >
                            Editar Odontograma
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* MÓDULO 3: ODONTOGRAMA EDITABLE (EXCLUSIVO DENTISTA) */}
            {activeTab === "odontograma" && odontograma && pacienteActual && (
              <Odontograma32View
                odontograma={odontograma}
                pacienteNombre={pacienteActual.nombreCompleto}
                editable={true}
                dentistaAutorNombre={user.nombreCompleto}
                onGuardarCambio={editarDiente}
              />
            )}

            {/* MÓDULO 4: AGREGAR EVOLUCIÓN / NOTA AL HISTORIAL CLÍNICO */}
            {activeTab === "historial" && pacienteActual && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-5 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Registrar Nota de Consulta — {pacienteActual.nombreCompleto}
                  </h2>
                  <AsyncForm
                    onSubmit={handleAgregarHistorial}
                    className="mt-4 space-y-3"
                  >
                    <Select
                      id="doc-hist-tipo"
                      label="Tipo de registro clínico"
                      value={histTipo}
                      onChange={(e) =>
                        setHistTipo(
                          e.target.value as
                            | "CONSULTA"
                            | "DIAGNOSTICO"
                            | "PROCEDIMIENTO"
                            | "CONTROL_PERIODONTAL",
                        )
                      }
                    >
                      <option value="PROCEDIMIENTO">
                        Procedimiento Clínico
                      </option>
                      <option value="DIAGNOSTICO">
                        Diagnóstico Radiográfico
                      </option>
                      <option value="CONSULTA">Consulta de Valoración</option>
                      <option value="CONTROL_PERIODONTAL">
                        Control Periodontal
                      </option>
                    </Select>
                    <Input
                      id="doc-hist-diag"
                      required
                      label="Diagnóstico clínico"
                      value={histDiag}
                      onChange={(e) => setHistDiag(e.target.value)}
                      placeholder="Ej. Pulpitis reversible en molar #16"
                    />
                    <Input
                      id="doc-hist-proc"
                      required
                      label="Procedimiento realizado"
                      value={histProc}
                      onChange={(e) => setHistProc(e.target.value)}
                      placeholder="Ej. Eliminación de caries y sellado dentinario"
                    />
                    <Input
                      id="doc-hist-notas"
                      label="Notas de evolución e indicaciones"
                      value={histNotas}
                      onChange={(e) => setHistNotas(e.target.value)}
                      placeholder="Ej. Control en 15 días..."
                    />
                    <Button type="submit" className="w-full">
                      Guardar en Historial Clínico
                    </Button>
                  </AsyncForm>
                </Card>

                <Card className="lg:col-span-7 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Historial Clínico de {pacienteActual.nombreCompleto} (
                    {historial.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {historial.length === 0 && (
                      <p role="status" className="text-sm text-slate-600 py-3">
                        No hay entradas de historial para mostrar.
                      </p>
                    )}
                    {historial.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-mono font-bold text-teal-800">
                            {h.fecha} · {h.tipo}
                          </span>
                          <span>{h.dentistaNombre}</span>
                        </div>
                        <p className="font-semibold text-slate-900">
                          {h.diagnostico}
                        </p>
                        <p className="text-slate-700">
                          {h.procedimientoRealizado}
                        </p>
                        <p className="text-slate-600">{h.notasClinicas}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* MÓDULO 5: CREAR Y ACTUALIZAR TRATAMIENTOS */}
            {activeTab === "tratamientos" && pacienteActual && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-5 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Asignar Nuevo Tratamiento a {pacienteActual.nombreCompleto}
                  </h2>
                  <AsyncForm
                    onSubmit={handleCrearTratamiento}
                    className="mt-4 space-y-3"
                  >
                    <Input
                      id="trt-nombre"
                      error={fieldErrors.nombre}
                      label="Nombre del plan de tratamiento"
                      value={trtNombre}
                      onChange={(e) => setTrtNombre(e.target.value)}
                      placeholder="Ej. Rehabilitación adhesiva cuadrante 1"
                    />
                    <Select
                      id="trt-srv"
                      label="Servicio base"
                      value={trtSrvId}
                      onChange={(e) => setTrtSrvId(e.target.value)}
                    >
                      {servicios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="trt-ses"
                        error={fieldErrors.sesionesTotales}
                        type="number"
                        min={1}
                        required
                        label="Total de sesiones"
                        value={trtSesiones}
                        onChange={(e) => setTrtSesiones(Number(e.target.value))}
                      />
                      <Input
                        id="trt-costo"
                        error={fieldErrors.costoTotalMXN}
                        type="number"
                        min={0}
                        required
                        label="Costo total MXN"
                        value={trtCosto}
                        onChange={(e) => setTrtCosto(Number(e.target.value))}
                      />
                    </div>
                    <Input
                      id="trt-dientes"
                      error={fieldErrors.dientesFDI}
                      label="Dientes FDI involucrados (separados por coma)"
                      value={trtDientes}
                      onChange={(e) => setTrtDientes(e.target.value)}
                    />
                    <Button type="submit" className="w-full">
                      Crear Plan de Tratamiento
                    </Button>
                  </AsyncForm>
                </Card>

                <Card className="lg:col-span-7 p-6">
                  <h2 className="text-base font-semibold text-slate-900">
                    Tratamientos del Paciente ({tratamientos.length})
                  </h2>
                  {treatmentOperation.error && (
                    <p role="alert">{treatmentOperation.error}</p>
                  )}
                  <div className="mt-4 space-y-3">
                    {tratamientos.length === 0 && (
                      <p role="status" className="text-sm text-slate-600 py-3">
                        No hay tratamientos para mostrar.
                      </p>
                    )}
                    {tratamientos.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {t.nombre} ({t.progresoPorcentaje}%)
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Estado: {t.estado} · Sesiones:{" "}
                            {t.sesionesCompletadas}/{t.sesionesTotales} ·
                            Dientes:{" "}
                            {t.dientesFDI.map((d) => `#${d}`).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            disabled={treatmentOperation.pending}
                            variant="outline"
                            onClick={() =>
                              treatmentOperation.run(() =>
                                actualizarTratamiento(
                                  t.id,
                                  "EN_CURSO",
                                  Math.min(
                                    t.sesionesTotales,
                                    t.sesionesCompletadas + 1,
                                  ),
                                ),
                              )
                            }
                          >
                            +1 Sesión
                          </Button>
                          <Button
                            size="sm"
                            disabled={treatmentOperation.pending}
                            onClick={() =>
                              treatmentOperation.run(() =>
                                actualizarTratamiento(
                                  t.id,
                                  "FINALIZADO",
                                  t.sesionesTotales,
                                ),
                              )
                            }
                          >
                            Finalizar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </TabPanel>
        </QueryState>
      </main>

      {/* Modal para Reagendar Cita de Paciente */}
      <Modal
        isOpen={Boolean(citaAReagendarId)}
        onClose={() => setCitaAReagendarId(null)}
        title="Reagendar cita de paciente y enviar notificación"
      >
        {citas.find((c) => c.id === citaAReagendarId) && (
          <RescheduleForm
            key={citaAReagendarId}
            cita={citas.find((c) => c.id === citaAReagendarId)!}
            onSave={async (payload) => {
              const updated = await reagendarCita(payload);
              setAvisoOperacion(
                `Cita reagendada para ${updated.fecha} ${updated.hora}. ${notificationText(updated.estadoNotificacion)}`,
              );
              setCitaAReagendarId(null);
            }}
          />
        )}
      </Modal>

      {/* Chatbot Transversal en Modo DENTISTA */}
      <ChatbotAssistant
        contexto={{
          rolActual: "DENTISTA",
          pacienteActivoId: pacienteSeleccionadoId,
          dentistaActivoId,
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
