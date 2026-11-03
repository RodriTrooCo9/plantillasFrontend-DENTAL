'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  useAuth,
  usePacientes,
  useCitas,
  useOdontograma,
} from '@/hooks';
import {Card, Button, Input, Select, Tabs, Modal} from '@/components/ui';
import {Odontograma32View} from '@/features/odontograma/Odontograma32View';
import {ChatbotAssistant} from '@/features/chatbot/ChatbotAssistant';
import {
  Calendar,
  Users,
  Search,
  LogOut,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
} from 'lucide-react';

type TabDentista =
  | 'agenda'
  | 'pacientes'
  | 'odontograma'
  | 'historial'
  | 'tratamientos';

export default function PortalDentistaPage() {
  const router = useRouter();
  const {logout} = useAuth();
  const [activeTab, setActiveTab] = useState<TabDentista>('agenda');
  const [vistaAgenda, setVistaAgenda] = useState<'lista' | 'calendario'>('lista');
  const [dentistaActivoId, setDentistaActivoId] = useState<string>('den-valeria');
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] =
    useState<string>('pac-1');
  const [busquedaPaciente, setBusquedaPaciente] = useState<string>('');

  const {
    pacientes,
    pacienteActual,
    historial,
    tratamientos,
    buscarPacientes,
    agregarNotaHistorial,
    crearTratamiento,
    actualizarTratamiento,
  } = usePacientes(pacienteSeleccionadoId);

  const {
    servicios,
    dentistas,
    citas,
    recargarCitas,
    reagendarCita,
    bloquearHorario,
  } = useCitas(undefined, dentistaActivoId);

  const {odontograma, recargarOdontograma, editarDiente} = useOdontograma(
    pacienteSeleccionadoId
  );

  // Estado Reagendar Cita Modal
  const [citaAReagendarId, setCitaAReagendarId] = useState<string | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState<string>('2026-11-12');
  const [nuevaHora, setNuevaHora] = useState<string>('11:00');
  const [motivoReagenda, setMotivoReagenda] = useState<string>(
    'Optimización de sala clínica'
  );
  const [avisoOperacion, setAvisoOperacion] = useState<string | null>(null);

  // Estado Bloqueo de Horario Propio
  const [bloqFecha, setBloqFecha] = useState<string>('2026-11-15');
  const [bloqInicio, setBloqInicio] = useState<string>('16:00');
  const [bloqFin, setBloqFin] = useState<string>('18:00');
  const [bloqMotivo, setBloqMotivo] = useState<string>(
    'Congreso de Implantología Digital'
  );

  // Estado Nueva Nota Historial Clínico
  const [histTipo, setHistTipo] = useState<
    'CONSULTA' | 'DIAGNOSTICO' | 'PROCEDIMIENTO' | 'CONTROL_PERIODONTAL'
  >('PROCEDIMIENTO');
  const [histDiag, setHistDiag] = useState<string>('');
  const [histProc, setHistProc] = useState<string>('');
  const [histNotas, setHistNotas] = useState<string>('');

  // Estado Nuevo Tratamiento
  const [trtNombre, setTrtNombre] = useState<string>('');
  const [trtSrvId, setTrtSrvId] = useState<string>('srv-ortodoncia');
  const [trtSesiones, setTrtSesiones] = useState<number>(6);
  const [trtCosto, setTrtCosto] = useState<number>(18500);
  const [trtDientes, setTrtDientes] = useState<string>('11, 12, 21, 22');

  const dentistaActual =
    dentistas.find((d) => d.id === dentistaActivoId) || dentistas[0];

  const handleReagendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citaAReagendarId) return;
    const act = await reagendarCita({
      citaId: citaAReagendarId,
      nuevaFecha,
      nuevaHora,
      motivo: motivoReagenda,
    });
    setCitaAReagendarId(null);
    setAvisoOperacion(
      `Cita de ${act.pacienteNombre} reagendada al ${act.fecha} (${act.hora} hrs). Notificación enviada al paciente.`
    );
  };

  const handleBloqueoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await bloquearHorario(
      dentistaActivoId,
      bloqFecha,
      bloqInicio,
      bloqFin,
      bloqMotivo
    );
    setAvisoOperacion(
      `Horario bloqueado el ${bloqFecha} de ${bloqInicio} a ${bloqFin} hrs.`
    );
  };

  const handleAgregarHistorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histDiag.trim() || !histProc.trim()) return;
    await agregarNotaHistorial({
      pacienteId: pacienteSeleccionadoId,
      dentistaId: dentistaActivoId,
      dentistaNombre: dentistaActual?.nombreCompleto || 'Dra. Valeria Mendoza',
      tipo: histTipo,
      diagnostico: histDiag,
      procedimientoRealizado: histProc,
      notasClinicas: histNotas,
    });
    setHistDiag('');
    setHistProc('');
    setHistNotas('');
    setAvisoOperacion('Evolución clínica agregada al expediente del paciente.');
  };

  const handleCrearTratamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trtNombre.trim()) return;
    const fdiNums = trtDientes
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    await crearTratamiento({
      pacienteId: pacienteSeleccionadoId,
      dentistaId: dentistaActivoId,
      servicioId: trtSrvId,
      nombre: trtNombre,
      sesionesTotales: trtSesiones,
      costoTotalMXN: trtCosto,
      dientesFDI: fdiNums.length ? fdiNums : [16],
      proximaFechaSugerida: '2026-11-20',
      notasEvolucion: 'Plan de tratamiento creado desde el Portal del Dentista.',
    });
    setTrtNombre('');
    setAvisoOperacion('Nuevo tratamiento asignado al paciente.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-main)] pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-surface)]/95 backdrop-blur-md border-b border-[var(--color-border-base)]">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0"
            style={{fontFamily: 'var(--font-fraunces), serif'}}
          >
            Lumina Odontología
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-slate-900">
              Inicio Público
            </Link>
            <Link href="/paciente" className="hover:text-slate-900">
              Vista Paciente
            </Link>
            <Link
              href="/dentista"
              className="text-slate-900 underline underline-offset-8 decoration-teal-700 decoration-2"
            >
              Consola del Dentista
            </Link>
          </nav>

          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Barra Superior de Selección de Dentista y Paciente Activo */}
        <Card className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-teal-800">
              PORTAL CLÍNICO DEL DENTISTA (PERMISOS COMPLETOS DE EDICIÓN)
            </span>
            <h1
              className="text-2xl font-semibold text-slate-900 mt-0.5"
              style={{fontFamily: 'var(--font-fraunces), serif'}}
            >
              {dentistaActual?.nombreCompleto || 'Dra. Valeria Mendoza'} ·{' '}
              <span className="text-base font-normal text-slate-600">
                {dentistaActual?.especialidad}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-56">
              <Select
                id="select-dentista"
                label="Especialista en sesión"
                value={dentistaActivoId}
                onChange={(e) => setDentistaActivoId(e.target.value)}
              >
                {dentistas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombreCompleto}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-64">
              <Select
                id="select-paciente-doc"
                label="Paciente en consulta"
                value={pacienteSeleccionadoId}
                onChange={(e) => setPacienteSeleccionadoId(e.target.value)}
              >
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
            {id: 'agenda', label: `1. Agenda y Disponibilidad (${citas.length})`},
            {id: 'pacientes', label: `2. Directorio de Pacientes (${pacientes.length})`},
            {
              id: 'odontograma',
              label: `3. Odontograma Editable (${pacienteActual?.nombreCompleto.split(' ')[0] || 'Paciente'})`,
            },
            {id: 'historial', label: '4. Evolución e Historial Clínico'},
            {id: 'tratamientos', label: '5. Gestión de Tratamientos'},
          ]}
        />

        {/* MÓDULO 1: AGENDA DEL DÍA/SEMANA + REAGENDAR + BLOQUEO DE HORARIOS */}
        {activeTab === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Agenda de Pacientes — {dentistaActual?.nombreCompleto}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Permite reagendar citas notificando automáticamente al paciente
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setVistaAgenda('lista')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      vistaAgenda === 'lista'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Vista Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaAgenda('calendario')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      vistaAgenda === 'calendario'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Vista Calendario Semanal
                  </button>
                </div>
              </div>

              {vistaAgenda === 'lista' ? (
                <div className="mt-4 space-y-3">
                  {citas.map((c) => (
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
                            setActiveTab('odontograma');
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
                  {['2026-11-10', '2026-11-12', '2026-11-24'].map((dia) => (
                    <div
                      key={dia}
                      className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200 space-y-2"
                    >
                      <p className="font-mono font-bold text-teal-800 border-b border-stone-200 pb-1.5">
                        Día {dia}
                      </p>
                      {citas
                        .filter((c) => c.fecha === dia)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-white border border-stone-200"
                          >
                            <p className="font-mono font-semibold">{c.hora} hrs</p>
                            <p className="font-medium text-slate-900">
                              {c.pacienteNombre}
                            </p>
                            <p className="text-slate-500 truncate">
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
              <p className="text-xs text-slate-500 mt-0.5">
                Reserva bloques quirúrgicos o académicos en tu agenda
              </p>

              <form onSubmit={handleBloqueoSubmit} className="mt-4 space-y-3">
                <Input
                  id="bloq-fecha"
                  type="date"
                  label="Fecha a bloquear"
                  value={bloqFecha}
                  onChange={(e) => setBloqFecha(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="bloq-ini"
                    type="time"
                    label="Hora inicio"
                    value={bloqInicio}
                    onChange={(e) => setBloqInicio(e.target.value)}
                  />
                  <Input
                    id="bloq-fin"
                    type="time"
                    label="Hora fin"
                    value={bloqFin}
                    onChange={(e) => setBloqFin(e.target.value)}
                  />
                </div>
                <Input
                  id="bloq-motivo"
                  label="Motivo del bloqueo"
                  value={bloqMotivo}
                  onChange={(e) => setBloqMotivo(e.target.value)}
                />
                <Button type="submit" className="w-full">
                  Registrar Bloqueo de Agenda
                </Button>
              </form>

              {dentistaActual?.bloqueos && dentistaActual.bloqueos.length > 0 && (
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
        {activeTab === 'pacientes' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Directorio Clínico de Pacientes (5 Expedientes Semilla)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Busca por nombre, código de expediente o correo y abre su ficha o su odontograma editable
                  </p>
                </div>
                <div className="w-full sm:w-80 flex gap-2">
                  <Input
                    id="search-pac"
                    placeholder="Buscar paciente o EXP-2026..."
                    value={busquedaPaciente}
                    onChange={(e) => {
                      setBusquedaPaciente(e.target.value);
                      buscarPacientes(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pacientes.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-colors text-xs flex flex-col justify-between ${
                      p.id === pacienteSeleccionadoId
                        ? 'border-teal-800 bg-teal-50/40'
                        : 'border-stone-200 bg-[#FAF9F6]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-slate-500">
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
                        Alergias: {p.alergias.join(', ')}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPacienteSeleccionadoId(p.id);
                          setActiveTab('historial');
                        }}
                      >
                        Ver Historial
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPacienteSeleccionadoId(p.id);
                          setActiveTab('odontograma');
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
        {activeTab === 'odontograma' && odontograma && pacienteActual && (
          <Odontograma32View
            odontograma={odontograma}
            pacienteNombre={pacienteActual.nombreCompleto}
            editable={true}
            dentistaAutorNombre={
              dentistaActual?.nombreCompleto || 'Dra. Valeria Mendoza'
            }
            onGuardarCambio={editarDiente}
          />
        )}

        {/* MÓDULO 4: AGREGAR EVOLUCIÓN / NOTA AL HISTORIAL CLÍNICO */}
        {activeTab === 'historial' && pacienteActual && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5 p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Registrar Nota de Consulta — {pacienteActual.nombreCompleto}
              </h2>
              <form onSubmit={handleAgregarHistorial} className="mt-4 space-y-3">
                <Select
                  id="doc-hist-tipo"
                  label="Tipo de registro clínico"
                  value={histTipo}
                  onChange={(e) =>
                    setHistTipo(
                      e.target.value as
                        | 'CONSULTA'
                        | 'DIAGNOSTICO'
                        | 'PROCEDIMIENTO'
                        | 'CONTROL_PERIODONTAL'
                    )
                  }
                >
                  <option value="PROCEDIMIENTO">Procedimiento Clínico</option>
                  <option value="DIAGNOSTICO">Diagnóstico Radiográfico</option>
                  <option value="CONSULTA">Consulta de Valoración</option>
                  <option value="CONTROL_PERIODONTAL">Control Periodontal</option>
                </Select>
                <Input
                  id="doc-hist-diag"
                  label="Diagnóstico clínico"
                  value={histDiag}
                  onChange={(e) => setHistDiag(e.target.value)}
                  placeholder="Ej. Pulpitis reversible en molar #16"
                />
                <Input
                  id="doc-hist-proc"
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
              </form>
            </Card>

            <Card className="lg:col-span-7 p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Historial Clínico de {pacienteActual.nombreCompleto} (
                {historial.length})
              </h2>
              <div className="mt-4 space-y-3">
                {historial.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-mono font-bold text-teal-800">
                        {h.fecha} · {h.tipo}
                      </span>
                      <span>{h.dentistaNombre}</span>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {h.diagnostico}
                    </p>
                    <p className="text-slate-700">{h.procedimientoRealizado}</p>
                    <p className="text-slate-500">{h.notasClinicas}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* MÓDULO 5: CREAR Y ACTUALIZAR TRATAMIENTOS */}
        {activeTab === 'tratamientos' && pacienteActual && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5 p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Asignar Nuevo Tratamiento a {pacienteActual.nombreCompleto}
              </h2>
              <form onSubmit={handleCrearTratamiento} className="mt-4 space-y-3">
                <Input
                  id="trt-nombre"
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
                    type="number"
                    label="Total de sesiones"
                    value={trtSesiones}
                    onChange={(e) =>
                      setTrtSesiones(parseInt(e.target.value, 10) || 1)
                    }
                  />
                  <Input
                    id="trt-costo"
                    type="number"
                    label="Costo total MXN"
                    value={trtCosto}
                    onChange={(e) =>
                      setTrtCosto(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <Input
                  id="trt-dientes"
                  label="Dientes FDI involucrados (separados por coma)"
                  value={trtDientes}
                  onChange={(e) => setTrtDientes(e.target.value)}
                />
                <Button type="submit" className="w-full">
                  Crear Plan de Tratamiento
                </Button>
              </form>
            </Card>

            <Card className="lg:col-span-7 p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Tratamientos del Paciente ({tratamientos.length})
              </h2>
              <div className="mt-4 space-y-3">
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
                        Estado: {t.estado} · Sesiones: {t.sesionesCompletadas}/
                        {t.sesionesTotales} · Dientes:{' '}
                        {t.dientesFDI.map((d) => `#${d}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          actualizarTratamiento(
                            t.id,
                            'EN_CURSO',
                            Math.min(t.sesionesTotales, t.sesionesCompletadas + 1)
                          )
                        }
                      >
                        +1 Sesión
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          actualizarTratamiento(
                            t.id,
                            'FINALIZADO',
                            t.sesionesTotales
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
      </main>

      {/* Modal para Reagendar Cita de Paciente */}
      <Modal
        isOpen={Boolean(citaAReagendarId)}
        onClose={() => setCitaAReagendarId(null)}
        title="Reagendar cita de paciente y enviar notificación"
      >
        <form onSubmit={handleReagendarSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="reag-fecha"
              type="date"
              label="Nueva fecha"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
            />
            <Input
              id="reag-hora"
              type="time"
              label="Nueva hora"
              value={nuevaHora}
              onChange={(e) => setNuevaHora(e.target.value)}
            />
          </div>
          <Input
            id="reag-motivo"
            label="Nota de notificación al paciente"
            value={motivoReagenda}
            onChange={(e) => setMotivoReagenda(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCitaAReagendarId(null)}
            >
              Cancelar
            </Button>
            <Button type="submit">Confirmar y Notificar al Paciente</Button>
          </div>
        </form>
      </Modal>

      {/* Chatbot Transversal en Modo DENTISTA */}
      <ChatbotAssistant
        contexto={{
          rolActual: 'DENTISTA',
          pacienteActivoId: pacienteSeleccionadoId,
          dentistaActivoId,
        }}
        onActionExecuted={() => {
          recargarCitas();
          recargarOdontograma();
          buscarPacientes();
        }}
        onOpenOdontograma={() => setActiveTab('odontograma')}
      />
    </div>
  );
}
