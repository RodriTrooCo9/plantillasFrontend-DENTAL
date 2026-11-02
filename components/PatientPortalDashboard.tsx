'use client';

import React, {useState, useEffect} from 'react';
import {
  UserSession,
  AppointmentRecord,
  PatientClinicalProfile,
  DentalService,
  cycleToothCondition,
  formatCurrencyMXN,
} from '@/lib/dental-logic';
import {
  Calendar,
  LogOut,
  PlusCircle,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Users,
  Activity,
  ShieldAlert,
} from 'lucide-react';

export type PortalTab =
  | 'citas'
  | 'historial'
  | 'tratamientos'
  | 'odontograma'
  | 'servicios';

interface PatientPortalDashboardProps {
  userSession: UserSession;
  activePatient: PatientClinicalProfile;
  allPatients: PatientClinicalProfile[];
  appointments: AppointmentRecord[];
  services: DentalService[];
  activeTab: PortalTab;
  onChangeTab: (tab: PortalTab) => void;
  onSelectPatientId: (patientId: string) => void;
  onUpdateTooth: (
    patientId: string,
    toothNumber: number,
    newNote?: string
  ) => void;
  onAddMedicalHistoryNote: (
    patientId: string,
    title: string,
    summary: string
  ) => void;
  onUpdateAppointmentStatus: (
    appointmentId: string,
    status: AppointmentRecord['status']
  ) => void;
  onNewAppointmentForService: (serviceId: string) => void;
  onOpenClinicalChatbot: () => void;
  onNavigateToHomeServices: () => void;
  onLogout: () => void;
}

export function PatientPortalDashboard({
  userSession,
  activePatient,
  allPatients,
  appointments,
  services,
  activeTab,
  onChangeTab,
  onSelectPatientId,
  onUpdateTooth,
  onAddMedicalHistoryNote,
  onUpdateAppointmentStatus,
  onNewAppointmentForService,
  onOpenClinicalChatbot,
  onNavigateToHomeServices,
  onLogout,
}: PatientPortalDashboardProps) {
  const [selectedToothNumber, setSelectedToothNumber] = useState<number>(
    activePatient.odontogram[0]?.toothNumber || 16
  );
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [newHistoryTitle, setNewHistoryTitle] = useState<string>('');
  const [newHistorySummary, setNewHistorySummary] = useState<string>('');

  // Keep selectedToothNumber valid when switching patient
  useEffect(() => {
    const exists = activePatient.odontogram.some(
      (t) => t.toothNumber === selectedToothNumber
    );
    if (!exists && activePatient.odontogram.length > 0) {
      setSelectedToothNumber(activePatient.odontogram[0].toothNumber);
    }
  }, [activePatient, selectedToothNumber]);

  const selectedTooth =
    activePatient.odontogram.find((t) => t.toothNumber === selectedToothNumber) ||
    activePatient.odontogram[0];

  const patientAppointments = appointments.filter(
    (a) =>
      a.patientId === activePatient.id ||
      a.patientEmail.toLowerCase() === activePatient.email.toLowerCase()
  );

  const handleSaveCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNoteInput.trim() || !selectedTooth) return;
    onUpdateTooth(
      activePatient.id,
      selectedTooth.toothNumber,
      customNoteInput.trim()
    );
    setCustomNoteInput('');
  };

  const handleCreateHistoryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistoryTitle.trim() || !newHistorySummary.trim()) return;
    onAddMedicalHistoryNote(
      activePatient.id,
      newHistoryTitle.trim(),
      newHistorySummary.trim()
    );
    setNewHistoryTitle('');
    setNewHistorySummary('');
  };

  return (
    <section
      aria-labelledby="portal-heading"
      className="max-w-[1280px] mx-auto px-6 py-8"
    >
      {/* Patient Selector Bar so each patient's individual odontogram, medical history, and treatments can be inspected */}
      <div className="mb-5 bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-700">
          <Users className="w-4 h-4 text-teal-800 shrink-0" />
          <span className="font-semibold text-slate-900">
            Expediente individual del paciente:
          </span>
          <span className="text-slate-500 hidden md:inline">
            Cada paciente cuenta con su propio odontograma FDI, historial médico y plan de tratamientos.
          </span>
        </div>

        <div
          role="group"
          aria-label="Seleccionar expediente de paciente"
          className="flex flex-wrap items-center gap-1.5"
        >
          {allPatients.map((pat) => {
            const isCurrent = pat.id === activePatient.id;
            return (
              <button
                key={pat.id}
                type="button"
                onClick={() => onSelectPatientId(pat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-teal-800 text-white border-teal-800 font-semibold'
                    : 'bg-[#FAF9F6] text-slate-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                {pat.fullName} ({pat.patientCode})
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Clinical Workspace Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-teal-800">
              {activePatient.patientCode}
            </span>
            <span aria-hidden="true">·</span>
            <span>Edad: {activePatient.age} años</span>
            <span aria-hidden="true">·</span>
            <span>Tipo sanguíneo: {activePatient.bloodType}</span>
            <span aria-hidden="true">·</span>
            <span>{activePatient.email}</span>
          </div>
          <h1
            id="portal-heading"
            className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900"
            style={{fontFamily: 'var(--font-fraunces), serif'}}
          >
            Expediente Clínico: {activePatient.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Próximo control clínico:{' '}
            <strong className="text-slate-900">
              {activePatient.nextCheckupDate}
            </strong>{' '}
            · Especialista a cargo: {activePatient.assignedDoctor}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenClinicalChatbot}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Consultar Chatbot Clínico
          </button>
          <button
            type="button"
            onClick={onNavigateToHomeServices}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Explorar Inicio y Servicios
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Portal Sub-navigation Tabs */}
      <div
        role="tablist"
        aria-label="Secciones del expediente clínico"
        className="mt-6 flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'odontograma'}
          onClick={() => onChangeTab('odontograma')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'odontograma'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-stone-200/60'
          }`}
        >
          Odontograma de {activePatient.fullName.split(' ')[0]} (
          {activePatient.odontogram.length} piezas)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'historial'}
          onClick={() => onChangeTab('historial')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'historial'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-stone-200/60'
          }`}
        >
          Historial Médico ({activePatient.medicalHistory.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tratamientos'}
          onClick={() => onChangeTab('tratamientos')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'tratamientos'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-stone-200/60'
          }`}
        >
          Mis Tratamientos ({activePatient.treatments.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'citas'}
          onClick={() => onChangeTab('citas')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'citas'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-stone-200/60'
          }`}
        >
          Citas Programadas ({patientAppointments.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'servicios'}
          onClick={() => onChangeTab('servicios')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'servicios'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-stone-200/60'
          }`}
        >
          Catálogo de Servicios ({services.length})
        </button>
      </div>

      {/* TAB: ODONTOGRAMA INDIVIDUAL DEL PACIENTE */}
      {activeTab === 'odontograma' && selectedTooth && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Odontograma FDI Personalizado — {activePatient.fullName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Expediente {activePatient.patientCode} · Haz clic en cualquier pieza dental para revisar o actualizar su diagnóstico.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-teal-800 font-semibold">
                {
                  activePatient.odontogram.filter((t) => t.condition !== 'Sano')
                    .length
                }{' '}
                piezas con seguimiento
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {activePatient.odontogram.map((tooth) => {
                const isSelected =
                  tooth.toothNumber === selectedTooth.toothNumber;
                return (
                  <button
                    key={tooth.toothNumber}
                    type="button"
                    onClick={() => setSelectedToothNumber(tooth.toothNumber)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/70'
                        : 'border-stone-200 hover:border-stone-300 bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        #{tooth.toothNumber}
                      </span>
                      <span className="text-[11px] font-medium text-teal-800 truncate">
                        {tooth.condition}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mt-1.5 truncate">
                      {tooth.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                      {tooth.quadrant}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Paciente: <strong className="text-slate-800">{activePatient.fullName}</strong>
                </span>
                <span className="font-mono">
                  Pieza FDI #{selectedTooth.toothNumber} · {selectedTooth.quadrant}
                </span>
              </div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {selectedTooth.name}
              </h3>

              <div className="mt-4 p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Diagnóstico en odontograma:</span>
                  <span className="font-semibold text-teal-900">
                    {selectedTooth.condition}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Última actualización:</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {selectedTooth.lastUpdated}
                  </span>
                </div>
                <p className="pt-2 border-t border-stone-200 text-slate-700 leading-relaxed">
                  {selectedTooth.clinicalNote}
                </p>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTooth(activePatient.id, selectedTooth.toothNumber)
                  }
                  className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cambiar estado a:{' '}
                  {cycleToothCondition(selectedTooth.condition)}
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSaveCustomNote}
              className="mt-6 pt-4 border-t border-stone-200"
            >
              <label
                htmlFor="tooth-note-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Agregar nota clínica a pieza #{selectedTooth.toothNumber} de{' '}
                {activePatient.fullName.split(' ')[0]}
              </label>
              <div className="flex gap-2">
                <input
                  id="tooth-note-input"
                  type="text"
                  value={customNoteInput}
                  onChange={(e) => setCustomNoteInput(e.target.value)}
                  placeholder="Ej. Sellado marginal verificado..."
                  className="flex-1 px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Guardar nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: HISTORIAL MÉDICO DEL PACIENTE */}
      {activeTab === 'historial' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
                <ShieldAlert className="w-4 h-4" />
                <span>Ficha Médica y Alertas Sistémicas</span>
              </div>
              <h2 className="mt-1 text-base font-semibold text-slate-900">
                {activePatient.fullName}
              </h2>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="pt-2 border-t border-stone-100">
                  <dt className="text-slate-500">Alergias reportadas</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {activePatient.allergies}
                  </dd>
                </div>
                <div className="pt-2 border-t border-stone-100">
                  <dt className="text-slate-500">Antecedentes sistémicos</dt>
                  <dd className="text-slate-800 mt-0.5 leading-relaxed">
                    {activePatient.systemicNotes}
                  </dd>
                </div>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <dt className="text-slate-500">Grupo sanguíneo</dt>
                  <dd className="font-mono font-bold text-slate-900">
                    {activePatient.bloodType}
                  </dd>
                </div>
              </dl>
            </div>

            <form
              onSubmit={handleCreateHistoryEntry}
              className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                Registrar evolución en historial médico
              </h3>
              <div>
                <label
                  htmlFor="hist-title"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Título de la nota médica
                </label>
                <input
                  id="hist-title"
                  type="text"
                  value={newHistoryTitle}
                  onChange={(e) => setNewHistoryTitle(e.target.value)}
                  placeholder="Ej. Control radiográfico periapical"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>
              <div>
                <label
                  htmlFor="hist-summary"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Observaciones clínicas
                </label>
                <textarea
                  id="hist-summary"
                  rows={2}
                  value={newHistorySummary}
                  onChange={(e) => setNewHistorySummary(e.target.value)}
                  placeholder="Describe hallazgos, medicación o evolución..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer"
              >
                Agregar al historial médico
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Cronología del Historial Médico y Odontológico
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Notas clínicas certificadas del expediente {activePatient.patientCode}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenClinicalChatbot}
                className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
              >
                Resumir con Asistente IA
              </button>
            </div>

            <div className="space-y-4">
              {activePatient.medicalHistory.map((entry) => (
                <article
                  key={entry.id}
                  className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-teal-800">
                      {entry.date} · {entry.category}
                    </span>
                    <span>Especialista: {entry.specialistName}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900">
                    {entry.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {entry.summary}
                  </p>
                  <p className="mt-2 pt-2 border-t border-stone-200/80 text-xs text-slate-500">
                    <strong className="text-slate-700">Signos y control:</strong>{' '}
                    {entry.vitalObservations}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TRATAMIENTOS DEL PACIENTE */}
      {activeTab === 'tratamientos' && (
        <div className="mt-6 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Plan de Tratamientos Odontológicos — {activePatient.fullName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de sesiones completadas, piezas dentales intervenidas y próximos pasos clínicos
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNewAppointmentForService('srv-ortodoncia-3d')}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Programar sesión de tratamiento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activePatient.treatments.map((trt) => (
              <div
                key={trt.id}
                className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono font-semibold text-teal-800">
                      Inicio: {trt.startDate} · Estado: {trt.status}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrencyMXN(trt.totalCostMXN)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {trt.treatmentName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Especialista: {trt.specialistName} · Piezas FDI:{' '}
                    <span className="font-mono">
                      {trt.toothNumbers.map((n) => `#${n}`).join(', ')}
                    </span>
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">
                        Avance clínico ({trt.completedSessions} de{' '}
                        {trt.totalSessions} sesiones)
                      </span>
                      <span className="font-mono tabular-nums font-bold text-teal-800">
                        {trt.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-700 rounded-full"
                        style={{width: `${trt.progressPercent}%`}}
                      />
                    </div>
                  </div>

                  <p className="mt-4 p-3 rounded-lg bg-[#FAF9F6] border border-stone-200 text-xs text-slate-700">
                    <strong className="text-slate-900">Siguiente paso: </strong>
                    {trt.nextStepDescription}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => onChangeTab('odontograma')}
                    className="font-semibold text-teal-800 hover:underline cursor-pointer"
                  >
                    Ver piezas en Odontograma
                  </button>
                  <button
                    type="button"
                    onClick={() => onNewAppointmentForService(trt.serviceId)}
                    className="font-semibold text-slate-800 hover:underline cursor-pointer"
                  >
                    Agendar control
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CITAS Y AGENDA */}
      {activeTab === 'citas' && (
        <div className="mt-6 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Citas Programadas — {activePatient.fullName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesiones agendadas para el expediente {activePatient.patientCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNewAppointmentForService('srv-ortodoncia-3d')}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Agendar nueva cita
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FAF9F6] text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-6">Fecha y Hora</th>
                  <th className="py-3 px-6">Paciente</th>
                  <th className="py-3 px-6">Servicio Odontológico</th>
                  <th className="py-3 px-6">Especialista</th>
                  <th className="py-3 px-6 text-right">Importe</th>
                  <th className="py-3 px-6">Estado Clínico</th>
                  <th className="py-3 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {patientAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-stone-50/80">
                    <td className="py-3.5 px-6 font-mono tabular-nums text-slate-900 whitespace-nowrap">
                      {apt.date} · {apt.time}
                    </td>
                    <td className="py-3.5 px-6">
                      <p className="font-semibold text-slate-900">
                        {apt.patientName}
                      </p>
                      <p className="text-slate-500">{apt.patientPhone}</p>
                    </td>
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-slate-900">
                        {apt.serviceName}
                      </p>
                      <p className="text-slate-500 line-clamp-1">{apt.notes}</p>
                    </td>
                    <td className="py-3.5 px-6 text-slate-700 whitespace-nowrap">
                      {apt.specialistName}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrencyMXN(apt.priceMXN)}
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        {apt.status === 'Confirmada' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                        )}
                        {apt.status === 'En sala' && (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {apt.status === 'Completada' && (
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateAppointmentStatus(
                            apt.id,
                            apt.status === 'Confirmada'
                              ? 'Completada'
                              : 'Confirmada'
                          )
                        }
                        className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                      >
                        {apt.status === 'Confirmada'
                          ? 'Marcar completada'
                          : 'Reactivar cita'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SERVICIOS DEL CONSULTORIO DENTRO DEL PORTAL */}
      {activeTab === 'servicios' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-semibold text-teal-800">
                    {srv.indexNumber}. {srv.categoryLabel}
                  </span>
                  <span className="font-mono tabular-nums">
                    {srv.durationMinutes} min
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900">
                  {srv.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {srv.shortDescription}
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">
                    Arancel preferencial
                  </span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {formatCurrencyMXN(srv.priceMXN)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNewAppointmentForService(srv.id)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Solicitar servicio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
